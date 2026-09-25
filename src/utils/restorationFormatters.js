export function scheduleStatusMeta(status) {
  const map = {
    pending: { label: '待开始', tone: 'idle' },
    progress: { label: '进行中', tone: 'active' },
    done: { label: '已完成', tone: 'done' },
  }

  return map[status] ?? map.pending
}

export function riskMeta(risk) {
  const map = {
    high: {
      label: '高',
      tone: 'high',
    },
    medium: {
      label: '中',
      tone: 'medium',
    },
    low: {
      label: '低',
      tone: 'low',
    },
  }

  return map[risk] ?? map.low
}
