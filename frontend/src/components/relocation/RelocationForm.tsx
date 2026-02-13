import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getCities } from '@/services/relocation-service'
import type { FamilySize, RoomType, RelocationCompareRequest } from '@/types/relocation'

interface RelocationFormProps {
  onSubmit: (request: RelocationCompareRequest) => void
  isLoading: boolean
}

const FAMILY_SIZE_OPTIONS: FamilySize[] = ['single', 'couple', 'couple_1', 'couple_2', 'couple_3']
const ROOM_TYPE_OPTIONS: RoomType[] = ['1K', '1LDK', '2LDK', '3LDK']

export function RelocationForm({ onSubmit, isLoading }: RelocationFormProps) {
  const { t, i18n } = useTranslation('common')
  const isJa = i18n.language === 'ja'

  const [nenshu, setNenshu] = useState('')
  const [familySize, setFamilySize] = useState<FamilySize>('single')
  const [roomType, setRoomType] = useState<RoomType>('1K')
  const [currentCityId, setCurrentCityId] = useState('')
  const [targetCityId, setTargetCityId] = useState('')

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ['relocation-cities'],
    queryFn: getCities,
    staleTime: 1000 * 60 * 30,
  })

  const cityOptions = [
    { value: '', label: t('relocation.selectCity') },
    ...(cities?.map((c) => ({
      value: String(c.id),
      label: isJa ? `${c.prefecture_name} ${c.city_name}` : `${c.city_name_en}, ${c.prefecture_name_en}`,
    })) ?? []),
  ]

  const familySizeOptions = FAMILY_SIZE_OPTIONS.map((fs) => ({
    value: fs,
    label: t(`relocation.familySize.${fs}`),
  }))

  const roomTypeOptions = ROOM_TYPE_OPTIONS.map((rt) => ({
    value: rt,
    label: rt,
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nenshu || !currentCityId || !targetCityId) return
    onSubmit({
      nenshu: Number(nenshu),
      family_size: familySize,
      room_type: roomType,
      current_city_id: Number(currentCityId),
      target_city_id: Number(targetCityId),
    })
  }

  const isValid = nenshu && Number(nenshu) > 0 && currentCityId && targetCityId && currentCityId !== targetCityId

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="nenshu"
          label={t('relocation.nenshu')}
          type="number"
          placeholder={t('relocation.nenshuPlaceholder')}
          value={nenshu}
          onChange={(e) => setNenshu(e.target.value)}
          min={1}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="familySize"
            label={t('relocation.familySizeLabel')}
            options={familySizeOptions}
            value={familySize}
            onChange={(e) => setFamilySize(e.target.value as FamilySize)}
          />
          <Select
            id="roomType"
            label={t('relocation.roomTypeLabel')}
            options={roomTypeOptions}
            value={roomType}
            onChange={(e) => setRoomType(e.target.value as RoomType)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <MapPin className="w-4 h-4" />
            {t('relocation.citySelection')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <Select
              id="currentCity"
              label={t('relocation.currentCity')}
              options={cityOptions}
              value={currentCityId}
              onChange={(e) => setCurrentCityId(e.target.value)}
              disabled={citiesLoading}
            />
            <ArrowRight className="hidden sm:block w-5 h-5 text-gray-400 mb-3" />
            <Select
              id="targetCity"
              label={t('relocation.targetCity')}
              options={cityOptions}
              value={targetCityId}
              onChange={(e) => setTargetCityId(e.target.value)}
              disabled={citiesLoading}
            />
          </div>
        </div>

        <Button type="submit" loading={isLoading} disabled={!isValid} className="w-full">
          {t('relocation.compare')}
        </Button>
      </form>
    </Card>
  )
}
