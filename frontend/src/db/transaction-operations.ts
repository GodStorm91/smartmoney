/**
 * IndexedDB Transaction Operations
 */
import { db } from './db'
import type { DBTransaction } from './types'

export async function createTransaction(transaction: DBTransaction): Promise<number> {
  return await db.transactions.add(transaction)
}

export async function getTransactionById(id: number): Promise<DBTransaction | undefined> {
  return await db.transactions.get(id)
}

export async function getAllTransactions(): Promise<DBTransaction[]> {
  return await db.transactions.orderBy('date').reverse().toArray()
}

export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string
): Promise<DBTransaction[]> {
  return await db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .reverse()
    .toArray()
}

export async function getTransactionsByCategory(category: string): Promise<DBTransaction[]> {
  return await db.transactions.where('category').equals(category).reverse().toArray()
}

export async function getTransactionsByAccount(accountId: number): Promise<DBTransaction[]> {
  return await db.transactions.where('account_id').equals(accountId).reverse().toArray()
}

export async function updateTransaction(
  id: number,
  changes: Partial<DBTransaction>
): Promise<number> {
  return await db.transactions.update(id, {
    ...changes,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  })
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id)
}

export async function bulkCreateTransactions(
  transactions: DBTransaction[]
): Promise<number> {
  return await db.transactions.bulkAdd(transactions)
}

export async function bulkUpdateTransactions(
  transactions: DBTransaction[]
): Promise<number> {
  return await db.transactions.bulkPut(transactions)
}
