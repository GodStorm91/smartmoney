import type { Transaction } from '@/types'

/**
 * Convert transactions to CSV string
 */
export function transactionsToCsv(transactions: Transaction[]): string {
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Source']

  const rows = transactions.map(tx => [
    tx.date,
    `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes
    tx.amount.toString(),
    tx.type,
    tx.category,
    tx.source,
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

/**
 * Download data as CSV file
 */
export function downloadCsv(data: string, filename: string): void {
  const blob = new Blob(['\ufeff' + data], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export transactions to CSV file
 */
export function exportTransactionsCsv(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): void {
  const csv = transactionsToCsv(transactions)

  // Generate filename with date range
  const dateStr = startDate && endDate
    ? `${startDate}_to_${endDate}`
    : new Date().toISOString().split('T')[0]

  downloadCsv(csv, `smartmoney_transactions_${dateStr}.csv`)
}
