/**
 * VoiceInputButton - Microphone button for voice transaction input
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, X, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { parseVoiceTransaction, formatParsedTransaction, type ParsedTransaction } from '@/utils/parseVoiceTransaction'

interface VoiceInputButtonProps {
  onTransactionParsed: (parsed: ParsedTransaction) => void
  className?: string
}

export function VoiceInputButton({ onTransactionParsed, className }: VoiceInputButtonProps) {
  const { t } = useTranslation('common')
  const [showPreview, setShowPreview] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedTransaction | null>(null)

  const {
    status,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
  } = useVoiceInput({
    language: 'ja-JP',
    onResult: (text) => {
      const parsed = parseVoiceTransaction(text)
      if (parsed) {
        setParsedResult(parsed)
        setShowPreview(true)
      }
    },
  })

  // Reset when closed
  useEffect(() => {
    if (!showPreview) {
      setParsedResult(null)
    }
  }, [showPreview])

  const handleConfirm = () => {
    if (parsedResult) {
      onTransactionParsed(parsedResult)
      setShowPreview(false)
      resetTranscript()
    }
  }

  const handleCancel = () => {
    setShowPreview(false)
    resetTranscript()
  }

  const handleMicClick = () => {
    if (status === 'listening') {
      stopListening()
    } else {
      startListening()
    }
  }

  // Not supported - show disabled button
  if (!isSupported) {
    return (
      <button
        disabled
        className={cn(
          'p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed',
          className
        )}
        title={t('voiceInput.notSupported')}
      >
        <MicOff className="w-5 h-5" />
      </button>
    )
  }

  // Preview mode - show parsed result
  if (showPreview && parsedResult) {
    const modalContent = (
      <div className={cn(
        'fixed inset-0 z-[100000] flex items-center justify-center bg-black/50',
        className
      )}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('voiceInput.confirm')}
          </h3>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-numbers">
              {formatParsedTransaction(parsedResult)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              "{transcript}"
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 mx-auto" />
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <Check className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>
      </div>
    )

    if (typeof document === 'undefined') return null
    return createPortal(modalContent, document.body)
  }

  // Main mic button
  return (
    <div className="relative">
      <button
        onClick={handleMicClick}
        className={cn(
          'p-3 rounded-full transition-all',
          status === 'listening'
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
          className
        )}
        title={status === 'listening' ? t('voiceInput.listening') : t('voiceInput.tap')}
      >
        {status === 'listening' ? (
          <Mic className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Status indicator */}
      {status === 'listening' && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-red-500 dark:text-red-400 font-medium">
            {t('voiceInput.listening')}
          </span>
        </div>
      )}

      {status === 'processing' && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
            {t('voiceInput.processing')}
          </span>
        </div>
      )}

      {status === 'error' && error && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-red-500 dark:text-red-400">
            {t('voiceInput.tryAgain')}
          </span>
        </div>
      )}

      {/* Transcript preview while listening */}
      {status === 'listening' && transcript && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 min-w-[200px]">
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
            {transcript}
          </p>
        </div>
      )}
    </div>
  )
}
