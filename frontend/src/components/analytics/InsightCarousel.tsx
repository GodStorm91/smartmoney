import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useEmblaCarousel from 'embla-carousel-react'
import { InsightCard } from './InsightCard'
import { cn } from '@/utils/cn'
import type { SpendingInsight } from '@/types/analytics'

interface InsightCarouselProps {
  insights: SpendingInsight[]
  displayCurrency?: string
  onScrollToChart?: () => void
}

export function InsightCarousel({
  insights,
  displayCurrency = 'JPY',
  onScrollToChart,
}: InsightCarouselProps) {
  const { t } = useTranslation('common')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  })

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  if (!insights || insights.length === 0) {
    return null
  }

  return (
    <div className="relative">
      {/* Swipe hint for first-time users */}
      {insights.length > 1 && (
        <p className="text-xs text-gray-400 text-center mb-2">
          {t('analytics.swipeHint')}
        </p>
      )}

      {/* Carousel viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {insights.map((insight, index) => (
            <div
              key={`${insight.type}-${insight.category || index}`}
              className="flex-shrink-0 w-full min-w-0"
            >
              <InsightCard
                insight={insight}
                displayCurrency={displayCurrency}
                onScrollToChart={onScrollToChart}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {insights.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {insights.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to insight ${index + 1}`}
              className={cn(
                'h-2 rounded-full transition-[width,background-color] duration-200',
                index === selectedIndex
                  ? 'bg-primary-600 w-5'
                  : 'bg-gray-300 dark:bg-gray-600 w-2'
              )}
              onClick={() => emblaApi?.scrollTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
