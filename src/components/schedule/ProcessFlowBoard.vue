<script setup>
import { computed, ref } from 'vue'

import ProcessStepCard from './ProcessStepCard.vue'
import ConfirmConflictDialog from './ConfirmConflictDialog.vue'
import SaveStatusBar from './SaveStatusBar.vue'
import ScheduleTimeline from './ScheduleTimeline.vue'
import { useDailySchedule } from '../../composables/useDailySchedule.js'
import {
  restorationProcessSteps,
  restorationRooms,
  restorationStaff,
  workdayStartMinutes,
} from '../../data/restorationData.js'
import { computeTimeline } from '../../utils/schedule.js'

const {
  date,
  entries,
  saveState,
  saveError,
  lastSavedAt,
  pendingInterrupted,
  isDirty,
  hasPlan,
  incompleteCount,
  conflicts,
  networkMode,
  updateEntry,
  cancel,
  restore,
  move,
  setStatus,
  applyEntries,
  fillTemplate,
  clearBoard,
  discardDraft,
  persist,
  retry,
  interrupt,
  changeNetworkMode,
} = useDailySchedule()

const dialogOpen = ref(false)

const staffNames = Object.fromEntries(
  restorationStaff.map((member) => [member.id, member.name]),
)
const roomNames = Object.fromEntries(
  restorationRooms.map((room) => [room.id, room.name]),
)
const stepNames = Object.fromEntries(
  restorationProcessSteps.map((step) => [step.id, step.shortName]),
)

const activeCount = computed(
  () => entries.filter((entry) => entry.status !== 'cancelled').length,
)
const orderOptions = computed(() =>
  Array.from({ length: Math.max(activeCount.value, 1) }, (_, i) => i + 1),
)

const timelineGroups = computed(() =>
  computeTimeline(entries, workdayStartMinutes),
)

function windowFor(stepId) {
  const group = timelineGroups.value.find((item) =>
    item.entries.some((entry) => entry.stepId === stepId),
  )
  return group ? group.window : null
}

function conflictsFor(stepId) {
  return conflicts.value
    .filter(
      (conflict) =>
        conflict.a.stepId === stepId || conflict.b.stepId === stepId,
    )
    .map((conflict) => {
      const other =
        conflict.a.stepId === stepId ? conflict.b : conflict.a
      return { ...conflict, otherName: stepNames[other.stepId] }
    })
}

function openConfirm() {
  dialogOpen.value = true
}

function handleApplySuggestions(nextEntries) {
  applyEntries(nextEntries)
  dialogOpen.value = false
}

async function handleSaveAnyway() {
  dialogOpen.value = false
  await persist()
}

// 无冲突的标准起步模板：四支工序顺序串行，互不争用。
const starterPlan = [
  {
    stepId: 'document',
    order: 1,
    durationMin: 40,
    ownerId: 'han-che',
    roomId: 'photo',
    status: 'idle',
  },
  {
    stepId: 'dusting',
    order: 2,
    durationMin: 50,
    ownerId: 'lu-ning',
    roomId: 'dry',
    status: 'idle',
  },
  {
    stepId: 'patching',
    order: 3,
    durationMin: 90,
    ownerId: 'zhou-tian',
    roomId: 'wet',
    status: 'idle',
  },
  {
    stepId: 'flattening',
    order: 4,
    durationMin: 120,
    ownerId: 'shen-yi',
    roomId: 'press',
    status: 'idle',
  },
]
</script>

