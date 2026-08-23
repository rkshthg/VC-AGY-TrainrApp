import { create } from 'zustand';
import { TagPill } from '../components/ClientActivityCard';
import { supabase } from '../lib/supabase';
import { queueOfflineTransaction } from '../lib/offlineSync';
import { useAuthStore } from './authStore';
import logger from '../lib/logger';

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
}

interface TrainerState {
  clients: ClientSummaryCard[];
  liveFeedCards: LiveFeedEventCard[];
  inspectingClientId: string | null;
  isLoading: boolean;

  fetchRoster: () => Promise<void>;
  addLiveFeedEvent: (event: Omit<LiveFeedEventCard, 'id' | 'timeAgo'>) => void;
  toggleAcknowledgeEvent: (eventId: string) => void;
  inspectClient: (clientId: string | null) => void;
  updateClientMacroTargets: (clientId: string, targets: { calories: number; protein: number; carbs: number; fat: number }) => void;
  removePhotoFromLiveFeed: (photoUrl: string) => void;
  deleteLiveFeedEventByPhotoUrl: (photoUrl: string) => void;
  unlinkClient: (clientId: string) => void;
}

// Basic formatter for time ago locally since timeAgo is derived
function formatTimeAgo(isoString: string): string {
   const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
   if (mins < 60) return `${mins}m ago`;
   if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
   return `${Math.floor(mins/1440)}d ago`;
}

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

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayISO = startOfDay.toISOString();

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
          .select('user_id, total_calories')
          .gte('created_at', startOfDayISO),
        supabase
          .from('workout_logs')
          .select('user_id')
          .gte('created_at', startOfDayISO),
      ]);

      const clientIdsWithWorkouts = new Set((workoutsRes.data || []).map((w: any) => w.user_id));
      const caloriesByClient: Record<string, number> = {};
      (mealsRes.data || []).forEach((m: any) => {
        caloriesByClient[m.user_id] = (caloriesByClient[m.user_id] || 0) + Number(m.total_calories || 0);
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
        const targetCals = c.users?.macro_targets?.[0]?.calories || 2500;

        return {
          clientId: cId,
          fullName: c.users?.full_name || 'Unknown',
          email: c.users?.email || '',
          avatarUrl: c.users?.avatar_url,
          currentPlanTitle: planByClient[cId] || 'No Active Plan',
          status: (workoutDone || loggedCals > 0) ? 'ON_TRACK' : 'NEEDS_ATTENTION',
          lastActive: c.users?.updated_at || new Date().toISOString(),
          todayCaloriesLogged: loggedCals,
          targetCalories: targetCals,
          targetProtein: c.users?.macro_targets?.[0]?.protein_g || 75,
          targetCarbs: c.users?.macro_targets?.[0]?.carbs_g || 250,
          targetFat: c.users?.macro_targets?.[0]?.fat_g || 65,
          todayWorkoutDone: workoutDone,
        };
      });

      // Fetch live feed
      const { data: feedData } = await supabase
        .from('trainer_feed_events')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      const parsedFeed: LiveFeedEventCard[] = (feedData || []).map((f: any) => {
         const relatedClient = parsedClients.find(c => c.clientId === f.client_id);
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
            tags: [],
            eventType: f.event_type as any,
            timestamp: f.created_at,
            photoUrl: f.photo_url,
            ...f.metadata
         };
      });

      set({ clients: parsedClients, liveFeedCards: parsedFeed, isLoading: false });
    } catch (e) {
       logger.warn('Failed to fetch roster', e);
       set({ isLoading: false });
    }
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
        photo_url: eventData.photoUrl,
        metadata: {
           breakdownItems: eventData.breakdownItems,
           updatedValues: eventData.updatedValues,
           detailPayload: eventData.detailPayload
        },
        created_at: timestamp
      };

      const { error } = await supabase.from('trainer_feed_events').insert(payload);
      if (error) {
         queueOfflineTransaction('FEED_EVENT', payload);
      }
    }
  },

  toggleAcknowledgeEvent: async (eventId: string) => {
    const nowISO = new Date().toISOString();
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
       supabase
         .from('trainer_feed_events')
         .update({
           is_acknowledged: current.isAcknowledged,
           acknowledged_at: current.isAcknowledged ? nowISO : null,
         })
         .eq('id', eventId)
         .then();
    }
  },

  inspectClient: (clientId) => set({ inspectingClientId: clientId }),

  updateClientMacroTargets: async (clientId, targets) => {
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
    
    await supabase.from('macro_targets').upsert({
      user_id: clientId,
      calories: targets.calories,
      protein_g: targets.protein,
      carbs_g: targets.carbs,
      fat_g: targets.fat,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
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
}));
