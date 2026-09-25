import { restorationProcessSteps } from '../data/restorationData.js'

/**
 * 当日工序编排的纯函数集合：
 * - 条目规范化与空态判断
 * - 取消后的自动顺延 / 恢复
 * - 顺序调整（上下游移动、采用替代顺序）
 * - 时间轴推算（同序视为并行，不同序串行）
 * - 责任人 / 修复室争用冲突检测与替代顺序建议
 * - 当日进度统计与展示格式化
 *
 * 编排条目结构：
 * { stepId, order: number|null, durationMin: number|null,
 *   ownerId: string|null, roomId: string|null,
 *   status: 'idle'|'active'|'done'|'cancelled' }
 */

export const STATUSES = {
  idle: 'idle',
  active: 'active',
  done: 'done',
  cancelled: 'cancelled',
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function blankEntries() {
  return restorationProcessSteps.map((step, index) => ({
    stepId: step.id,
    order: index + 1,
    durationMin: null,
    ownerId: null,
    roomId: null,
    status: STATUSES.idle,
  }))
}

export function normalizeEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) return blankEntries()

  const byId = new Map(
    rawEntries
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => [entry.stepId, entry]),
  )

  // 始终以四步工序目录为基准，缺失的补空白，多余的丢弃，保证四步内容不被改写。
  return restorationProcessSteps.map((step, index) => {
    const saved = byId.get(step.id)
    if (!saved) {
      return {
        stepId: step.id,
        order: index + 1,
        durationMin: null,
        ownerId: null,
        roomId: null,
        status: STATUSES.idle,
      }
    }
    return {
      stepId: step.id,
      order: Number.isInteger(saved.order) ? saved.order : null,
      durationMin:
        Number.isFinite(saved.durationMin) && saved.durationMin > 0
          ? saved.durationMin
          : null,
      ownerId: saved.ownerId ?? null,
      roomId: saved.roomId ?? null,
      status: Object.values(STATUSES).includes(saved.status)
        ? saved.status
        : STATUSES.idle,
    }
  })
}

export function isScheduled(entry) {
  return Boolean(
    entry &&
      entry.status !== STATUSES.cancelled &&
      entry.order != null &&
      entry.durationMin > 0 &&
      entry.ownerId &&
      entry.roomId,
  )
}

export function hasAnySchedule(entries) {
  return entries.some(
    (entry) =>
      entry.durationMin > 0 || entry.ownerId || entry.roomId,
  )
}

export function missingFields(entry) {
  const missing = []
  if (entry.order == null) missing.push('顺序')
  if (!(entry.durationMin > 0)) missing.push('预计时长')
  if (!entry.ownerId) missing.push('责任人')
  if (!entry.roomId) missing.push('修复室')
  return missing
}

/**
 * 取消一支工序：后续未取消工序自动顺延（顺序整体前移一位）。
 * 被取消工序保留顺序号与配置，便于「恢复」时还原。
 */
export function cancelEntry(entries, stepId) {
  return entries.map((entry) => {
    if (entry.stepId === stepId) {
      return {
        ...entry,
        status: STATUSES.cancelled,
        order: null,
        durationMin: null,
        ownerId: null,
        roomId: null,
      }
    }
    const target = entries.find((item) => item.stepId === stepId)
    if (
      target &&
      target.order != null &&
      entry.status !== STATUSES.cancelled &&
      entry.order != null &&
      entry.order > target.order
    ) {
      return { ...entry, order: entry.order - 1 }
    }
    return entry
  })
}

/** 恢复已取消工序：排到当日最后一位，其他工序不动。 */
export function restoreEntry(entries, stepId) {
  const maxOrder = entries.reduce((max, entry) => {
    if (entry.status === STATUSES.cancelled) return max
    return Math.max(max, entry.order ?? 0)
  }, 0)

  return entries.map((entry) =>
    entry.stepId === stepId
      ? {
          ...entry,
          status: STATUSES.idle,
          order: maxOrder + 1,
        }
      : entry,
  )
}

/**
 * 上移 / 下移一支工序：与相邻的另一支活跃工序交换顺序号。
 * direction 为 -1（提前）或 +1（延后）。返回新数组；无法移动时原样返回。
 */
export function nudgeEntryOrder(entries, stepId, direction) {
  if (direction !== -1 && direction !== 1) return entries

  const entry = entries.find((item) => item.stepId === stepId)
  if (!entry || entry.status === STATUSES.cancelled || entry.order == null) {
    return entries
  }

  const active = entries
    .filter((item) => item.status !== STATUSES.cancelled && item.order != null)
    .sort((a, b) => a.order - b.order || a.stepId.localeCompare(b.stepId))

  const index = active.findIndex((item) => item.stepId === stepId)
  const swapIndex = index + direction
  const neighbor = active[swapIndex]
  if (!neighbor) return entries

  const currentOrder = entry.order
  const neighborOrder = neighbor.order

  return entries.map((item) => {
    if (item.stepId === entry.stepId) return { ...item, order: neighborOrder }
    if (item.stepId === neighbor.stepId) return { ...item, order: currentOrder }
    return item
  })
}

/**
 * 推算当日时间轴：同顺序号视为并行分组，分组之间串行；
 * 每组时长取组内最长工时。未编排完整（缺时长）的工序不参与排时。
 */
