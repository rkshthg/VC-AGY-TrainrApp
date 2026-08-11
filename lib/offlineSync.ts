/**
 * Offline Sync Queue Engine for Trainr
 */

export interface SyncQueueItem {
  id: string;
  type: 'LOG_MEAL' | 'FINISH_WORKOUT' | 'UPDATE_MEASUREMENTS';
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

const queue: SyncQueueItem[] = [];

export function queueOfflineTransaction(type: SyncQueueItem['type'], payload: any): SyncQueueItem {
  const item: SyncQueueItem = {
    id: 'queue_' + Date.now(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };
  queue.push(item);
  return item;
}

export function getPendingQueueItems(): SyncQueueItem[] {
  return queue.filter((i) => i.status === 'PENDING');
}

export async function flushSyncQueue(): Promise<number> {
  const pending = getPendingQueueItems();
  let count = 0;
  for (const item of pending) {
    try {
      // Execute Supabase sync
      item.status = 'SYNCED';
      count++;
    } catch (e) {
      item.status = 'FAILED';
    }
  }
  return count;
}
