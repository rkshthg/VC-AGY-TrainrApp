import { create } from 'zustand';
import { TagPill } from '../components/ClientActivityCard';
import { supabase } from '../lib/supabase';
import { queueOfflineTransaction } from '../lib/offlineSync';
import { useAuthStore } from './authStore';
import logger from '../lib/logger';
import { ensureUploaded, toDisplayUrls } from '../lib/photoStorage';
import { localDateStr, localDayRangeISO } from '../lib/dates';
import { Alert, Platform } from 'react-native';

export interface ClientSummaryCard {
  clientId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  currentPlanTitle?: string;
  status: 'ON_TRACK' | 'NEEDS_ATTENTION';
  lastActive: string; // ISO String
  todayCaloriesLogged: number;
  targetCalories: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  todayWorkoutDone: boolean;
  /** Why the client needs attention (PRD 3.5), when status is NEEDS_ATTENTION. */
  attentionReasons?: string[];
}

export interface LiveFeedEventCard {
  id: string;
  clientId: string;
  clientName: string;
  avatarUrl?: string;
  timeAgo: string;
  actionVerb: string;
  targetTitle: string;
  isAlert?: boolean;
  isAcknowledged?: boolean;
  acknowledgedAt?: string;
  tags: TagPill[];
  eventType: 'LOG_MEAL' | 'FINISH_WORKOUT' | 'UPLOAD_CHECKIN' | 'UPDATE_MEASUREMENTS' | 'MISSED_WORKOUT';
  timestamp: string;
  photoUrl?: string;
  breakdownItems?: { title: string; subtitle: string; value: string }[];
  updatedValues?: { label: string; value: string }[];
  detailPayload?: any;
  mealId?: string;
}

interface TrainerState {
  clients: ClientSummaryCard[];
  liveFeedCards: LiveFeedEventCard[];
  inspectingClientId: string | null;
  isLoading: boolean;

  fetchRoster: () => Promise<void>;
  receiveFeedEvent: (row: any) => Promise<void>;
  addLiveFeedEvent: (event: Omit<LiveFeedEventCard, 'id' | 'timeAgo'>) => void;
  toggleAcknowledgeEvent: (eventId: string) => void;
  inspectClient: (clientId: string | null) => void;
  updateClientMacroTargets: (clientId: string, targets: { calories: number; protein: number; carbs: number; fat: number }) => Promise<boolean>;
  removePhotoFromLiveFeed: (photoUrl: string) => void;
  deleteLiveFeedEventByPhotoUrl: (photoUrl: string) => void;
  removeFeedEventsByMealId: (mealId: string) => void;
  unlinkClient: (clientId: string) => void;
  reset: () => void;
}


// Basic formatter for time ago locally since timeAgo is derived
function formatTimeAgo(isoString: string): string {
   const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
   if (mins < 60) return `${mins}m ago`;
   if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
   return `${Math.floor(mins/1440)}d ago`;
}

/** Map a trainer_feed_events row to a feed card (photo resolved separately). */
function mapFeedRow(f: any, clients: ClientSummaryCard[]): LiveFeedEventCard {
  const relatedClient = clients.find((c) => c.clientId === f.client_id);
  return {
    id: f.id,
    clientId: f.client_id,
    clientName: relatedClient?.fullName || 'Client',
    avatarUrl: relatedClient?.avatarUrl,
    timeAgo: formatTimeAgo(f.created_at),
    actionVerb: f.action_verb,
    targetTitle: f.target_title,
    isAlert: f.is_alert,
    isAcknowledged: f.is_acknowledged,
    acknowledgedAt: f.acknowledged_at || (f.is_acknowledged ? f.created_at : undefined),
    mealId: f.meal_id || undefined,
    tags: [],
    eventType: f.event_type as any,
    timestamp: f.created_at,
    photoUrl: f.photo_url,
    ...f.metadata,
  };
}

const MS_48H = 48 * 60 * 60 * 1000;
const COMPLIANCE_THRESHOLD = 0.7;