export function computeTimeline(entries, startMinutes = 9 * 60) {
  const groups = new Map()

  entries
    .filter((entry) => entry.status !== STATUSES.cancelled && entry.order != null)
    .forEach((entry) => {
      if (!groups.has(entry.order)) groups.set(entry.order, [])
      groups.get(entry.order).push(entry)
    })

  let cursor = startMinutes
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([order, groupEntries]) => {
      const scheduled = groupEntries.filter((entry) => entry.durationMin > 0)
      const duration = scheduled.reduce(
        (max, entry) => Math.max(max, entry.durationMin),
        0,
      )
      const window = { start: cursor, end: cursor + duration }
      cursor += duration
      return { order, entries: groupEntries, window }
    })
}

/**
 * 检测同一时间窗口内的资源争用：
 * 同序（并行）分组中，两支已编排工序争用同一责任人或同一修复室即为冲突。
 * 返回 [{ type: 'owner'|'room', a, b, groupOrder, window, resourceName }]
 */
export function detectConflicts(entries, options = {}) {
  const { startMinutes = 9 * 60, ownerNames = {}, roomNames = {} } = options
  const conflicts = []

  computeTimeline(entries, startMinutes).forEach((group) => {
    const scheduled = group.entries.filter(isScheduled)
    for (let i = 0; i < scheduled.length; i += 1) {
      for (let j = i + 1; j < scheduled.length; j += 1) {
        const a = scheduled[i]
        const b = scheduled[j]
        if (a.ownerId && a.ownerId === b.ownerId) {
          conflicts.push({
            type: 'owner',
            a,
            b,
            groupOrder: group.order,
            window: group.window,
            resourceName: ownerNames[a.ownerId] ?? a.ownerId,
          })
        }
        if (a.roomId && a.roomId === b.roomId) {
          conflicts.push({
            type: 'room',
            a,
            b,
            groupOrder: group.order,
            window: group.window,
            resourceName: roomNames[a.roomId] ?? a.roomId,
          })
        }
      }
    }
  })

  return conflicts
}

/**
 * 针对一组冲突给出替代顺序：
 * 默认建议把冲突中后一支工序（按目录序）挪到本组之后，
 * 与它争用的前一支保持原位，后续工序顺延。
 */
export function suggestedReorder(entries, conflict) {
  const catalogIndex = (stepId) =>
    restorationProcessSteps.findIndex((step) => step.id === stepId)

  const active = entries
    .filter((entry) => entry.status !== STATUSES.cancelled)
    // 当前执行序列：先按顺序号，同序再按标准目录序。
    .sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        catalogIndex(a.stepId) - catalogIndex(b.stepId),
    )

  // 以标准目录中靠前的一支为锚点，保证流程方向不被颠倒。
  const anchor =
    catalogIndex(conflict.a.stepId) <= catalogIndex(conflict.b.stepId)
      ? conflict.a
      : conflict.b
  const mover =
    anchor.stepId === conflict.a.stepId ? conflict.b : conflict.a

  const rest = active.filter((entry) => entry.stepId !== mover.stepId)
  // 插入到锚点所在并行组最后一支之后，其余工序相对次序不变。
  let insertAt = 0
  rest.forEach((entry, index) => {
    if (entry.order === anchor.order) insertAt = index + 1
  })
  rest.splice(insertAt, 0, mover)

  const orderByStep = new Map(
    rest.map((entry, index) => [entry.stepId, index + 1]),
  )

  return entries.map((entry) =>
    orderByStep.has(entry.stepId)
      ? { ...entry, order: orderByStep.get(entry.stepId) }
      : entry,
  )
}

/** 批量采用多组冲突的替代顺序：依次串行应用。 */
export function applySuggestions(entries, conflicts) {
  let next = entries
  conflicts.forEach((conflict) => {
    // 只在冲突仍然存在时应用，避免重复挪动。
    const stillExists = detectConflicts(next).some(
      (item) =>
        (item.a.stepId === conflict.a.stepId &&
          item.b.stepId === conflict.b.stepId &&
          item.type === conflict.type) ||
        (item.a.stepId === conflict.b.stepId &&
          item.b.stepId === conflict.a.stepId &&
          item.type === conflict.type),
    )
    if (stillExists) next = suggestedReorder(next, conflict)
  })
  return next
}

/** 当日进度统计。 */
export function computeOverview(entries) {
  const active = entries.filter(
    (entry) => entry.status !== STATUSES.cancelled,
  )
  const cancelled = entries.filter(
    (entry) => entry.status === STATUSES.cancelled,
  )
  const scheduled = active.filter(isScheduled)
  const done = active.filter((entry) => entry.status === STATUSES.done)
  const running = active.filter((entry) => entry.status === STATUSES.active)
  const totalMinutes = scheduled.reduce(
    (sum, entry) => sum + (entry.durationMin || 0),
    0,
  )

  // 进度以「已完整编排且未取消」的工序为分母。
  const denominator = scheduled.length
  const percent = denominator
    ? Math.round((done.length / denominator) * 100)
    : 0

  return {
    total: entries.length,
    scheduledCount: scheduled.length,
    doneCount: done.length,
    runningCount: running.length,
    cancelledCount: cancelled.length,
    unscheduledCount: active.length - scheduled.length,
    totalMinutes,
    percent,
  }
}

export function formatDuration(minutes) {
  if (!(minutes > 0)) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} 小时 ${m} 分`
  if (h) return `${h} 小时`
  return `${m} 分钟`
}

export function formatClock(minutesFromMidnight) {
  if (!(minutesFromMidnight >= 0)) return '--:--'
  const h = Math.floor(minutesFromMidnight / 60)
  const m = minutesFromMidnight % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function statusMeta(status) {
  const map = {
    idle: { label: '待开始', tone: 'idle' },
    active: { label: '进行中', tone: 'active' },
    done: { label: '已完成', tone: 'done' },
    cancelled: { label: '已取消', tone: 'cancelled' },
  }
  return map[status] ?? map.idle
}
