import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useSync } from '@/hooks/useSync'
import { validatePin } from '@/lib/crypto'

interface SetupModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SetupModal({ isOpen, onClose }: SetupModalProps) {
  const { register, isSyncing } = useSync()
  const [step, setStep] = useState<'input' | 'success'>('input')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [createdAccount, setCreatedAccount] = useState<{
    fullId: string
    warning?: string
    warningMessage?: string
  } | null>(null)

  const handleClose = () => {
    setStep('input')
    setUsername('')
    setPin('')
    setConfirmPin('')
    setError(null)
    setCreatedAccount(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate username
    if (!username || username.length < 2 || username.length > 20) {
      setError('使用者名稱需要 2-20 個字元')
      return
    }

    // Validate PIN
    if (!validatePin(pin)) {
      setError('PIN 碼必須是 6 位數字')
      return
    }

    // Check PIN match
    if (pin !== confirmPin) {
      setError('兩次輸入的 PIN 碼不一致')
      return
    }

    try {
      const account = await register(username, pin)
      setCreatedAccount(account)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立帳號失敗')
    }
  }

  const handleCopyId = () => {
    if (createdAccount) {
      navigator.clipboard.writeText(createdAccount.fullId)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
        {step === 'input' ? (
          <>
            {/* Input Step */}
            <div>
              <h2 className="text-2xl font-bold">建立雲端同步帳號</h2>
              <p className="text-sm text-muted-foreground mt-1">
                建立帳號後，您可以在其他裝置上輸入 ID 和 PIN 碼來還原學習資料
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">使用者名稱</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VocabMaster"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
                  autoFocus
                  disabled={isSyncing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">設定 PIN 碼（6 位數字）</label>
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

              <div>
                <label className="block text-sm font-medium mb-2">確認 PIN 碼</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-mono text-center text-2xl tracking-widest text-gray-900 dark:text-white"
                  disabled={isSyncing}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
              )}

              <div className="rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-3 text-sm">
                ⚠️ 請記住您的 PIN 碼，遺失將無法還原資料
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={handleClose} variant="outline" className="flex-1" disabled={isSyncing}>
                  取消
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSyncing || !username || pin.length !== 6 || confirmPin.length !== 6}
                >
                  {isSyncing ? '建立中...' : '建立帳號'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Success Step */}
            <div className="text-center space-y-4">
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
                <h2 className="text-2xl font-bold">帳號建立成功！</h2>
                <p className="text-sm text-muted-foreground mt-1">請記住您的完整 ID 和 PIN 碼</p>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <div className="text-sm text-muted-foreground mb-2">您的完整 ID</div>
                <div className="font-mono text-2xl font-bold break-all">{createdAccount?.fullId}</div>
              </div>

              {createdAccount?.warning === 'DUPLICATE_CREDENTIALS' && (
                <div className="rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-3 text-sm text-left">
                  <div className="font-semibold mb-1">⚠️ 注意</div>
                  <div>{createdAccount.warningMessage}</div>
                  <div className="mt-2 text-xs">
                    登入時需要輸入完整 ID（包含 #{createdAccount.fullId.split('#')[1]} 部分）
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                請記住此 ID 和 PIN 碼，以便在其他裝置還原資料
              </p>

              <div className="flex gap-2">
                <Button onClick={handleCopyId} variant="outline" className="flex-1">
                  複製 ID
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  確定
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
