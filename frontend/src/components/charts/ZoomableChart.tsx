import { useRef, useState, useCallback, ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'

interface ZoomableChartProps {
  children: ReactNode
  className?: string
  minScale?: number
  maxScale?: number
}

export function ZoomableChart({
  children,
  className = '',
  minScale = 1,
  maxScale = 3,
}: ZoomableChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  // Handle pinch gesture
  useGesture(
    {
      onPinch: ({ offset: [s], memo }) => {
        const newScale = Math.min(maxScale, Math.max(minScale, s))
        setScale(newScale)

        // Reset offset if zooming back to 1
        if (newScale <= 1) {
          setOffset({ x: 0, y: 0 })
        }

        return memo
      },
      onDrag: ({ offset: [x, y], pinching }) => {
        // Only allow drag when zoomed in
        if (scale > 1 && !pinching) {
          const maxOffset = ((scale - 1) * 100) / 2
          setOffset({
            x: Math.min(maxOffset, Math.max(-maxOffset, x)),
            y: Math.min(maxOffset, Math.max(-maxOffset, y)),
          })
        }
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault()
        const newScale = Math.min(maxScale, Math.max(minScale, scale - dy * 0.01))
        setScale(newScale)

        if (newScale <= 1) {
          setOffset({ x: 0, y: 0 })
        }
      },
    },
    {
      target: containerRef,
      pinch: { scaleBounds: { min: minScale, max: maxScale } },
      drag: { filterTaps: true },
      wheel: { preventDefault: true },
    }
  )

  return (
    <div className={`relative overflow-hidden touch-none ${className}`}>
      <div
        ref={containerRef}
        style={{
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s ease-out',
        }}
        className="w-full h-full"
      >
        {children}
      </div>

      {/* Zoom indicator and reset button */}
      {scale > 1 && (
        <button
          onClick={resetZoom}
          className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-gray-800/70 text-white rounded-md hover:bg-gray-700/70 transition-colors"
        >
          {Math.round(scale * 100)}% - Tap to reset
        </button>
      )}
    </div>
  )
}
