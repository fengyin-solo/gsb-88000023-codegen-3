<script setup>
import { computed } from 'vue'

import {
  computeTimeline,
  formatClock,
  formatDuration,
  isScheduled,
} from '../../utils/schedule.js'

const props = defineProps({
  entries: { type: Array, required: true },
  steps: { type: Array, required: true },
  staffNames: { type: Object, required: true },
  roomNames: { type: Object, required: true },
  startMinutes: { type: Number, required: true },
})

const groups = computed(() => computeTimeline(props.entries, props.startMinutes))
const totalMinutes = computed(() => {
  const last = groups.value[groups.value.length - 1]
  return last ? last.window.end - props.startMinutes : 0
})

function stepName(stepId) {
  return props.steps.find((step) => step.id === stepId)?.shortName ?? stepId
}
</script>

<template>
  <div v-if="groups.length === 0 || totalMinutes === 0" class="timeline-empty">
    <p>还没有可排时的工序：为工序补齐顺序、时长、责任人与修复室后，这里会显示当日时间轴。</p>
  </div>

  <ol v-else class="timeline">
    <li v-for="group in groups" :key="group.order" class="timeline-group">
      <div class="group-time">
        <strong>{{ formatClock(group.window.start) }}</strong>
        <span>{{ formatClock(group.window.end) }}</span>
      </div>
      <div class="group-body">
        <span class="parallel-tag">
          第 {{ group.order }} 序 ·
          {{ group.entries.filter(isScheduled).length > 1
            ? `并行 × ${group.entries.filter(isScheduled).length}`
            : '串行单支' }}
        </span>
        <ul>
          <li
            v-for="entry in group.entries"
            :key="entry.stepId"
            :class="{ 'is-unscheduled': !isScheduled(entry) }"
          >
            {{ stepName(entry.stepId) }}
            <template v-if="isScheduled(entry)">
              · {{ staffNames[entry.ownerId] ?? '未分配' }}
              · {{ roomNames[entry.roomId] ?? '未分配' }}
              · {{ formatDuration(entry.durationMin) }}
            </template>
            <template v-else>· 资料不全，暂不排时</template>
          </li>
        </ul>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.timeline-empty {
  border: 1px dashed rgba(121, 88, 47, 0.35);
  border-radius: 14px;
  padding: 16px;
  color: #7e6038;
  font-size: 0.88rem;
  background: #fffaf0;
}

.timeline-empty p {
  margin: 0;
}

.timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0;
}

.timeline-group {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 14px;
  padding: 14px 0;
}

.timeline-group + .timeline-group {
  border-top: 1px solid rgba(79, 57, 32, 0.1);
}

.group-time {
  display: grid;
  gap: 2px;
  align-content: start;
  color: #5d4322;
}

.group-time span {
  font-size: 0.8rem;
  color: #82684b;
}

.group-body ul {
  margin: 8px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  color: #5c4a33;
  font-size: 0.9rem;
}

.is-unscheduled {
  color: #9c8a70;
}

.parallel-tag {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7e6038;
  background: #efe2ca;
  border-radius: 999px;
  padding: 4px 10px;
}
</style>
