/**
 * useVoiceInput - Web Speech API hook for voice-to-text input
 */
import { useState, useCallback, useEffect, useRef } from 'react'

// Web Speech API types (browser-native, not in TypeScript lib)
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

export type VoiceInputStatus = 'idle' | 'listening' | 'processing' | 'error'

interface UseVoiceInputOptions {
  language?: string
  onResult?: (text: string) => void
  onError?: (error: string) => void
}

interface UseVoiceInputReturn {
  status: VoiceInputStatus
  transcript: string
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  error: string | null
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { language = 'ja-JP', onResult, onError } = options

  const [status, setStatus] = useState<VoiceInputStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
  }, [])

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      setStatus('listening')
      setError(null)
    }

    recognition.onresult = (event) => {
      const results = event.results
      const lastResult = results[results.length - 1]
      const text = lastResult[0].transcript

      setTranscript(text)

      if (lastResult.isFinal) {
        setStatus('processing')
        onResult?.(text)
      }
    }

    recognition.onerror = (event) => {
      const errorMessage = event.error === 'no-speech'
        ? 'No speech detected'
        : event.error === 'audio-capture'
        ? 'Microphone not found'
        : event.error === 'not-allowed'
        ? 'Microphone access denied'
        : `Error: ${event.error}`

      setError(errorMessage)
      setStatus('error')
      onError?.(errorMessage)
    }

    recognition.onend = () => {
      if (status === 'listening') {
        setStatus('idle')
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [language, onResult, onError, status])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return

    setTranscript('')
    setError(null)

    try {
      recognitionRef.current.start()
    } catch (err) {
      // Recognition might already be started
      console.warn('Speech recognition start error:', err)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.warn('Speech recognition stop error:', err)
    }
    setStatus('idle')
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
    setStatus('idle')
  }, [])

  return {
    status,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
  }
}
