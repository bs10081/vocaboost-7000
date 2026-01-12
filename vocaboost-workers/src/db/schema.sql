-- VocaBoost Leaderboard Database Schema

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  words_learned INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_words ON leaderboard(words_learned DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);

-- User Sync Table (Riot Games Style Identification)
CREATE TABLE IF NOT EXISTS user_sync (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Username (can be duplicated, e.g., "VocabMaster")
  username TEXT NOT NULL,

  -- Tag (unique identifier, e.g., "A1B2C3", without #)
  tag TEXT NOT NULL UNIQUE,

  -- PIN hash (SHA-256 for validation)
  pin_hash TEXT NOT NULL,

  -- Encrypted data (Base64 encoded)
  encrypted_data TEXT NOT NULL,

  -- Encryption metadata (JSON: {iv, salt})
  encryption_meta TEXT NOT NULL,

  -- Version number (optimistic locking)
  data_version INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_sync_username ON user_sync(username);
CREATE INDEX IF NOT EXISTS idx_user_sync_tag ON user_sync(tag);
