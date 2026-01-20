import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/utils/cn'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * PageTransition - Adds smooth fade-in animation when navigating between pages
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const [displayedChildren, setDisplayedChildren] = useState(children)

  useEffect(() => {
    // Fade out
    setIsVisible(false)

    // Small delay then update content and fade in
    const timer = setTimeout(() => {
      setDisplayedChildren(children)
      setIsVisible(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [location.pathname]) // Re-trigger on route change

  // Also update children when they change (but don't trigger animation)
  useEffect(() => {
    setDisplayedChildren(children)
  }, [children])

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        className
      )}
    >
      {displayedChildren}
    </div>
  )
}
