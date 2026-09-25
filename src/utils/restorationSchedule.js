import {
  restorationOwners,
  restorationRooms,
  restorationStepNames,
  restorationSteps,
} from '../data/restorationData'

// ---- 工序基础 ----

export const STEP_COUNT = restorationSteps.length

export function stepIndexOf(id) {
  const index = Number(String(id).replace('step-', '')) - 1
  return Number.isInteger(index) && index >= 0 && index < STEP_COUNT ? index : -1
}

export function stepContentOf(id) {
  const index = stepIndexOf(id)
  return index === -1 ? '' : restorationSteps[index]
}

export function stepNameOf(id) {
  const index = stepIndexOf(id)
  return index === -1 ? '未知工序' : restorationStepNames[index]
}

// 空白工序 = 明确空态的数据来源
export function createBlankEntries() {
  return restorationSteps.map((_, index) => ({
    id: `step-${index + 1}`,
    start: null, // 分钟数，08:00 = 480
    duration: null, // 分钟数
    owner: null,
    room: null,
    status: 'pending', // pending | progress | done
    canceled: false,
  }))
}

export function normalizeEntries(raw) {
  const blanks = createBlankEntries()
  if (!Array.isArray(raw)) return blanks

  return blanks.map((blank) => {
    const saved = raw.find((item) => item && item.id === blank.id)
    if (!saved) return blank
    const status = ['pending', 'progress', 'done'].includes(saved.status)
      ? saved.status
      : 'pending'
    const start =
      typeof saved.start === 'number' &&
      saved.start >= WORKDAY_START &&
      saved.start <= WORKDAY_END
        ? saved.start
        : null
    const duration =
      typeof saved.duration === 'number' &&
      DURATION_OPTIONS.some((option) => option.value === saved.duration)
        ? saved.duration
        : null
    return {
      ...blank,
      start,
      duration,
      owner:
        saved.owner && restorationOwners.some((item) => item.name === saved.owner)
          ? saved.owner
          : null,
      room: restorationRooms.some((item) => item.id === saved.room)
        ? saved.room
        : null,
      status,
      canceled: Boolean(saved.canceled),
    }
  })
}

export function missingFields(entry) {
  const missing = []
  if (entry.start === null) missing.push('开始时间')
  if (entry.duration === null) missing.push('预计时长')
  if (!entry.owner) missing.push('责任人')
  if (!entry.room) missing.push('修复室')
  return missing
}

export function isConfigured(entry) {
  return !entry.canceled && missingFields(entry).length === 0
}

export function endOf(entry) {
  return entry.start === null || entry.duration === null ? null : entry.start + entry.duration
}

// 未取消的工序，按开始时间排序（开始时间为空的排在末尾并保持工序序号）
export function orderedActive(entries) {
  return entries
    .filter((entry) => !entry.canceled)
    .slice()
    .sort((a, b) => {
      if (a.start === null && b.start === null) {
        return stepIndexOf(a.id) - stepIndexOf(b.id)
      }
      if (a.start === null) return 1
      if (b.start === null) return -1
      if (a.start !== b.start) return a.start - b.start
      return stepIndexOf(a.id) - stepIndexOf(b.id)
    })
}

// ---- 时间槽 ----

export const WORKDAY_START = 8 * 60 // 08:00
export const WORKDAY_END = 19 * 60 // 19:00
export const SLOT_STEP = 15

export function timeSlotOptions() {
  const options = []
  for (let value = WORKDAY_START; value <= WORKDAY_END; value += SLOT_STEP) {
    options.push({ value, label: formatClock(value) })
  }
  return options
}

export const DURATION_OPTIONS = [
  { value: 30, label: '30 分钟' },
  { value: 45, label: '45 分钟' },
  { value: 60, label: '1 小时' },
  { value: 90, label: '1.5 小时' },
  { value: 120, label: '2 小时' },
  { value: 180, label: '3 小时' },
  { value: 240, label: '4 小时' },
  { value: 480, label: '8 小时（定型）' },
]

export function formatClock(value) {
  const hour = Math.floor(value / 60)
  const minute = value % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatDuration(value) {
  if (value === null) return '未填'
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours === 0) return `${minutes} 分钟`
  if (minutes === 0) return `${hours} 小时`
  return `${hours} 小时 ${minutes} 分钟`
}

export function formatRange(entry) {
  const end = endOf(entry)
  if (entry.start === null || end === null) return '时间未定'
  return `${formatClock(entry.start)} – ${formatClock(end)}`
}

export function formatTotalMinutes(value) {
  const hours = Math.round((value / 60) * 10) / 10
  return `${hours} 小时`
}

export function roomNameOf(id) {
  const room = restorationRooms.find((item) => item.id === id)
  return room ? room.name : '未安排'
}

// ---- 冲突检测：两支工序争用同一责任人或同一修复室，且时段重叠 ----

export function overlaps(a, b) {
  const aEnd = endOf(a)
  const bEnd = endOf(b)
  if (a.start === null || b.start === null || aEnd === null || bEnd === null) {
    return false
  }
  return a.start < bEnd && b.start < aEnd
}

export function findConflicts(entries) {
  const active = orderedActive(entries).filter(isConfigured)
  const conflicts = []

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i]
      const b = active[j]
      if (!overlaps(a, b)) continue

      const resources = []
      if (a.owner && a.owner === b.owner) resources.push({ type: 'owner', name: a.owner })
      if (a.room && a.room === b.room) {
        resources.push({ type: 'room', name: roomNameOf(a.room) })
      }
      if (resources.length === 0) continue

      // 替代顺序：后开始的工序顺延至先开工序结束
      const later = a.start <= b.start ? b : a
      const earlier = a.start <= b.start ? a : b
      conflicts.push({
        key: `${a.id}__${b.id}__${resources.map((item) => item.type).join('-')}`,
        aId: a.id,
        bId: b.id,
        resources,
        suggestionId: later.id,
        suggestionStart: endOf(earlier),
        reason: `${stepNameOf(a.id)}（${formatRange(a)}）与 ${stepNameOf(
          b.id,
        )}（${formatRange(b)}）在 ${resources
          .map((item) => item.name)
          .join('、')}上时间重叠`,
      })
    }
  }

  return conflicts
}

// 采用替代顺序：把建议工序的开始时间顺延到冲突工序结束
export function applySuggestion(entries, conflict) {
  return entries.map((entry) =>
    entry.id === conflict.suggestionId
      ? { ...entry, start: conflict.suggestionStart }
      : entry,
  )
}

// 某工序取消后，其余工序在当日次序中的位置自动顺延（重排序号不改变已安排时段）
export function sequenceOf(entry, entries) {
  return orderedActive(entries).findIndex((item) => item.id === entry.id) + 1
}
