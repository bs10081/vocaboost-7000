import React from 'react'
import { Button } from '@/components/ui/Button'

interface AnswerButtonsProps {
  onDontKnow: () => void
  onKnow: () => void
  disabled?: boolean
}

export function AnswerButtons({ onDontKnow, onKnow, disabled }: AnswerButtonsProps) {
  return (
    <div className="flex gap-4 justify-center w-full max-w-md mx-auto">
      <Button
        variant="destructive"
        size="lg"
        onClick={onDontKnow}
        disabled={disabled}
        className="flex-1"
      >
        <span className="mr-2">←</span>
        不會
      </Button>
      <Button
        variant="default"
        size="lg"
        onClick={onKnow}
        disabled={disabled}
        className="flex-1"
      >
        會
        <span className="ml-2">→</span>
      </Button>
    </div>
  )
}
