import { useCallback } from 'react'

/**
 * 文字轉語音 (TTS) Hook
 * 使用 Web Speech API 實作
 */
export function useTTS() {
  const speak = useCallback((text: string, lang: string = 'en-US', rate: number = 0.9) => {
    if (!('speechSynthesis' in window)) {
      console.warn('TTS not supported in this browser')
      return
    }

    // 取消正在播放的語音
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate // 稍慢一點，適合學習

    // 嘗試選擇較好的英文發音引擎
    const voices = window.speechSynthesis.getVoices()
    const englishVoice =
      voices.find((v) => v.lang.startsWith('en') && v.name.includes('Enhanced')) ||
      voices.find((v) => v.lang.startsWith('en'))

    if (englishVoice) {
      utterance.voice = englishVoice
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return { speak, stop }
}
