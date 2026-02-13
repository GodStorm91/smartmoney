import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { getCities } from '@/services/relocation-service'
import type { FamilySize, RoomType, RelocationCompareRequest } from '@/types/relocation'
import { formatPostalCode, usePostalCodeResolver } from './use-postal-code-resolver'

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
  const [hasYoungChildren, setHasYoungChildren] = useState(false)

  const currentPostal = usePostalCodeResolver(
    useCallback((id: string) => setCurrentCityId(id), []),
  )
  const targetPostal = usePostalCodeResolver(
    useCallback((id: string) => setTargetCityId(id), []),
  )

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
      has_young_children: hasYoungChildren,
    })
  }

  const isValid = nenshu && Number(nenshu) > 0 && currentCityId && targetCityId && currentCityId !== targetCityId

  const renderCityPicker = (
    id: string,
    label: string,
    cityId: string,
    setCityId: (v: string) => void,
    postal: ReturnType<typeof usePostalCodeResolver>,
  ) => (
    <div className="space-y-2">
      <Input
        id={`${id}PostalCode`}
        label={t('relocation.postalCodeLabel')}
        type="text"
        inputMode="numeric"
        placeholder={t('relocation.postalCodePlaceholder')}
        value={formatPostalCode(postal.postalCode)}
        onChange={(e) => postal.handlePostalCodeChange(e.target.value)}
        error={postal.error ? t(`relocation.${postal.error}`) : undefined}
        disabled={postal.isResolving}
      />
      <button
        type="button"
        onClick={() => {
          postal.toggleDropdown()
        }}
        className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
      >
        {t('relocation.chooseManually')}
        {postal.showDropdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {postal.showDropdown && (
        <Select
          id={id}
          label={label}
          options={cityOptions}
          value={cityId}
          onChange={(e) => {
            setCityId(e.target.value)
            postal.setShowDropdown(false)
          }}
          disabled={citiesLoading}
        />
      )}
    </div>
  )

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="nenshu"
          label={t('relocation.nenshu')}
          type="text"
          inputMode="numeric"
          placeholder={t('relocation.nenshuPlaceholder')}
          value={nenshu ? Number(nenshu).toLocaleString() : ''}
          onChange={(e) => {
            const stripped = e.target.value.replace(/[^\d]/g, '')
            setNenshu(stripped)
          }}
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

        {['couple_1', 'couple_2', 'couple_3'].includes(familySize) && (
          <div className="flex items-center justify-between">
            <label htmlFor="hasYoungChildren" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('relocation.hasYoungChildren')}
            </label>
            <Switch
              checked={hasYoungChildren}
              onChange={setHasYoungChildren}
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <MapPin className="w-4 h-4" />
            {t('relocation.citySelection')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
            {renderCityPicker('currentCity', t('relocation.currentCity'), currentCityId, setCurrentCityId, currentPostal)}
            <ArrowRight className="hidden sm:block w-5 h-5 text-gray-400 mt-10" />
            {renderCityPicker('targetCity', t('relocation.targetCity'), targetCityId, setTargetCityId, targetPostal)}
          </div>
        </div>

        <Button type="submit" loading={isLoading} disabled={!isValid} className="w-full">
          {t('relocation.compare')}
        </Button>
      </form>
    </Card>
  )
}
