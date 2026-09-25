<script setup>
import { computed } from 'vue'

import {
  computeOverview,
  formatDuration,
  statusMeta,
} from '../../utils/schedule.js'
import { useDailySchedule } from '../../composables/useDailySchedule.js'
import { restorationProcessSteps } from '../../data/restorationData.js'

const { entries, hasPlan, setStatus } = useDailySchedule()

const overview = computed(() => computeOverview(entries))

function entryFor(stepId) {
  return entries.find((item) => item.stepId === stepId)
}
</script>

<template>
  <div v-if="!hasPlan" class="overview-empty">
    <p>今日尚无工序编排数据。</p>
    <small>请到「任务清单」的当日工序流程板安排顺序、时长、责任人与修复室。</small>
  </div>

  <div v-else class="overview-board">
    <div class="progress-head">
      <strong>{{ overview.percent }}%</strong>
      <span>
        已完成 {{ overview.doneCount }} / {{ overview.scheduledCount }}
        支已编排工序
        <template v-if="overview.runningCount > 0">
          · {{ overview.runningCount }} 支进行中
        </template>
      </span>
    </div>
    <div class="progress-track" aria-hidden="true">
      <div class="progress-fill" :style="{ width: `${overview.percent}%` }"></div>
    </div>

    <ul class="overview-steps">
      <li
        v-for="step in restorationProcessSteps"
        :key="step.id"
        :class="`tone-${statusMeta(entryFor(step.id)?.status).tone}`"
      >
        <label class="overview-step">
          <select
            v-if="entryFor(step.id)?.status !== 'cancelled'"
            :value="entryFor(step.id)?.status"
            @change="setStatus(step.id, $event.target.value)"
          >
            <option value="idle">待开始</option>
            <option value="active">进行中</option>
            <option value="done">已完成</option>
          </select>
          <span v-else class="cancelled-readonly">已取消</span>
          <span class="overview-name">{{ step.shortName }}</span>
        </label>
        <small v-if="entryFor(step.id)?.durationMin > 0">
          {{ formatDuration(entryFor(step.id).durationMin) }}
        </small>
        <small v-else>未安排</small>
      </li>
    </ul>

    <p class="overview-foot">
      当日已排工时合计
      <strong>{{ formatDuration(overview.totalMinutes) }}</strong>
      <template v-if="overview.unscheduledCount > 0">
        · {{ overview.unscheduledCount }} 支尚未编排完整
      </template>
    </p>
  </div>
</template>

<style scoped>
.overview-empty {
  border: 1px dashed rgba(121, 88, 47, 0.35);
  border-radius: 14px;
  padding: 18px;
  text-align: center;
  color: #7e6038;
  background: #fffaf0;
}

.overview-empty p {
  margin: 0 0 6px;
}

.overview-empty small {
  color: #9c8a70;
}

.progress-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.progress-head strong {
  font-size: 2rem;
  color: #5d4322;
}

.progress-head span {
  font-size: 0.86rem;
  color: #6a5439;
}

.progress-track {
  margin-top: 12px;
  height: 10px;
  border-radius: 999px;
  background: #e6dcc8;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a6a3f, #5d4322);
  transition: width 0.25s ease;
}

.overview-steps {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.overview-steps li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px 8px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-left: 4px solid #cbbfa8;
}

.overview-steps .tone-active {
  border-left-color: #8b8f3e;
}

.overview-steps .tone-done {
  border-left-color: #366338;
}

.overview-steps .tone-cancelled {
  border-left-color: #a88a80;
  opacity: 0.65;
}

.overview-step {
  display: flex;
  align-items: center;
  gap: 10px;
}

.overview-step select {
  font: inherit;
  font-size: 0.78rem;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(121, 88, 47, 0.22);
  background: rgba(255, 255, 255, 0.9);
}

.overview-name {
  color: #3c2f1d;
  font-size: 0.92rem;
}

.cancelled-readonly {
  font-size: 0.78rem;
  color: #7a5a52;
  background: #e4d8d5;
  border-radius: 8px;
  padding: 4px 8px;
}

.overview-steps small {
  color: #82684b;
}

.overview-foot {
  margin: 14px 0 0;
  font-size: 0.85rem;
  color: #6a5439;
}
</style>
