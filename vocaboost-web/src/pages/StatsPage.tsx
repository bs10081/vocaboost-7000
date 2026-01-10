import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useVocabulary } from '@/hooks/useVocabulary'
import { storage } from '@/lib/storage'

export function StatsPage() {
  const navigate = useNavigate()
  const { vocabulary } = useVocabulary()

  const allProgress = storage.getAllProgress()
  const todayStats = storage.getTodayStats()
  const streakDays = storage.getStreakDays()

  const totalLearned = allProgress.size
  const totalWords = vocabulary.length

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← 返回
        </Button>
        <h1 className="text-2xl font-bold">學習統計</h1>
        <div className="w-20" />
      </div>

      {/* 總體統計 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>總體進度</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">學習進度</span>
                <span className="font-bold">
                  {totalLearned} / {totalWords}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(totalLearned / totalWords) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{streakDays}</div>
                <div className="text-sm text-muted-foreground">連續天數</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{storage.getDueWords(vocabulary).length}</div>
                <div className="text-sm text-muted-foreground">待複習</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{storage.getFavorites(vocabulary).length}</div>
                <div className="text-sm text-muted-foreground">收藏</div>
              </div>
            </div>
          </div>
        </CardPanel>
      </Card>

      {/* 今日統計 */}
      <Card>
        <CardHeader>
          <CardTitle>今日學習</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">新學單字</div>
              <Badge variant="success" size="lg">
                {todayStats.new_words}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">複習單字</div>
              <Badge variant="info" size="lg">
                {todayStats.reviewed_words}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">答對</div>
              <Badge variant="success" size="lg">
                {todayStats.correct_count}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">正確率</div>
              <Badge variant="default" size="lg">
                {todayStats.total_count > 0
                  ? `${Math.round((todayStats.correct_count / todayStats.total_count) * 100)}%`
                  : '0%'}
              </Badge>
            </div>
          </div>
        </CardPanel>
      </Card>
    </div>
  )
}
