import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Check, Upload, Loader2, Crown, Star } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useProfile, useAvatars, useGamificationStats, useActivateAvatar, useUploadCustomAvatar, useUpdateProfile } from '@/services/rewards-service'
import { toast } from 'sonner'
import { convertHeicToJpeg, isHeicFile } from '@/utils/heic-converter'
import { cn } from '@/utils/cn'

interface ProfileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
}

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 border-gray-300 dark:bg-gray-800',
  rare: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30',
  epic: 'bg-purple-100 border-purple-300 dark:bg-purple-900/30',
  legendary: 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30',
}

export function ProfileBottomSheet({ isOpen, onClose }: ProfileBottomSheetProps) {
  const { t } = useTranslation('common')
  const { data: profile, refetch: refetchProfile } = useProfile()
  const { data: gamificationStats } = useGamificationStats()
  const { data: avatars = [] } = useAvatars(1)
  const { mutate: activateAvatar, isPending: activatingAvatar } = useActivateAvatar()
  const { mutate: uploadCustomAvatar, isPending: uploadingAvatar, isSuccess: uploadSuccess } = useUploadCustomAvatar()
  const { mutate: updateProfile, isPending: updatingProfile } = useUpdateProfile()

  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const level = gamificationStats?.current_level || profile?.level || 1
  const totalXP = gamificationStats?.total_xp || profile?.total_xp || 0
  const activeAvatar = profile?.active_avatar

  // Sync display name when profile loads
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
  }, [profile?.display_name])

  // Close upload state after success
  useEffect(() => {
    if (uploadSuccess) {
      refetchProfile()
    }
  }, [uploadSuccess, refetchProfile])

  const handleSave = () => {
    if (!displayName.trim()) return
    updateProfile({ displayName: displayName.trim() }, {
      onSuccess: () => {
        toast.success(t('gamification.profile.nameSaved') || 'Profile updated!')
        setIsEditing(false)
        refetchProfile()
      },
      onError: () => toast.error(t('gamification.profile.saveError') || 'Failed to update profile'),
    })
  }

  const handleAvatarSelect = (avatarId: number) => {
    if (activatingAvatar) return
    activateAvatar(avatarId, {
      onSuccess: () => {
        toast.success(t('gamification.profile.avatarSelected') || 'Avatar selected!')
        refetchProfile()
      },
      onError: () => toast.error(t('gamification.profile.avatarError') || 'Failed to select avatar'),
    })
  }

  const handleCustomAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (fileInputRef.current) fileInputRef.current.value = ''

    try {
      let fileToUpload = file
      if (isHeicFile(file)) {
        setIsConverting(true)
        toast.info('Converting HEIC image...')
        fileToUpload = await convertHeicToJpeg(file)
        setIsConverting(false)
      }

      if (!fileToUpload.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }

      if (fileToUpload.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }

      uploadCustomAvatar(fileToUpload)
    } catch (error) {
      setIsConverting(false)
      toast.error('Failed to process image')
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('gamification.profile.title') || 'Profile'}>
      <div className="space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg">
            {activeAvatar?.emoji || '😊'}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('gamification.profile.displayNamePlaceholder') || 'Display Name'}
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={handleSave} size="sm" disabled={updatingProfile}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {profile?.display_name || t('gamification.profile.newUser') || 'New User'}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                {t('gamification.level', { level }) || `Level ${level}`}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {totalXP.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        {/* Avatar selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
              {t('gamification.profile.selectAvatar') || 'Select Avatar'}
            </h4>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar || isConverting}
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isConverting || uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {t('gamification.profile.uploadCustom') || 'Upload Custom'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCustomAvatarUpload}
              accept="image/*,.heic,.heif"
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-6 gap-2">
            {(avatars as any[]).map((avatar) => {
              const isAvailable = avatar.unlock_level <= level
              const isActive = avatar.id === profile?.active_avatar?.id
              return (
                <button
                  key={avatar.id}
                  onClick={() => isAvailable && handleAvatarSelect(avatar.id)}
                  disabled={!isAvailable || activatingAvatar}
                  className={cn(
                    'aspect-square rounded-xl flex items-center justify-center text-2xl relative transition-all',
                    'border-2',
                    isAvailable ? rarityColors[avatar.rarity] : 'opacity-40 bg-gray-100 dark:bg-gray-800',
                    isActive && 'ring-2 ring-green-500 ring-offset-2',
                    isAvailable && !isActive && 'hover:scale-105 active:scale-95'
                  )}
                >
                  {avatar.emoji || '😊'}
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 rounded-xl">
                      <span className="text-xs font-medium">Lv{avatar.unlock_level}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default ProfileBottomSheet
