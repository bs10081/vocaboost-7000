// 單字資料結構
export interface VocabularyWord {
  id: number
  word: string
  phonetic: string
  part_of_speech: string
  translation: string
  level: number
}

// 學習進度
export interface LearningProgress {
  vocabulary_id: number
  ease_factor: number // 難度因子 (1.3 ~ 3.0)
  interval_days: number // 間隔天數
  next_review: string // 下次複習日期 (YYYY-MM-DD)
  review_count: number // 複習次數
  correct_count: number // 答對次數
  is_favorite: boolean // 是否收藏
  last_reviewed: string // 最後複習時間 (ISO string)
}

// 學習統計
export interface StudySession {
  date: string // 日期 (YYYY-MM-DD)
  new_words: number // 新學單字數
  reviewed_words: number // 複習單字數
  correct_count: number // 答對數
  total_count: number // 總測驗數
}

// 設定
export interface Settings {
  dark_mode: boolean
  sound_enabled: boolean
  tts_rate: number // 朗讀速度 (0.5 ~ 2.0)
  daily_goal: number // 每日目標 (預設 20)
  words_per_session: number // 每次學習單字數量 (5-100, 預設 20)
}

// localStorage Keys
export const STORAGE_KEYS = {
  PROGRESS: 'vocaboost_progress',
  SESSIONS: 'vocaboost_sessions',
  SETTINGS: 'vocaboost_settings',
  VOCABULARY_VERSION: 'vocaboost_vocab_version',
  USER_ID: 'vocaboost_user_id',
  USERNAME: 'vocaboost_username',

  // Sync相關
  SYNC_USERNAME: 'vocaboost_sync_username', // 同步帳號使用者名稱
  SYNC_TAG: 'vocaboost_sync_tag', // 同步帳號識別碼 (A1B2C3)
  SYNC_ENABLED: 'vocaboost_sync_enabled', // 是否啟用同步
  SYNC_VERSION: 'vocaboost_sync_version', // 本地資料版本號
  SYNC_LAST_SYNCED: 'vocaboost_sync_last_synced', // 最後同步時間 (ISO string)
} as const
