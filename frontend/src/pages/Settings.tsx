import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  Settings as SettingsIcon,
  Wallet,
  Tag,
  Repeat,
  CreditCard,
  Globe,
  Check,
  AlertTriangle,
  Bell,
  Palette,
  Users,
  Smartphone,
  Download,
  Link2,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { RecurringTransactionsList } from '@/components/recurring/RecurringTransactionsList'
import { CategoryRulesList } from '@/components/settings/CategoryRulesList'
import { CategoryManagementSection } from '@/components/settings/CategoryManagementSection'
import { CryptoWalletSettings } from '@/components/settings/CryptoWalletSettings'
import { AnomalyConfigPanel } from '@/components/anomalies/AnomalyConfigPanel'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { HouseholdProfileForm } from '@/components/benchmark/HouseholdProfileForm'
import { fetchSettings, updateSettings } from '@/services/settings-service'
import { getHouseholdProfile, updateHouseholdProfile } from '@/services/benchmark-service'
import { toast } from 'sonner'
import { exportForIOS, generateExportLink } from '@/services/export-service'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/utils/cn'

// Settings sections for navigation
const SECTIONS = [
  { id: 'appearance', labelKey: 'settings.sections.appearance', icon: Palette },
  { id: 'general', labelKey: 'settings.sections.general', icon: SettingsIcon },
  { id: 'household', labelKey: 'settings.sections.household', icon: Users },
  { id: 'budget', labelKey: 'settings.sections.budget', icon: Wallet },
  { id: 'categories', labelKey: 'settings.sections.categories', icon: Tag },
  { id: 'sources', labelKey: 'settings.sections.sources', icon: CreditCard },
  { id: 'recurring', labelKey: 'settings.sections.recurring', icon: Repeat },
  { id: 'notifications', labelKey: 'settings.sections.notifications', icon: Bell },
  { id: 'crypto', labelKey: 'settings.sections.crypto', icon: Globe },
  { id: 'anomaly', labelKey: 'anomaly.title', icon: AlertTriangle },
  { id: 'export', labelKey: 'settings.sections.export', icon: Smartphone },
] as const

