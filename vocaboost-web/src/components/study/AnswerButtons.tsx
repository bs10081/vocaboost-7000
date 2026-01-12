import React from 'react'
import { Button } from '@/components/ui/Button'

interface AnswerButtonsProps {
  onDontKnow: () => void
  onKnow: () => void
  onPrevious?: () => void
  disabled?: boolean
  canGoPrevious?: boolean
}

export function AnswerButtons({ onDontKnow, onKnow, onPrevious, disabled, canGoPrevious }: AnswerButtonsProps) {
  return (
    <div className="flex gap-2 justify-center w-full max-w-md mx-auto">
      {canGoPrevious && onPrevious && (
        <Button
          variant="outline"
          size="lg"
          onClick={onPrevious}
          disabled={disabled}
          className="px-4 md:px-6 h-12 md:h-11"
        >
          <span className="text-lg">↶</span>
          <span className="ml-1 hidden sm:inline">上一題</span>
        </Button>
      )}
      <Button
        variant="destructive"
        size="lg"
        onClick={onDontKnow}
        disabled={disabled}
        className="flex-1 h-12 md:h-11"
      >
        <span className="mr-2">←</span>
        不會
      </Button>
      <Button
        variant="default"
        size="lg"
        onClick={onKnow}
        disabled={disabled}
        className="flex-1 h-12 md:h-11"
      >
        會
        <span className="ml-2">→</span>
      </Button>
    </div>
  )
}
