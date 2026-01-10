import { useEffect, RefObject } from 'react'

export interface SwipeConfig {
  onSwipeLeft?: () => void // 不會
  onSwipeRight?: () => void // 會
  onSwipeUp?: () => void // 上一題
  onTap?: () => void // 翻面
  threshold?: number // 觸發閾值 (預設 50px)
}

/**
 * 觸控手勢處理 Hook
 * 支援左滑、右滑、上滑和點擊
 */
export function useSwipe(
  ref: RefObject<HTMLElement>,
  config: SwipeConfig
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    let startX = 0
    let startY = 0
    let startTime = 0

    const threshold = config.threshold ?? 50

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startTime = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const deltaX = endX - startX
      const deltaY = endY - startY
      const deltaTime = Date.now() - startTime

      // 判斷手勢類型
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑動
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            config.onSwipeRight?.()
          } else {
            config.onSwipeLeft?.()
          }
        }
      } else {
        // 垂直滑動
        if (Math.abs(deltaY) > threshold) {
          if (deltaY < 0) {
            // 上滑
            config.onSwipeUp?.()
          }
        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
          // 點擊（移動距離小且時間短）
          config.onTap?.()
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, config])
}
