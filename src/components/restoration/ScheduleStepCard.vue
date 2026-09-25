<script setup>
import { computed, ref } from 'vue'

import {
  restorationOwners,
  restorationRooms,
} from '../../data/restorationData'
import { scheduleStatusMeta } from '../../utils/restorationFormatters'
import {
  DURATION_OPTIONS,
  endOf,
  formatClock,
  formatDuration,
  formatRange,
  isConfigured,
  missingFields,
  roomNameOf,
  sequenceOf,
  stepContentOf,
  stepNameOf,
  timeSlotOptions,
} from '../../utils/restorationSchedule'

const props = defineProps({
  entry: {
    type: Object,
    required: true,
  },
  entries: {
    type: Array,
    required: true,
  },
  canMoveUp: {
    type: Boolean,
    default: false,
  },
  canMoveDown: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'patch',
  'move',
  'cancel',
  'status',
  'expand',
])

const configured = computed(() => isConfigured(props.entry))
const sequence = computed(() =>
  configured.value ? sequenceOf(props.entry, props.entries) : null,
)
const missing = computed(() => missingFields(props.entry))
const statusMeta = computed(() => scheduleStatusMeta(props.entry.status))
const endTime = computed(() => endOf(props.entry))
const editing = ref(false)

const startOptions = timeSlotOptions()

function openEditor() {
  editing.value = true
  emit('expand', props.entry.id)
}

function closeEditor() {
  editing.value = false
}

function patchField(field, value) {
  emit('patch', props.entry.id, { [field]: value })
}

function patchNumber(field, rawValue) {
  emit('patch', props.entry.id, {
    [field]: rawValue === '' ? null : Number(rawValue),
  })
}
</script>

<template>
  <article :class="['step-card', { 'step-card--blank': !configured }]">
    <!-- 空态：某道工序尚无编排数据时给出明确提示 -->
    <div v-if="!configured" class="step-body">
      <div class="step-id">
        <span class="step-index">{{ stepNameOf(entry.id) }}</span>
        <span class="step-tag">标准工序 · 未编排</span>
      </div>
      <p class="step-content">{{ stepContentOf(entry.id) }}</p>

      <div v-if="!editing" class="empty-block">
        <div class="empty-copy">
          <strong>暂无当日编排数据</strong>
          <p>还缺：{{ missing.join('、') || '信息不完整' }}</p>
        </div>
        <button type="button" class="btn btn--ghost" @click="openEditor">
          安排本道工序
        </button>
      </div>

      <div v-else class="schedule-form">
        <div class="form-grid">
          <label class="field">
            <span>开始时间</span>
            <select
              :value="entry.start"
              @change="patchNumber('start', $event.target.value)"
            >
              <option :value="null">请选择开始时间</option>
              <option v-for="option in startOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>预计时长</span>
            <select
              :value="entry.duration"
              @change="patchNumber('duration', $event.target.value)"
            >
              <option :value="null">请选择预计时长</option>
              <option
                v-for="option in DURATION_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>责任人</span>
            <select
              :value="entry.owner"
              @change="patchField('owner', $event.target.value || null)"
            >
              <option value="">请选择责任人</option>
              <option v-for="owner in restorationOwners" :key="owner.name" :value="owner.name">
                {{ owner.name }}（{{ owner.title }}）
              </option>
            </select>
          </label>
          <label class="field">
            <span>修复室</span>
            <select
              :value="entry.room"
              @change="patchField('room', $event.target.value || null)"
            >
              <option value="">请选择修复室</option>
              <option v-for="room in restorationRooms" :key="room.id" :value="room.id">
                {{ room.name }}（{{ room.note }}）
              </option>
            </select>
          </label>
        </div>
        <p class="form-hint">待补齐：{{ missing.join('、') || '已排完，可收起' }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" @click="closeEditor">
            {{ configured ? '收起' : '暂不安排，返回空态' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 已编排态：顺序、时段、时长、责任人、修复室、状态 -->
    <div v-else class="step-body">
      <header class="step-head">
        <div class="step-id">
          <span class="order-badge">第 {{ sequence }} 道</span>
          <span class="step-index">{{ stepNameOf(entry.id) }}</span>
          <span :class="['status-chip', `status-chip--${statusMeta.tone}`]">
            {{ statusMeta.label }}
          </span>
        </div>
        <div class="order-controls">
          <button
            type="button"
            class="icon-btn"
            :disabled="!canMoveUp"
            title="前移一道（与上一道交换开始时段）"
            @click="emit('move', entry.id, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            class="icon-btn"
            :disabled="!canMoveDown"
            title="后移一道（与下一道交换开始时段）"
            @click="emit('move', entry.id, 1)"
          >
            ↓
          </button>
        </div>
      </header>

      <p class="step-content">{{ stepContentOf(entry.id) }}</p>

      <div class="assignment">
        <div class="assignment-item">
          <span class="assignment-label">时段</span>
          <strong>{{ formatRange(entry) }}</strong>
        </div>
        <div class="assignment-item">
          <span class="assignment-label">预计时长</span>
          <strong>{{ formatDuration(entry.duration) }}</strong>
        </div>
        <div class="assignment-item">
          <span class="assignment-label">责任人</span>
          <strong>{{ entry.owner }}</strong>
        </div>
        <div class="assignment-item">
          <span class="assignment-label">修复室</span>
          <strong>{{ roomNameOf(entry.room) }}</strong>
        </div>
      </div>

      <div v-if="endTime !== null" class="timeline-row">
        <span class="timeline-time">{{ formatClock(entry.start) }}</span>
        <div class="timeline-track">
          <div
            :class="['timeline-fill', `timeline-fill--${entry.status}`]"
            :style="{
              width:
                Math.max(8, (entry.duration / (11 * 60)) * 100) + '%',
              marginLeft:
                ((entry.start - 8 * 60) / (11 * 60)) * 100 + '%',
            }"
          ></div>
        </div>
        <span class="timeline-time">{{ formatClock(endTime) }}</span>
      </div>

      <div v-if="editing" class="schedule-form">
        <div class="form-grid">
          <label class="field">
            <span>开始时间</span>
            <select
              :value="entry.start"
              @change="patchNumber('start', $event.target.value)"
            >
              <option v-for="option in startOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>预计时长</span>
            <select
              :value="entry.duration"
              @change="patchNumber('duration', $event.target.value)"
            >
              <option
                v-for="option in DURATION_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>责任人</span>
            <select
              :value="entry.owner"
              @change="patchField('owner', $event.target.value || null)"
            >
              <option v-for="owner in restorationOwners" :key="owner.name" :value="owner.name">
                {{ owner.name }}（{{ owner.title }}）
              </option>
            </select>
          </label>
          <label class="field">
            <span>修复室</span>
            <select
              :value="entry.room"
              @change="patchField('room', $event.target.value || null)"
            >
              <option v-for="room in restorationRooms" :key="room.id" :value="room.id">
                {{ room.name }}（{{ room.note }}）
              </option>
            </select>
          </label>
        </div>
      </div>

      <footer class="step-foot">
        <div class="status-actions">
          <button
            type="button"
            :class="['chip-btn', { 'chip-btn--on': entry.status === 'pending' }]"
            @click="emit('status', entry.id, 'pending')"
          >
            待开始
          </button>
          <button
            type="button"
            :class="['chip-btn', { 'chip-btn--on': entry.status === 'progress' }]"
            @click="emit('status', entry.id, 'progress')"
          >
            进行中
          </button>
          <button
            type="button"
            :class="['chip-btn', { 'chip-btn--on': entry.status === 'done' }]"
            @click="emit('status', entry.id, 'done')"
          >
            已完成
          </button>
        </div>
        <div class="foot-actions">
          <button type="button" class="btn btn--text" @click="editing = !editing">
            {{ editing ? '收起编辑' : '修改安排' }}
          </button>
          <button
            type="button"
            class="btn btn--danger-text"
            title="取消后后续安排自动顺延"
            @click="emit('cancel', entry.id)"
          >
            取消本道
          </button>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.step-card {
  border: 1px solid rgba(79, 57, 32, 0.12);
  border-radius: 20px;
  background: rgba(255, 252, 246, 0.92);
  padding: 18px;
}

.step-card--blank {
  border-style: dashed;
  background: rgba(250, 244, 232, 0.72);
}

.step-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.step-id {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #5d4322;
  color: #fff8eb;
  font-size: 0.78rem;
}

.step-index {
  font-weight: 700;
  font-size: 1.04rem;
}

.step-tag {
  font-size: 0.76rem;
  color: #8b7150;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.step-content {
  margin: 12px 0 0;
  color: #5c4a33;
  font-size: 0.92rem;
}

.empty-block {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(160, 120, 74, 0.08);
}

.empty-copy strong {
  display: block;
  color: #7e6038;
}

.empty-copy p {
  margin: 4px 0 0;
  font-size: 0.84rem;
  color: #8b7150;
}

.assignment {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.assignment-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(239, 226, 202, 0.55);
}

.assignment-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b7150;
}

.assignment-item strong {
  display: block;
  margin-top: 4px;
  font-size: 0.95rem;
}

.status-chip {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
}

.status-chip--idle {
  background: #e7e0d1;
  color: #6f5d40;
}

.status-chip--active {
  background: #f6e5b9;
  color: #8b6314;
}

.status-chip--done {
  background: #d9ead9;
  color: #366338;
}

.timeline-row {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.timeline-time {
  font-size: 0.74rem;
  color: #8b7150;
  text-align: center;
}

.timeline-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: rgba(160, 120, 74, 0.14);
  overflow: hidden;
}

.timeline-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  min-width: 8px;
}

