import { computed, reactive, ref, watch } from 'vue'

import {
  getSaveMode,
  interruptActiveSave,
  saveScheduleToServer,
  setSaveMode,
} from '../api/mockScheduleApi.js'
import {
  STATUSES,
  blankEntries,
  cancelEntry,
  detectConflicts,
  hasAnySchedule,
  isScheduled,
  normalizeEntries,
  nudgeEntryOrder,
  restoreEntry,
  todayKey,
} from '../utils/schedule.js'
import {
  restorationRooms,
  restorationStaff,
  workdayStartMinutes,
} from '../data/restorationData.js'

const CONFIRMED_PREFIX = 'conservation:schedule:'
const DRAFT_PREFIX = 'conservation:schedule-draft:'
const PENDING_PREFIX = 'conservation:schedule-pending:'

const memoryStore = new Map()

function readStorage(key) {
  try {
    const raw =
      typeof localStorage === 'undefined'
        ? memoryStore.get(key) ?? null
        : localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return memoryStore.get(key) ?? null
  }
}

function writeStorage(key, value) {
  const serialized = JSON.stringify(value)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    } else {
      memoryStore.set(key, value)
    }
  } catch {
    memoryStore.set(key, value)
  }
}

function removeStorage(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
    }
  } catch {
    // 忽略存储不可用，内存映射仍会清理
  }
  memoryStore.delete(key)
}

const date = todayKey()
const confirmedKey = CONFIRMED_PREFIX + date
const draftKey = DRAFT_PREFIX + date
const pendingKey = PENDING_PREFIX + date

// 单例状态：任务清单与总览页共享同一份当日编排。
const entries = reactive([])
const saveState = ref('idle') // idle | saving | failed | interrupted | saved
const lastSavedAt = ref(null)
const saveError = ref('')
const pendingInterrupted = ref(false)
let initialized = false

function loadInitial() {
  // 上次保存中途中断（关闭页面 / 崩溃）：进入时允许一键重试。
  const pending = readStorage(pendingKey)
  pendingInterrupted.value = Boolean(pending)

  // 草稿优先，保证“退出再进来次序相同”；没有草稿回落到已确认编排。
  const draft = readStorage(draftKey)
  const confirmed = readStorage(confirmedKey)
  const initial = draft ?? confirmed

  normalizeEntries(initial?.entries ?? []).forEach((entry) => entries.push(entry))
  lastSavedAt.value = confirmed?.savedAt ?? null
}

function persistDraft() {
  writeStorage(draftKey, { date, entries: JSON.parse(JSON.stringify(entries)) })
}

function ensureInit() {
  if (!initialized) {
    loadInitial()
    initialized = true
    // 任何修改都即时（同步）留存到本地，路由切换 / 刷新 / 中途关闭页面后次序保持一致。
    watch(
      entries,
      () => {
        persistDraft()
      },
      { deep: true, flush: 'sync' },
    )
  }
}

function findEntry(stepId) {
  return entries.find((entry) => entry.stepId === stepId)
}

function updateEntry(stepId, patch) {
  const entry = findEntry(stepId)
  if (entry) Object.assign(entry, patch)
}

function cancel(stepId) {
  const next = cancelEntry(entries, stepId)
  next.forEach((updated) => {
    const current = findEntry(updated.stepId)
    if (current) Object.assign(current, updated)
  })
}

function restore(stepId) {
  const next = restoreEntry(entries, stepId)
  next.forEach((updated) => {
    const current = findEntry(updated.stepId)
    if (current) Object.assign(current, updated)
  })
}

function move(stepId, direction) {
  const next = nudgeEntryOrder(entries, stepId, direction)
  next.forEach((updated) => {
    const current = findEntry(updated.stepId)
    if (current) Object.assign(current, updated)
  })
}

function setStatus(stepId, status) {
  if (!Object.values(STATUSES).includes(status)) return
  const entry = findEntry(stepId)
  if (!entry) return
  // 已取消工序的状态只能通过“恢复”改变。
  if (entry.status === STATUSES.cancelled && status !== STATUSES.cancelled) return
  updateEntry(stepId, { status })
}

function applyEntries(nextEntries) {
  normalizeEntries(nextEntries).forEach((updated, index) => {
    Object.assign(entries[index], updated)
  })
}

function fillTemplate(plan) {
  applyEntries(plan)
}

