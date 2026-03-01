import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Check, Upload, Loader2, Crown, Star, ZoomIn, ZoomOut, RotateCw, X, Filter } from 'lucide-react'
import Cropper, { Area } from 'react-easy-crop'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useProfile, useAvatars, useActivateAvatar, useUploadCustomAvatar, useUpdateProfile } from '@/services/rewards-service'
import { useGamificationStats } from '@/services/gamification-service'
import { toast } from 'sonner'
import { convertHeicToJpeg, isHeicFile } from '@/utils/heic-converter'
import { cn } from '@/utils/cn'

interface ProfileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
}

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary'

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 border-gray-300 dark:bg-gray-800',
  rare: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30',
  epic: 'bg-purple-100 border-purple-300 dark:bg-purple-900/30',
  legendary: 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30',
}

const filterColors: Record<RarityFilter, string> = {
  all: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  common: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  rare: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  epic: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  legendary: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
}

// Helper to create cropped image blob
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('No 2d context')

  // Set canvas size to desired crop size (256x256 for avatar)
  const outputSize = 256
  canvas.width = outputSize
  canvas.height = outputSize

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      'image/jpeg',
      0.9
    )
  })
}

export function ProfileBottomSheet({ isOpen, onClose }: ProfileBottomSheetProps) {
  const { t } = useTranslation('common')
  const { data: profile, refetch: refetchProfile } = useProfile()
  const { data: gamificationStats } = useGamificationStats()
  const { data: avatars = [] } = useAvatars(1)
  const { mutate: activateAvatar, isPending: activatingAvatar } = useActivateAvatar()
  const { mutate: uploadCustomAvatar, isPending: uploadingAvatar } = useUploadCustomAvatar()
  const { mutate: updateProfile, isPending: updatingProfile } = useUpdateProfile()

  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cropper state
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const level = gamificationStats?.current_level || profile?.level || 1
  const totalXP = gamificationStats?.total_xp || profile?.total_xp || 0
  const activeAvatar = profile?.active_avatar

  // Filter avatars by rarity
  const filteredAvatars = (avatars as any[]).filter(
    (avatar) => rarityFilter === 'all' || avatar.rarity === rarityFilter
  )

  // Count avatars by rarity
  const rarityCount = (avatars as any[]).reduce(
    (acc, avatar) => {
      acc[avatar.rarity] = (acc[avatar.rarity] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Sync display name when profile loads
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
  }, [profile?.display_name])

  // Reset cropper when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCropImage(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
    }
  }, [isOpen])

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (fileInputRef.current) fileInputRef.current.value = ''

    try {
      let fileToProcess = file
      if (isHeicFile(file)) {
        setIsConverting(true)
        toast.info('Converting HEIC image...')
        fileToProcess = await convertHeicToJpeg(file)
        setIsConverting(false)
      }

      if (!fileToProcess.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }

      if (fileToProcess.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }

      // Create object URL for cropper
      const imageUrl = URL.createObjectURL(fileToProcess)
      setCropImage(imageUrl)
    } catch (error) {
      setIsConverting(false)
      toast.error('Failed to process image')
    }
  }

  const handleCropConfirm = async () => {
    if (!cropImage || !croppedAreaPixels) return

    try {
      const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels)
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })

      uploadCustomAvatar(file, {
        onSuccess: () => {
          toast.success('Avatar uploaded!')
          setCropImage(null)
          refetchProfile()
        },
        onError: () => toast.error('Failed to upload avatar'),
      })
    } catch (error) {
      toast.error('Failed to crop image')
    }
  }

  const handleCropCancel = () => {
    if (cropImage) {
      URL.revokeObjectURL(cropImage)
    }
    setCropImage(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }

  // Render cropper view
  if (cropImage) {
    return (
      <ResponsiveModal isOpen={isOpen} onClose={handleCropCancel} title="Crop Avatar" size="lg">
        <div className="space-y-4">
          {/* Cropper area */}
          <div className="relative h-64 sm:h-80 bg-gray-900 rounded-xl overflow-hidden">
            <Cropper
              image={cropImage}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Zoom */}
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-gray-500" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <ZoomIn className="w-4 h-4 text-gray-500" />
            </div>

            {/* Rotation */}
            <div className="flex items-center gap-3">
              <RotateCw className="w-4 h-4 text-gray-500" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-gray-500 w-10">{rotation}°</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCropCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCropConfirm}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Avatar
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    )
  }

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} title={t('gamification.profile.title') || 'Profile'} size="lg">
      <div className="space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg overflow-hidden">
            {activeAvatar?.image_url ? (
              <img src={activeAvatar.image_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              activeAvatar?.emoji || '😊'
            )}
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
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
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
              onChange={handleFileSelect}
              accept="image/*,.heic,.heif"
              className="hidden"
            />
          </div>

          {/* Rarity filter */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(['all', 'common', 'rare', 'epic', 'legendary'] as RarityFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setRarityFilter(filter)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all',
                  rarityFilter === filter
                    ? cn(filterColors[filter], 'ring-2 ring-offset-1 ring-blue-500')
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                {filter !== 'all' && rarityCount[filter] ? ` (${rarityCount[filter]})` : ''}
              </button>
            ))}
          </div>

          {/* Avatar grid */}
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
            {filteredAvatars.map((avatar) => {
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
                    isAvailable ? rarityColors[avatar.rarity] : 'opacity-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                    isActive && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900',
                    isAvailable && !isActive && 'hover:scale-105 active:scale-95'
                  )}
                >
                  {avatar.image_url ? (
                    <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    avatar.emoji || '😊'
                  )}
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 rounded-xl backdrop-blur-sm">
                      <span className="text-xs font-medium">Lv{avatar.unlock_level}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Empty state */}
          {filteredAvatars.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {rarityFilter} avatars available</p>
            </div>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}

export default ProfileBottomSheet
