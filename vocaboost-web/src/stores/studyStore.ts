import { create } from 'zustand'
import type { VocabularyWord } from '@/types/vocabulary'
import { storage } from '@/lib/storage'

export type StudyMode = 'review' | 'new' | 'favorite'

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
  startStudy: (mode: StudyMode, vocabulary: VocabularyWord[], level?: number) => void
  flipCard: () => void
  answerKnow: () => void
  answerDontKnow: () => void
  goToPrevious: () => void
  nextWord: () => void
  reset: () => void
  isFinished: () => boolean
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
  startStudy: (mode, vocabulary, level) => {
    let words: VocabularyWord[] = []

    if (mode === 'review') {
      words = storage.getDueWords(vocabulary)
    } else if (mode === 'new') {
      words = storage.getNewWords(vocabulary, level)
      // 限制新單字數量（從設定讀取）
      const settings = storage.getSettings()
      words = words.slice(0, settings.words_per_session)
    } else if (mode === 'favorite') {
      words = storage.getFavorites(vocabulary)
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

    // 移動到下一題
    set({
      currentIndex: currentIndex + 1,
      isFlipped: false,
      history: [...history, currentIndex],
    })
  },

  // 回答「不會」
  answerDontKnow: () => {
    const { words, currentIndex, mode, history, wrongWords } = get()
    if (currentIndex >= words.length) return

    const word = words[currentIndex]
    const isNew = mode === 'new'

    // 記錄答案
    storage.recordAnswer(word.id, false, isNew)

    // 加入答錯列表（稍後重測）
    if (!wrongWords.find((w) => w.id === word.id)) {
      wrongWords.push(word)
    }

    // 移動到下一題
    set({
      currentIndex: currentIndex + 1,
      isFlipped: false,
      history: [...history, currentIndex],
      wrongWords,
    })
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
}))
