/**
 * 排行榜 API 服務層
 * 與 Cloudflare Workers 後端通信
 */

const API_BASE = 'https://vocaboost-leaderboard.bs10081.workers.dev'

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  score: number
  wordsLearned: number
  streakDays: number
  createdAt?: string
  updatedAt?: string
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SubmitScoreData {
  userId: string
  username: string
  score: number
  wordsLearned: number
  streakDays: number
}

export interface SubmitScoreResponse {
  success: boolean
  rank: number
}

export const leaderboardApi = {
  /**
   * 獲取排行榜列表
   */
  async getLeaderboard(page = 1, limit = 20): Promise<LeaderboardResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/leaderboard?page=${page}&limit=${limit}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
      throw error
    }
  },

  /**
   * 獲取使用者排名
   */
  async getUserRank(userId: string): Promise<LeaderboardEntry> {
    try {
      const response = await fetch(`${API_BASE}/api/leaderboard/${userId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('USER_NOT_FOUND')
        }
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch user rank:', error)
      throw error
    }
  },

  /**
   * 提交/更新分數
   */
  async submitScore(data: SubmitScoreData): Promise<SubmitScoreResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/leaderboard/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to submit score:', error)
      throw error
    }
  },
}
