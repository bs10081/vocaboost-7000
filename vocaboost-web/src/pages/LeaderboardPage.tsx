import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { storage } from '@/lib/storage'
import { leaderboardApi, type LeaderboardEntry } from '@/services/leaderboardApi'

export function LeaderboardPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState<string | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [showUsernameDialog, setShowUsernameDialog] = useState(false)

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 使用排行榜專用的 userId（已啟用同步則為 username#tag，否則為 UUID）
  const userId = storage.getLeaderboardUserId()

  // 檢查是否有使用者暱稱
  useEffect(() => {
    // 優先使用同步帳號的 username
    const syncUsername = localStorage.getItem('vocaboost_sync_username')
    const storedUsername = storage.getUsername()

    if (syncUsername) {
      setUsername(syncUsername)
    } else if (!storedUsername) {
      setShowUsernameDialog(true)
    } else {
      setUsername(storedUsername)
    }
  }, [])

  // 載入排行榜
  useEffect(() => {
    loadLeaderboard()
  }, [currentPage])

  // 載入使用者排名
  useEffect(() => {
    if (username) {
      loadUserRank()
    }
  }, [username])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await leaderboardApi.getLeaderboard(currentPage, 20)
      setLeaderboard(response.data)
      setTotalPages(response.pagination.totalPages)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
      setError('載入排行榜失敗')
    } finally {
      setLoading(false)
    }
  }

  const loadUserRank = async () => {
    try {
      const rank = await leaderboardApi.getUserRank(userId)
      setUserRank(rank)
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') {
        // 使用者尚未提交分數
        setUserRank(null)
      } else {
        console.error('Failed to load user rank:', err)
      }
    }
  }

  const handleSetUsername = () => {
    const trimmed = usernameInput.trim()

    if (trimmed.length < 2) {
      alert('暱稱至少需要 2 個字元')
      return
    }

    if (trimmed.length > 20) {
      alert('暱稱最多 20 個字元')
      return
    }

    storage.setUsername(trimmed)
    setUsername(trimmed)
    setShowUsernameDialog(false)

    // 提交當前分數
    syncScore(trimmed)
  }

  const syncScore = async (displayName: string) => {
    try {
      const score = storage.calculateTotalScore()
      const wordsLearned = storage.getAllProgress().size
      const streakDays = storage.getStreakDays()

      await leaderboardApi.submitScore({
        userId,
        username: displayName,
        score,
        wordsLearned,
        streakDays,
      })

      // 重新載入排行榜和使用者排名
      loadLeaderboard()
      loadUserRank()
    } catch (err) {
      console.error('Failed to sync score:', err)
    }
  }

  // 設定暱稱對話框
  if (showUsernameDialog) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>設定您的暱稱</CardTitle>
          </CardHeader>
          <CardPanel>
            <p className="text-muted-foreground mb-4">
              設定暱稱後即可參與全球排行榜！
            </p>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="輸入暱稱 (2-20 字元)"
              maxLength={20}
              className="w-full px-4 py-2 border border-border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSetUsername()
                }
              }}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>
                跳過
              </Button>
              <Button onClick={handleSetUsername} className="flex-1">
                確定
              </Button>
            </div>
          </CardPanel>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← 返回
        </Button>
        <h1 className="text-2xl font-bold">全球排行榜</h1>
        <div className="w-20" />
      </div>

      {/* 當前使用者排名 */}
      {userRank && (
        <Card className="mb-6 bg-primary text-primary-foreground">
          <CardPanel>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90">您的排名</div>
                <div className="text-2xl font-bold">#{userRank.rank}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{username}</div>
                <div className="text-sm opacity-90">
                  {userRank.score} 分 · {userRank.wordsLearned} 單字 · {userRank.streakDays} 天
                </div>
              </div>
            </div>
          </CardPanel>
        </Card>
      )}

      {/* 排行榜列表 */}
      <Card>
        <CardHeader>
          <CardTitle>排行榜</CardTitle>
        </CardHeader>
        <CardPanel>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              載入中...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              目前還沒有排行榜資料
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.userId === userId
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        entry.rank === 1
                          ? 'default'
                          : entry.rank === 2 || entry.rank === 3
                          ? 'secondary'
                          : 'outline'
                      }
                      className="w-12 justify-center"
                    >
                      #{entry.rank}
                    </Badge>
                    <div>
                      <div className="font-bold">{entry.username}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.wordsLearned} 單字 · {entry.streakDays} 天連續
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{entry.score}</div>
                    <div className="text-xs text-muted-foreground">分</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                上一頁
              </Button>
              <div className="flex items-center px-4 text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                下一頁
              </Button>
            </div>
          )}
        </CardPanel>
      </Card>

      {/* 更新分數按鈕 */}
      {username && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => syncScore(username)}
          >
            同步最新分數
          </Button>
        </div>
      )}
    </div>
  )
}
