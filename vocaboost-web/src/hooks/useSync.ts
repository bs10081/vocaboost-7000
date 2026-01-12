import { useState, useCallback } from 'react'
import { syncApi } from '@/services/syncApi'
import { storage } from '@/lib/storage'
import { formatFullId, parseFullId, type SyncData } from '@/lib/crypto'
import { mergeSyncData } from '@/lib/syncMerge'
import { STORAGE_KEYS } from '@/types/vocabulary'

export interface SyncAccount {
  username: string
  tag: string
  fullId: string
}

export function useSync() {
  // PIN management helpers
  const savePin = useCallback((pin: string) => {
    localStorage.setItem(STORAGE_KEYS.SYNC_PIN, pin)
  }, [])

  const getSavedPin = useCallback((): string | null => {
    return localStorage.getItem(STORAGE_KEYS.SYNC_PIN)
  }, [])

  const hasSavedPin = useCallback((): boolean => {
    return localStorage.getItem(STORAGE_KEYS.SYNC_PIN) !== null
  }, [])

  // Read sync state from localStorage
  const getSyncAccount = useCallback((): SyncAccount | null => {
    const username = localStorage.getItem(STORAGE_KEYS.SYNC_USERNAME)
    const tag = localStorage.getItem(STORAGE_KEYS.SYNC_TAG)

    if (!username || !tag) return null

    return {
      username,
      tag,
      fullId: formatFullId(username, tag),
    }
  }, [])

  const [account, setAccount] = useState<SyncAccount | null>(getSyncAccount())
  const [isEnabled, setIsEnabled] = useState<boolean>(
    localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) === 'true'
  )
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const timestamp = localStorage.getItem(STORAGE_KEYS.SYNC_LAST_SYNCED)
    return timestamp ? new Date(timestamp) : null
  })
  const [dataVersion, setDataVersion] = useState<number>(() => {
    const version = localStorage.getItem(STORAGE_KEYS.SYNC_VERSION)
    return version ? parseInt(version, 10) : 0
  })
  const [isSyncing, setIsSyncing] = useState(false)

  /**
   * Prepare sync data from localStorage
   */
  const prepareSyncData = useCallback((): SyncData => {
    const progressMap = storage.getAllProgress()
    const sessions = storage.getAllSessions()
    const settings = storage.getSettings()
    const username = storage.getUsername()

    return {
      progress: Array.from(progressMap.entries()),
      sessions,
      settings,
      username,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }
  }, [])

  /**
   * Apply sync data to localStorage
   */
  const applySyncData = useCallback((data: SyncData) => {
    // Import progress
    const progressMap = new Map(data.progress)
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(Object.fromEntries(progressMap)))

    // Import sessions
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(data.sessions))

    // Import settings
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings))

    // Import username (if exists)
    if (data.username) {
      localStorage.setItem(STORAGE_KEYS.USERNAME, data.username)
    }
  }, [])

  /**
   * Register a new sync account
   */
  const register = useCallback(
    async (username: string, pin: string): Promise<SyncAccount & { warning?: string; warningMessage?: string }> => {
      setIsSyncing(true)
      try {
        // Prepare data to sync
        const data = prepareSyncData()

        // Register with server
        const response = await syncApi.register(username, pin, data)

        // Save sync account to localStorage
        localStorage.setItem(STORAGE_KEYS.SYNC_USERNAME, username)
        localStorage.setItem(STORAGE_KEYS.SYNC_TAG, response.tag)
        localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, 'true')
        localStorage.setItem(STORAGE_KEYS.SYNC_VERSION, response.dataVersion.toString())
        localStorage.setItem(STORAGE_KEYS.SYNC_LAST_SYNCED, new Date().toISOString())

        // Save PIN for auto-sync
        savePin(pin)

        const newAccount = {
          username,
          tag: response.tag,
          fullId: response.fullId,
          warning: response.warning,
          warningMessage: response.warningMessage,
        }

        setAccount({
          username,
          tag: response.tag,
          fullId: response.fullId,
        })
        setIsEnabled(true)
        setDataVersion(response.dataVersion)
        setLastSynced(new Date())

        return newAccount
      } finally {
        setIsSyncing(false)
      }
    },
    [prepareSyncData]
  )

  /**
   * Login (validate credentials)
   */
  const login = useCallback(async (fullId: string, pin: string): Promise<void> => {
    setIsSyncing(true)
    try {
      const parsed = parseFullId(fullId)
      if (!parsed) {
        throw new Error('無效的 ID 格式，應為 username#TAG123')
      }

      await syncApi.login(parsed.username, parsed.tag, pin)

      // Login successful - save credentials
      localStorage.setItem(STORAGE_KEYS.SYNC_USERNAME, parsed.username)
      localStorage.setItem(STORAGE_KEYS.SYNC_TAG, parsed.tag)
      localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, 'true')

      setAccount({
        username: parsed.username,
        tag: parsed.tag,
        fullId,
      })
      setIsEnabled(true)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  /**
   * Sync now (upload current data)
   */
  const syncNow = useCallback(
    async (pin: string): Promise<void> => {
      if (!account) {
        throw new Error('未登入同步帳號')
      }

      setIsSyncing(true)
      try {
        const data = prepareSyncData()

        const response = await syncApi.upload(account.username, account.tag, pin, data, dataVersion)

        // Update sync metadata
        localStorage.setItem(STORAGE_KEYS.SYNC_VERSION, response.dataVersion.toString())
        localStorage.setItem(STORAGE_KEYS.SYNC_LAST_SYNCED, new Date().toISOString())

        setDataVersion(response.dataVersion)
        setLastSynced(new Date())
      } finally {
        setIsSyncing(false)
      }
    },
    [account, dataVersion, prepareSyncData]
  )

  /**
   * Restore data from server
   * @param fullIdOrUsername - Full ID (username#TAG) or just username for simplified flow
   * @param pin - PIN code
   * @param useSimplified - If true, use simplified API (no TAG required)
   */
  const restoreData = useCallback(
    async (fullIdOrUsername: string, pin: string, useSimplified: boolean = false): Promise<void> => {
      setIsSyncing(true)
      try {
        let username: string
        let tag: string
        let data: SyncData & { _tag?: string }

        if (useSimplified) {
          // Simplified flow - username only
          username = fullIdOrUsername
          data = await syncApi.downloadSimple(username, pin) as SyncData & { _tag?: string }

          // Get tag from the result
          if (!data._tag) {
            throw new Error('Failed to get account tag from server')
          }
          tag = data._tag
        } else {
          // Full flow - require username#TAG
          const parsed = parseFullId(fullIdOrUsername)
          if (!parsed) {
            throw new Error('無效的 ID 格式')
          }
          username = parsed.username
          tag = parsed.tag

          // Download and decrypt data
          data = await syncApi.download(username, tag, pin)
        }

        // Apply to localStorage
        applySyncData(data)

        // Save sync account
        localStorage.setItem(STORAGE_KEYS.SYNC_USERNAME, username)
        localStorage.setItem(STORAGE_KEYS.SYNC_TAG, tag)
        localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, 'true')
        localStorage.setItem(STORAGE_KEYS.SYNC_LAST_SYNCED, new Date().toISOString())

        // Save PIN for auto-sync
        savePin(pin)

        // Get version from server
        const loginResponse = await syncApi.login(username, tag, pin)
        localStorage.setItem(STORAGE_KEYS.SYNC_VERSION, loginResponse.dataVersion.toString())

        setAccount({
          username,
          tag,
          fullId: formatFullId(username, tag),
        })
        setIsEnabled(true)
        setDataVersion(loginResponse.dataVersion)
        setLastSynced(new Date())
      } finally {
        setIsSyncing(false)
      }
    },
    [applySyncData]
  )

  /**
   * Disconnect (logout locally, don't delete server data)
   */
  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.SYNC_USERNAME)
    localStorage.removeItem(STORAGE_KEYS.SYNC_TAG)
    localStorage.removeItem(STORAGE_KEYS.SYNC_ENABLED)
    localStorage.removeItem(STORAGE_KEYS.SYNC_VERSION)
    localStorage.removeItem(STORAGE_KEYS.SYNC_LAST_SYNCED)
    localStorage.removeItem(STORAGE_KEYS.SYNC_PIN) // Clear saved PIN

    setAccount(null)
    setIsEnabled(false)
    setDataVersion(0)
    setLastSynced(null)
  }, [])

  /**
   * Auto-sync using saved PIN (for automatic syncing after study)
   */
  const autoSync = useCallback(
    async (): Promise<void> => {
      if (!account || !isEnabled) return

      const pin = getSavedPin()
      if (!pin) return // No saved PIN, skip auto-sync

      setIsSyncing(true)
      try {
        await syncWithConflictResolution(pin)
      } catch (err) {
        console.error('Auto sync failed:', err)
        // Don't throw error to avoid interrupting user experience
      } finally {
        setIsSyncing(false)
      }
    },
    [account, isEnabled, getSavedPin]
  )

  /**
   * Sync with automatic conflict resolution
   */
  const syncWithConflictResolution = useCallback(
    async (pin: string): Promise<void> => {
      if (!account) return

      try {
        // Try normal sync first
        const data = prepareSyncData()
        const response = await syncApi.upload(account.username, account.tag, pin, data, dataVersion)

        // Update sync metadata
        localStorage.setItem(STORAGE_KEYS.SYNC_VERSION, response.dataVersion.toString())
        localStorage.setItem(STORAGE_KEYS.SYNC_LAST_SYNCED, new Date().toISOString())

        setDataVersion(response.dataVersion)
        setLastSynced(new Date())
      } catch (err) {
        const error = err as Error
        if (error.message.includes('版本衝突')) {
          // Version conflict detected - pull, merge, and push
          await pullMergeAndPush(pin)
        } else {
          throw err
        }
      }
    },
    [account, dataVersion, prepareSyncData]
  )

  /**
   * Pull-Merge-Push strategy for conflict resolution
   */
  const pullMergeAndPush = useCallback(
    async (pin: string): Promise<void> => {
      if (!account) return

      // 1. Download server data
      const serverData = await syncApi.download(account.username, account.tag, pin)

      // 2. Get local data
      const localData = prepareSyncData()

      // 3. Merge
      const mergedData = mergeSyncData(localData, serverData)

      // 4. Apply merged data to localStorage
      applySyncData(mergedData)

      // 5. Re-upload (without version check to force update)
      const response = await syncApi.upload(account.username, account.tag, pin, mergedData)

      // 6. Update metadata
      localStorage.setItem(STORAGE_KEYS.SYNC_VERSION, response.dataVersion.toString())
      localStorage.setItem(STORAGE_KEYS.SYNC_LAST_SYNCED, new Date().toISOString())

      setDataVersion(response.dataVersion)
      setLastSynced(new Date())
    },
    [account, prepareSyncData, applySyncData]
  )

  /**
   * Delete account (remove from server)
   */
  const deleteAccount = useCallback(
    async (pin: string): Promise<void> => {
      if (!account) {
        throw new Error('未登入同步帳號')
      }

      setIsSyncing(true)
      try {
        await syncApi.deleteAccount(account.username, account.tag, pin)

        // Clear local sync data
        disconnect()
      } finally {
        setIsSyncing(false)
      }
    },
    [account, disconnect]
  )

  return {
    // State
    account,
    isEnabled,
    lastSynced,
    dataVersion,
    isSyncing,

    // PIN management
    hasSavedPin: hasSavedPin(),

    // Actions
    register,
    login,
    syncNow,
    autoSync,
    restoreData,
    disconnect,
    deleteAccount,
  }
}
