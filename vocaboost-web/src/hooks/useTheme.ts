import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

/**
 * 深色模式管理 Hook
 * 支援系統偵測和手動切換
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // 從 localStorage 讀取用戶偏好，預設使用系統設定
    const stored = localStorage.getItem('theme') as Theme | null
    return stored || 'system'
  })

  useEffect(() => {
    const root = window.document.documentElement

    // 移除所有主題類別
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      // 使用系統偏好
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      // 使用用戶選擇的主題
      root.classList.add(theme)
    }

    // 儲存到 localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  // 監聽系統主題變更
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(mediaQuery.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return { theme, setTheme }
}
