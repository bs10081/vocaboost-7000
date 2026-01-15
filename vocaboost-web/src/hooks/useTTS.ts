import { useCallback, useRef, useState } from 'react'

interface DictionaryPhonetic {
  audio?: string
  text?: string
}

interface DictionaryEntry {
  phonetics?: DictionaryPhonetic[]
}

/**
 * 文字轉語音 (TTS) Hook
 * 優先使用 Free Dictionary API 的真人發音音頻
 * Fallback 到 Web Speech API
 */
export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const speak = useCallback(async (word: string) => {
    // 停止之前的播放
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setIsLoading(true)

    try {
      // 嘗試從詞典 API 獲取音頻
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      )

      if (response.ok) {
        const data: DictionaryEntry[] = await response.json()
        const audioUrl = data[0]?.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio

        if (audioUrl) {
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          await audio.play()
          return
        }
      }
    } catch (error) {
      console.warn('Dictionary API failed, falling back to Web Speech API:', error)
    } finally {
      setIsLoading(false)
    }

    // Fallback: 使用 Web Speech API
    fallbackSpeak(word)
  }, [])

  const fallbackSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('TTS not supported in this browser')
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9 // 稍慢一點，適合學習
    window.speechSynthesis.speak(utterance)
  }

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return { speak, stop, isLoading }
}
