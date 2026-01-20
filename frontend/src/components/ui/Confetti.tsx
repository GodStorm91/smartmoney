import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  duration: number
  rotation: number
}

interface ConfettiProps {
  active: boolean
  duration?: number
  pieces?: number
  onComplete?: () => void
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

export function Confetti({ active, duration = 3000, pieces = 50, onComplete }: ConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (active) {
      // Generate confetti pieces
      const newConfetti: ConfettiPiece[] = Array.from({ length: pieces }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        rotation: Math.random() * 360,
      }))
      setConfetti(newConfetti)
      setIsVisible(true)

      // Clean up after duration
      const timer = setTimeout(() => {
        setIsVisible(false)
        setConfetti([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [active, duration, pieces, onComplete])

  if (!isVisible || confetti.length === 0) return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        >
          <div
            className="w-3 h-3 animate-confetti-spin"
            style={{
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        </div>
      ))}
    </div>,
    document.body
  )
}
