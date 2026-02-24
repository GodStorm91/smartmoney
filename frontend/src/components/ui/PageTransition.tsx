import { useEffect, useState, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/utils/cn'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * PageTransition - Smooth fade + subtle slide on route changes.
 * Uses opacity + translateY for GPU-composited performance.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation()
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const [displayedChildren, setDisplayedChildren] = useState(children)
  const prevPathRef = useRef(location.pathname)

  useEffect(() => {
    // Skip animation on first mount
    if (prevPathRef.current === location.pathname) {
      setDisplayedChildren(children)
      return
    }
    prevPathRef.current = location.pathname

    // Phase 1: fade out current content
    setPhase('exit')

    // Phase 2: swap content and fade in
    const timer = setTimeout(() => {
      setDisplayedChildren(children)
      setPhase('enter')
    }, 120)

    return () => clearTimeout(timer)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update children without animation when content changes on same route
  useEffect(() => {
    if (prevPathRef.current === location.pathname) {
      setDisplayedChildren(children)
    }
  }, [children, location.pathname])

  return (
    <div
      className={cn(
        'transition-[opacity,transform] ease-out',
        phase === 'enter'
          ? 'duration-250 opacity-100 translate-y-0'
          : 'duration-100 opacity-0 translate-y-1',
        className
      )}
    >
      {displayedChildren}
    </div>
  )
}
