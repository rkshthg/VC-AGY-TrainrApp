import { create } from 'zustand';
import { computeFullHealthMetrics, CalculatedHealthMetrics, BodyStats } from '../lib/healthMetrics';

export interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
}

export interface BodyMeasurements {
  neckCm?: number;
  shouldersCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bicepsCm?: number;
  bicepsLCm?: number;
  bicepsRCm?: number;
  thighsCm?: number;
  thighsLCm?: number;
  thighsRCm?: number;
}

export interface CheckinPhoto {
  id: string;
  date: string;
  photoUrl: string;
  note?: string;
}

interface ProgressState {
  weightHistory: WeightLog[];
  latestMeasurements: BodyMeasurements;
  checkinPhotos: CheckinPhoto[];

  addWeightLog: (weightKg: number) => void;
  updateMeasurements: (measurements: Partial<BodyMeasurements>) => void;
  addCheckinPhoto: (photoUrl: string, note?: string) => void;
  deleteCheckinPhoto: (id: string) => void;
  getCalculatedMetrics: (profileStats: Partial<BodyStats>) => CalculatedHealthMetrics;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  weightHistory: [
    { id: 'w_1', date: new Date(Date.now() - 2592000000).toISOString(), weightKg: 78.5 },
    { id: 'w_2', date: new Date(Date.now() - 1296000000).toISOString(), weightKg: 77.2 },
    { id: 'w_3', date: new Date().toISOString(), weightKg: 76.4 },
  ],
  latestMeasurements: {
    neckCm: 39,
    shouldersCm: 118,
    chestCm: 102,
    waistCm: 84,
    hipsCm: 98,
    bicepsCm: 37,
    thighsCm: 58,
  },
  checkinPhotos: [
    {
      id: 'pic_1',
      date: new Date(Date.now() - 1296000000).toISOString(),
      photoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400',
      note: 'Week 2 Check-in',
    },
  ],

  addWeightLog: (weightKg) => {
    const newLog: WeightLog = {
      id: 'w_' + Date.now(),
      date: new Date().toISOString(),
      weightKg,
    };
    set((state) => ({
      weightHistory: [newLog, ...state.weightHistory],
    }));
  },

  updateMeasurements: (newMeasurements) =>
    set((state) => ({
      latestMeasurements: { ...state.latestMeasurements, ...newMeasurements },
    })),

  addCheckinPhoto: (photoUrl, note) => {
    const newPic: CheckinPhoto = {
      id: 'pic_' + Date.now(),
      date: new Date().toISOString(),
      photoUrl,
      note,
    };
    set((state) => ({
      checkinPhotos: [newPic, ...state.checkinPhotos],
    }));
  },

  deleteCheckinPhoto: (id) =>
    set((state) => ({
      checkinPhotos: state.checkinPhotos.filter((p) => p.id !== id),
    })),

  getCalculatedMetrics: (profileStats) => {
    const latestWeight = get().weightHistory[0]?.weightKg || profileStats.weightKg || 70;
    const stats: BodyStats = {
      heightCm: profileStats.heightCm || 175,
      weightKg: latestWeight,
      sex: profileStats.sex || 'MALE',
      ageYears: 26,
      neckCm: get().latestMeasurements.neckCm || profileStats.neckCm,
      waistCm: get().latestMeasurements.waistCm || profileStats.waistCm,
      hipsCm: get().latestMeasurements.hipsCm || profileStats.hipsCm,
      activityLevel: profileStats.activityLevel || 'MODERATELY_ACTIVE',
    };

    return computeFullHealthMetrics(stats);
  },
}));
