import React from 'react'
import { Button } from '@/components/ui/Button'

interface TTSButtonProps {
  text: string
  disabled?: boolean
  isLoading?: boolean
  onClick?: () => void
}

export function TTSButton({ text, disabled, isLoading, onClick }: TTSButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="rounded-full h-12 w-12"
      title="朗讀 (G)"
    >
      {isLoading ? (
        // 載入動畫 - 旋轉圓圈
        <svg
          className="animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        // 喇叭圖示
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </Button>
  )
}
