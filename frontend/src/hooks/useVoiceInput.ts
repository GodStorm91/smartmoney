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
  const statusRef = useRef<VoiceInputStatus>('idle')
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const isStartingRef = useRef(false) // Prevent duplicate starts

  // Keep refs in sync with current values (avoid stale closures)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
  }, [])

  // Initialize recognition - only depends on language, NOT on status
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true // Keep listening until explicitly stopped (PTT mode)
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      isStartingRef.current = false
      setError(null)
      // Status already set in startListening for instant feedback
    }

    recognition.onresult = (event) => {
      const results = event.results
      const lastResult = results[results.length - 1]
      const text = lastResult[0].transcript

      setTranscript(text)

      // Don't auto-process on final result - wait for user to release button
      // The onResult callback will be called when user releases (stopListening)
    }

    recognition.onerror = (event) => {
      isStartingRef.current = false
      // Ignore 'aborted' errors (user stopped listening)
      if (event.error === 'aborted') return

      const errorMessage = event.error === 'no-speech'
        ? 'No speech detected'
        : event.error === 'audio-capture'
        ? 'Microphone not found'
        : event.error === 'not-allowed'
        ? 'Microphone access denied'
        : `Error: ${event.error}`

      setError(errorMessage)
      setStatus('error')
      onErrorRef.current?.(errorMessage)
    }

    recognition.onend = () => {
      isStartingRef.current = false
      // Only reset to idle if we're still in listening state
      // (not if we transitioned to processing)
      if (statusRef.current === 'listening') {
        setStatus('idle')
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [language]) // Removed status, onResult, onError from deps - they cause re-init

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    // Prevent duplicate starts from touch + mouse events
    if (isStartingRef.current || statusRef.current === 'listening') return

    isStartingRef.current = true
    setTranscript('')
    setError(null)
    setStatus('listening') // Set immediately for instant UI feedback

    try {
      recognitionRef.current.start()
    } catch (err) {
      // Recognition might already be started
      console.warn('Speech recognition start error:', err)
      isStartingRef.current = false
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    if (statusRef.current !== 'listening') return

    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.warn('Speech recognition stop error:', err)
    }

    // If we have a transcript, process it
    if (transcript) {
      setStatus('processing')
      onResultRef.current?.(transcript)
    } else {
      setStatus('idle')
    }
  }, [transcript])

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
