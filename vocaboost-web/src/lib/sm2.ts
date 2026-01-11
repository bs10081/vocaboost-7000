/**
 * SM-2 二元評分演算法
 * 基於 Python 版本的 src/srs_algorithm.py 移植
 */

const INITIAL_INTERVALS = [1, 3, 7] // 前三次學習的固定間隔
const MIN_EASE_FACTOR = 1.3
const MAX_EASE_FACTOR = 3.0
const INITIAL_EASE_FACTOR = 2.5

export interface SM2Result {
  ease_factor: number
  interval_days: number
  next_review: string // YYYY-MM-DD
}

/**
 * 計算二元評分（會/不會）的 SM-2 結果
 * @param know - true: 會, false: 不會
 * @param currentEaseFactor - 當前難度因子
 * @param currentIntervalDays - 當前間隔天數
 * @param reviewCount - 複習次數
 * @returns SM-2 結果
 */
export function calculateBinary(
  know: boolean,
  currentEaseFactor: number = INITIAL_EASE_FACTOR,
  currentIntervalDays: number = 0,
  reviewCount: number = 0
): SM2Result {
  let newEaseFactor: number
  let intervalDays: number

  if (know) {
    // 「會」：難度因子小幅上升
    newEaseFactor = Math.min(currentEaseFactor + 0.1, MAX_EASE_FACTOR)

    // 前三次使用固定間隔
    if (reviewCount < 3) {
      intervalDays = INITIAL_INTERVALS[reviewCount]
    } else {
      intervalDays = Math.floor(currentIntervalDays * newEaseFactor)
    }
  } else {
    // 「不會」：難度因子下降，重置間隔
    newEaseFactor = Math.max(currentEaseFactor - 0.2, MIN_EASE_FACTOR)
    intervalDays = 1
  }

  // 計算下次複習日期
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + intervalDays)
  const nextReviewStr = nextReview.toISOString().split('T')[0]

  return {
    ease_factor: newEaseFactor,
    interval_days: intervalDays,
    next_review: nextReviewStr,
  }
}

/**
 * 取得今天的日期字串 (YYYY-MM-DD)
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * 比較兩個日期字串
 * @returns -1: date1 < date2, 0: date1 === date2, 1: date1 > date2
 */
export function compareDates(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  if (d1 < d2) return -1
  if (d1 > d2) return 1
  return 0
}
