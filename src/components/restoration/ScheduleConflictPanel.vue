<script setup>
import {
  formatClock,
  stepNameOf,
} from '../../utils/restorationSchedule'

defineProps({
  conflicts: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['apply', 'dismiss'])
</script>

<template>
  <section class="conflict-panel" role="alert">
    <header class="conflict-head">
      <div>
        <h4>资源冲突 · 确认前必须处理</h4>
        <p>检测到两支工序争用同一责任人或同一修复室，请采用建议的替代顺序，或返回手动改派。</p>
      </div>
      <button type="button" class="link-btn" @click="emit('dismiss')">稍后手动调整</button>
    </header>

    <ul class="conflict-list">
      <li v-for="conflict in conflicts" :key="conflict.key" class="conflict-item">
        <div class="conflict-copy">
          <p class="conflict-reason">{{ conflict.reason }}</p>
          <p class="conflict-resource">
            争用资源：
            <span v-for="resource in conflict.resources" :key="resource.type" class="resource-tag">
              {{ resource.name }}（{{ resource.type === 'owner' ? '责任人' : '修复室' }}）
            </span>
          </p>
          <p class="conflict-suggestion">
            替代顺序：将「{{ stepNameOf(conflict.suggestionId) }}」顺延至
            {{ formatClock(conflict.suggestionStart) }} 开始，排在冲突工序之后。
          </p>
        </div>
        <button
          type="button"
          class="btn btn--solid"
          @click="emit('apply', conflict)"
        >
          采用此顺序
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.conflict-panel {
  border: 1px solid #d69a8d;
  border-radius: 20px;
  background: #fbeee9;
  padding: 18px;
}

.conflict-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.conflict-head h4 {
  margin: 0;
  color: #913d2f;
}

.conflict-head p {
  margin: 6px 0 0;
  color: #8a5a4c;
  font-size: 0.86rem;
}

.link-btn {
  border: none;
  background: transparent;
  color: #913d2f;
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  white-space: nowrap;
}

.conflict-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.conflict-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(145, 61, 47, 0.18);
}

.conflict-reason {
  margin: 0;
  font-weight: 700;
  color: #7a362a;
  font-size: 0.92rem;
}

.conflict-resource {
  margin: 6px 0 0;
  font-size: 0.84rem;
  color: #8a5a4c;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.resource-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: #efd0c9;
  color: #913d2f;
}

.conflict-suggestion {
  margin: 8px 0 0;
  font-size: 0.86rem;
  color: #5c4a33;
}

.btn {
  font: inherit;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid #913d2f;
  padding: 9px 16px;
  font-size: 0.86rem;
  white-space: nowrap;
}

.btn--solid {
  background: #913d2f;
  color: #fff5ef;
}

@media (max-width: 680px) {
  .conflict-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
