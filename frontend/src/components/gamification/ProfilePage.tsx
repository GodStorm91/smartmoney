import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Crown, Star, Edit2, Check, Upload, X, Loader2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useProfile, useAvatars, useGamificationStats, useActivateAvatar, useUploadCustomAvatar, useDeleteAvatar } from '@/services/rewards-service';
import { toast } from 'sonner';
import { convertHeicToJpeg, isHeicFile } from '@/utils/heic-converter';

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  epic: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300',
  legendary: 'bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300',
};

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation('common');
  const { data: profile } = useProfile();
  const { data: gamificationStats } = useGamificationStats ? useGamificationStats() : { data: null };
  const { data: avatars = [] } = useAvatars(1);
  const { mutate: activateAvatar, isPending: activatingAvatar } = useActivateAvatar();
  const { mutate: uploadCustomAvatar, isPending: uploadingAvatar, isSuccess: uploadSuccess } = useUploadCustomAvatar();
  const { mutate: deleteAvatar, isPending: deletingAvatar } = useDeleteAvatar();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<{ id: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const level = gamificationStats?.current_level || profile?.level || 1;
  const totalXP = gamificationStats?.total_xp || profile?.total_xp || 0;
  const activeAvatar = profile?.active_avatar;

  // Close modal after successful upload
  useEffect(() => {
    if (uploadSuccess) {
      setShowUploadModal(false);
    }
  }, [uploadSuccess]);

  const handleSave = () => {
    toast.success(t('common.saving') + '...');
    setIsEditing(false);
  };

  const handleAvatarSelect = (avatarId: number) => {
    if (activatingAvatar) return;
    activateAvatar(avatarId, {
      onSuccess: () => toast.success(t('gamification.profile.avatarSelected') || 'Avatar selected!'),
      onError: () => toast.error(t('gamification.profile.avatarError') || 'Failed to select avatar'),
    });
  };

  const handleDeleteAvatar = () => {
    if (!avatarToDelete || deletingAvatar) return;
    deleteAvatar(avatarToDelete.id, {
      onSuccess: () => setAvatarToDelete(null),
    });
  };

  const handleCustomAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('[Avatar Upload] File selected:', file.name, file.type, file.size);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Check if file is HEIC and convert if needed
      let fileToUpload = file;
      if (isHeicFile(file)) {
        console.log('[Avatar Upload] Detected HEIC file, starting conversion...');
        setIsConverting(true);
        toast.info('Converting HEIC image...');
        fileToUpload = await convertHeicToJpeg(file);
        setIsConverting(false);
        console.log('[Avatar Upload] HEIC conversion complete:', fileToUpload.name, fileToUpload.type, fileToUpload.size);
        toast.success('HEIC image converted successfully!');
      }

      // Validate file type after conversion
      console.log('[Avatar Upload] Validating file type:', fileToUpload.type);
      if (!fileToUpload.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      console.log('[Avatar Upload] Validating file size:', fileToUpload.size);
      if (fileToUpload.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      console.log('[Avatar Upload] Starting upload...');
      uploadCustomAvatar(fileToUpload);
    } catch (error) {
      setIsConverting(false);
      console.error('[Avatar Upload] Error:', error);
      toast.error('Failed to process image. Please try a different file.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-500">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Profile & Customization</h2>
          <p className="text-gray-500">Personalize your experience</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="relative px-6 pb-6">
          <div className="absolute -top-12 left-6">
            <div className="h-24 w-24 rounded-full bg-white dark:bg-gray-800 p-1 shadow-xl">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                <span className="text-4xl">{activeAvatar?.emoji || '😊'}</span>
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-6">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="font-bold text-lg">{t('gamification.levelProgress', { level })}</span>
            </div>
          </div>
          <div className="mt-14">
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('gamification.profile.displayNamePlaceholder') || 'Display Name'}
                  className="max-w-xs"
                />
                <Button onClick={handleSave} size="sm">{t('button.save')}</Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">{t('button.cancel')}</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{profile?.display_name || t('gamification.profile.newUser')}</h2>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                {totalXP.toLocaleString()} XP
              </span>
              {profile?.title && (
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">{profile.title}</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Avatar Selection */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5 text-blue-500" />
              Select Avatar
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Upload Custom
            </Button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
            {avatars.map((avatar: any) => {
              const isAvailable = avatar.unlock_level <= level;
              const isActive = avatar.id === profile?.active_avatar?.id;
              const isCustom = avatar.rarity === 'custom';
              return (
                <div
                  key={avatar.id}
                  className={`aspect-square rounded-xl flex items-center justify-center text-3xl cursor-pointer transition-all relative group ${
                    isAvailable ? rarityColors[avatar.rarity] || 'bg-pink-100 text-pink-700 border-pink-300' : 'opacity-50 bg-gray-100'
                  } ${isActive ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                  title={isAvailable ? `${avatar.name} - ${isActive ? 'Selected' : 'Click to select'}` : `Unlock at level ${avatar.unlock_level}`}
                >
                  <div onClick={() => isAvailable && handleAvatarSelect(avatar.id)} className="w-full h-full flex items-center justify-center">
                    {avatar.image_url ? (
                      <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      avatar.emoji || '😊'
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 rounded-xl">
                      <span className="text-xs font-medium">Lv{avatar.unlock_level}</span>
                    </div>
                  )}
                  {isCustom && isAvailable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatarToDelete({ id: avatar.id, name: avatar.name });
                      }}
                      className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete avatar"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Custom Avatar Upload Modal */}
      {showUploadModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 animate-in fade-in"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upload Custom Avatar</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCustomAvatarUpload}
                    accept="image/*,.heic,.heif"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar || isConverting}
                    className="flex flex-col items-center gap-2 mx-auto"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <span className="text-sm text-blue-500">Converting HEIC...</span>
                      </>
                    ) : uploadingAvatar ? (
                      <>
                        <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                        <span className="text-sm text-gray-500">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400" />
                        <span className="text-sm text-gray-500">Click to upload image</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  <p>Supported formats: JPG, PNG, GIF, WebP, HEIC</p>
                  <p>Maximum file size: 5MB</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Avatar Confirmation Modal */}
      {avatarToDelete && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 animate-in fade-in"
            onClick={() => setAvatarToDelete(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Delete Avatar?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  This will permanently delete your custom avatar. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setAvatarToDelete(null)}
                    disabled={deletingAvatar}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleDeleteAvatar}
                    disabled={deletingAvatar}
                  >
                    {deletingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePage;

