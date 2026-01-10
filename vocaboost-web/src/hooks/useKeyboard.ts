import { useEffect } from 'react'

export interface KeyboardConfig {
  enabled: boolean
  handlers: {
    [key: string]: () => void
  }
}

/**
 * 鍵盤事件處理 Hook
 * 監聽全域鍵盤事件並執行對應的 handler
 */
export function useKeyboard(config: KeyboardConfig) {
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
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [config])
}
