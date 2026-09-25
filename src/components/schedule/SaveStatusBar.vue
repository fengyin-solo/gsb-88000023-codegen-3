<script setup>
const props = defineProps({
  state: {
    type: String,
    required: true,
  },
  error: {
    type: String,
    default: '',
  },
  lastSavedAt: {
    type: String,
    default: null,
  },
  pendingInterrupted: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['retry', 'interrupt'])

function savedTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}
</script>

<template>
  <div :class="['save-bar', `save-bar--${props.state}`]">
    <p class="save-text">
      <template v-if="props.state === 'saving'">
        <span class="save-dot save-dot--spin" aria-hidden="true"></span>
        正在保存当日编排…
      </template>
      <template v-else-if="props.state === 'saved'">
        <span class="save-dot" aria-hidden="true"></span>
        编排已确认保存<template v-if="savedTime(props.lastSavedAt)">
          （{{ savedTime(props.lastSavedAt) }} 更新）</template>
      </template>
      <template v-else-if="props.state === 'failed'">
        <span class="save-dot" aria-hidden="true"></span>
        {{ props.error }}
      </template>
      <template v-else-if="props.state === 'interrupted'">
        <span class="save-dot" aria-hidden="true"></span>
        {{ props.error }}
      </template>
      <template v-else-if="props.pendingInterrupted">
        <span class="save-dot" aria-hidden="true"></span>
        上次保存中途中断，编排仍保留在本地，可继续重试。
      </template>
      <template v-else>
        <span class="save-dot" aria-hidden="true"></span>
        修改会自动暂存在本机，确认保存后同步到工作室看板。
      </template>
    </p>

    <div class="save-actions">
      <button
        v-if="props.state === 'saving'"
        type="button"
        class="save-button save-button--ghost"
        @click="emit('interrupt')"
      >
        模拟中途中断
      </button>
      <button
        v-if="
          props.state === 'failed' ||
          props.state === 'interrupted' ||
          (props.pendingInterrupted && props.state !== 'saving')
        "
        type="button"
        class="save-button save-button--retry"
        @click="emit('retry')"
      >
        重试保存
      </button>
    </div>
  </div>
</template>

<style scoped>
.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(79, 57, 32, 0.12);
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.88rem;
}

.save-bar--saving {
  background: #eef1e4;
  border-color: rgba(94, 105, 58, 0.25);
}

.save-bar--saved {
  background: #e9f1e6;
  border-color: rgba(54, 99, 56, 0.25);
  color: #366338;
}

.save-bar--failed,
.save-bar--interrupted {
  background: #f8e7e2;
  border-color: rgba(145, 61, 47, 0.3);
  color: #913d2f;
}

.save-text {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.save-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

.save-dot--spin {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

.save-actions {
  display: inline-flex;
  gap: 8px;
}

.save-button {
  font: inherit;
  font-size: 0.82rem;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
}

.save-button--retry {
  background: #5d4322;
  color: #fff8eb;
}

.save-button--retry:hover {
  background: #6f5230;
}

.save-button--ghost {
  background: transparent;
  border-color: rgba(79, 57, 32, 0.3);
  color: inherit;
}

.save-button--ghost:hover {
  background: rgba(79, 57, 32, 0.08);
}
</style>
