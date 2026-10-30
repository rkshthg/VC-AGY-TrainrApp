/**
 * Offline Sync Queue Engine for Trainr
 *
 * Writes that fail (no network, upload error) are saved here and replayed by
 * processQueue(), which runs on sign-in, when the app returns to the
 * foreground, and on a timer while items are pending (see app/_layout.tsx).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';

const QUEUE_KEY = '@trainr_offline_queue';
const MAX_ATTEMPTS = 8;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SyncQueueItem {
  id: string;
  type: 'LOG_MEAL' | 'FINISH_WORKOUT' | 'UPDATE_MEASUREMENTS' | 'ADD_CHECKIN' | 'UPDATE_PROFILE' | 'ADD_WEIGHT' | 'ADD_PR' | 'FEED_EVENT';
  payload: any;
  userId?: string;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  attempts?: number;
  lastError?: string;
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

function ownerOf(payload: any): string | undefined {
  return payload?.user_id || payload?.userId || payload?.client_id || payload?.log?.user_id;
}

export async function queueOfflineTransaction(type: SyncQueueItem['type'], payload: any): Promise<SyncQueueItem> {
  const queue = await getQueue();
  const item: SyncQueueItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    userId: ownerOf(payload),
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    attempts: 0,
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

/** Drop synced and permanently failed items; returns how many were removed. */
export async function clearFinishedItems(): Promise<number> {
  const queue = await getQueue();
  const nextQueue = queue.filter((item) => item.status === 'PENDING');
  await saveQueue(nextQueue);
  return queue.length - nextQueue.length;
}

// --- Replay -------------------------------------------------------------

/** Maps a queued meal's temporary id to its server id once synced. */
const syncedMealIds: Record<string, string> = {};

async function replay(item: SyncQueueItem): Promise<void> {
  // Lazy imports avoid a require cycle (stores import this module).
  const { supabase } = require('./supabase');
  const { ensureUploaded } = require('./photoStorage');
  const p = item.payload || {};
  const check = (res: { error: any }) => {
    if (res.error) throw res.error;
  };

  switch (item.type) {
    case 'LOG_MEAL': {
      const { items = [], temp_id, ...meal } = p;
      meal.photo_url = await ensureUploaded(meal.photo_url, 'meals');
      const res = await supabase.from('meals').insert(meal).select('id').single();
      check(res);
      if (temp_id) syncedMealIds[temp_id] = res.data.id;
      if (items.length > 0) {
        check(await supabase.from('meal_items').insert(
          items.map((i: any) => ({
            meal_id: res.data.id,
            name: i.name,
            quantity: i.quantity,
            calories: i.calories,
            protein_g: i.proteinG ?? i.protein_g,
            carbs_g: i.carbsG ?? i.carbs_g,
            fat_g: i.fatG ?? i.fat_g,
          }))
        ));
      }
      return;
    }
    case 'FINISH_WORKOUT': {
      // New shape: { log, sets }. Older items stored the log row directly.
      const log = p.log || p;
      const sets: any[] = p.sets || [];
      const res = await supabase.from('workout_logs').insert(log).select('id').single();
      check(res);
      if (sets.length > 0) {
        check(await supabase.from('workout_log_sets').insert(
          sets.map((s) => ({ ...s, workout_log_id: res.data.id }))
        ));
      }
      return;
    }
    case 'UPDATE_MEASUREMENTS':
      check(await supabase.from('body_measurements').insert(p));
      return;
    case 'ADD_CHECKIN': {
      const row = { ...p, photo_url: await ensureUploaded(p.photo_url, 'checkins') };
      check(await supabase.from('checkin_photos').insert(row));
      return;
    }
    case 'ADD_WEIGHT':
      check(await supabase.from('weight_logs').insert({
        user_id: p.user_id || p.userId,
        weight_kg: p.weight_kg ?? p.weightKg,
        recorded_at: p.recorded_at || p.date,
      }));
      return;
    case 'ADD_PR':
      check(await supabase.from('personal_records').upsert(p, { onConflict: 'user_id,exercise_id' }));
      return;
    case 'FEED_EVENT': {
      const row = { ...p };
      if (row.meal_id && !UUID_RE.test(row.meal_id)) {
        row.meal_id = syncedMealIds[row.meal_id] || null;
      }
      if (row.photo_url) row.photo_url = await ensureUploaded(row.photo_url, 'checkins');
      check(await supabase.from('trainer_feed_events').insert(row));
      return;
    }
    default:
      return; // Unknown/legacy types: nothing to send.
  }
}

let processing: Promise<{ synced: number; pending: number }> | null = null;

/**
 * Send queued items belonging to the signed-in user, oldest first.
 * Safe to call often; concurrent calls share one run.
 */
export function processQueue(): Promise<{ synced: number; pending: number }> {
  if (processing) return processing;
  processing = (async () => {
    let synced = 0;
    try {
      const { supabase } = require('./supabase');
      const { data } = await supabase.auth.getSession();
      const uid: string | undefined = data?.session?.user?.id;
      if (!uid) return { synced: 0, pending: 0 };

      const queue = await getQueue();
      for (const item of queue) {
        if (item.status !== 'PENDING') continue;
        const owner = item.userId || ownerOf(item.payload);
        if (owner && owner !== uid) continue; // another account's data: leave it

        try {
          await replay(item);
          item.status = 'SYNCED';
          synced++;
        } catch (e: any) {
          item.attempts = (item.attempts || 0) + 1;
          item.lastError = e?.message || String(e);
          if (item.attempts >= MAX_ATTEMPTS) item.status = 'FAILED';
          logger.warn(`Offline sync failed for ${item.type} (attempt ${item.attempts}):`, item.lastError);
          // Stop on network-style failures so items stay in order.
          if (/network|fetch|timeout/i.test(item.lastError || '')) break;
        }
      }

      // Re-read and merge, in case new items were queued while we worked.
      const latest = await getQueue();
      const byId = new Map(queue.map((i) => [i.id, i]));
      const merged = latest.map((i) => byId.get(i.id) ?? i).filter((i) => i.status !== 'SYNCED');
      await saveQueue(merged);
      return { synced, pending: merged.filter((i) => i.status === 'PENDING').length };
    } catch (e) {
      logger.warn('Offline queue processing error:', e);
      return { synced, pending: -1 };
    } finally {
      processing = null;
    }
  })();
  return processing;
}
