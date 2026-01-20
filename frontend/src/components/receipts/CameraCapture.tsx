/**
 * Camera Capture - Full screen camera for mobile receipt capture
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, RotateCcw, Check, Camera } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(true)

  const startCamera = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera for receipts
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setError(t('receipt.cameraError', 'Could not access camera'))
    } finally {
      setIsStarting(false)
    }
  }, [t])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0)

    // Convert to JPEG base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageData)
    stopCamera()
  }, [stopCamera])

  const retake = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  const confirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage)
    }
  }, [capturedImage, onCapture])

  // Start camera on mount
  useEffect(() => {
    startCamera()
    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8 text-center">
        <Camera size={48} className="text-gray-400 mb-4" />
        <p className="text-red-400 mb-6">{error}</p>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          {t('close', 'Close')}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <button
          onClick={onCancel}
          className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label={t('close', 'Close')}
        >
          <X size={24} />
        </button>
        <span className="text-white font-medium">
          {t('receipt.scanReceipt', 'Scan Receipt')}
        </span>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {isStarting && !capturedImage && (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            <p className="text-white">{t('receipt.startingCamera', 'Starting camera...')}</p>
          </div>
        )}

        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            onLoadedMetadata={() => setIsStarting(false)}
          />
        ) : (
          <img
            src={capturedImage}
            alt="Captured receipt"
            className="max-w-full max-h-full object-contain"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50 flex justify-center gap-8 absolute bottom-0 left-0 right-0 safe-area-bottom">
        {!capturedImage ? (
          <button
            onClick={capturePhoto}
            disabled={isStarting}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-50 transition-opacity"
            aria-label={t('receipt.takePhoto', 'Take Photo')}
          >
            <div className="w-14 h-14 rounded-full border-4 border-black" />
          </button>
        ) : (
          <>
            <button
              onClick={retake}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RotateCcw size={20} />
              {t('receipt.retake', 'Retake')}
            </button>
            <button
              onClick={confirm}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Check size={20} />
              {t('receipt.usePhoto', 'Use Photo')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
