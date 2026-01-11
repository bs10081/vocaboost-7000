import { useEffect, useRef } from 'react'

export interface KeyboardConfig {
  enabled: boolean
  handlers: {
    [key: string]: () => void
  }
  throttleMs?: number // 節流時間（毫秒），防止高速按鍵導致問題
}

/**
 * 鍵盤事件處理 Hook
 * 監聽全域鍵盤事件並執行對應的 handler
 * 內建節流機制防止高速按鍵導致的狀態競爭
 */
export function useKeyboard(config: KeyboardConfig) {
  const lastKeyTime = useRef<number>(0)
  const throttleMs = config.throttleMs ?? 150 // 預設 150ms 節流

  useEffect(() => {
    if (!config.enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在輸入框中觸發
      const target = e.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return
      }

      // 嘗試用 key 或 code 匹配 handler
      const key = e.key.toLowerCase()
      const code = e.code
      const handler = config.handlers[key] || config.handlers[code]

      if (handler) {
        // 節流檢查：防止高速按鍵導致狀態競爭
        const now = Date.now()
        if (now - lastKeyTime.current < throttleMs) {
          e.preventDefault()
          return // 忽略過快的重複按鍵
        }
        lastKeyTime.current = now

        e.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [config, throttleMs])
}
