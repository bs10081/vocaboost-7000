import React, { useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardPanel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { VocabularyWord } from '@/types/vocabulary'
import { cn } from '@/lib/utils'
import { useSwipe } from '@/hooks/useSwipe'

interface FlashCardProps {
  word: VocabularyWord
  isFlipped: boolean
  onFlip: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function FlashCard({
  word,
  isFlipped,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
}: FlashCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null)

  // 處理滑動結束後的動畫協調
  const handleSwipe = (direction: 'left' | 'right' | 'up' | 'down', callback?: () => void) => {
    setExitDirection(direction)

    // 等待動畫完成後執行回調
    setTimeout(() => {
      callback?.()
      setExitDirection(null)
      setSwipeOffset({ x: 0, y: 0 })
    }, 300)
  }

  // 觸控手勢
  useSwipe(cardRef, {
    onTap: onFlip,
    onSwipeLeft: () => handleSwipe('left', onSwipeLeft),
    onSwipeRight: () => handleSwipe('right', onSwipeRight),
    onSwipeUp: () => handleSwipe('up', onSwipeUp),
    onSwipeDown: () => handleSwipe('down', onSwipeDown),
    onSwipeMove: (deltaX, deltaY) => {
      if (!exitDirection) {
        setSwipeOffset({ x: deltaX, y: deltaY })
      }
    },
    onSwipeEnd: () => {
      if (!exitDirection) {
        setSwipeOffset({ x: 0, y: 0 })
      }
    },
    threshold: 60,
  })

  // 動態樣式：跟隨手指或執行退出動畫
  const cardStyle = exitDirection
    ? {}
    : {
        transform: `translateX(${swipeOffset.x}px) translateY(${swipeOffset.y}px) rotate(${swipeOffset.x * 0.05}deg)`,
        transition: 'none',
      }

  return (
    <div ref={cardRef} className="w-full max-w-md mx-auto perspective-1000 relative">
      <Card
        className={cn(
          "flip-card cursor-pointer select-none",
          "h-80 sm:h-96 md:h-[28rem]",
          "transition-transform duration-300 hover:scale-105",
          exitDirection && `swipe-exit-${exitDirection}`
        )}
        style={cardStyle}
      >
        <div className={cn("flip-card-inner", isFlipped && "flipped")}>
          {/* 正面：英文 */}
          <CardPanel className="flip-card-front">
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <Badge variant="secondary" size="lg">
                Level {word.level}
              </Badge>
              <CardHeader className="text-center">
                <CardTitle className="text-4xl sm:text-5xl md:text-6xl font-bold">
                  {word.word}
                </CardTitle>
                <CardDescription className="text-lg sm:text-xl mt-4">
                  [{word.phonetic}]
                </CardDescription>
              </CardHeader>
              <Badge variant="outline">{word.part_of_speech}</Badge>
            </div>
          </CardPanel>

          {/* 背面：中文翻譯 */}
          <CardPanel className="flip-card-back bg-primary text-primary-foreground">
            <div className="flex flex-col items-center justify-center h-full">
              <CardTitle className="text-3xl sm:text-4xl md:text-5xl text-center px-6">
                {word.translation}
              </CardTitle>
            </div>
          </CardPanel>
        </div>
      </Card>

      {/* 視覺指示器 */}
      {!exitDirection && swipeOffset.x > 30 && (
        <div className="absolute top-4 right-4 text-green-500 text-2xl font-bold border-4 border-green-500 px-4 py-2 rounded-lg rotate-12 bg-white/90">
          會 ✓
        </div>
      )}
      {!exitDirection && swipeOffset.x < -30 && (
        <div className="absolute top-4 left-4 text-red-500 text-2xl font-bold border-4 border-red-500 px-4 py-2 rounded-lg -rotate-12 bg-white/90">
          不會 ✗
        </div>
      )}
      {!exitDirection && swipeOffset.y > 30 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-blue-500 text-xl font-bold border-4 border-blue-500 px-4 py-2 rounded-lg bg-white/90">
          上一題 ↓
        </div>
      )}
    </div>
  )
}
