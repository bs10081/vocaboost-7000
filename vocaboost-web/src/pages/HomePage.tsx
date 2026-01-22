import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardPanel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useVocabulary } from '@/hooks/useVocabulary'
import { storage } from '@/lib/storage'

export function HomePage() {
  const navigate = useNavigate()
  const { vocabulary, loading } = useVocabulary()
  const [completeLevelMode, setCompleteLevelMode] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  const dueWords = storage.getDueWords(vocabulary)
  const todayStats = storage.getTodayStats()
  const streakDays = storage.getStreakDays()

  const handleStartReview = () => {
    navigate('/study/review')
  }

  const handleStartNew = (level: number) => {
    if (completeLevelMode) {
      navigate(`/study/new/${level}?all=true`)
    } else {
      navigate(`/study/new/${level}`)
    }
  }

  const handleFavorites = () => {
    navigate('/study/favorite')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 標題 */}
      <div className="text-center mb-8 relative">
        <div className="absolute right-0 top-0">
          <ThemeToggle />
        </div>
        <h1 className="text-4xl font-bold mb-2">VocaBoost 7000</h1>
        <p className="text-muted-foreground">教育部 7000 單字學習 PWA</p>
      </div>

      {/* 統計摘要 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>今日學習</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{todayStats.new_words}</div>
              <div className="text-sm text-muted-foreground">新學單字</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{todayStats.reviewed_words}</div>
              <div className="text-sm text-muted-foreground">複習單字</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {todayStats.total_count > 0
                  ? Math.round((todayStats.correct_count / todayStats.total_count) * 100)
                  : 0}
                %
              </div>
              <div className="text-sm text-muted-foreground">正確率</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{streakDays}</div>
              <div className="text-sm text-muted-foreground">連續天數</div>
            </div>
          </div>
        </CardPanel>
      </Card>

      {/* 功能選單 */}
      <div className="space-y-4">
        {/* 開始複習 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardPanel className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-xl font-semibold">開始複習</h3>
              <p className="text-muted-foreground">複習今日到期的單字</p>
              {dueWords.length > 0 && (
                <Badge variant="destructive" className="mt-2">
                  {dueWords.length} 個待複習
                </Badge>
              )}
            </div>
            <Button size="lg" onClick={handleStartReview} disabled={dueWords.length === 0}>
              開始
            </Button>
          </CardPanel>
        </Card>

        {/* 學習新單字 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>學習新單字</CardTitle>
                <CardDescription>選擇級別開始學習</CardDescription>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completeLevelMode}
                  onChange={(e) => setCompleteLevelMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">完成整個級別</span>
              </label>
            </div>
          </CardHeader>
          <CardPanel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((level) => {
                const newWords = storage.getNewWords(vocabulary, level)
                return (
                  <Button
                    key={level}
                    variant="outline"
                    onClick={() => handleStartNew(level)}
                    disabled={newWords.length === 0}
                    className="h-20 flex flex-col"
                  >
                    <span className="text-lg font-bold">Level {level}</span>
                    <span className="text-sm text-muted-foreground">{newWords.length} 個</span>
                  </Button>
                )
              })}
            </div>
          </CardPanel>
        </Card>

        {/* 其他功能 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="secondary" onClick={handleFavorites} className="h-16">
            收藏難詞
          </Button>
          <Button variant="secondary" onClick={() => navigate('/leaderboard')} className="h-16">
            排行榜
          </Button>
          <Button variant="secondary" onClick={() => navigate('/stats')} className="h-16">
            學習統計
          </Button>
          <Button variant="secondary" onClick={() => navigate('/settings')} className="h-16">
            設定
          </Button>
        </div>
      </div>
    </div>
  )
}