function clearBoard() {
  blankEntries().forEach((updated, index) => {
    Object.assign(entries[index], updated)
  })
  saveState.value = 'idle'
  saveError.value = ''
  removeStorage(draftKey)
  removeStorage(confirmedKey)
  removeStorage(pendingKey)
  pendingInterrupted.value = false
}

function reloadBoard() {
  // 模拟退出任务清单后重新进入：先取出本地留存，再清空内存态后重新载入。
  const pending = readStorage(pendingKey)
  const draft = readStorage(draftKey)
  const confirmed = readStorage(confirmedKey)
  const initial = draft ?? confirmed

  entries.splice(0)
  normalizeEntries(initial?.entries ?? []).forEach((entry) => entries.push(entry))
  lastSavedAt.value = confirmed?.savedAt ?? null
  pendingInterrupted.value = Boolean(pending)
}

function discardDraft() {
  const confirmed = readStorage(confirmedKey)
  removeStorage(draftKey)
  removeStorage(pendingKey)
  pendingInterrupted.value = false
  if (confirmed) {
    normalizeEntries(confirmed.entries).forEach((updated, index) => {
      Object.assign(entries[index], updated)
    })
  } else {
    blankEntries().forEach((updated, index) => {
      Object.assign(entries[index], updated)
    })
  }
  saveState.value = confirmed ? 'saved' : 'idle'
  saveError.value = ''
}

async function persist() {
  if (saveState.value === 'saving') return

  saveState.value = 'saving'
  saveError.value = ''
  // 落盘“保存中”标记：即使页面被关闭，重新进入仍可重试。
  writeStorage(pendingKey, {
    date,
    entries: JSON.parse(JSON.stringify(entries)),
    startedAt: new Date().toISOString(),
  })

  try {
    const payload = { date, entries: JSON.parse(JSON.stringify(entries)) }
    const result = await saveScheduleToServer(payload)
    writeStorage(confirmedKey, {
      date,
      entries: payload.entries,
      savedAt: result.savedAt,
    })
    removeStorage(pendingKey)
    removeStorage(draftKey)
    pendingInterrupted.value = false
    lastSavedAt.value = result.savedAt
    saveState.value = 'saved'
  } catch (error) {
    if (error.message === 'SAVE_INTERRUPTED') {
      saveState.value = 'interrupted'
      saveError.value = '保存中途中断，编排已保留在本地，可立即重试。'
    } else {
      saveState.value = 'failed'
      saveError.value = '保存失败，请检查网络后重试，编排内容不会丢失。'
    }
  }
}

function retry() {
  return persist()
}

function interrupt() {
  interruptActiveSave()
}

const ownerNames = Object.fromEntries(
  restorationStaff.map((staff) => [staff.id, staff.name]),
)
const roomNames = Object.fromEntries(
  restorationRooms.map((room) => [room.id, room.name]),
)

const conflicts = computed(() =>
  detectConflicts(entries, {
    startMinutes: workdayStartMinutes,
    ownerNames,
    roomNames,
  }),
)

const incompleteCount = computed(
  () =>
    entries.filter(
      (entry) =>
        entry.status !== STATUSES.cancelled &&
        (entry.order == null ||
          !(entry.durationMin > 0) ||
          !entry.ownerId ||
          !entry.roomId),
    ).length,
)

const isDirty = computed(() => {
  const confirmed = readStorage(confirmedKey)
  if (!confirmed) return hasAnySchedule(entries)
  return JSON.stringify(confirmed.entries) !== JSON.stringify(entries)
})

const hasPlan = computed(() => hasAnySchedule(entries))
const scheduledCount = computed(() => entries.filter(isScheduled).length)
const networkMode = ref(getSaveMode())

function changeNetworkMode(mode) {
  setSaveMode(mode)
  networkMode.value = getSaveMode()
}

export function useDailySchedule() {
  ensureInit()

  return {
    date,
    entries,
    // 持久化状态
    saveState,
    saveError,
    lastSavedAt,
    pendingInterrupted,
    isDirty,
    hasPlan,
    scheduledCount,
    incompleteCount,
    conflicts,
    networkMode,
    // 条目操作
    updateEntry,
    cancel,
    restore,
    move,
    setStatus,
    applyEntries,
    fillTemplate,
    clearBoard,
    discardDraft,
    reloadBoard,
    // 保存 / 重试 / 中断
    persist,
    retry,
    interrupt,
    changeNetworkMode,
  }
}
