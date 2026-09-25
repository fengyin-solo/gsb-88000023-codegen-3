// 模拟服务端保存：弱网环境下随机失败，允许调用方反复重试。
// 首次提交失败概率更高；重试仍可能失败，直到成功落库。
const FIRST_ATTEMPT_FAIL_RATE = 0.55
const RETRY_FAIL_RATE = 0.35
const MIN_LATENCY = 320
const MAX_LATENCY = 900

function delay() {
  const ms = MIN_LATENCY + Math.random() * (MAX_LATENCY - MIN_LATENCY)
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function submitSchedule(payload, attempt = 1) {
  return delay().then(() => {
    const failed =
      Math.random() < (attempt <= 1 ? FIRST_ATTEMPT_FAIL_RATE : RETRY_FAIL_RATE)
    if (failed) {
      const messages = [
        '服务端繁忙，保存未送达。',
        '网络连接中断，保存未完成。',
        '响应超时，请重试。',
      ]
      const error = new Error(messages[Math.floor(Math.random() * messages.length)])
      error.code = 'SAVE_FAILED'
      throw error
    }

    return {
      savedAt: new Date().toISOString(),
      revision: payload.revision,
    }
  })
}
