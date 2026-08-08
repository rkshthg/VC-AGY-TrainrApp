/**
 * Trainer Live Roster & Client Alert Engine State Store
 * @module store/trainerStore
 */

import { create } from 'zustand';
import { getTrainerClients, createClientInvite } from '@/services/authService';

export interface ClientRosterItem {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  goal: string;
  calories_logged: number;
  calorie_target: number;
  protein_logged: number;
  protein_target: number;
  last_workout: string;
  last_active: string;
  status_badge: 'on_track' | 'needs_attention' | 'off_track' | 'no_data';
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  timestamp: string;
}

interface TrainerState {
  clients: ClientRosterItem[];
  messages: ChatMessage[];
  selectedClientId: string | null;
  isLoadingClients: boolean;
  setSelectedClient: (id: string | null) => void;
  fetchClients: (trainerId: string) => Promise<void>;
  generateInvite: (trainerId: string, email: string) => Promise<{ inviteCode: string } | null>;
  updateClientTarget: (clientId: string, calories: number, protein: number) => void;
  sendMessage: (receiverId: string, text: string) => void;
}

const DEFAULT_MOCK_CLIENTS: ClientRosterItem[] = [
  {
    id: 'cli_1',
    name: 'Alex Johnson',
    goal: 'Fat Loss & Muscle Retention',
    calories_logged: 1850,
    calorie_target: 2000,
    protein_logged: 155,
    protein_target: 160,
    last_workout: 'Push Day A (Today)',
    last_active: '10 mins ago',
    status_badge: 'on_track',
  },
  {
    id: 'cli_2',
    name: 'Sarah Miller',
    goal: 'Hypertrophy & Strength',
    calories_logged: 950,
    calorie_target: 2300,
    protein_logged: 65,
    protein_target: 170,
    last_workout: 'Leg Day B (2 days ago)',
    last_active: '1 day ago',
    status_badge: 'needs_attention',
  },
  {
    id: 'cli_3',
    name: 'Marcus Vance',
    goal: 'Recomposition',
    calories_logged: 0,
    calorie_target: 2500,
    protein_logged: 0,
    protein_target: 190,
    last_workout: 'None logged (4 days ago)',
    last_active: '3 days ago',
    status_badge: 'off_track',
  },
];

/**
 * Dynamic Client Risk Alert Engine
 */
export function computeDynamicAlertStatus(
  caloriesLogged: number,
  calorieTarget: number,
  lastWorkoutDaysAgo: number
): 'on_track' | 'needs_attention' | 'off_track' | 'no_data' {
  if (caloriesLogged === 0 && lastWorkoutDaysAgo >= 3) {
    return 'off_track';
  }
  const calRatio = calorieTarget > 0 ? caloriesLogged / calorieTarget : 0;
  if (calRatio < 0.5 || lastWorkoutDaysAgo >= 2) {
    return 'needs_attention';
  }
  if (calRatio >= 0.85 && calRatio <= 1.15) {
    return 'on_track';
  }
  return 'needs_attention';
}

export const useTrainerStore = create<TrainerState>((set, get) => ({
  clients: [],
  messages: [],
  selectedClientId: null,
  isLoadingClients: false,

  setSelectedClient: (id) => set({ selectedClientId: id }),

  fetchClients: async (trainerId) => {
    if (!trainerId) return;
    set({ isLoadingClients: true });
    try {
      const dbClients = await getTrainerClients(trainerId);
      if (dbClients && dbClients.length > 0) {
        const formatted: ClientRosterItem[] = dbClients.map((c: any) => {
          const calLogged = c.calories_logged || 0;
          const calTarget = c.calorie_target || 2200;
          const daysAgo = c.last_workout?.includes('days') ? parseInt(c.last_workout) || 2 : 0;
          const computedStatus = computeDynamicAlertStatus(calLogged, calTarget, daysAgo);

          return {
            id: c.id,
            name: c.full_name || 'Client',
            email: c.email,
            avatar_url: c.avatar_url,
            goal: c.fitness_goal || 'Recomposition',
            calories_logged: calLogged,
            calorie_target: calTarget,
            protein_logged: c.protein_logged || 0,
            protein_target: c.protein_target || 160,
            last_workout: c.last_workout || 'Push Day A (Today)',
            last_active: c.last_active || 'Recently',
            status_badge: computedStatus,
          };
        });
        set({ clients: formatted, isLoadingClients: false });
      } else {
        set({ isLoadingClients: false });
      }
    } catch (err) {
      console.error('[trainerStore] Error fetching trainer clients:', err);
      set({ isLoadingClients: false });
    }
  },

  generateInvite: async (trainerId, email) => {
    return await createClientInvite(trainerId, email);
  },

  updateClientTarget: (clientId, calories, protein) => {
    set((state) => ({
      clients: state.clients.map((c) => {
        if (c.id === clientId) {
          const updatedCalTarget = calories;
          const updatedStatus = computeDynamicAlertStatus(c.calories_logged, updatedCalTarget, 0);
          return {
            ...c,
            calorie_target: calories,
            protein_target: protein,
            status_badge: updatedStatus,
          };
        }
        return c;
      }),
    }));
  },

  sendMessage: (receiverId, text) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender_id: 'trainer',
      receiver_id: receiverId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({ messages: [...state.messages, newMsg] }));
  },
}));
