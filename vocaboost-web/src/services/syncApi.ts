import { encryptData, decryptData, hashPin, type SyncData, type EncryptionResult } from '@/lib/crypto'

const API_BASE = 'https://vocaboost-leaderboard.bs10081.workers.dev'

export interface SyncAccount {
  username: string
  tag: string
  fullId: string // "username#tag"
  dataVersion: number
}

export interface RegisterResponse {
  success: boolean
  tag: string
  fullId: string
  dataVersion: number
  warning?: string
  warningMessage?: string
}

export interface LoginSimpleResponse {
  success: boolean
  tag: string
  fullId: string
  dataVersion: number
  updatedAt: string
}

export interface DownloadSimpleResponse {
  tag: string
  encryptedData: string
  encryptionMeta: {
    iv: string
    salt: string
  }
  dataVersion: number
  updatedAt: string
}

export interface LoginResponse {
  success: boolean
  dataVersion: number
  updatedAt: string
}

export interface UploadResponse {
  success: boolean
  dataVersion: number
}

export interface DownloadResponse {
  encryptedData: string
  encryptionMeta: {
    iv: string
    salt: string
  }
  dataVersion: number
  updatedAt: string
}

export interface CheckResponse {
  exists: boolean
  updatedAt?: string
}

export interface DeleteResponse {
  success: boolean
  message: string
}

export interface SyncError {
  error: string
  message?: string
  serverVersion?: number
  accounts?: Array<{
    tag: string
    fullId: string
    updatedAt: string
  }>
}

/**
 * Sync API client for zero-knowledge cross-device sync
 */
export const syncApi = {
  /**
   * Register a new sync account
   * Returns the generated tag and full ID
   */
  async register(username: string, pin: string, data: SyncData): Promise<RegisterResponse> {
    // Encrypt data with PIN
    const { encryptedData, iv, salt } = await encryptData(data, pin)

    // Hash PIN for server validation
    const pinHash = await hashPin(pin)

    const response = await fetch(`${API_BASE}/api/sync/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        pinHash,
        encryptedData,
        encryptionMeta: { iv, salt },
      }),
    })

    if (!response.ok) {
      const error: SyncError = await response.json()
      throw new Error(error.message || error.error || 'Failed to register')
    }

    return response.json()
  },

  /**
   * Login (validate credentials)
   */
  async login(username: string, tag: string, pin: string): Promise<LoginResponse> {
    const pinHash = await hashPin(pin)

    const response = await fetch(`${API_BASE}/api/sync/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        tag,
        pinHash,
      }),
    })

    if (!response.ok) {
      const error: SyncError = await response.json()
      throw new Error(error.message || error.error || 'Login failed')
    }

    return response.json()
  },

  /**
   * Upload encrypted data to server
   */
  async upload(
    username: string,
    tag: string,
    pin: string,
    data: SyncData,
    expectedVersion?: number
  ): Promise<UploadResponse> {
    // Encrypt data with PIN
    const { encryptedData, iv, salt } = await encryptData(data, pin)

    // Hash PIN for server validation
    const pinHash = await hashPin(pin)

    const response = await fetch(`${API_BASE}/api/sync/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        tag,
        pinHash,
        encryptedData,
        encryptionMeta: { iv, salt },
        expectedVersion,
      }),
    })

    if (!response.ok) {
      const error: SyncError = await response.json()
      if (error.error === 'VERSION_CONFLICT') {
        throw new Error(`版本衝突：資料已在其他裝置上修改（伺服器版本：${error.serverVersion}）`)
      }
      throw new Error(error.message || error.error || 'Upload failed')
    }

    return response.json()
  },

  /**
   * Download and decrypt data from server
   */
  async download(username: string, tag: string, pin: string): Promise<SyncData> {
    const pinHash = await hashPin(pin)

    const response = await fetch(`${API_BASE}/api/sync/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        tag,
        pinHash,
      }),
    })

    if (!response.ok) {
      const error: SyncError = await response.json()
      throw new Error(error.message || error.error || 'Download failed')
    }

    const { encryptedData, encryptionMeta }: DownloadResponse = await response.json()

    // Decrypt data with PIN
    return decryptData(encryptedData, encryptionMeta.iv, encryptionMeta.salt, pin)
  },

  /**
   * Check if a tag exists (public endpoint, no auth)
   */
  async checkTag(tag: string): Promise<CheckResponse> {
    const response = await fetch(`${API_BASE}/api/sync/check/${tag}`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to check tag')
    }

    return response.json()
  },

  /**
   * Delete sync account
   */
  async deleteAccount(username: string, tag: string, pin: string): Promise<DeleteResponse> {
    const pinHash = await hashPin(pin)

    const response = await fetch(`${API_BASE}/api/sync/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        tag,
        pinHash,
      }),
    })

    if (!response.ok) {
      const error: SyncError = await response.json()
      throw new Error(error.message || error.error || 'Delete failed')
    }

    return response.json()
  },

  /**
   * Simplified login with just username + PIN (no tag required)
   * Returns success if unique match, throws error with accounts list if multiple matches
   */
  async loginSimple(username: string, pin: string): Promise<LoginSimpleResponse> {
    const pinHash = await hashPin(pin)

    const response = await fetch(`${API_BASE}/api/sync/login-simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        pinHash,
      }),
    })

    if (!response.ok) {
      const error: SyncError = await response.json()

      // For multiple accounts, throw error with accounts data attached
      if (error.error === 'MULTIPLE_ACCOUNTS' && error.accounts) {
        const multipleError = new Error(error.message || 'Multiple accounts found') as Error & { accounts: typeof error.accounts }
        multipleError.accounts = error.accounts
        throw multipleError
      }

      throw new Error(error.message || error.error || 'Login failed')
    }

    return response.json()
  },

  /**
   * Simplified download with just username + PIN (no tag required)
   * If tag is provided, it will be used directly (for multiple account selection)
   * Returns decrypted data if unique match, throws error with accounts list if multiple matches
   */
  async downloadSimple(username: string, pin: string, selectedTag?: string): Promise<SyncData> {
    const pinHash = await hashPin(pin)

    const response = await fetch(`${API_BASE}/api/sync/download-simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        pinHash,
        tag: selectedTag,
      }),
    })

    if (!response.ok) {
      const error: SyncError = await response.json()

      // For multiple accounts, throw error with accounts data attached
      if (error.error === 'MULTIPLE_ACCOUNTS' && error.accounts) {
        const multipleError = new Error(error.message || 'Multiple accounts found') as Error & { accounts: typeof error.accounts }
        multipleError.accounts = error.accounts
        throw multipleError
      }

      throw new Error(error.message || error.error || 'Download failed')
    }

    const { encryptedData, encryptionMeta, tag }: DownloadSimpleResponse = await response.json()

    // Decrypt data with PIN
    const decryptedData = await decryptData(encryptedData, encryptionMeta.iv, encryptionMeta.salt, pin)

    // Attach the tag to the result for saving to account info
    return { ...decryptedData, _tag: tag } as SyncData & { _tag: string }
  },
}
