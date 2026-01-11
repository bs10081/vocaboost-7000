import React, { useRef } from 'react'
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
}

export function FlashCard({
  word,
  isFlipped,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}: FlashCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // 觸控手勢
  useSwipe(cardRef, {
    onTap: onFlip,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    threshold: 60,
  })

  return (
    <div ref={cardRef} className="w-full max-w-md mx-auto perspective-1000">
      <Card
        className={cn(
          "flip-card cursor-pointer select-none",
          "h-80 sm:h-96 md:h-[28rem]",
          "transition-transform duration-300 hover:scale-105"
        )}
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
    </div>
  )
}
