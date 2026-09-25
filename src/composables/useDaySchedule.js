import { computed, reactive, watch } from 'vue'

import { submitSchedule } from '../services/scheduleService'
import {
  applySuggestion,
  createBlankEntries,
  endOf,
  findConflicts,
  formatClock,
  formatDuration,
  isConfigured,
  missingFields,
  normalizeEntries,
  orderedActive,
  stepContentOf,
  stepNameOf,
} from '../utils/restorationSchedule'

const STORAGE_PREFIX = 'conservation-desk:schedule:'
const STORAGE_VERSION = 1

function todayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function todayLabel() {
  const now = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${
    weekdays[now.getDay()]
  }`
}

function storageKey() {
  return `${STORAGE_PREFIX}${todayKey()}`
}

function loadDraft() {
  try {
    const raw = window.localStorage.getItem(storageKey())
    if (!raw) {
      return { entries: createBlankEntries(), confirmedJson: '', pending: false }
    }
    const parsed = JSON.parse(raw)
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.entries)) {
      return { entries: createBlankEntries(), confirmedJson: '', pending: false }
    }
    return {
      entries: normalizeEntries(parsed.entries),
      confirmedJson:
        typeof parsed.confirmedJson === 'string' ? parsed.confirmedJson : '',
      pending: Boolean(parsed.pending),
    }
  } catch {
    return { entries: createBlankEntries(), confirmedJson: '', pending: false }
  }
}

function persistDraft(entries, confirmedJson, pending) {
  try {
    window.localStorage.setItem(
      storageKey(),
      JSON.stringify({
        version: STORAGE_VERSION,
        entries,
        confirmedJson,
        pending,
      }),
    )
  } catch {
    // 本地存储不可用时仅保留内存状态，不阻塞编排操作
  }
}

const initial = loadDraft()

const state = reactive({
  entries: initial.entries,
  saveState: initial.pending ? 'failed' : 'idle', // idle | saving | failed | saved
  saveError: initial.pending ? '上次保存中途中断，编排尚未确认。' : '',
  interrupted: initial.pending,
  attempt: initial.pending ? 1 : 0,
  lastSavedAt: '',
  conflictOpen: false,
  validationMessage: '',
})

let confirmedJson = initial.confirmedJson
let revision = 0

function persist(pending = false) {
  persistDraft(state.entries, confirmedJson, pending)
}

// 草稿自动写入本地：退出任务清单再进入，次序与内容保持一致。
// 仅当存在未完成的服务端提交时保留 pending，便于下次进入恢复“中断的保存”。
watch(
  () => state.entries,
  () => {
    const hasPendingSubmit = state.saveState === 'saving' || state.interrupted
    persist(hasPendingSubmit)
  },
  { deep: true },
)

const activeEntries = computed(() => orderedActive(state.entries))

const configuredEntries = computed(() =>
  activeEntries.value.filter(isConfigured),
)

const incompleteEntries = computed(() =>
  activeEntries.value.filter((entry) => !isConfigured(entry)),
)

const conflicts = computed(() => findConflicts(state.entries))

const dirty = computed(
  () => JSON.stringify(state.entries) !== confirmedJson,
)

const canceledEntries = computed(() =>
  state.entries.filter((entry) => entry.canceled),
)

// ---- 总览统计 ----

const doneCount = computed(
  () => configuredEntries.value.filter((entry) => entry.status === 'done').length,
)

const progressCount = computed(
  () => configuredEntries.value.filter((entry) => entry.status === 'progress').length,
)

const totalScheduledMinutes = computed(() =>
  configuredEntries.value.reduce((sum, entry) => sum + entry.duration, 0),
)

const dayWindow = computed(() => {
  if (configuredEntries.value.length === 0) return ''
  const starts = configuredEntries.value.map((entry) => entry.start)
  const ends = configuredEntries.value.map((entry) => endOf(entry))
  return `${formatClock(Math.min(...starts))} – ${formatClock(Math.max(...ends))}`
})

const overview = computed(() => {
  const configured = configuredEntries.value.length
  const active = activeEntries.value.length
  return {
    hasPlan: configured > 0,
    activeCount: active,
    configuredCount: configured,
    doneCount: doneCount.value,
    progressCount: progressCount.value,
    percent: configured === 0 ? 0 : Math.round((doneCount.value / configured) * 100),
    totalMinutesLabel: formatDuration(totalScheduledMinutes.value),
    dayWindow: dayWindow.value,
    conflictCount: conflicts.value.length,
  }
})

function clearSaveFeedbackOnEdit() {
  state.validationMessage = ''
  state.conflictOpen = false
}

function patchEntry(id, patch) {
  const target = state.entries.find((entry) => entry.id === id)
  if (!target) return
  Object.assign(target, patch)
  clearSaveFeedbackOnEdit()
}

function setStatus(id, status) {
  patchEntry(id, { status })
}

// 在已安排工序之间交换开始时段，从而调整当日顺序
function moveEntry(id, direction) {
  const lineup = configuredEntries.value
  const index = lineup.findIndex((entry) => entry.id === id)
  const targetIndex = index + direction
  if (index === -1 || targetIndex < 0 || targetIndex >= lineup.length) return

  const current = lineup[index]
  const neighbor = lineup[targetIndex]
  const currentStart = current.start
  patchEntry(current.id, { start: neighbor.start })
  patchEntry(neighbor.id, { start: currentStart })
}

function cancelEntry(id) {
  patchEntry(id, { canceled: true, status: 'pending' })
}

function restoreEntry(id) {
  patchEntry(id, { canceled: false })
}

function applyConflict(conflict) {
  const next = applySuggestion(state.entries, conflict)
  state.entries = next
  clearSaveFeedbackOnEdit()
}

function validationForIncomplete() {
  if (activeEntries.value.length === 0) {
    return '所有工序均已取消，无法确认空编排。请至少恢复一道工序。'
  }
  if (incompleteEntries.value.length > 0) {
    const names = incompleteEntries.value
      .map(
        (entry) =>
          `${stepNameOf(entry.id)}（缺 ${missingFields(entry).join('、')}）`,
      )
      .join('；')
    return `以下工序尚未排完，不能确认：${names}。`
  }
  return ''
}

async function sendToServer(attempt) {
  state.saveState = 'saving'
  state.interrupted = false
  persist(true) // 先落本地，即使中途退出也能恢复并允许重试
  try {
    const result = await submitSchedule(
      { revision, entries: state.entries, date: todayKey() },
      attempt,
    )
    confirmedJson = JSON.stringify(state.entries)
    revision += 1
    state.saveState = 'saved'
    state.saveError = ''
    state.attempt = 0
    state.interrupted = false
    state.lastSavedAt = result.savedAt
    state.conflictOpen = false
    persist(false)
  } catch (error) {
    state.saveState = 'failed'
    state.saveError = error.message
    state.interrupted = true
    persist(true)
  }
}

// 确认前校验：先补齐空项，再拦截冲突并给出替代顺序
function confirmSave() {
  if (state.saveState === 'saving') return

  const incompleteMessage = validationForIncomplete()
  if (incompleteMessage) {
    state.validationMessage = incompleteMessage
    state.conflictOpen = false
    return
  }

  if (conflicts.value.length > 0) {
    state.conflictOpen = true
    state.validationMessage =
      '确认前检测到资源冲突，请先按替代顺序调整，或手动改派责任人 / 修复室。'
    return
  }

  state.validationMessage = ''
  state.attempt = 1
  sendToServer(1)
}

// 保存失败或中途中断后，按当前编排重新提交
function retrySave() {
  if (state.saveState === 'saving') return

  const incompleteMessage = validationForIncomplete()
  if (incompleteMessage) {
    state.validationMessage = incompleteMessage
    return
  }
  if (conflicts.value.length > 0) {
    state.conflictOpen = true
    state.validationMessage = '冲突尚未解决，不能提交。'
    return
  }

  state.validationMessage = ''
  state.attempt += 1
  sendToServer(Math.max(state.attempt, 1))
}

function dismissConflictPanel() {
  state.conflictOpen = false
}

export function useDaySchedule() {
  return {
    // 静态四步内容（只读引用，不在流程板内改写）
    stepContentOf,
    stepNameOf,
    // 状态
    state,
    activeEntries,
    configuredEntries,
    incompleteEntries,
    conflicts,
    dirty,
    canceledEntries,
    overview,
    todayLabel,
    // 操作
    patchEntry,
    setStatus,
    moveEntry,
    cancelEntry,
    restoreEntry,
    applyConflict,
    confirmSave,
    retrySave,
    dismissConflictPanel,
  }
}
