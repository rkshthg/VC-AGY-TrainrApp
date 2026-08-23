/**
 * Offline Sync Queue Engine for Trainr
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';

const QUEUE_KEY = '@trainr_offline_queue';

export interface SyncQueueItem {
  id: string;
  type: 'LOG_MEAL' | 'FINISH_WORKOUT' | 'UPDATE_MEASUREMENTS' | 'ADD_CHECKIN' | 'UPDATE_PROFILE' | 'ADD_WEIGHT' | 'ADD_PR' | 'FEED_EVENT';
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export async function getQueue(): Promise<SyncQueueItem[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export async function saveQueue(queue: SyncQueueItem[]) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    logger.warn('Failed to save sync queue:', e);
  }
}

export async function queueOfflineTransaction(type: SyncQueueItem['type'], payload: any): Promise<SyncQueueItem> {
  const queue = await getQueue();
  const item: SyncQueueItem = {
    id: 'queue_' + Date.now(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

export async function getPendingQueueItems(): Promise<SyncQueueItem[]> {
  const queue = await getQueue();
  return queue.filter((i) => i.status === 'PENDING');
}

export async function markItemSynced(id: string) {
  const queue = await getQueue();
  const nextQueue = queue.map(item => item.id === id ? { ...item, status: 'SYNCED' as const } : item);
  await saveQueue(nextQueue);
}

export async function clearSyncedItems() {
  const queue = await getQueue();
  const nextQueue = queue.filter(item => item.status !== 'SYNCED');
  await saveQueue(nextQueue);
}
