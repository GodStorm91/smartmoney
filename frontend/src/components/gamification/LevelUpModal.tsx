import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Crown, Sparkles } from 'lucide-react'
import { Confetti } from '@/components/ui/Confetti'
import { cn } from '@/utils/cn'

interface LevelUpModalProps {
  open: boolean
  newLevel: number
  onClose: () => void
}

export function LevelUpModal({ open, newLevel, onClose }: LevelUpModalProps) {
  const { t } = useTranslation('common')

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [open, onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <Confetti active={open} duration={3000} pieces={100} />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
      >
        <div
          className={cn(
            'relative text-center p-8 rounded-3xl bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500',
            'shadow-2xl transform transition-all duration-300',
            'animate-bounce-in'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkle decorations */}
          <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-yellow-300 animate-pulse" />
          <Sparkles className="absolute -top-2 -right-6 w-6 h-6 text-pink-300 animate-pulse delay-100" />
          <Sparkles className="absolute -bottom-3 left-8 w-5 h-5 text-orange-300 animate-pulse delay-200" />

          {/* Crown icon */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <Crown className="w-12 h-12 text-yellow-100" />
          </div>

          {/* Level text */}
          <h2
            id="levelup-title"
            className="text-5xl font-bold text-white mb-2 drop-shadow-lg"
          >
            {t('gamification.levelUp', { level: newLevel }) || `Level ${newLevel}!`}
          </h2>

          <p className="text-white/90 text-lg mb-6">
            {t('gamification.levelUpMessage') || 'Congratulations! Keep up the great work!'}
          </p>

          {/* Continue button */}
          <button
            onClick={onClose}
            className={cn(
              'px-8 py-3 rounded-full font-bold text-lg',
              'bg-white text-orange-600 hover:bg-orange-50',
              'shadow-lg hover:shadow-xl transition-all',
              'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-500'
            )}
          >
            {t('button.continue') || 'Continue'}
          </button>
        </div>
      </div>
    </>
  )
}

export default LevelUpModal
