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
}
