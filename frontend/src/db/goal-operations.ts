/**
 * IndexedDB Goal Operations
 */
import { db } from './db'
import type { DBGoal } from './types'

export async function createGoal(goal: DBGoal): Promise<number> {
  return await db.goals.add(goal)
}

export async function getGoalById(id: number): Promise<DBGoal | undefined> {
  return await db.goals.get(id)
}

export async function getAllGoals(): Promise<DBGoal[]> {
  return await db.goals.toArray()
}

export async function getActiveGoals(): Promise<DBGoal[]> {
  return await db.goals.where('status').notEqual('achieved').toArray()
}

export async function updateGoal(id: number, changes: Partial<DBGoal>): Promise<number> {
  return await db.goals.update(id, {
    ...changes,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  })
}

export async function deleteGoal(id: number): Promise<void> {
  await db.goals.delete(id)
}

export async function bulkUpdateGoals(goals: DBGoal[]): Promise<number> {
  return await db.goals.bulkPut(goals)
}
