import { create } from 'zustand'
import type { VocabularyWord } from '@/types/vocabulary'
import { storage } from '@/lib/storage'
import { leaderboardApi } from '@/services/leaderboardApi'

export type StudyMode = 'review' | 'new' | 'favorite' | 'difficult' | 'relearn'

/**
 * 自動同步分數到排行榜（靜默失敗）
 */
const syncScoreToLeaderboard = async () => {
  try {
    const username = storage.getUsername()
    if (!username) return // 沒有設定暱稱，不同步

    const userId = storage.getUserId()
    const score = storage.calculateTotalScore()
    const wordsLearned = storage.getAllProgress().size
    const streakDays = storage.getStreakDays()

    await leaderboardApi.submitScore({
      userId,
      username,
      score,
      wordsLearned,
      streakDays,
    })

    console.log('Score synced to leaderboard')
  } catch (error) {
    // 靜默失敗，不影響用戶體驗
    console.error('Failed to sync score:', error)
  }
}

interface StudyState {
  // 當前學習狀態
  mode: StudyMode | null
  level: number | null
  words: VocabularyWord[]
  currentIndex: number
  isFlipped: boolean
  history: number[] // 用於上一題功能
  wrongWords: VocabularyWord[] // 答錯的重測

  // Actions
  startStudy: (mode: StudyMode, vocabulary: VocabularyWord[], level?: number, completeLevel?: boolean) => void
  flipCard: () => void
  answerKnow: () => void
  answerDontKnow: () => void
  goToPrevious: () => void
  nextWord: () => void
  reset: () => void
  isFinished: () => boolean
  startRetest: () => void
  toggleCurrentDifficult: () => boolean
}

export const useStudyStore = create<StudyState>((set, get) => ({
  // 初始狀態
  mode: null,
  level: null,
  words: [],
  currentIndex: 0,
  isFlipped: false,
  history: [],
  wrongWords: [],

  // 開始學習
  startStudy: (mode, vocabulary, level, completeLevel = false) => {
    let words: VocabularyWord[] = []

    if (mode === 'review') {
      words = storage.getDueWords(vocabulary)
    } else if (mode === 'new') {
      words = storage.getNewWords(vocabulary, level)
      // 如果不是「完成整個級別」模式，限制新單字數量
      if (!completeLevel) {
        const settings = storage.getSettings()
        words = words.slice(0, settings.words_per_session)
      }
    } else if (mode === 'favorite') {
      words = storage.getFavorites(vocabulary)
    } else if (mode === 'difficult') {
      words = storage.getDifficultWords(vocabulary)
    } else if (mode === 'relearn') {
      words = storage.getLearnedWords(vocabulary, level)
      // 如果不是「完成整個級別」模式，限制單字數量
      if (!completeLevel) {
        const settings = storage.getSettings()
        words = words.slice(0, settings.words_per_session)
      }
    }

    // 打亂順序
    words = words.sort(() => Math.random() - 0.5)

    set({
      mode,
      level: level ?? null,
      words,
      currentIndex: 0,
      isFlipped: false,
      history: [],
      wrongWords: [],
    })
  },

  // 翻牌
  flipCard: () => {
    set((state) => ({ isFlipped: !state.isFlipped }))
  },

  // 回答「會」
  answerKnow: () => {
    const { words, currentIndex, mode, history } = get()
    if (currentIndex >= words.length) return

    const word = words[currentIndex]
    const isNew = mode === 'new'

    // 記錄答案
    storage.recordAnswer(word.id, true, isNew)

    const nextIndex = currentIndex + 1

    // 移動到下一題
    set({
      currentIndex: nextIndex,
      isFlipped: false,
      history: [...history, currentIndex],
    })

    // 如果完成學習，自動同步分數
    if (nextIndex >= words.length) {
      syncScoreToLeaderboard()
    }
  },

  // 回答「不會」
  answerDontKnow: () => {
    const { words, currentIndex, mode, history, wrongWords } = get()
    if (currentIndex >= words.length) return

    const word = words[currentIndex]
    const isNew = mode === 'new'

    // 記錄答案
    storage.recordAnswer(word.id, false, isNew)

    // 加入答錯列表（使用不可變方式更新陣列）
    const newWrongWords = wrongWords.find((w) => w.id === word.id)
      ? wrongWords
      : [...wrongWords, word]

    const nextIndex = currentIndex + 1

    // 移動到下一題
    set({
      currentIndex: nextIndex,
      isFlipped: false,
      history: [...history, currentIndex],
      wrongWords: newWrongWords,
    })

    // 如果完成學習，自動同步分數
    if (nextIndex >= words.length) {
      syncScoreToLeaderboard()
    }
  },

  // 上一題
  goToPrevious: () => {
    const { history } = get()
    if (history.length === 0) return

    const prevIndex = history[history.length - 1]
    const newHistory = history.slice(0, -1)

    set({
      currentIndex: prevIndex,
      isFlipped: false,
      history: newHistory,
    })
  },

  // 下一題（不記錄答案）
  nextWord: () => {
    const { currentIndex, history } = get()
    set({
      currentIndex: currentIndex + 1,
      isFlipped: false,
      history: [...history, currentIndex],
    })
  },

  // 重置
  reset: () => {
    set({
      mode: null,
      level: null,
      words: [],
      currentIndex: 0,
      isFlipped: false,
      history: [],
      wrongWords: [],
    })
  },

  // 是否完成
  isFinished: () => {
    const { words, currentIndex } = get()
    return currentIndex >= words.length
  },

  // 立即重測錯詞
  startRetest: () => {
    const { wrongWords } = get()
    if (wrongWords.length === 0) return

    // 打亂錯詞順序
    const shuffled = [...wrongWords].sort(() => Math.random() - 0.5)

    set({
      words: shuffled,
      currentIndex: 0,
      isFlipped: false,
      history: [],
      wrongWords: [],
    })
  },

  // 切換當前單字的困難狀態
  toggleCurrentDifficult: () => {
    const { words, currentIndex } = get()
    if (currentIndex >= words.length) return false

    const word = words[currentIndex]
    return storage.toggleDifficult(word.id)
  },
}))
