import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Users, MapPin, Wallet, Settings } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export interface HouseholdProfile {
  family_size: number
  prefecture: string
  annual_income_bracket: string
}

interface ProfileSummaryCardProps {
  profile: HouseholdProfile | null
}

// Prefecture code to name mapping (JP)
const PREFECTURE_NAMES: Record<string, string> = {
  '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
  '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
  '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
  '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
  '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
  '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
  '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
  '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
  '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
  '46': '鹿児島県', '47': '沖縄県',
}

// Income bracket labels
const INCOME_LABELS: Record<string, string> = {
  '1': '~300万円',
  '2': '300~500万円',
  '3': '500~700万円',
  '4': '700~1000万円',
  '5': '1000万円~',
}

export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  const { t } = useTranslation('common')

  if (!profile) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-dashed">
        <CardContent>
          <div className="text-center py-6">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('benchmark.noProfile', 'Set up your household profile to see comparisons')}
            </p>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                {t('benchmark.setupProfile', 'Set up profile')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const prefectureName = PREFECTURE_NAMES[profile.prefecture] || profile.prefecture
  const incomeLabel = INCOME_LABELS[profile.annual_income_bracket] || profile.annual_income_bracket

  return (
    <Card variant="elevated" className="border-primary-200 dark:border-primary-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t('benchmark.yourProfile', 'Your Household Profile')}
          </CardTitle>
          <Link to="/settings">
            <Button variant="ghost" size="sm" className="text-xs">
              <Settings className="w-3 h-3 mr-1" />
              {t('common.edit', 'Edit')}
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Family Size */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {t('benchmark.familySize', 'Family size')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {profile.family_size === 5 ? '5+' : profile.family_size} {t('benchmark.people', 'people')}
              </p>
            </div>
          </div>

          {/* Prefecture */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {t('benchmark.prefecture', 'Prefecture')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {prefectureName}
              </p>
            </div>
          </div>

          {/* Income Bracket */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {t('benchmark.annualIncome', 'Annual income')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {incomeLabel}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
