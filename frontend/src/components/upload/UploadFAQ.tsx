export function UploadFAQ() {
  return (
    <div className="space-y-4">
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <span className="font-medium text-gray-900">どのアプリのCSVに対応していますか？</span>
          <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700">
          現在、Zaim、MoneyForward、楽天カード、三井住友カードのCSVエクスポート形式に対応しています。その他のフォーマットは設定ページでマッピングを調整できます。
        </div>
      </details>

      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <span className="font-medium text-gray-900">重複したデータはどう処理されますか？</span>
          <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700">
          日付、金額、説明が完全に一致する取引は自動的にスキップされます。アップロード結果で重複スキップされた件数を確認できます。
        </div>
      </details>

      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <span className="font-medium text-gray-900">エラーが発生した場合は？</span>
          <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700">
          エラーが発生した行は詳細とともに表示されます。エラーデータは修正後に再アップロードできます。正常な行は問題なくインポートされます。
        </div>
      </details>
    </div>
  )
}
