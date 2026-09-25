<script setup>
import { computed } from 'vue'

import {
  applySuggestions,
  formatClock,
} from '../../utils/schedule.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  conflicts: { type: Array, default: () => [] },
  entries: { type: Array, required: true },
  stepNames: { type: Object, required: true },
  startMinutes: { type: Number, required: true },
})

const emit = defineEmits(['apply-suggestions', 'save-anyway', 'cancel'])

const hasConflict = computed(() => props.conflicts.length > 0)

function acceptSuggestions() {
  emit('apply-suggestions', applySuggestions(props.entries, props.conflicts))
}
</script>

<template>
  <div v-if="props.open" class="dialog-backdrop" @click.self="emit('cancel')">
    <div class="dialog" role="dialog" aria-modal="true" aria-label="保存前确认">
      <header class="dialog-head">
        <h3>保存前确认</h3>
      </header>

      <div v-if="!hasConflict" class="dialog-body">
        <p class="dialog-lead">未发现责任人或修复室争用，可以确认保存。</p>
        <ul class="plain-list">
          <li v-for="entry in props.entries" :key="entry.stepId">
            第 {{ entry.order ?? '—' }} 序 ·
            {{ props.stepNames[entry.stepId] ?? entry.stepId }}
          </li>
        </ul>
      </div>

      <div v-else class="dialog-body">
        <p class="dialog-lead dialog-lead--warn">
          发现 {{ props.conflicts.length }} 处同一时段的资源争用，请先处理再确认：
        </p>
        <ul class="conflict-list">
          <li v-for="(conflict, index) in props.conflicts" :key="index">
            <p>
              <strong>{{ props.stepNames[conflict.a.stepId] }}</strong>
              与
              <strong>{{ props.stepNames[conflict.b.stepId] }}</strong>
              在第 {{ conflict.groupOrder }} 序并行时段
              （{{ formatClock(conflict.window.start) }} –
              {{ formatClock(conflict.window.end) }}）
              争用{{ conflict.type === 'owner' ? '同一责任人' : '同一修复室' }}
              「{{ conflict.resourceName }}」
            </p>
            <p class="suggestion">
              建议替代顺序：将两支工序从同一并行时段拆开——
              「{{ props.stepNames[conflict.a.stepId] }}」与
              「{{ props.stepNames[conflict.b.stepId] }}」改为先后串行，
              排在前面的保持原位，另一支顺延至本组之后，后续工序依次顺延。
            </p>
          </li>
        </ul>
        <p class="dialog-note">
          采用建议后系统会重排顺序；如确需并行，请明确选择「仍按当前编排保存」。
        </p>
      </div>

      <footer class="dialog-foot">
        <button type="button" class="button button--ghost" @click="emit('cancel')">
          返回修改
        </button>
        <button
          v-if="hasConflict"
          type="button"
          class="button button--ghost-danger"
          @click="emit('save-anyway')"
        >
          仍按当前编排保存
        </button>
        <button
          v-if="hasConflict"
          type="button"
          class="button button--primary"
          @click="acceptSuggestions"
        >
          采用替代顺序
        </button>
        <button
          v-else
          type="button"
          class="button button--primary"
          @click="emit('save-anyway')"
        >
          确认保存
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(45, 36, 24, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 50;
}

.dialog {
  width: min(640px, 100%);
  max-height: 86vh;
  overflow-y: auto;
  background: #fdf8ee;
  border-radius: 22px;
  padding: 24px;
  box-shadow: 0 28px 70px rgba(45, 30, 12, 0.35);
}

.dialog-head h3 {
  margin: 0;
}

.dialog-body {
  margin-top: 14px;
  color: #5c4a33;
}

.dialog-lead {
  margin: 0 0 12px;
}

.dialog-lead--warn {
  color: #913d2f;
}

.plain-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.conflict-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.conflict-list li {
  background: #f8e7e2;
  border: 1px solid rgba(145, 61, 47, 0.25);
  border-radius: 14px;
  padding: 12px 14px;
}

.conflict-list p {
  margin: 0;
}

.suggestion {
  margin-top: 8px !important;
  color: #7e6038;
  font-size: 0.88rem;
}

.dialog-note {
  margin: 12px 0 0;
  font-size: 0.84rem;
  color: #82684b;
}

.dialog-foot {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.button {
  font: inherit;
  font-size: 0.9rem;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
}

.button--primary {
  background: #5d4322;
  color: #fff8eb;
}

.button--primary:hover {
  background: #6f5230;
}

.button--ghost {
  background: transparent;
  border-color: rgba(79, 57, 32, 0.3);
  color: #5c4a33;
}

.button--ghost-danger {
  background: transparent;
  border-color: rgba(145, 61, 47, 0.45);
  color: #913d2f;
}
</style>