export function Settings() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<string>('appearance')
  const [hasChanges, setHasChanges] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [linkExpiresAt, setLinkExpiresAt] = useState<Date | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [linkCountdown, setLinkCountdown] = useState<string>('')
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  // Household profile
  const { data: householdProfile } = useQuery({
    queryKey: ['household-profile'],
    queryFn: getHouseholdProfile,
  })

  const updateProfileMutation = useMutation({
    mutationFn: updateHouseholdProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-profile'] })
      queryClient.invalidateQueries({ queryKey: ['benchmark-comparison'] })
      toast.success(t('settings.profileSaved', 'Household profile saved successfully'))
    },
    onError: (error) => {
      console.error('Failed to save household profile:', error)
      toast.error(t('settings.profileSaveError', 'Failed to save household profile'))
    },
  })

  // Local state for form inputs
  const [currency, setCurrency] = useState<string>('JPY')
  const [baseDate, setBaseDate] = useState<number>(25)
  const [budgetCarryOver, setBudgetCarryOver] = useState<boolean>(false)
  const [budgetEmailAlerts, setBudgetEmailAlerts] = useState<boolean>(true)
  const [largeTransactionThreshold, setLargeTransactionThreshold] = useState<number>(1000000)

  // Sync state with fetched settings
  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency)
      setBaseDate(settings.base_date)
      setBudgetCarryOver(settings.budget_carry_over)
      setBudgetEmailAlerts(settings.budget_email_alerts)
      setLargeTransactionThreshold(settings.large_transaction_threshold)
    }
  }, [settings])

  // Track changes
  useEffect(() => {
    if (settings) {
      const changed = 
        currency !== settings.currency ||
        baseDate !== settings.base_date ||
        budgetCarryOver !== settings.budget_carry_over ||
        budgetEmailAlerts !== settings.budget_email_alerts ||
        largeTransactionThreshold !== settings.large_transaction_threshold
      setHasChanges(changed)
    }
  }, [currency, baseDate, budgetCarryOver, budgetEmailAlerts, largeTransactionThreshold, settings])

  // Mutation for saving settings
  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setHasChanges(false)
      // Show success toast (inline)
    },
    onError: (error) => {
      console.error('Failed to save settings:', error)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      currency,
      base_date: baseDate,
      budget_carry_over: budgetCarryOver,
      budget_email_alerts: budgetEmailAlerts,
      large_transaction_threshold: largeTransactionThreshold,
    })
  }

  const handleExportIOS = async () => {
    setIsExporting(true)
    setExportSuccess(false)
    try {
      await exportForIOS()
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true)
    setGeneratedLink(null)
    setLinkCopied(false)
    try {
      const result = await generateExportLink()
      setGeneratedLink(result.url)
      setLinkExpiresAt(new Date(result.expiresAt))
    } catch (error) {
      console.error('Generate link failed:', error)
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleCopyLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      console.error('Failed to copy link')
    }
  }

  // Countdown timer for generated link
  useEffect(() => {
    if (!linkExpiresAt) return
    const timer = setInterval(() => {
      const now = new Date()
      const diff = linkExpiresAt.getTime() - now.getTime()
      if (diff <= 0) {
        setLinkCountdown('')
        setGeneratedLink(null)
        setLinkExpiresAt(null)
        clearInterval(timer)
        return
      }
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setLinkCountdown(t('settings.export.linkExpires', { minutes, seconds }))
    }, 1000)
    return () => clearInterval(timer)
  }, [linkExpiresAt, t])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
    )
  }

  // Settings form data for display
  const currencyLabels: Record<string, string> = {
    JPY: t('settings.currencyJPY'),
    USD: t('settings.currencyUSD'),
    VND: t('settings.currencyVND'),
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary-600" />
            {t('settings.title')}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Section Navigation - Horizontal Scroll */}
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide -mb-2">
              {SECTIONS.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t(section.labelKey)}
                    </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Appearance */}
        <div className={cn('space-y-4', activeSection !== 'appearance' && 'hidden')}>
          <SectionCard icon={Palette} title={t('appearance.title', 'Appearance')} description={t('appearance.subtitle', 'Theme, colors, and display preferences')}>
            <AppearanceSettings />
          </SectionCard>
        </div>

        {/* General Settings */}
        <div className={cn('space-y-4', activeSection !== 'general' && 'hidden')}>
          <SectionCard icon={SettingsIcon} title={t('settings.general')} description="Currency and basic preferences">
            <div className="space-y-4">
              <Select
                label={t('settings.currency')}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'JPY', label: currencyLabels.JPY },
                  { value: 'USD', label: currencyLabels.USD },
                  { value: 'VND', label: currencyLabels.VND }
                ]}
              />
              <Input
                type="number"
                label={t('settings.payday')}
                value={baseDate}
                onChange={(e) => setBaseDate(parseInt(e.target.value, 10))}
                min={1}
                max={31}
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 -mt-2">
                {t('settings.paydayDescription')}
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Household Profile */}
        <div className={cn('space-y-4', activeSection !== 'household' && 'hidden')}>
          <SectionCard icon={Users} title={t('settings.householdProfile', 'Household Profile')} description={t('settings.householdProfileDescription', 'Family size, prefecture, and income bracket for spending benchmarks')}>
            <HouseholdProfileForm
              profile={householdProfile || null}
              onSave={(profile) => updateProfileMutation.mutate(profile)}
              isLoading={updateProfileMutation.isPending}
            />
          </SectionCard>
        </div>

        {/* Budget Settings */}
        <div className={cn('space-y-4', activeSection !== 'budget' && 'hidden')}>
          <SectionCard icon={Wallet} title={t('settings.budgetSettings')} description="Budget behavior and alerts">
            <div className="space-y-4">
              <ToggleSetting
                label={t('settings.budgetCarryOver')}
                description={t('settings.budgetCarryOverDescription')}
                checked={budgetCarryOver}
                onChange={setBudgetCarryOver}
              />
              <ToggleSetting
                label={t('settings.budgetEmailAlerts')}
                description={t('settings.budgetEmailAlertsDescription')}
                checked={budgetEmailAlerts}
                onChange={setBudgetEmailAlerts}
              />
              <div className="pt-2">
                <label className="font-medium text-gray-900 dark:text-white block mb-2">
                  {t('settings.largeTransactionThreshold')}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('settings.largeTransactionThresholdDescription')}
                </p>
                <Input
                  type="number"
                  value={largeTransactionThreshold}
                  onChange={(e) => setLargeTransactionThreshold(parseInt(e.target.value, 10) || 0)}
                  min={0}
                  step={100000}
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {t('settings.largeTransactionThresholdHint')}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Category Management */}
        <div className={cn('space-y-4', activeSection !== 'categories' && 'hidden')}>
          <CategoryManagementSection />
        </div>

        {/* Payment Sources */}
        <div className={cn('space-y-4', activeSection !== 'sources' && 'hidden')}>
          <CollapsibleCard
            title={t('settings.paymentSourceManagement')}
            badge={settings?.sources?.length || 0}
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {settings?.sources?.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100">{source}</span>
                  <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm">
                    {t('settings.delete')}
                  </button>
                </div>
              )) || <p className="text-gray-400 dark:text-gray-500 text-center py-4">{t('settings.noSources')}</p>}
            </div>
            <div className="mt-4">
              <Button variant="outline">{t('settings.addSource')}</Button>
            </div>
          </CollapsibleCard>
        </div>

        {/* Recurring Transactions */}
        <div className={cn('space-y-4', activeSection !== 'recurring' && 'hidden')}>
          <RecurringTransactionsList />
        </div>

        {/* Notifications */}
        <div className={cn('space-y-4', activeSection !== 'notifications' && 'hidden')}>
          <NotificationPreferences />
        </div>

        {/* Crypto Wallets */}
        <div className={cn('space-y-4', activeSection !== 'crypto' && 'hidden')}>
          <CryptoWalletSettings />
        </div>

        {/* Anomaly Detection */}
        <div className={cn('space-y-4', activeSection !== 'anomaly' && 'hidden')}>
          <AnomalyConfigPanel />
        </div>

        {/* Export to iOS */}
        <div className={cn('space-y-4', activeSection !== 'export' && 'hidden')}>
          <SectionCard icon={Smartphone} title={t('settings.export.title')} description={t('settings.export.description')}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.export.instructions')}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportIOS}
                  disabled={isExporting}
                  className="flex-1"
                  size="lg"
                >
                  {isExporting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('settings.export.exporting')}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {t('settings.export.button')}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGenerateLink}
                  disabled={isGeneratingLink}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  {isGeneratingLink ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('settings.export.generatingLink')}
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      {t('settings.export.generateLink')}
                    </>
                  )}
                </Button>
              </div>
              {exportSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  {t('settings.export.success')}
                </div>
              )}

              {/* Generated Link Section */}
              {generatedLink && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    {t('settings.export.linkGenerated')}
                  </div>

                  {/* URL + Copy */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          {t('settings.export.linkCopied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          {t('settings.export.copyLink')}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-lg">
                      <QRCodeSVG value={generatedLink} size={180} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.export.scanQR')}
                    </p>
                  </div>

                  {/* Countdown */}
                  {linkCountdown && (
                    <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                      {linkCountdown}
                    </p>
                  )}
                  {!linkExpiresAt && !linkCountdown && (
                    <p className="text-xs text-center text-red-600 dark:text-red-400">
                      {t('settings.export.linkExpired')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Category Rules - Always visible but can be hidden on mobile */}
        <CategoryRulesList />
      </div>

      {/* Fixed Save Button */}
      {hasChanges && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-40">
          <div className="max-w-2xl mx-auto">
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              className="w-full"
              size="lg"
            >
              {updateMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('settings.saveSettings')}
                </>
              )}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Section Card Component
interface SectionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

function SectionCard({ icon: Icon, title, description, children, className }: SectionCardProps) {
  return (
    <Card className={cn('', className)}>
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      {children}
    </Card>
  )
}

// Toggle Setting Component
interface ToggleSettingProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-start justify-between py-1">
      <div className="flex-1 pr-4">
        <label className="font-medium text-gray-900 dark:text-white block">{label}</label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}
