import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { fetchSettings } from '@/services/settings-service'

export function Settings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">設定</h2>
        <p className="text-gray-600">アプリケーション設定の管理</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">一般設定</h3>
          <div className="space-y-4">
            <Select
              label="通貨"
              value={settings?.currency || 'JPY'}
              options={[{ value: 'JPY', label: '日本円 (¥)' }, { value: 'USD', label: '米ドル ($)' }]}
            />
            <Input
              type="number"
              label="給料日 (毎月)"
              value={settings?.base_date || 25}
              min={1}
              max={31}
            />
          </div>
          <div className="mt-6">
            <Button>設定を保存</Button>
          </div>
        </Card>

        {/* Categories */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">カテゴリー管理</h3>
          <div className="space-y-2">
            {settings?.categories?.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>{cat}</span>
                <button className="text-red-600 hover:text-red-700 text-sm">削除</button>
              </div>
            )) || <p className="text-gray-400 text-center py-4">カテゴリーがありません</p>}
          </div>
          <div className="mt-4">
            <Button variant="outline">カテゴリーを追加</Button>
          </div>
        </Card>

        {/* Payment Sources */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">支払元管理</h3>
          <div className="space-y-2">
            {settings?.sources?.map((source, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>{source}</span>
                <button className="text-red-600 hover:text-red-700 text-sm">削除</button>
              </div>
            )) || <p className="text-gray-400 text-center py-4">支払元がありません</p>}
          </div>
          <div className="mt-4">
            <Button variant="outline">支払元を追加</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
