import test from 'node:test'
import assert from 'node:assert/strict'

import {
  useDailySchedule,
  setSaveMode,
  applySuggestions,
} from './helpers/harness.js'

function resetBoard() {
  setSaveMode('ok')
  const board = useDailySchedule()
  board.clearBoard()
  board.saveState.value = 'idle'
  return board
}

function fillAll(board, patch = {}) {
  board.entries.forEach((entry) => {
    board.updateEntry(entry.stepId, {
      durationMin: 60,
      ownerId: `owner-${entry.stepId}`,
      roomId: `room-${entry.stepId}`,
      ...patch,
    })
  })
}

test('空态：初次进入没有任何编排数据', () => {
  const board = resetBoard()
  assert.equal(board.hasPlan.value, false)
  assert.equal(board.scheduledCount.value, 0)
  assert.equal(board.incompleteCount.value, 4)
})

test('编辑后“退出再进入”（reloadBoard）次序与配置保持一致', () => {
  const board = resetBoard()
  board.updateEntry('document', {
    durationMin: 40,
    ownerId: 'han-che',
    roomId: 'photo',
  })
  board.updateEntry('dusting', { order: 3 })
  board.updateEntry('patching', { order: 2 })

  board.reloadBoard()

  const document = board.entries.find((e) => e.stepId === 'document')
  assert.equal(document.durationMin, 40)
  assert.equal(document.ownerId, 'han-che')
  assert.equal(document.roomId, 'photo')
  assert.equal(board.entries.find((e) => e.stepId === 'dusting').order, 3)
  assert.equal(board.entries.find((e) => e.stepId === 'patching').order, 2)
})

test('取消工序后后续自动顺延，恢复后排到末位', () => {
  const board = resetBoard()
  fillAll(board)

  board.cancel('dusting')
  assert.equal(board.entries.find((e) => e.stepId === 'patching').order, 2)
  assert.equal(board.entries.find((e) => e.stepId === 'flattening').order, 3)
  assert.equal(
    board.entries.find((e) => e.stepId === 'dusting').status,
    'cancelled',
  )

  board.reloadBoard()
  assert.equal(board.entries.find((e) => e.stepId === 'patching').order, 2)

  board.restore('dusting')
  assert.equal(board.entries.find((e) => e.stepId === 'dusting').order, 4)
})

test('同序争用在确认前检出，采用替代顺序后全部串行且无冲突', () => {
  const board = resetBoard()
  fillAll(board, { order: 1, ownerId: 'han-che' })

  // 四支同序且同一责任人：两两争用共 6 组冲突
  assert.equal(board.conflicts.value.length, 6)

  board.applyEntries(applySuggestions(board.entries, board.conflicts.value))
  assert.equal(board.conflicts.value.length, 0)
  const orders = board.entries
    .filter((e) => e.status !== 'cancelled')
    .map((e) => e.order)
    .sort((a, b) => a - b)
  assert.deepEqual(orders, [1, 2, 3, 4])
})

test('同一修复室争用同样检出（责任人不同）', () => {
  const board = resetBoard()
  fillAll(board)
  board.updateEntry('dusting', { order: 1, roomId: 'room-document' })
  // document 与 dusting 同序同修复室
  const roomConflicts = board.conflicts.value.filter(
    (conflict) => conflict.type === 'room',
  )
  assert.equal(roomConflicts.length, 1)
})

test('保存失败后允许重试，网络恢复后保存成功', async () => {
  const board = resetBoard()
  board.updateEntry('document', {
    durationMin: 40,
    ownerId: 'han-che',
    roomId: 'photo',
  })

  setSaveMode('fail')
  await board.persist()
  assert.equal(board.saveState.value, 'failed')
  assert.match(board.saveError.value, /保存失败/)

  setSaveMode('ok')
  await board.retry()
  assert.equal(board.saveState.value, 'saved')
  assert.ok(board.lastSavedAt.value)
})

test('保存响应中断：可重试并最终成功', async () => {
  const board = resetBoard()
  fillAll(board)

  setSaveMode('interrupt')
  await board.persist()
  assert.equal(board.saveState.value, 'interrupted')
  assert.match(board.saveError.value, /中断/)

  setSaveMode('ok')
  await board.retry()
  assert.equal(board.saveState.value, 'saved')
})

test('保存进行中主动中断：可重试并最终成功', async () => {
  const board = resetBoard()
  fillAll(board)
  setSaveMode('ok')

  const inFlight = board.persist()
  board.interrupt()
  await inFlight
  assert.equal(board.saveState.value, 'interrupted')

  await board.retry()
  assert.equal(board.saveState.value, 'saved')
})

test('保存成功后的修改可放弃并回落到已确认编排', async () => {
  const board = resetBoard()
  board.updateEntry('document', {
    durationMin: 40,
    ownerId: 'han-che',
    roomId: 'photo',
  })
  setSaveMode('ok')
  await board.persist()

  board.updateEntry('document', { durationMin: 90 })
  assert.equal(board.isDirty.value, true)
  board.discardDraft()
  assert.equal(
    board.entries.find((e) => e.stepId === 'document').durationMin,
    40,
  )
  assert.equal(board.isDirty.value, false)
})
