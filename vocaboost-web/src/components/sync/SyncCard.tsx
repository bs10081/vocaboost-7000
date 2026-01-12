import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardPanel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSync } from '@/hooks/useSync'
import { SetupModal } from './SetupModal'
import { RestoreModal } from './RestoreModal'

export function SyncCard() {
  const { account, isEnabled, lastSynced, isSyncing, syncNow, disconnect } = useSync()
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSync = async () => {
    if (!pin) {
      setError('請輸入 PIN 碼')
      return
    }

    setError(null)
    setSuccess(null)

    try {
      await syncNow(pin)
      setSuccess('同步成功！')
      setPin('')
      setShowPinInput(false)

      // 3 秒後自動清除成功消息
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : '同步失敗'
      // 改進錯誤訊息
      if (message === 'INVALID_PIN' || message.includes('Invalid PIN')) {
        setError('PIN 碼錯誤，請確認輸入的是註冊時設定的 6 位數字')
      } else {
        setError(message)
      }
    }
  }

  const formatLastSynced = (date: Date | null) => {
    if (!date) return '從未同步'

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '剛剛'
    if (minutes < 60) return `${minutes} 分鐘前`
    if (hours < 24) return `${hours} 小時前`
    return `${days} 天前`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>雲端同步</CardTitle>
              <CardDescription>跨裝置同步學習進度</CardDescription>
            </div>
            {isEnabled && (
              <Badge variant={isSyncing ? 'default' : 'secondary'}>
                {isSyncing ? '同步中...' : '已啟用'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardPanel>
          {!isEnabled ? (
            // 未啟用狀態
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                建立同步帳號後，您可以在不同裝置上繼續學習。資料採用端到端加密，伺服器無法讀取您的學習內容。
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setShowSetupModal(true)} className="flex-1">
                  建立同步帳號
                </Button>
                <Button onClick={() => setShowRestoreModal(true)} variant="outline" className="flex-1">
                  還原資料
                </Button>
              </div>
            </div>
          ) : (
            // 已啟用狀態
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm text-muted-foreground mb-1">您的同步 ID</div>
                <div className="font-mono text-lg font-semibold">{account?.fullId}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  最後同步：{formatLastSynced(lastSynced)}
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
              )}

              {success && (
                <div className="rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 p-3 text-sm">
                  {success}
                </div>
              )}

              {showPinInput ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">輸入 PIN 碼以同步</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 位數字"
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
                      autoFocus
                    />
                    <Button onClick={handleSync} disabled={isSyncing || pin.length !== 6}>
                      {isSyncing ? '同步中...' : '確認'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowPinInput(false)
                        setPin('')
                        setError(null)
                      }}
                      variant="outline"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowPinInput(true)
                      setError(null)
                      setSuccess(null)
                    }}
                    disabled={isSyncing}
                    className="flex-1"
                  >
                    立即同步
                  </Button>
                  <Button onClick={() => setShowRestoreModal(true)} variant="outline" className="flex-1">
                    還原資料
                  </Button>
                  <Button onClick={disconnect} variant="outline">
                    登出
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardPanel>
      </Card>

      <SetupModal isOpen={showSetupModal} onClose={() => setShowSetupModal(false)} />
      <RestoreModal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} />
    </>
  )
}
