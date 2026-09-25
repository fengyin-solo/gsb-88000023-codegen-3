<script setup>
import { computed } from 'vue'

import {
  formatClock,
  formatDuration,
  isScheduled,
  missingFields,
  statusMeta,
} from '../../utils/schedule.js'
import { durationPresets } from '../../data/restorationData.js'

const props = defineProps({
  step: { type: Object, required: true },
  entry: { type: Object, required: true },
  staff: { type: Array, required: true },
  rooms: { type: Array, required: true },
  orderOptions: { type: Array, required: true },
  conflicts: { type: Array, default: () => [] },
  window: {
    type: Object,
    default: null, // { start, end } | null
  },
})

const emit = defineEmits([
  'update',
  'cancel',
  'restore',
  'move',
  'set-status',
  'apply-suggestion',
])

const cancelled = computed(() => props.entry.status === 'cancelled')
const scheduled = computed(() => isScheduled(props.entry))
const missing = computed(() => missingFields(props.entry))
const meta = computed(() => statusMeta(props.entry.status))

function durationInput(event) {
  const value = Number(event.target.value)
  emit('update', { durationMin: value > 0 ? value : null })
}

function setDuration(minutes) {
  emit('update', { durationMin: minutes })
}
</script>

<template>
  <article
    :class="[
      'step-card',
      `step-card--${meta.tone}`,
      {
        'step-card--cancelled': cancelled,
        'step-card--conflict': conflicts.length > 0,
        'step-card--unscheduled': !scheduled && !cancelled,
      },
    ]"
  >
    <header class="card-head">
      <div class="card-title">
        <span v-if="entry.order != null && !cancelled" class="order-badge">
          第 {{ entry.order }} 序
        </span>
        <span v-else class="order-badge order-badge--muted">未排序</span>
        <h4>{{ step.shortName }}</h4>
        <span class="lock-note" title="标准工序内容不可改写">🔒 标准工序</span>
      </div>
      <div class="head-actions">
        <span :class="['status-tag', `status-tag--${meta.tone}`]">
          {{ meta.label }}
        </span>
        <button
          v-if="!cancelled"
          type="button"
          class="text-button text-button--danger"
          @click="emit('cancel')"
        >
          取消工序
        </button>
        <button
          v-else
          type="button"
          class="text-button"
          @click="emit('restore')"
        >
          恢复工序
        </button>
      </div>
    </header>

    <p class="step-detail">{{ step.detail }}</p>

    <template v-if="!cancelled">
      <div class="conflict-alert" v-if="conflicts.length > 0">
        <strong>资源争用：</strong>
        <span v-for="(conflict, index) in conflicts" :key="index">
          与「{{ conflict.otherName }}」同一时段争用{{
            conflict.type === 'owner' ? '同一责任人' : '同一修复室'
          }}「{{ conflict.resourceName }}」
          <template v-if="index < conflicts.length - 1">；</template>
        </span>
      </div>

      <div v-if="!scheduled" class="empty-hint">
        <p>
          这道工序还没有编排数据：<strong v-if="missing.length > 0">
          待补「{{ missing.join('、') }}」</strong>
        </p>
      </div>

      <div class="card-grid">
        <label class="field">
          <span class="field-label">顺序</span>
          <div class="order-control">
            <button
              type="button"
              class="order-arrow"
              aria-label="提前一位"
              @click="emit('move', -1)"
            >
              ↑
            </button>
            <select
              :value="entry.order ?? ''"
              @change="emit('update', { order: Number($event.target.value) })"
            >
              <option value="" disabled>选择</option>
              <option
                v-for="option in orderOptions"
                :key="option"
                :value="option"
              >
                第 {{ option }} 序
              </option>
            </select>
            <button
              type="button"
              class="order-arrow"
              aria-label="延后一位"
              @click="emit('move', 1)"
            >
              ↓
            </button>
          </div>
        </label>

        <label class="field">
          <span class="field-label">预计时长（分钟）</span>
          <input
            type="number"
            min="1"
            step="5"
            :value="entry.durationMin ?? ''"
            placeholder="未设置"
            @input="durationInput"
          />
          <div class="preset-row">
            <button
              v-for="preset in durationPresets"
              :key="preset"
              type="button"
              class="preset-chip"
              :class="{ 'preset-chip--active': entry.durationMin === preset }"
              @click="setDuration(preset)"
            >
              {{ preset >= 60 ? `${preset / 60}小时` : `${preset}分` }}
            </button>
          </div>
        </label>

        <label class="field">
          <span class="field-label">责任人</span>
          <select
            :value="entry.ownerId ?? ''"
            @change="emit('update', { ownerId: $event.target.value || null })"
          >
            <option value="">未安排</option>
            <option v-for="member in staff" :key="member.id" :value="member.id">
              {{ member.name }}
            </option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">修复室</span>
          <select
            :value="entry.roomId ?? ''"
            @change="emit('update', { roomId: $event.target.value || null })"
          >
            <option value="">未安排</option>
            <option v-for="room in rooms" :key="room.id" :value="room.id">
              {{ room.name }}
            </option>
          </select>
        </label>
      </div>

      <footer class="card-foot">
        <label class="status-field">
          <span class="field-label">执行状态</span>
          <select
            :value="entry.status"
            @change="emit('set-status', $event.target.value)"
          >
            <option value="idle">待开始</option>
            <option value="active">进行中</option>
            <option value="done">已完成</option>
          </select>
        </label>
        <span class="time-window">
          <template v-if="window && scheduled">
            {{ formatClock(window.start) }} – {{ formatClock(window.end) }}
            · 工时 {{ formatDuration(entry.durationMin) }}
          </template>
          <template v-else>
            补齐顺序与时长后显示当日时段
          </template>
        </span>
      </footer>
    </template>

    <div v-else class="cancelled-note">
      此工序已取消，后续工序已自动顺延；恢复后排到当日最后一位。
    </div>
  </article>
