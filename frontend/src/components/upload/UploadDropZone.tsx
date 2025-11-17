import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface UploadDropZoneProps {
  isDragOver: boolean
  uploading: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileSelect: (file: File) => void
}

export function UploadDropZone({
  isDragOver,
  uploading,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
}: UploadDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="CSVファイルをドラッグ&ドロップ、またはクリックしてアップロード"
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-primary-500 bg-primary-50/50'
            : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50/50'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click()
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFileSelect(file)
          }}
        />

        {uploading ? (
          <>
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">アップロード中...</h3>
            <p className="text-sm text-gray-600">しばらくお待ちください</p>
          </>
        ) : (
          <>
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">ファイルをドロップまたはクリック</h3>
            <p className="text-sm text-gray-600 mb-4">CSVファイルをここにドラッグ&ドロップ、またはクリックして選択</p>

            <Button variant="primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              ファイルを選択
            </Button>

            <p className="text-xs text-gray-500 mt-4">対応形式: .csv (最大 10MB)</p>
          </>
        )}
      </div>

      {/* File Requirements */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">CSVファイルの要件</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 必須列: 日付、金額、カテゴリー</li>
              <li>• 対応アプリ: Zaim、MoneyForward、楽天カード</li>
              <li>• 文字コード: UTF-8、Shift-JIS</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