.timeline-fill--pending {
  background: #b29874;
}

.timeline-fill--progress {
  background: #c8922f;
}

.timeline-fill--done {
  background: #5f8b5f;
}

.schedule-form {
  margin-top: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 0.8rem;
  color: #6a5439;
}

.field select {
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid rgba(79, 57, 32, 0.18);
  background: #fffdf7;
  color: #2d2418;
  font: inherit;
  font-size: 0.86rem;
}

.form-hint {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: #8b7150;
}

.form-actions {
  margin-top: 10px;
}

.step-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.status-actions,
.foot-actions,
.order-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.chip-btn,
.btn,
.icon-btn {
  font: inherit;
  cursor: pointer;
  border-radius: 999px;
  transition: background 0.15s ease;
}

.chip-btn {
  border: 1px solid rgba(79, 57, 32, 0.16);
  background: transparent;
  color: #6a5439;
  padding: 6px 12px;
  font-size: 0.8rem;
}

.chip-btn--on {
  background: #efe2ca;
  border-color: #c9b18b;
  color: #4d381d;
}

.btn {
  border: 1px solid rgba(79, 57, 32, 0.2);
  padding: 8px 14px;
  font-size: 0.84rem;
}

.btn--ghost {
  background: #fffaf0;
  color: #5d4322;
}

.btn--text,
.btn--danger-text {
  border-color: transparent;
  background: transparent;
  padding: 6px 8px;
}

.btn--text {
  color: #5d4322;
}

.btn--danger-text {
  color: #913d2f;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(79, 57, 32, 0.16);
  background: #fffaf0;
  color: #5d4322;
  font-size: 0.9rem;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .assignment,
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .assignment,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .empty-block {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
