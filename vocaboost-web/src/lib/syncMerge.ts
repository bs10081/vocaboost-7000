/**
 * Sync data merge utilities
 * Handles merging local and server sync data when conflicts occur
 */

import type { SyncData } from './crypto'
import type { LearningProgress, StudySession } from '@/types/vocabulary'

/**
 * Merge local and server sync data
 * Strategy: Keep newer records for progress, merge sessions
 */
export function mergeSyncData(local: SyncData, server: SyncData): SyncData {
  // Merge learning progress: keep newer records
  const mergedProgress = mergeProgress(
    new Map(local.progress),
    new Map(server.progress)
  )

  // Merge study sessions: deduplicate and merge
  const mergedSessions = mergeSessions(local.sessions, server.sessions)

  // Settings: use local (user preference)
  const mergedSettings = local.settings

  return {
    progress: Array.from(mergedProgress.entries()),
    sessions: mergedSessions,
    settings: mergedSettings,
    username: local.username || server.username,
    exportedAt: new Date().toISOString(),
    version: local.version,
  }
}

/**
 * Merge learning progress maps
 * For each word, keep the record with more recent last_reviewed timestamp
 */
function mergeProgress(
  local: Map<number, LearningProgress>,
  server: Map<number, LearningProgress>
): Map<number, LearningProgress> {
  const merged = new Map(server) // Start with server data

  for (const [id, localProgress] of local) {
    const serverProgress = server.get(id)

    if (!serverProgress) {
      // Server doesn't have this word, use local
      merged.set(id, localProgress)
    } else {
      // Compare timestamps, keep newer one
      const localTime = new Date(localProgress.last_reviewed).getTime()
      const serverTime = new Date(serverProgress.last_reviewed).getTime()

      if (localTime > serverTime) {
        merged.set(id, localProgress)
      }
      // Otherwise keep server version
    }
  }

  return merged
}

/**
 * Merge study sessions
 * For same-day sessions, take maximum values
 */
function mergeSessions(
  local: StudySession[],
  server: StudySession[]
): StudySession[] {
  const sessionMap = new Map<string, StudySession>()

  // Add server data first
  for (const session of server) {
    sessionMap.set(session.date, session)
  }

  // Merge local data (take max values for same day)
  for (const session of local) {
    const existing = sessionMap.get(session.date)
    if (!existing) {
      sessionMap.set(session.date, session)
    } else {
      // Same day, merge data with maximum values
      sessionMap.set(session.date, {
        date: session.date,
        new_words: Math.max(existing.new_words, session.new_words),
        reviewed_words: Math.max(existing.reviewed_words, session.reviewed_words),
        correct_count: Math.max(existing.correct_count, session.correct_count),
        total_count: Math.max(existing.total_count, session.total_count),
      })
    }
  }

  return Array.from(sessionMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}