<template>
  <div class="flow-board">
    <div class="board-toolbar">
      <div class="toolbar-info">
        <h3>当日工序流程板</h3>
        <p>{{ date }} · 09:00 开工 · 同序视为并行，不同序依次串行</p>
      </div>
      <div class="toolbar-actions">
        <button
          type="button"
          class="toolbar-button"
          :disabled="!hasPlan"
          @click="clearBoard"
        >
          清空重排
        </button>
        <button
          v-if="isDirty"
          type="button"
          class="toolbar-button"
          @click="discardDraft"
        >
          放弃未保存修改
        </button>
        <button
          type="button"
          class="toolbar-button toolbar-button--primary"
          :disabled="saveState === 'saving'"
          @click="openConfirm"
        >
          检查冲突并保存
        </button>
      </div>
    </div>

    <SaveStatusBar
      :state="saveState"
      :error="saveError"
      :last-saved-at="lastSavedAt"
      :pending-interrupted="pendingInterrupted"
      @retry="retry"
      @interrupt="interrupt"
    />

    <div v-if="conflicts.length > 0" class="conflict-banner">
      <p>
        当前有 <strong>{{ conflicts.length }}</strong> 处责任人 /
        修复室争用，保存确认时会给出替代顺序建议。
      </p>
    </div>

    <div v-if="incompleteCount > 0" class="incomplete-banner">
      还有 {{ incompleteCount }} 道工序未编排完整（顺序 / 时长 / 责任人 /
      修复室），未补齐的工序不参与当日排时。
    </div>

    <section v-if="!hasPlan" class="board-empty">
      <div class="empty-illustration" aria-hidden="true">📋</div>
      <h4>今日尚无工序编排</h4>
      <p>
        四步标准工序已按修复目录列出，但顺序、预计时长、责任人与修复室都还没有数据。
        请修复师逐支工序安排；也可以直接载入一套无冲突的起步模板，再按实情调整。
      </p>
      <button
        type="button"
        class="toolbar-button toolbar-button--primary"
        @click="fillTemplate(starterPlan)"
      >
        载入无冲突起步模板
      </button>
    </section>

    <section v-else class="step-list">
      <ProcessStepCard
        v-for="step in restorationProcessSteps"
        :key="step.id"
        :step="step"
        :entry="entries.find((entry) => entry.stepId === step.id)"
        :staff="restorationStaff"
        :rooms="restorationRooms"
        :order-options="orderOptions"
        :conflicts="conflictsFor(step.id)"
        :window="windowFor(step.id)"
        @update="(patch) => updateEntry(step.id, patch)"
        @cancel="cancel(step.id)"
        @restore="restore(step.id)"
        @move="(direction) => move(step.id, direction)"
        @set-status="(status) => setStatus(step.id, status)"
      />
    </section>

    <section v-if="hasPlan" class="timeline-wrap">
      <h4 class="timeline-title">当日时间轴总览</h4>
      <ScheduleTimeline
        :entries="entries"
        :steps="restorationProcessSteps"
        :staff-names="staffNames"
        :room-names="roomNames"
        :start-minutes="workdayStartMinutes"
      />
    </section>

    <details class="network-demo">
      <summary>网络环境演示（用于验证失败与中断重试）</summary>
      <div class="demo-row">
        <button
          type="button"
          class="demo-chip"
          :class="{ 'demo-chip--active': networkMode === 'ok' }"
          @click="changeNetworkMode('ok')"
        >
          网络正常
        </button>
        <button
          type="button"
          class="demo-chip"
          :class="{ 'demo-chip--active': networkMode === 'fail' }"
          @click="changeNetworkMode('fail')"
        >
          保存必然失败
        </button>
        <button
          type="button"
          class="demo-chip"
          :class="{ 'demo-chip--active': networkMode === 'interrupt' }"
          @click="changeNetworkMode('interrupt')"
        >
          保存响应中断
        </button>
      </div>
      <p class="demo-note">
        选择“失败 / 中断”后点击保存即可看到重试入口；保存进行中也可点击“模拟中途中断”。
      </p>
    </details>

    <ConfirmConflictDialog
      :open="dialogOpen"
      :conflicts="conflicts"
      :entries="entries"
      :step-names="stepNames"
      :start-minutes="workdayStartMinutes"
      @apply-suggestions="handleApplySuggestions"
      @save-anyway="handleSaveAnyway"
      @cancel="dialogOpen = false"
    />
  </div>
</template>

<style scoped>
.flow-board {
  display: grid;
  gap: 16px;
}

.board-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  flex-wrap: wrap;
}

.toolbar-info h3 {
  margin: 0;
}

.toolbar-info p {
  margin: 6px 0 0;
  color: #82684b;
  font-size: 0.88rem;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-button {
  font: inherit;
  font-size: 0.86rem;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(79, 57, 32, 0.28);
  background: rgba(255, 255, 255, 0.78);
  color: #5c4a33;
  cursor: pointer;
}

.toolbar-button:hover:not(:disabled) {
  background: #fff;
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-button--primary {
  background: #5d4322;
  color: #fff8eb;
  border-color: #5d4322;
}

.toolbar-button--primary:hover:not(:disabled) {
  background: #6f5230;
}

.conflict-banner {
  background: #f8e7e2;
  border: 1px solid rgba(145, 61, 47, 0.32);
  color: #913d2f;
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 0.88rem;
}

.conflict-banner p {
  margin: 0;
}

.incomplete-banner {
  background: #fff6e3;
  border: 1px solid rgba(139, 99, 20, 0.25);
  color: #8b6314;
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 0.86rem;
}

.board-empty {
  text-align: center;
  border: 1px dashed rgba(121, 88, 47, 0.4);
  border-radius: 20px;
  padding: 36px 24px;
  background: rgba(255, 250, 240, 0.7);
  display: grid;
  justify-items: center;
  gap: 8px;
}

.empty-illustration {
  font-size: 2rem;
}

.board-empty h4 {
  margin: 0;
  font-size: 1.1rem;
}

.board-empty p {
  margin: 0;
  max-width: 520px;
  color: #7e6038;
  font-size: 0.9rem;
}

.step-list {
  display: grid;
  gap: 14px;
}

.timeline-wrap {
  border: 1px solid rgba(79, 57, 32, 0.1);
  border-radius: 20px;
  background: rgba(255, 251, 245, 0.88);
  padding: 20px;
}

.timeline-title {
  margin: 0 0 14px;
  font-size: 1.04rem;
}

.network-demo {
  border: 1px dashed rgba(121, 88, 47, 0.3);
  border-radius: 14px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.55);
  font-size: 0.86rem;
  color: #6a5439;
}

.network-demo summary {
  cursor: pointer;
}

.demo-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.demo-chip {
  font: inherit;
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(121, 88, 47, 0.3);
  background: transparent;
  cursor: pointer;
}

.demo-chip--active {
  background: #5d4322;
  color: #fff8eb;
  border-color: #5d4322;
}

.demo-note {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: #82684b;
}
</style>
