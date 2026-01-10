import { useState, useEffect } from 'react'
import type { VocabularyWord } from '@/types/vocabulary'

/**
 * 載入單字資料的 Hook
 */
export function useVocabulary() {
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadVocabulary() {
      try {
        setLoading(true)
        const response = await fetch('/vocabulary.json')

        if (!response.ok) {
          throw new Error('Failed to load vocabulary')
        }

        const data: VocabularyWord[] = await response.json()
        setVocabulary(data)
        setError(null)
      } catch (err) {
        console.error('Error loading vocabulary:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadVocabulary()
  }, [])

  return { vocabulary, loading, error }
}