export const useTrainerStore = create<TrainerState>((set, get) => ({
  clients: [],
  liveFeedCards: [],
  inspectingClientId: null,
  isLoading: false,

  fetchRoster: async () => {
    set({ isLoading: true });
    try {
      const trainerId = useAuthStore.getState().profile?.id;
      if (!trainerId) {
        set({ isLoading: false });
        return;
      }

      const startOfDayISO = localDayRangeISO(localDateStr()).start;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterdayISO = localDayRangeISO(localDateStr(yesterday)).start;
      const since48hISO = new Date(Date.now() - MS_48H).toISOString();

      // Fetch active clients, plan assignments, today's meals, and today's workouts
      const [clientsRes, assignmentsRes, mealsRes, workoutsRes] = await Promise.all([
        supabase
          .from('trainer_clients')
          .select(`
             client_id,
             users!trainer_clients_client_id_fkey(
                full_name, 
                email, 
                avatar_url, 
                updated_at,
                macro_targets:macro_targets!user_id(calories, protein_g, carbs_g, fat_g)
             )
          `)
          .eq('trainer_id', trainerId)
          .eq('status', 'ACTIVE'),
        supabase
          .from('workout_plan_assignments')
          .select('client_id, workout_plans(title)')
          .eq('trainer_id', trainerId),
        supabase
          .from('meals')
          .select('user_id, total_calories, created_at')
          .gte('created_at', startOfYesterdayISO),
        supabase
          .from('workout_logs')
          .select('user_id, created_at')
          .gte('created_at', since48hISO),
      ]);

      // Workouts today, and anyone with a workout in the last 48h.
      const clientIdsWithWorkouts = new Set(
        (workoutsRes.data || []).filter((w: any) => w.created_at >= startOfDayISO).map((w: any) => w.user_id)
      );
      const clientIdsWorkout48h = new Set((workoutsRes.data || []).map((w: any) => w.user_id));

      const caloriesByClient: Record<string, number> = {};
      const yesterdayCaloriesByClient: Record<string, number> = {};
      (mealsRes.data || []).forEach((m: any) => {
        const bucket = m.created_at >= startOfDayISO ? caloriesByClient : yesterdayCaloriesByClient;
        bucket[m.user_id] = (bucket[m.user_id] || 0) + Number(m.total_calories || 0);
      });

      const planByClient: Record<string, string> = {};
      (assignmentsRes.data || []).forEach((a: any) => {
        if (a.workout_plans?.title) {
          planByClient[a.client_id] = a.workout_plans.title;
        }
      });

      const parsedClients: ClientSummaryCard[] = (clientsRes.data || []).map((c: any) => {
        const cId = c.client_id;
        const loggedCals = caloriesByClient[cId] || 0;
        const workoutDone = clientIdsWithWorkouts.has(cId);
        const rawMacros = c.users?.macro_targets;
        const userMacros = Array.isArray(rawMacros) ? rawMacros[0] : rawMacros;
        const targetCals = userMacros?.calories || 2500;

        // PRD 3.5: needs attention when macro compliance < 70% (judged on
        // yesterday, the last complete day) or no workout in over 48h.
        const yesterdayCompliance = (yesterdayCaloriesByClient[cId] || 0) / targetCals;
        const attentionReasons: string[] = [];
        if (yesterdayCompliance < COMPLIANCE_THRESHOLD) {
          attentionReasons.push(`Calories ${Math.round(yesterdayCompliance * 100)}% of target yesterday`);
        }
        if (!clientIdsWorkout48h.has(cId)) {
          attentionReasons.push('No workout in 48h');
        }

        return {
          clientId: cId,
          fullName: c.users?.full_name || 'Unknown',
          email: c.users?.email || '',
          avatarUrl: c.users?.avatar_url,
          currentPlanTitle: planByClient[cId] || 'No Active Plan',
          status: attentionReasons.length > 0 ? 'NEEDS_ATTENTION' : 'ON_TRACK',
          attentionReasons,
          lastActive: c.users?.updated_at || new Date().toISOString(),
          todayCaloriesLogged: loggedCals,
          targetCalories: targetCals,
          targetProtein: userMacros?.protein_g || 75,
          targetCarbs: userMacros?.carbs_g || 250,
          targetFat: userMacros?.fat_g || 65,
          todayWorkoutDone: workoutDone,
        };
      });


      const avatarUrls = await toDisplayUrls(parsedClients.map((c) => c.avatarUrl));
      parsedClients.forEach((c, i) => { c.avatarUrl = avatarUrls[i]; });

      // Cleanup acknowledged events older than 24h from backend
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      supabase
        .from('trainer_feed_events')
        .delete()
        .eq('trainer_id', trainerId)
        .eq('is_acknowledged', true)
        .lte('acknowledged_at', cutoff24h)
        .then();

      // Fetch live feed
      const { data: feedData } = await supabase
        .from('trainer_feed_events')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      const parsedFeed: LiveFeedEventCard[] = (feedData || [])
        .filter((f: any) => {
          // Exclude any acknowledged cards older than 24 hours
          if (f.is_acknowledged && f.acknowledged_at) {
            return new Date(f.acknowledged_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
          }
          return true;
        })
        .map((f: any) => mapFeedRow(f, parsedClients));
      const feedPhotos = await toDisplayUrls(parsedFeed.map((c) => c.photoUrl));
      parsedFeed.forEach((c, i) => { c.photoUrl = feedPhotos[i]; });

      set({ clients: parsedClients, liveFeedCards: parsedFeed, isLoading: false });
    } catch (e) {
       logger.warn('Failed to fetch roster', e);
       set({ isLoading: false });
    }
  },

  receiveFeedEvent: async (row) => {
    if (!row?.id || get().liveFeedCards.some((c) => c.id === row.id)) return;
    const card = mapFeedRow(row, get().clients);
    [card.photoUrl] = await toDisplayUrls([card.photoUrl]);
    set((state) => ({ liveFeedCards: [card, ...state.liveFeedCards.filter((c) => c.id !== card.id)] }));
  },

  addLiveFeedEvent: async (eventData) => {
    const timestamp = eventData.timestamp || new Date().toISOString();
    const newEvent: LiveFeedEventCard = {
      ...eventData,
      id: 'feed_' + Date.now(),
      timeAgo: 'Just now',
      timestamp
    };
    
    set((state) => ({
      liveFeedCards: [newEvent, ...state.liveFeedCards],
    }));

    const trainerId = useAuthStore.getState().profile?.linkedTrainerId; // For clients logging events
    if (trainerId) {
      const payload = {
        trainer_id: trainerId,
        client_id: eventData.clientId,
        event_type: eventData.eventType,
        action_verb: eventData.actionVerb,
        target_title: eventData.targetTitle,
        is_alert: eventData.isAlert || false,
        is_acknowledged: false,
        meal_id: eventData.mealId || null,
        photo_url: eventData.photoUrl as string | undefined,
        metadata: {
           breakdownItems: eventData.breakdownItems,
           updatedValues: eventData.updatedValues,
           detailPayload: eventData.detailPayload
        },
        created_at: timestamp
      };

      try {
        payload.photo_url = await ensureUploaded(payload.photo_url, 'checkins');
        const { error } = await supabase.from('trainer_feed_events').insert(payload);
        if (error) {
          queueOfflineTransaction('FEED_EVENT', payload);
        }
      } catch {
        queueOfflineTransaction('FEED_EVENT', payload);
      }
    }
  },

  toggleAcknowledgeEvent: async (eventId: string) => {
    const nowISO = new Date().toISOString();
    const prevCards = get().liveFeedCards;

    set((state) => ({
      liveFeedCards: state.liveFeedCards.map((card) => {
        if (card.id !== eventId) return card;
        const nextAck = !card.isAcknowledged;
        return {
          ...card,
          isAcknowledged: nextAck,
          acknowledgedAt: nextAck ? nowISO : undefined,
        };
      }),
    }));
    
    const current = get().liveFeedCards.find((c) => c.id === eventId);
    if (current && !eventId.startsWith('feed_')) {
       try {
         const { error } = await supabase
           .from('trainer_feed_events')
           .update({
             is_acknowledged: current.isAcknowledged,
             acknowledged_at: current.isAcknowledged ? nowISO : null,
           })
           .eq('id', eventId);

         if (error) {
           logger.warn('Failed to update event acknowledgement in Supabase:', error);
           set({ liveFeedCards: prevCards });
         }
       } catch (err) {
         logger.error('Error in toggleAcknowledgeEvent:', err);
         set({ liveFeedCards: prevCards });
       }
    }
  },

  removeFeedEventsByMealId: (mealId: string) => {
    set((state) => ({
      liveFeedCards: state.liveFeedCards.filter((card) => card.mealId !== mealId),
    }));
  },


  inspectClient: (clientId) => set({ inspectingClientId: clientId }),

  updateClientMacroTargets: async (clientId, targets) => {
    const prevClients = get().clients;
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId
          ? {
              ...c,
              targetCalories: targets.calories,
              targetProtein: targets.protein,
              targetCarbs: targets.carbs,
              targetFat: targets.fat,
            }
          : c
      ),
    }));
    
    const { error } = await supabase.from('macro_targets').upsert({
      user_id: clientId,
      calories: targets.calories,
      protein_g: targets.protein,
      carbs_g: targets.carbs,
      fat_g: targets.fat,
      updated_by: useAuthStore.getState().profile?.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (error) {
      logger.warn('Failed to save client macro targets:', error);
      set({ clients: prevClients });
      const msg = 'Could not save the new targets. Check your connection and try again.';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Save Failed', msg);
      return false;
    }
    return true;
  },

  removePhotoFromLiveFeed: (photoUrl) => {
    set((state) => ({
      liveFeedCards: state.liveFeedCards.map((card) => {
        if (card.photoUrl === photoUrl) {
          const { photoUrl: _, ...rest } = card;
          return rest;
        }
        return card;
      }),
    }));
  },

  deleteLiveFeedEventByPhotoUrl: (photoUrl) => {
    set((state) => ({
      liveFeedCards: state.liveFeedCards.filter((card) => card.photoUrl !== photoUrl),
    }));
  },

  unlinkClient: async (clientId: string) => {
    set((state) => ({
      clients: state.clients.filter((c) => c.clientId !== clientId),
      inspectingClientId: state.inspectingClientId === clientId ? null : state.inspectingClientId,
    }));
    
    const trainerId = useAuthStore.getState().profile?.id;
    if (trainerId) {
      supabase.from('trainer_clients')
        .update({ status: 'UNLINKED' })
        .eq('trainer_id', trainerId)
        .eq('client_id', clientId)
        .then();
    }
  },

  reset: () => set({ clients: [], liveFeedCards: [], inspectingClientId: null, isLoading: false }),
}));
