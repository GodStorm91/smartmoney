/**
 * Sync Queue Manager
 * Handles offline mutations queue and replay
 */
import { db } from '../db'
import type { SyncOperation, SyncOperationType, SyncEntityType } from '../db/types'
import { apiClient } from '../services/api-client'

// Exponential backoff delays in ms
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000]
const MAX_RETRIES = 5

/**
 * Add operation to sync queue
 */
export async function enqueueOperation(
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

/**
 * Get API endpoint for entity type
 */
function getEndpoint(entityType: SyncEntityType, entityId: number | string): string {
  const base = `/api/${entityType}s`
  return typeof entityId === 'number' && entityId > 0 ? `${base}/${entityId}` : base
}

/**
 * Get HTTP method for operation type
 */
function getMethod(operationType: SyncOperationType): string {
  switch (operationType) {
    case 'CREATE': return 'POST'
    case 'UPDATE': return 'PUT'
    case 'DELETE': return 'DELETE'
  }
}

/**
 * Replay single operation to server
 */
async function replayOperation(operation: SyncOperation): Promise<void> {
  const endpoint = getEndpoint(operation.entity_type, operation.entity_id)
  const method = getMethod(operation.operation_type)

  const response = await apiClient.request({
    method,
    url: endpoint,
    data: operation.operation_type !== 'DELETE' ? operation.payload : undefined,
  })

  if (response.status >= 400) {
    throw new Error(`Sync failed: ${response.status}`)
  }
}

/**
 * Process all pending sync operations
 */
export async function processSyncQueue(): Promise<{
  processed: number
  failed: number
}> {
  const pending = await db.sync_queue
    .where('status')
    .equals('pending')
    .and(op => op.retry_count < MAX_RETRIES)
    .sortBy('timestamp')

  let processed = 0
  let failed = 0

  for (const operation of pending) {
    try {
      // Mark as processing
      await db.sync_queue.update(operation.id!, { status: 'processing' })

      // Apply backoff delay if retrying
      if (operation.retry_count > 0) {
        const delay = BACKOFF_DELAYS[Math.min(operation.retry_count - 1, BACKOFF_DELAYS.length - 1)]
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Replay operation
      await replayOperation(operation)

      // Success - remove from queue
      await db.sync_queue.delete(operation.id!)
      processed++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const newRetryCount = operation.retry_count + 1

      await db.sync_queue.update(operation.id!, {
        status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
        retry_count: newRetryCount,
        last_error: errorMessage,
      })
      failed++
    }
  }

  return { processed, failed }
}

/**
 * Get count of pending operations
 */
export async function getPendingCount(): Promise<number> {
  return await db.sync_queue.where('status').equals('pending').count()
}

/**
 * Clear all failed operations
 */
export async function clearFailedOperations(): Promise<number> {
  return await db.sync_queue.where('status').equals('failed').delete()
}

/**
 * Clear sync queue (on logout)
 */
export async function clearSyncQueue(): Promise<void> {
  await db.sync_queue.clear()
}
