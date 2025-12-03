/**
 * IndexedDB Budget Operations
 */
import { db } from './db'
import type { DBBudget } from './types'

export async function createBudget(budget: DBBudget): Promise<number> {
  return await db.budgets.add(budget)
}

export async function getBudgetById(id: number): Promise<DBBudget | undefined> {
  return await db.budgets.get(id)
}

export async function getBudgetByMonth(month: string): Promise<DBBudget | undefined> {
  return await db.budgets.where('month').equals(month).first()
}

export async function getAllBudgets(): Promise<DBBudget[]> {
  return await db.budgets.orderBy('month').reverse().toArray()
}

export async function updateBudget(id: number, changes: Partial<DBBudget>): Promise<number> {
  return await db.budgets.update(id, {
    ...changes,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  })
}

export async function deleteBudget(id: number): Promise<void> {
  await db.budgets.delete(id)
}

export async function bulkUpdateBudgets(budgets: DBBudget[]): Promise<number> {
  return await db.budgets.bulkPut(budgets)
}
