import test from 'node:test'
import assert from 'node:assert/strict'

import {
  STATUSES,
  applySuggestions,
  blankEntries,
  cancelEntry,
  computeOverview,
  computeTimeline,
  detectConflicts,
  formatClock,
  formatDuration,
  isScheduled,
  missingFields,
  normalizeEntries,
  nudgeEntryOrder,
  restoreEntry,
  suggestedReorder,
  todayKey,
} from '../src/utils/schedule.js'

const STEP_IDS = ['document', 'dusting', 'patching', 'flattening']

function fullEntries(overrides = {}) {
  const base = blankEntries()
  return base.map((entry, index) => ({
    ...entry,
    order: index + 1,
    durationMin: 60,
    ownerId: `owner-${index}`,
    roomId: `room-${index}`,
    ...(overrides[entry.stepId] ?? {}),
  }))
}

test('blankEntries 始终以四步工序为基准且顺序预置', () => {
  const entries = blankEntries()
  assert.deepEqual(
    entries.map((entry) => entry.stepId),
    STEP_IDS,
  )
  assert.deepEqual(
    entries.map((entry) => entry.order),
    [1, 2, 3, 4],
  )
  assert.ok(entries.every((entry) => !isScheduled(entry)))
})

test('normalizeEntries 补缺失、滤多余，四步目录不被改写', () => {
  const normalized = normalizeEntries([
    { stepId: 'document', order: 2, durationMin: 40, ownerId: 'a', roomId: 'r' },
    { stepId: 'unknown-step', order: 1 },
    { stepId: 'dusting', order: 'bad', durationMin: -5 },
  ])
  assert.equal(normalized.length, 4)
  assert.deepEqual(
    normalized.map((entry) => entry.stepId),
    STEP_IDS,
  )
  assert.equal(normalized[0].order, 2)
  assert.equal(normalized[2].order, 3) // 缺失条目回落为预置序号
  assert.equal(normalized[2].durationMin, null)
})

test('isScheduled 与 missingFields 覆盖空态字段', () => {
  const [blank] = blankEntries()
  assert.deepEqual(missingFields(blank), ['预计时长', '责任人', '修复室'])
  const full = fullEntries()[0]
  assert.equal(isScheduled(full), true)
  assert.deepEqual(missingFields(full), [])
})

test('取消工序后后续活跃工序自动顺延', () => {
  const entries = fullEntries()
  const next = cancelEntry(entries, 'dusting')
  const dusting = next.find((entry) => entry.stepId === 'dusting')
  assert.equal(dusting.status, STATUSES.cancelled)
  assert.equal(dusting.order, null)
  assert.equal(dusting.ownerId, null)
  assert.deepEqual(
    next
      .filter((entry) => entry.status !== STATUSES.cancelled)
      .map((entry) => entry.order),
    [1, 2, 3],
  )
  assert.equal(next.find((entry) => entry.stepId === 'patching').order, 2)
  assert.equal(next.find((entry) => entry.stepId === 'flattening').order, 3)
})

test('恢复工序排到当日最后一位', () => {
  const cancelled = cancelEntry(fullEntries(), 'dusting')
  const restored = restoreEntry(cancelled, 'dusting')
  const dusting = restored.find((entry) => entry.stepId === 'dusting')
  assert.equal(dusting.status, STATUSES.idle)
  assert.equal(dusting.order, 4)
})

test('上移/下移与相邻工序交换顺序', () => {
  const entries = fullEntries()
  const moved = nudgeEntryOrder(entries, 'patching', -1)
  assert.equal(moved.find((entry) => entry.stepId === 'dusting').order, 3)
  assert.equal(moved.find((entry) => entry.stepId === 'patching').order, 2)
  // 首支无法再上移
  const first = nudgeEntryOrder(entries, 'document', -1)
  assert.deepEqual(
    first.map((entry) => entry.order),
    [1, 2, 3, 4],
  )
})

test('时间轴：同序并行取最长工时，异序串行累加', () => {
  const entries = fullEntries({
    dusting: { order: 1, durationMin: 30 },
    document: { durationMin: 90 },
  })
  const groups = computeTimeline(entries, 9 * 60)
  assert.equal(groups.length, 3)
  assert.deepEqual(
    groups[0].entries.map((entry) => entry.stepId).sort(),
    ['document', 'dusting'],
  )
  assert.equal(groups[0].window.start, 540)
  assert.equal(groups[0].window.end, 630) // max(90, 30)
  assert.equal(groups[1].window.start, 630)
  assert.equal(groups[2].window.end, 750)
})

test('同序同责任人或同修复室检测为冲突，异序不争用', () => {
  const parallel = fullEntries({
    dusting: { order: 1, ownerId: 'owner-0', roomId: 'other' },
  })
  const ownerNames = { 'owner-0': '韩澈' }
  const conflicts = detectConflicts(parallel, { ownerNames })
  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].type, 'owner')
  assert.equal(conflicts[0].resourceName, '韩澈')

  const sameRoom = fullEntries({
    dusting: { order: 1, ownerId: 'other', roomId: 'room-0' },
  })
  assert.equal(detectConflicts(sameRoom).length, 1)

  // 默认串行排布无冲突
  assert.equal(detectConflicts(fullEntries()).length, 0)
})

test('替代顺序消除冲突且保持标准目录方向', () => {
  const parallel = fullEntries({
    dusting: { order: 1, ownerId: 'owner-0' },
  })
  const conflict = detectConflicts(parallel)[0]
  const reordered = suggestedReorder(parallel, conflict)
  // document 在前保持原位，dusting 顺延到第二组
  assert.equal(reordered.find((entry) => entry.stepId === 'document').order, 1)
  assert.equal(reordered.find((entry) => entry.stepId === 'dusting').order, 2)
  assert.equal(detectConflicts(reordered).length, 0)
})

test('applySuggestions 可一次处理多组争用', () => {
  const entries = fullEntries({
    dusting: { order: 1, ownerId: 'owner-0' },
    patching: { order: 1, ownerId: 'owner-0' },
  })
  const conflicts = detectConflicts(entries)
  assert.ok(conflicts.length >= 1)
  const resolved = applySuggestions(entries, conflicts)
  assert.equal(detectConflicts(resolved).length, 0)
})

test('取消工序不计入进度分母', () => {
  const cancelled = cancelEntry(fullEntries(), 'dusting')
  cancelled.find((entry) => entry.stepId === 'document').status =
    STATUSES.done
  const overview = computeOverview(cancelled)
  assert.equal(overview.scheduledCount, 3)
  assert.equal(overview.doneCount, 1)
  assert.equal(overview.cancelledCount, 1)
  assert.equal(overview.percent, 33)
})

test('格式化工具输出预期文本', () => {
  assert.equal(formatDuration(90), '1 小时 30 分')
  assert.equal(formatDuration(60), '1 小时')
  assert.equal(formatDuration(40), '40 分钟')
  assert.equal(formatDuration(null), '—')
  assert.equal(formatClock(540), '09:00')
  assert.equal(formatClock(670), '11:10')
})

test('todayKey 为 YYYY-MM-DD', () => {
  assert.match(todayKey(new Date(2026, 0, 5)), /^\d{4}-01-05$/)
})
