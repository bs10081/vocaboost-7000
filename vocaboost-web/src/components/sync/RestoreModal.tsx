import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useSync } from '@/hooks/useSync'
import { validatePin } from '@/lib/crypto'

interface RestoreModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RestoreModal({ isOpen, onClose }: RestoreModalProps) {
  const { restoreData, isSyncing } = useSync()
  const [fullId, setFullId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    setFullId('')
    setPin('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate full ID format
    if (!fullId || !fullId.includes('#')) {
      setError('請輸入完整的 ID（格式：使用者名稱#TAG123）')
      return
    }

    // Validate PIN
    if (!validatePin(pin)) {
      setError('PIN 碼必須是 6 位數字')
      return
    }

    try {
      await restoreData(fullId, pin)
      setSuccess(true)
      // Auto-close after success and reload to apply changes
      setTimeout(() => {
        handleClose()
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '還原失敗')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
        {!success ? (
          <>
            <div>
              <h2 className="text-2xl font-bold">還原學習資料</h2>
              <p className="text-sm text-muted-foreground mt-1">
                輸入您的完整 ID 和 PIN 碼以還原學習資料
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">完整 ID</label>
                <input
                  type="text"
                  value={fullId}
                  onChange={(e) => setFullId(e.target.value.trim())}
                  placeholder="VocabMaster#A1B2C3"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400"
                  autoFocus
                  disabled={isSyncing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  格式：使用者名稱#識別碼（例如：小明#A1B2C3）
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">PIN 碼</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-mono text-center text-2xl tracking-widest text-gray-900 dark:text-white"
                  disabled={isSyncing}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
              )}

              <div className="rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-3 text-sm">
                ⚠️ 這將覆蓋目前裝置上的所有學習資料
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={handleClose} variant="outline" className="flex-1" disabled={isSyncing}>
                  取消
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSyncing || !fullId || pin.length !== 6}
                >
                  {isSyncing ? '還原中...' : '還原'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-bold">還原成功！</h2>
                <p className="text-sm text-muted-foreground mt-1">頁面即將重新載入以套用資料</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                重新載入中...
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
