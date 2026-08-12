import { create } from 'zustand';
import { TagPill } from '../components/ClientActivityCard';

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
  tags: TagPill[];
  eventType: 'LOG_MEAL' | 'FINISH_WORKOUT' | 'UPLOAD_CHECKIN' | 'UPDATE_MEASUREMENTS' | 'MISSED_WORKOUT';
  timestamp: string;
  photoUrl?: string;
  updatedValues?: { label: string; value: string }[];
  detailPayload?: any;
}

interface TrainerState {
  clients: ClientSummaryCard[];
  liveFeedCards: LiveFeedEventCard[];
  inspectingClientId: string | null;

  fetchRoster: () => void;
  addLiveFeedEvent: (event: Omit<LiveFeedEventCard, 'id'>) => void;
  toggleAcknowledgeEvent: (eventId: string) => void;
  inspectClient: (clientId: string | null) => void;
  updateClientMacroTargets: (clientId: string, targets: { calories: number; protein: number; carbs: number; fat: number }) => void;
  removePhotoFromLiveFeed: (photoUrl: string) => void;
  deleteLiveFeedEventByPhotoUrl: (photoUrl: string) => void;
  unlinkClient: (clientId: string) => void;
}

export const useTrainerStore = create<TrainerState>((set, get) => ({
  clients: [
    {
      clientId: 'cli_101',
      fullName: 'Sarah J.',
      email: 'sarah@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      currentPlanTitle: 'Chest & Triceps Hypertrophy',
      status: 'ON_TRACK',
      lastActive: new Date().toISOString(),
      todayCaloriesLogged: 1850,
      targetCalories: 2100,
      todayWorkoutDone: true,
    },
    {
      clientId: 'cli_102',
      fullName: 'Mike T.',
      email: 'mike@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      currentPlanTitle: 'Macro Bowl Nutrition Plan',
      status: 'ON_TRACK',
      lastActive: new Date(Date.now() - 2700000).toISOString(),
      todayCaloriesLogged: 1420,
      targetCalories: 2400,
      todayWorkoutDone: true,
    },
    {
      clientId: 'cli_103',
      fullName: 'David R.',
      email: 'david@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      currentPlanTitle: 'Leg Day Hypertrophy',
      status: 'NEEDS_ATTENTION',
      lastActive: new Date(Date.now() - 7200000).toISOString(),
      todayCaloriesLogged: 600,
      targetCalories: 2500,
      todayWorkoutDone: false,
    },
  ],
  liveFeedCards: [
    {
      id: 'feed_0',
      clientId: 'cli_101',
      clientName: 'Sarah J.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      timeAgo: '2m ago',
      actionVerb: 'logged',
      targetTitle: 'a Transformation',
      eventType: 'UPLOAD_CHECKIN',
      tags: [
        { label: 'Check-In', type: 'success' },
        { label: 'Transformation', type: 'success' },
      ],
      photoUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400',
      updatedValues: [
        { label: 'Body Weight', value: '74.2 kg' },
        { label: 'Height', value: '175 cm' },
        { label: 'Biceps L', value: '37.0 cm' },
        { label: 'Biceps R', value: '37.5 cm' },
        { label: 'Waist', value: '84 cm' },
      ],
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: 'feed_1',
      clientId: 'cli_101',
      clientName: 'Sarah J.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      timeAgo: '10m ago',
      actionVerb: 'Logged',
      targetTitle: 'Chest & Triceps Hypertrophy',
      eventType: 'FINISH_WORKOUT',
      tags: [
        { label: 'Strength', type: 'success' },
        { label: 'PR Hit', type: 'success' },
      ],
      timestamp: new Date().toISOString(),
    },
    {
      id: 'feed_2',
      clientId: 'cli_102',
      clientName: 'Mike T.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      timeAgo: '45m ago',
      actionVerb: 'Logged',
      targetTitle: 'Macro Bowl Lunch',
      eventType: 'LOG_MEAL',
      tags: [
        { label: 'Nutrition', type: 'success' },
        { label: 'On Track', type: 'success' },
      ],
      timestamp: new Date(Date.now() - 2700000).toISOString(),
    },
    {
      id: 'feed_3',
      clientId: 'cli_103',
      clientName: 'David R.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      timeAgo: '2h ago',
      actionVerb: 'Missed Scheduled Workout:',
      targetTitle: 'Leg Day',
      isAlert: true,
      eventType: 'MISSED_WORKOUT',
      tags: [
        { label: 'Action Required', type: 'alert' },
      ],
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  inspectingClientId: null,

  fetchRoster: () => {
    // In production, queries Supabase for clients assigned to auth.uid()
  },

  addLiveFeedEvent: (eventData) => {
    const newEvent: LiveFeedEventCard = {
      ...eventData,
      id: 'feed_' + Date.now(),
    };
    set((state) => ({
      liveFeedCards: [newEvent, ...state.liveFeedCards],
    }));
  },

  toggleAcknowledgeEvent: (eventId: string) => {
    set((state) => ({
      liveFeedCards: state.liveFeedCards.map((card) =>
        card.id === eventId ? { ...card, isAcknowledged: !card.isAcknowledged } : card
      ),
    }));
  },

  inspectClient: (clientId) => set({ inspectingClientId: clientId }),

  updateClientMacroTargets: (clientId, targets) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId ? { ...c, targetCalories: targets.calories } : c
      ),
    }));
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

  unlinkClient: (clientId: string) => {
    set((state) => ({
      clients: state.clients.filter((c) => c.clientId !== clientId),
      inspectingClientId: state.inspectingClientId === clientId ? null : state.inspectingClientId,
    }));
  },
}));
