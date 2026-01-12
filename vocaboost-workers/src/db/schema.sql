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
