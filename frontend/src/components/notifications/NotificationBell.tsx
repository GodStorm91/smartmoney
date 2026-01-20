import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { NotificationCenter } from './NotificationCenter'
import { notificationService } from '@/services/notification-service'

interface NotificationBellProps {
  onViewAll?: () => void
  className?: string
}

export function NotificationBell({ onViewAll, className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Fetch unread count for badge
  const { data: countData, isLoading } = useQuery({
    queryKey: ['notification-count'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 60000, // Refresh every minute
  })

  const unreadCount = countData?.unread_count || 0

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          isOpen && 'bg-gray-100 dark:bg-gray-800'
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1">
            <Badge
              variant="error"
              className="text-[10px] px-1 min-w-[18px] h-[18px] flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationCenter
          onClose={() => setIsOpen(false)}
          onViewAll={onViewAll}
        />
      )}
    </div>
  )
}
