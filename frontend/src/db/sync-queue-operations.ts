/**
 * IndexedDB Sync Queue Operations
 * Manages offline mutation queue for background sync
 */
import { db } from './db'
import type { SyncOperation, SyncOperationType, SyncEntityType } from './types'

export async function enqueueSyncOperation(
  operationType: SyncOperationType,
  entityType: SyncEntityType,
  entityId: number | string,
  payload: Record<string, unknown>
): Promise<number> {
  const operation: SyncOperation = {
    operation_type: operationType,
    entity_type: entityType,
    entity_id: entityId,
    payload,
    timestamp: Date.now(),
    retry_count: 0,
    status: 'pending',
  }
  return await db.sync_queue.add(operation)
}

export async function getPendingSyncOperations(): Promise<SyncOperation[]> {
  return await db.sync_queue
    .where('status')
    .equals('pending')
    .and((op) => op.retry_count < 5)
    .sortBy('timestamp')
}

export async function markSyncOperationProcessing(id: number): Promise<void> {
  await db.sync_queue.update(id, { status: 'processing' })
}

export async function markSyncOperationComplete(id: number): Promise<void> {
  await db.sync_queue.delete(id)
}

export async function markSyncOperationFailed(id: number, error: string): Promise<void> {
  const op = await db.sync_queue.get(id)
  if (op) {
    await db.sync_queue.update(id, {
      status: op.retry_count >= 4 ? 'failed' : 'pending',
      retry_count: op.retry_count + 1,
      last_error: error,
    })
  }
}

export async function getSyncQueueCount(): Promise<number> {
  return await db.sync_queue.where('status').equals('pending').count()
}

export async function clearFailedSyncOperations(): Promise<number> {
  return await db.sync_queue.where('status').equals('failed').delete()
}

// App Meta Operations
export async function updateLastSyncTime(): Promise<void> {
  await db.app_meta.update('app-state', {
    last_full_sync: new Date().toISOString(),
  })
}

export async function getLastSyncTime(): Promise<string | undefined> {
  const meta = await db.app_meta.get('app-state')
  return meta?.last_full_sync
}

export async function setUserId(userId: number): Promise<void> {
  await db.app_meta.update('app-state', { user_id: userId })
}
