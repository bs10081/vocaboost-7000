import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FlashCard } from '@/components/study/FlashCard'
import { AnswerButtons } from '@/components/study/AnswerButtons'
import { KeyboardHints } from '@/components/study/KeyboardHints'
import { TTSButton } from '@/components/study/TTSButton'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useVocabulary } from '@/hooks/useVocabulary'
import { useStudyStore } from '@/stores/studyStore'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useTTS } from '@/hooks/useTTS'
import { useSync } from '@/hooks/useSync'
import { storage } from '@/lib/storage'

export function StudyPage() {
  const navigate = useNavigate()
  const { mode, level } = useParams<{ mode: string; level?: string }>()
  const [searchParams] = useSearchParams()
  const { vocabulary, loading } = useVocabulary()
  const { speak, isLoading: ttsLoading } = useTTS()
  const { autoSync, isEnabled: syncEnabled } = useSync()

  const {
    words,
    currentIndex,
    isFlipped,
    wrongWords,
    history,
    startStudy,
    flipCard,
    answerKnow,
    answerDontKnow,
    goToPrevious,
    reset,
    isFinished,
    startRetest,
    toggleCurrentDifficult,
  } = useStudyStore()

  // 追蹤困難狀態變化
  const [difficultStates, setDifficultStates] = useState<Record<number, boolean>>({})

  // 處理標記困難
  const handleToggleDifficult = () => {
    if (!words[currentIndex]) return
    const newState = toggleCurrentDifficult()
    setDifficultStates(prev => ({
      ...prev,
      [words[currentIndex].id]: newState
    }))
  }

  // 初始化學習
  useEffect(() => {
    if (loading || !mode) return

    const levelNum = level ? parseInt(level) : undefined
    const completeLevel = searchParams.get('all') === 'true'
    startStudy(mode as any, vocabulary, levelNum, completeLevel)
  }, [mode, level, vocabulary, loading, searchParams])

  // 自動同步：完成學習後觸發
  useEffect(() => {
    if (isFinished() && syncEnabled) {
      console.log('Study completed, triggering auto-sync...')
      autoSync()
    }
  }, [currentIndex, words.length, syncEnabled, autoSync, isFinished])

  // 鍵盤操控
  useKeyboard({
    enabled: true,
    handlers: {
      arrowleft: answerDontKnow,
      arrowright: answerKnow,
      arrowup: goToPrevious,
      ' ': flipCard,
      g: () => {
        if (words[currentIndex]) {
          speak(words[currentIndex].word)
        }
      },
      d: handleToggleDifficult,
    },
  })

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

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">沒有可學習的單字</h2>
          <Button onClick={() => navigate('/')}>返回首頁</Button>
        </div>
      </div>
    )
  }

  // 檢查是否完成
  if (isFinished()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold mb-4">完成學習！</h2>
          <p className="text-lg text-muted-foreground mb-2">
            共學習了 {words.length} 個單字
          </p>
          {wrongWords.length > 0 && (
            <p className="text-sm text-destructive mb-6">
              其中 {wrongWords.length} 個需要加強複習
            </p>
          )}
          <div className="flex gap-3 justify-center">
            {wrongWords.length > 0 && (
              <Button size="lg" variant="destructive" onClick={startRetest}>
                立即重測錯詞
              </Button>
            )}
            <Button size="lg" onClick={() => navigate('/')}>
              返回首頁
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentWord = words[currentIndex]
  const progress = ((currentIndex / words.length) * 100).toFixed(0)

  // 取得當前單字的困難狀態
  const currentProgress = storage.getProgress(currentWord.id)
  const isDifficult = difficultStates[currentWord.id] ?? currentProgress?.is_difficult ?? false

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen flex flex-col">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← 返回
        </Button>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {currentIndex + 1} / {words.length}
          </Badge>
          <div className="text-sm text-muted-foreground">{progress}%</div>
        </div>
      </div>

      {/* 進度條 */}
      <div className="w-full bg-secondary rounded-full h-2 mb-8">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 翻牌卡片 */}
      <div className="flex-1 flex items-center justify-center mb-8">
        <FlashCard
          word={currentWord}
          isFlipped={isFlipped}
          onFlip={flipCard}
        />
      </div>

      {/* TTS 按鈕和標記困難 */}
      <div className="flex justify-center gap-3 mb-4">
        <TTSButton
          text={currentWord.word}
          isLoading={ttsLoading}
          onClick={() => speak(currentWord.word)}
        />
        <Button
          variant={isDifficult ? 'destructive' : 'outline'}
          size="sm"
          onClick={handleToggleDifficult}
          title={isDifficult ? '取消困難標記' : '標記為困難'}
        >
          {isDifficult ? '⚠️ 困難' : '📌 標記困難'}
        </Button>
      </div>

      {/* 答題按鈕 */}
      <div className="mb-6">
        <AnswerButtons
          onDontKnow={answerDontKnow}
          onKnow={answerKnow}
          onPrevious={goToPrevious}
          onFlip={flipCard}
          canGoPrevious={history.length > 0}
        />
      </div>

      {/* 鍵盤提示 */}
      <div className="mb-4">
        <KeyboardHints />
      </div>

      {/* 觸控提示（行動裝置） */}
      <div className="flex md:hidden justify-center text-sm text-muted-foreground">
        <span>點擊卡片翻面</span>
      </div>

      {/* 錯誤統計 */}
      {wrongWords.length > 0 && (
        <div className="mt-4 text-center">
          <Badge variant="destructive">{wrongWords.length} 個答錯待重測</Badge>
        </div>
      )}
    </div>
  )
}
