/**
 * IndexedDB Account Operations
 */
import { db } from './db'
import type { DBAccount } from './types'

export async function createAccount(account: DBAccount): Promise<number> {
  return await db.accounts.add(account)
}

export async function getAccountById(id: number): Promise<DBAccount | undefined> {
  return await db.accounts.get(id)
}

export async function getAllAccounts(): Promise<DBAccount[]> {
  return await db.accounts.toArray()
}

export async function getActiveAccounts(): Promise<DBAccount[]> {
  return await db.accounts.where('is_active').equals(1).toArray()
}

export async function updateAccount(id: number, changes: Partial<DBAccount>): Promise<number> {
  return await db.accounts.update(id, {
    ...changes,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  })
}

export async function deleteAccount(id: number): Promise<void> {
  await db.accounts.delete(id)
}

export async function bulkUpdateAccounts(accounts: DBAccount[]): Promise<number> {
  return await db.accounts.bulkPut(accounts)
}
