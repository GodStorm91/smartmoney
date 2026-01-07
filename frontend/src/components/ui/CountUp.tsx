import { useState, useEffect, useRef } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  formatter?: (value: number) => string
  onComplete?: () => void
}

/**
 * CountUp - Animated number counter
 * Smoothly animates from 0 to target value using easeOutQuart
 */
export function CountUp({
  end,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatter,
  onComplete,
}: CountUpProps) {
  const [value, setValue] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const prevEndRef = useRef(end)

  useEffect(() => {
    // Only reset if end value actually changed significantly
    if (Math.abs(prevEndRef.current - end) < 0.01) return
    prevEndRef.current = end

    setValue(0)
    startTimeRef.current = null

    // Skip animation for zero
    if (end === 0) {
      setValue(0)
      return
    }

    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4)
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutQuart(progress)

      setValue(easedProgress * end)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setValue(end)
        onComplete?.()
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [end, duration, onComplete])

  const displayValue = formatter ? formatter(value) : `${prefix}${value.toFixed(decimals)}${suffix}`

  return <span className={className}>{displayValue}</span>
}
