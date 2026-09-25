<script setup>
import { computed } from 'vue'

const props = defineProps({
  saveState: {
    type: String,
    required: true,
  },
  saveError: {
    type: String,
    default: '',
  },
  attempt: {
    type: Number,
    default: 0,
  },
  interrupted: {
    type: Boolean,
    default: false,
  },
  lastSavedAt: {
    type: String,
    default: '',
  },
  dirty: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['retry'])

const savedLabel = computed(() => {
  if (!props.lastSavedAt) return ''
  const date = new Date(props.lastSavedAt)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
})
</script>

<template>
  <div :class="['save-bar', `save-bar--${saveState}`]">
    <template v-if="saveState === 'idle'">
      <span class="save-copy">
        {{ dirty ? '编排有未确认修改，草稿已自动保存在本机。' : '四步标准工序内容固定不可改写，只编排顺序、时长、责任人与修复室。' }}
      </span>
    </template>

    <template v-else-if="saveState === 'saving'">
      <span class="spinner" aria-hidden="true"></span>
      <span class="save-copy">正在保存当日编排，请勿离开……</span>
    </template>

    <template v-else-if="saveState === 'failed'">
      <div class="save-copy">
        <strong>{{ interrupted ? '上次保存中途中断' : '保存失败' }}：</strong>
        <span>{{ saveError || '服务暂不可用' }}</span>
        <span class="save-sub">编排已留在本机，可立即重试，不会丢失。</span>
      </div>
      <button
        type="button"
        class="retry-btn"
        @click="$emit('retry')"
      >
        重试保存{{ attempt > 1 ? `（第 ${attempt} 次）` : '' }}
      </button>
    </template>

    <template v-else-if="saveState === 'saved'">
      <span class="save-copy">
        <strong>保存成功。</strong>
        当日编排已确认{{ savedLabel ? `，最后保存于 ${savedLabel}` : '' }}。
      </span>
    </template>
  </div>
</template>

<style scoped>
.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 16px;
  border: 1px solid transparent;
  font-size: 0.88rem;
}

.save-bar--idle {
  background: rgba(239, 226, 202, 0.5);
  color: #6a5439;
  border-color: rgba(79, 57, 32, 0.1);
}

.save-bar--saving {
  background: #fdf3df;
  color: #8b6314;
  border-color: #e3c886;
}

.save-bar--failed {
  background: #fbeee9;
  color: #7a362a;
  border-color: #d69a8d;
}

.save-bar--saved {
  background: #edf5ed;
  color: #366338;
  border-color: #a9caa9;
}

.save-copy {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.save-sub {
  display: block;
  width: 100%;
  font-size: 0.8rem;
  color: #8a5a4c;
}

.retry-btn {
  font: inherit;
  cursor: pointer;
  border-radius: 999px;
  padding: 9px 18px;
  background: #913d2f;
  color: #fff5ef;
  border: 1px solid #913d2f;
  white-space: nowrap;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(139, 99, 20, 0.25);
  border-top-color: #8b6314;
  animation: spin 0.8s linear infinite;
  flex: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 680px) {
  .save-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
