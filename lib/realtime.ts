/**
 * Supabase Realtime subscriptions (PRD 5.1).
 *
 * Trainers: new trainer_feed_events rows for them are prepended to the live
 *           feed instantly, and the roster is refreshed shortly after.
 * Everyone: changes to their own macro_targets (e.g. set by their trainer)
 *           update the nutrition targets immediately.
 *
 * Row Level Security still applies to realtime, so a trainer only receives
 * events for clients they are actively linked to.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import logger from './logger';

let channel: RealtimeChannel | null = null;
let rosterTimer: ReturnType<typeof setTimeout> | null = null;

export function startRealtime(userId: string, role: 'CLIENT' | 'TRAINER'): void {
  stopRealtime();

  const { useTrainerStore } = require('../store/trainerStore');
  const { useNutritionStore } = require('../store/nutritionStore');

  const ch = supabase.channel(`trainr-user-${userId}`);

  if (role === 'TRAINER') {
    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'trainr', table: 'trainer_feed_events', filter: `trainer_id=eq.${userId}` },
      (payload: any) => {
        useTrainerStore.getState().receiveFeedEvent(payload.new);
        // Calories / workout badges on the roster come from other tables;
        // refresh them once activity settles.
        if (rosterTimer) clearTimeout(rosterTimer);
        rosterTimer = setTimeout(() => useTrainerStore.getState().fetchRoster(), 2000);
      }
    );
  }

  ch.on(
    'postgres_changes',
    { event: '*', schema: 'trainr', table: 'macro_targets', filter: `user_id=eq.${userId}` },
    (payload: any) => {
      const row = payload.new;
      if (!row || row.user_id !== userId) return;
      useNutritionStore.setState({
        macroTargets: {
          calories: Number(row.calories),
          protein: Number(row.protein_g),
          carbs: Number(row.carbs_g),
          fat: Number(row.fat_g),
        },
      });
    }
  );

  ch.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      logger.warn('Realtime channel status:', status);
    }
  });
  channel = ch;
}

export function stopRealtime(): void {
  if (rosterTimer) {
    clearTimeout(rosterTimer);
    rosterTimer = null;
  }
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
