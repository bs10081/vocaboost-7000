import React from 'react'
import { Kbd, KbdGroup } from '@/components/ui/Kbd'

export function KeyboardHints() {
  return (
    <div className="hidden md:flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Kbd>←</Kbd>
        <span>不會</span>
      </div>
      <div className="flex items-center gap-2">
        <Kbd>→</Kbd>
        <span>會</span>
      </div>
      <div className="flex items-center gap-2">
        <Kbd>↑</Kbd>
        <span>上一題</span>
      </div>
      <div className="flex items-center gap-2">
        <KbdGroup>
          <Kbd>Space</Kbd>
        </KbdGroup>
        <span>翻面</span>
      </div>
      <div className="flex items-center gap-2">
        <Kbd>G</Kbd>
        <span>朗讀</span>
      </div>
    </div>
  )
}
