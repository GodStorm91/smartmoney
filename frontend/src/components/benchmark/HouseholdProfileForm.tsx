import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, MapPin, Wallet } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface HouseholdProfile {
  family_size: number
  prefecture: string
  annual_income_bracket: string
}

interface HouseholdProfileFormProps {
  profile: HouseholdProfile | null
  onSave: (profile: HouseholdProfile) => void
  isLoading: boolean
}

// 47 Japanese prefectures
const PREFECTURES = [
  { value: '01', label: '北海道' }, { value: '02', label: '青森県' }, { value: '03', label: '岩手県' },
  { value: '04', label: '宮城県' }, { value: '05', label: '秋田県' }, { value: '06', label: '山形県' },
  { value: '07', label: '福島県' }, { value: '08', label: '茨城県' }, { value: '09', label: '栃木県' },
  { value: '10', label: '群馬県' }, { value: '11', label: '埼玉県' }, { value: '12', label: '千葉県' },
  { value: '13', label: '東京都' }, { value: '14', label: '神奈川県' }, { value: '15', label: '新潟県' },
  { value: '16', label: '富山県' }, { value: '17', label: '石川県' }, { value: '18', label: '福井県' },
  { value: '19', label: '山梨県' }, { value: '20', label: '長野県' }, { value: '21', label: '岐阜県' },
  { value: '22', label: '静岡県' }, { value: '23', label: '愛知県' }, { value: '24', label: '三重県' },
  { value: '25', label: '滋賀県' }, { value: '26', label: '京都府' }, { value: '27', label: '大阪府' },
  { value: '28', label: '兵庫県' }, { value: '29', label: '奈良県' }, { value: '30', label: '和歌山県' },
  { value: '31', label: '鳥取県' }, { value: '32', label: '島根県' }, { value: '33', label: '岡山県' },
  { value: '34', label: '広島県' }, { value: '35', label: '山口県' }, { value: '36', label: '徳島県' },
  { value: '37', label: '香川県' }, { value: '38', label: '愛媛県' }, { value: '39', label: '高知県' },
  { value: '40', label: '福岡県' }, { value: '41', label: '佐賀県' }, { value: '42', label: '長崎県' },
  { value: '43', label: '熊本県' }, { value: '44', label: '大分県' }, { value: '45', label: '宮崎県' },
  { value: '46', label: '鹿児島県' }, { value: '47', label: '沖縄県' },
]

// Income brackets (quintiles)
const INCOME_BRACKETS = [
  { value: '1', label: '~300万円' },
  { value: '2', label: '300~500万円' },
  { value: '3', label: '500~700万円' },
  { value: '4', label: '700~1000万円' },
  { value: '5', label: '1000万円~' },
]

// Family size options
const FAMILY_SIZES = [
  { value: '1', label: '1人' },
  { value: '2', label: '2人' },
  { value: '3', label: '3人' },
  { value: '4', label: '4人' },
  { value: '5', label: '5人以上' },
]

export function HouseholdProfileForm({ profile, onSave, isLoading }: HouseholdProfileFormProps) {
  const { t } = useTranslation('common')

  // Local form state
  const [familySize, setFamilySize] = useState<string>('2')
  const [prefecture, setPrefecture] = useState<string>('13') // Default Tokyo
  const [incomeBracket, setIncomeBracket] = useState<string>('3') // Default middle bracket

  // Sync with profile prop
  useEffect(() => {
    if (profile) {
      setFamilySize(String(profile.family_size))
      setPrefecture(profile.prefecture)
      setIncomeBracket(profile.annual_income_bracket)
    }
  }, [profile])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      family_size: parseInt(familySize),
      prefecture,
      annual_income_bracket: incomeBracket,
    })
  }

  const hasChanges = profile
    ? familySize !== String(profile.family_size) ||
      prefecture !== profile.prefecture ||
      incomeBracket !== profile.annual_income_bracket
    : true

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Family Size */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          {t('benchmark.familySize', 'Family size')}
        </label>
        <Select
          value={familySize}
          onChange={(e) => setFamilySize(e.target.value)}
          options={FAMILY_SIZES}
          disabled={isLoading}
        />
      </div>

      {/* Prefecture */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          {t('benchmark.prefecture', 'Prefecture')}
        </label>
        <Select
          value={prefecture}
          onChange={(e) => setPrefecture(e.target.value)}
          options={PREFECTURES}
          disabled={isLoading}
        />
      </div>

      {/* Annual Income Bracket */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          {t('benchmark.annualIncome', 'Annual income bracket')}
        </label>
        <Select
          value={incomeBracket}
          onChange={(e) => setIncomeBracket(e.target.value)}
          options={INCOME_BRACKETS}
          disabled={isLoading}
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!hasChanges || isLoading}
          className={cn(
            'min-w-[120px]',
            !hasChanges && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('common.saving', 'Saving...')}
            </span>
          ) : (
            t('common.save', 'Save')
          )}
        </Button>
      </div>
    </form>
  )
}
