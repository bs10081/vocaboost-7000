/**
 * localStorage 管理系統
 * 基於 Python 版本的 src/database.py 移植
 */

import type {
  VocabularyWord,
  LearningProgress,
  StudySession,
  Settings,
} from '@/types/vocabulary'
import { STORAGE_KEYS } from '@/types/vocabulary'
import { calculateBinary, getTodayString, compareDates } from './sm2'

class StorageManager {
  // ============ 進度管理 ============

  /**
   * 取得單字的學習進度
   */
  getProgress(vocabularyId: number): LearningProgress | null {
    const allProgress = this.getAllProgress()
    return allProgress.get(vocabularyId) || null
  }

  /**
   * 設定單字的學習進度
   */
  setProgress(vocabularyId: number, progress: LearningProgress): void {
    const allProgress = this.getAllProgress()
    allProgress.set(vocabularyId, progress)
    this._saveAllProgress(allProgress)
  }

  /**
   * 取得所有學習進度
   */
  getAllProgress(): Map<number, LearningProgress> {
    const json = localStorage.getItem(STORAGE_KEYS.PROGRESS)
    if (!json) return new Map()

    try {
      const obj = JSON.parse(json)
      return new Map(Object.entries(obj).map(([k, v]) => [Number(k), v as LearningProgress]))
    } catch {
      return new Map()
    }
  }

