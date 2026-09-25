/**
 * 当日工序编排的模拟服务端接口。
 * - setSaveMode('ok' | 'fail' | 'interrupt') 切换网络环境，用于演示保存失败重试；
 * - 保存进行中可调用 interruptActiveSave() 模拟中途中断（断网 / 关闭页面）。
 * 真实项目中替换为 fetch 调用即可，调用方逻辑不变。
 */

let saveMode = 'ok'
let activeAbort = null

export function setSaveMode(mode) {
  if (['ok', 'fail', 'interrupt'].includes(mode)) saveMode = mode
}

export function getSaveMode() {
  return saveMode
}

export function saveScheduleToServer(payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      activeAbort = null
      if (saveMode === 'fail') {
        reject(new Error('SAVE_FAILED'))
        return
      }
      if (saveMode === 'interrupt') {
        reject(new Error('SAVE_INTERRUPTED'))
        return
      }
      resolve({
        ok: true,
        savedAt: new Date().toISOString(),
        receivedEntries: payload.entries.length,
      })
    }, 1200)

    activeAbort = () => {
      clearTimeout(timer)
      activeAbort = null
      reject(new Error('SAVE_INTERRUPTED'))
    }
  })
}

export function interruptActiveSave() {
  if (activeAbort) activeAbort()
}
