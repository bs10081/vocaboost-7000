import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardPanel } from '@/components/ui/Card'
import { storage } from '@/lib/storage'

export function SettingsPage() {
  const navigate = useNavigate()
  const [wordsPerSession, setWordsPerSession] = useState(20)

  // 載入設定
  useEffect(() => {
    const settings = storage.getSettings()
    setWordsPerSession(settings.words_per_session)
  }, [])

  const handleWordsPerSessionChange = (value: number) => {
    setWordsPerSession(value)
    storage.setSettings({ words_per_session: value })
  }

  const handleClearData = () => {
    if (confirm('確定要清除所有學習資料嗎？此操作無法復原。')) {
      storage.clearAllData()
      alert('資料已清除')
      navigate('/')
    }
  }

  const handleExportData = () => {
    const data = storage.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vocaboost-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const wordCountOptions = [5, 10, 15, 20, 30, 50]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← 返回
        </Button>
        <h1 className="text-2xl font-bold">設定</h1>
        <div className="w-20" />
      </div>

      <div className="space-y-4">
        {/* 學習設定 */}
        <Card>
          <CardHeader>
            <CardTitle>學習設定</CardTitle>
            <CardDescription>自訂學習體驗</CardDescription>
          </CardHeader>
          <CardPanel className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">
                每次學習單字數量
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {wordCountOptions.map((count) => (
                  <Button
                    key={count}
                    variant={wordsPerSession === count ? 'default' : 'outline'}
                    onClick={() => handleWordsPerSessionChange(count)}
                    className="h-12"
                  >
                    {count}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                選擇較少單字適合短時間學習，較多單字適合長時間專注學習。
              </p>
            </div>
          </CardPanel>
        </Card>

        {/* 資料管理 */}
        <Card>
          <CardHeader>
            <CardTitle>資料管理</CardTitle>
          </CardHeader>
          <CardPanel className="space-y-3">
            <Button variant="secondary" onClick={handleExportData} className="w-full">
              匯出學習資料
            </Button>
            <Button variant="destructive" onClick={handleClearData} className="w-full">
              清除所有資料
            </Button>
          </CardPanel>
        </Card>

        {/* 關於 */}
        <Card>
          <CardHeader>
            <CardTitle>關於</CardTitle>
          </CardHeader>
          <CardPanel>
            <p className="text-sm text-muted-foreground">
              VocaBoost 7000 - 教育部 7000 單字學習 PWA
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              版本 1.0.0 | 使用 COSS UI + React + TypeScript
            </p>
          </CardPanel>
        </Card>
      </div>
    </div>
  )
}