  private _saveAllProgress(progress: Map<number, LearningProgress>): void {
    const obj = Object.fromEntries(progress)
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(obj))
  }

  // ============ 待複習單字 ============

  /**
   * 取得今日待複習的單字
   */
  getDueWords(vocabulary: VocabularyWord[]): VocabularyWord[] {
    const today = getTodayString()
    const allProgress = this.getAllProgress()

    return vocabulary.filter(word => {
      const progress = allProgress.get(word.id)
      if (!progress) return false // 新單字不算待複習

      // 比較 next_review 是否 <= today
      return compareDates(progress.next_review, today) <= 0
    })
  }

  /**
   * 取得新單字（尚未有進度記錄的）
   */
  getNewWords(vocabulary: VocabularyWord[], level?: number): VocabularyWord[] {
    const allProgress = this.getAllProgress()

    return vocabulary.filter(word => {
      if (level !== undefined && word.level !== level) return false
      return !allProgress.has(word.id)
    })
  }

  // ============ 收藏管理 ============

  /**
   * 取得收藏的單字
   */
  getFavorites(vocabulary: VocabularyWord[]): VocabularyWord[] {
    const allProgress = this.getAllProgress()

    return vocabulary.filter(word => {
      const progress = allProgress.get(word.id)
      return progress?.is_favorite === true
    })
  }

  /**
   * 切換收藏狀態
   * @returns 新的收藏狀態
   */
  toggleFavorite(vocabularyId: number): boolean {
    const progress = this.getProgress(vocabularyId)
    if (!progress) {
      // 如果尚未有進度，建立一個初始進度並設為收藏
      const newProgress: LearningProgress = {
        vocabulary_id: vocabularyId,
        ease_factor: 2.5,
        interval_days: 0,
        next_review: getTodayString(),
        review_count: 0,
        correct_count: 0,
        is_favorite: true,
        last_reviewed: new Date().toISOString(),
      }
      this.setProgress(vocabularyId, newProgress)
      return true
    }

    const newFavoriteStatus = !progress.is_favorite
    this.setProgress(vocabularyId, {
      ...progress,
      is_favorite: newFavoriteStatus,
    })
    return newFavoriteStatus
  }

  // ============ 學習記錄 ============

  /**
   * 記錄一次學習答案
   * @param vocabularyId - 單字 ID
   * @param know - true: 會, false: 不會
   * @param isNew - 是否為新學的單字
   */
  recordAnswer(vocabularyId: number, know: boolean, isNew: boolean): void {
    const progress = this.getProgress(vocabularyId)

    if (isNew && !progress) {
      // 新單字首次學習
      const sm2Result = calculateBinary(know, 2.5, 0, 0)
      const newProgress: LearningProgress = {
        vocabulary_id: vocabularyId,
        ease_factor: sm2Result.ease_factor,
        interval_days: sm2Result.interval_days,
        next_review: sm2Result.next_review,
        review_count: 1,
        correct_count: know ? 1 : 0,
        is_favorite: false,
        last_reviewed: new Date().toISOString(),
        consecutive_failures: know ? 0 : 1,
      }
      this.setProgress(vocabularyId, newProgress)
    } else if (progress) {
      // 複習已有進度的單字
      const sm2Result = calculateBinary(
        know,
        progress.ease_factor,
        progress.interval_days,
        progress.review_count
      )
      const updatedProgress: LearningProgress = {
        ...progress,
        ease_factor: sm2Result.ease_factor,
        interval_days: sm2Result.interval_days,
        next_review: sm2Result.next_review,
        review_count: progress.review_count + 1,
        correct_count: progress.correct_count + (know ? 1 : 0),
        last_reviewed: new Date().toISOString(),
        consecutive_failures: know ? 0 : (progress.consecutive_failures || 0) + 1,
      }
      this.setProgress(vocabularyId, updatedProgress)
    }

    // 記錄到今日統計
    this._recordToSession(isNew, know)
  }

  private _recordToSession(isNew: boolean, isCorrect: boolean): void {
    const sessions = this._getAllSessions()
    const today = getTodayString()

    let todaySession = sessions.find(s => s.date === today)
    if (!todaySession) {
      todaySession = {
        date: today,
        new_words: 0,
        reviewed_words: 0,
        correct_count: 0,
        total_count: 0,
      }
      sessions.push(todaySession)
    }

    if (isNew) {
      todaySession.new_words++
    } else {
      todaySession.reviewed_words++
    }

    if (isCorrect) {
      todaySession.correct_count++
    }
    todaySession.total_count++

    this._saveAllSessions(sessions)
  }

  // ============ 學習統計 ============

  /**
   * 取得今日統計
   */
  getTodayStats(): StudySession {
    const sessions = this._getAllSessions()
    const today = getTodayString()

    return sessions.find(s => s.date === today) || {
      date: today,
      new_words: 0,
      reviewed_words: 0,
      correct_count: 0,
      total_count: 0,
    }
  }

  /**
   * 計算連續學習天數
   */
  getStreakDays(): number {
    const sessions = this._getAllSessions()
    if (sessions.length === 0) return 0

    // 按日期降序排序
    sessions.sort((a, b) => compareDates(b.date, a.date))

    let streak = 0
    let expectedDate = new Date()

    for (const session of sessions) {
      const sessionDate = new Date(session.date)
      const expectedDateStr = expectedDate.toISOString().split('T')[0]

      if (session.date === expectedDateStr) {
        streak++
        expectedDate.setDate(expectedDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  private _getAllSessions(): StudySession[] {
    const json = localStorage.getItem(STORAGE_KEYS.SESSIONS)
    if (!json) return []

    try {
      return JSON.parse(json)
    } catch {
      return []
    }
  }

  /**
   * 取得所有學習記錄（公開方法供 sync 使用）
   */
  getAllSessions(): StudySession[] {
    return this._getAllSessions()
  }

  private _saveAllSessions(sessions: StudySession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions))
  }

  // ============ 設定管理 ============

  /**
   * 取得設定
   */
  getSettings(): Settings {
    const json = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (!json) {
      return {
        dark_mode: false,
        sound_enabled: true,
        tts_rate: 0.9,
        daily_goal: 20,
        words_per_session: 20,
      }
    }

    try {
      const parsed = JSON.parse(json)
      // 確保有 words_per_session 欄位（向後兼容）
      return {
        ...parsed,
        words_per_session: parsed.words_per_session ?? 20,
      }
    } catch {
      return {
        dark_mode: false,
        sound_enabled: true,
        tts_rate: 0.9,
        daily_goal: 20,
        words_per_session: 20,
      }
    }
  }

  /**
   * 設定部分設定
   */
  setSettings(settings: Partial<Settings>): void {
    const current = this.getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
  }

  // ============ 使用者管理 ============

  /**
   * 取得或生成使用者 ID (UUID v4)
   */
  getUserId(): string {
    let userId = localStorage.getItem(STORAGE_KEYS.USER_ID)

    if (!userId) {
      // 生成 UUID v4
      userId = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId)
    }

    return userId
  }

  /**
   * 取得使用者暱稱
   */
  getUsername(): string | null {
    return localStorage.getItem(STORAGE_KEYS.USERNAME)
  }

  /**
   * 設定使用者暱稱
   */
  setUsername(username: string): void {
    localStorage.setItem(STORAGE_KEYS.USERNAME, username)
  }

  /**
   * 計算總分數（基於學習進度）
   */
  calculateTotalScore(): number {
    const allProgress = this.getAllProgress()
    let totalScore = 0

    // 計算所有單字的總答對次數
    allProgress.forEach(progress => {
      totalScore += progress.correct_count
    })

    return totalScore
  }

  /**
   * 取得排行榜用的使用者 ID
   * 如果已啟用同步，使用 username#tag 格式
   * 否則使用 localStorage 的 UUID
   */
  getLeaderboardUserId(): string {
    const syncEnabled = localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) === 'true'

    if (syncEnabled) {
      const syncUsername = localStorage.getItem(STORAGE_KEYS.SYNC_USERNAME)
      const syncTag = localStorage.getItem(STORAGE_KEYS.SYNC_TAG)

      if (syncUsername && syncTag) {
        return `${syncUsername}#${syncTag}`
      }
    }

    // 回退到 localStorage UUID
    return this.getUserId()
  }

  // ============ 資料管理 ============

  /**
   * 清除所有資料
   */
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PROGRESS)
    localStorage.removeItem(STORAGE_KEYS.SESSIONS)
    localStorage.removeItem(STORAGE_KEYS.SETTINGS)
  }

  /**
   * 匯出所有資料為 JSON
   */
  exportData(): string {
    return JSON.stringify({
      progress: Array.from(this.getAllProgress().entries()),
      sessions: this._getAllSessions(),
      settings: this.getSettings(),
      version: '1.0',
      exported_at: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * 從 JSON 匯入資料
   */
  importData(json: string): void {
    try {
      const data = JSON.parse(json)

      if (data.progress) {
        const progressMap = new Map(data.progress)
        this._saveAllProgress(progressMap)
      }

      if (data.sessions) {
        this._saveAllSessions(data.sessions)
      }

      if (data.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings))
      }
    } catch (error) {
      console.error('Failed to import data:', error)
      throw new Error('資料格式錯誤')
    }
  }
}

// 匯出單例
export const storage = new StorageManager()