</template>

<style scoped>
.step-card {
  padding: 18px;
  border-radius: 18px;
  background: #fbf5ea;
  border: 1px solid rgba(121, 88, 47, 0.14);
  display: grid;
  gap: 12px;
}

.step-card--conflict {
  border-color: rgba(145, 61, 47, 0.55);
  box-shadow: 0 0 0 2px rgba(145, 61, 47, 0.12);
}

.step-card--unscheduled {
  border-style: dashed;
}

.step-card--cancelled {
  opacity: 0.62;
  background: #f1ece2;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.card-title h4 {
  margin: 0;
  font-size: 1.06rem;
}

.order-badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: #5d4322;
  color: #fff8eb;
  font-size: 0.76rem;
  white-space: nowrap;
}

.order-badge--muted {
  background: #d9cfbc;
  color: #6a5439;
}

.lock-note {
  font-size: 0.72rem;
  color: #82684b;
  border: 1px dashed rgba(121, 88, 47, 0.3);
  border-radius: 999px;
  padding: 2px 8px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-tag {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
}

.status-tag--idle {
  background: #ece4d3;
  color: #6a5439;
}

.status-tag--active {
  background: #e6e6d2;
  color: #5f6623;
}

.status-tag--done {
  background: #d9ead9;
  color: #366338;
}

.status-tag--cancelled {
  background: #e4d8d5;
  color: #7a5a52;
}

.text-button {
  font: inherit;
  font-size: 0.8rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #5d4322;
  text-decoration: underline;
  padding: 2px;
}

.text-button--danger {
  color: #913d2f;
}

.step-detail {
  margin: 0;
  color: #5c4a33;
  font-size: 0.94rem;
}

.conflict-alert {
  background: #f8e7e2;
  border: 1px solid rgba(145, 61, 47, 0.3);
  color: #913d2f;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.85rem;
}

.empty-hint {
  background: #fffaf0;
  border: 1px dashed rgba(121, 88, 47, 0.35);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.85rem;
  color: #7e6038;
}

.empty-hint p {
  margin: 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field-label {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #82684b;
}

select,
input {
  font: inherit;
  width: 100%;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid rgba(121, 88, 47, 0.22);
  background: rgba(255, 255, 255, 0.85);
  color: #2d2418;
}

.order-control {
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.order-control select {
  min-width: 0;
}

.order-arrow {
  font: inherit;
  width: 34px;
  border-radius: 10px;
  border: 1px solid rgba(121, 88, 47, 0.22);
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}

.preset-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-chip {
  font: inherit;
  font-size: 0.74rem;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(121, 88, 47, 0.25);
  background: transparent;
  color: #6a5439;
  cursor: pointer;
}

.preset-chip--active {
  background: #5d4322;
  color: #fff8eb;
  border-color: #5d4322;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
}

.status-field {
  display: grid;
  gap: 6px;
  min-width: 130px;
}

.time-window {
  font-size: 0.85rem;
  color: #6a5439;
}

.cancelled-note {
  font-size: 0.85rem;
  color: #7a5a52;
  background: rgba(121, 88, 47, 0.07);
  border-radius: 10px;
  padding: 10px 12px;
}

@media (max-width: 1080px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
