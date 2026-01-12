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
  const [mode, setMode] = useState<'simple' | 'select'>('simple')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [multipleAccounts, setMultipleAccounts] = useState<Array<{
    tag: string
    fullId: string
    updatedAt: string
  }> | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const handleClose = () => {
    setMode('simple')
    setUsername('')
    setPin('')
    setError(null)
    setSuccess(false)
    setMultipleAccounts(null)
    setSelectedTag(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate PIN
    if (!validatePin(pin)) {
      setError('PIN 碼必須是 6 位數字')
      return
    }

    // Validate username
    if (!username || username.length < 2) {
      setError('請輸入使用者名稱')
      return
    }

    try {
      // If in select mode, we need a selected tag
      if (mode === 'select' && !selectedTag) {
        setError('請選擇一個帳號')
        return
      }

      // Construct fullId based on mode
      const fullId = mode === 'select' && selectedTag
        ? `${username}#${selectedTag}`
        : username // For simple mode, we'll use username only

      await restoreData(fullId, pin, mode === 'simple')
      setSuccess(true)
      // Auto-close after success and reload to apply changes
      setTimeout(() => {
        handleClose()
        window.location.reload()
      }, 2000)
    } catch (err) {
      const error = err as Error & { accounts?: Array<{ tag: string; fullId: string; updatedAt: string }> }

      // Check if error has accounts (multiple accounts case)
      if (error.accounts && error.accounts.length > 0) {
        setMultipleAccounts(error.accounts)
        setMode('select')
        setError(null)
      } else {
        setError(error.message || '還原失敗')
      }
    }
  }

  const formatLastSynced = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (hours < 1) return '剛剛'
    if (hours < 24) return `${hours} 小時前`
    return `${days} 天前`
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
                {mode === 'simple' ? '輸入您的使用者名稱和 PIN 碼' : '請選擇您的帳號'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'simple' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">使用者名稱</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.trim())}
                      placeholder="VocabMaster"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
                      autoFocus
                      disabled={isSyncing}
                    />
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
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-3 text-sm">
                    ⚠️ 有多個帳號使用相同的名稱和 PIN，請選擇您的帳號
                  </div>

                  <div className="space-y-2">
                    {multipleAccounts?.map((account) => (
                      <label
                        key={account.tag}
                        className="flex items-center p-3 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <input
                          type="radio"
                          name="account"
                          value={account.tag}
                          checked={selectedTag === account.tag}
                          onChange={() => setSelectedTag(account.tag)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                            {account.fullId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            最後同步：{formatLastSynced(account.updatedAt)}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
              )}

              {mode === 'simple' && (
                <div className="rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-3 text-sm">
                  ⚠️ 這將覆蓋目前裝置上的所有學習資料
                </div>
              )}

              <div className="flex gap-2">
                {mode === 'select' && (
                  <Button
                    type="button"
                    onClick={() => {
                      setMode('simple')
                      setMultipleAccounts(null)
                      setSelectedTag(null)
                      setError(null)
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isSyncing}
                  >
                    返回
                  </Button>
                )}
                <Button type="button" onClick={handleClose} variant="outline" className="flex-1" disabled={isSyncing}>
                  取消
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSyncing || (mode === 'simple' && (!username || pin.length !== 6)) || (mode === 'select' && !selectedTag)}
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
