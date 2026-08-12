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

export interface CheckinLog {
  id: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  photoUrl?: string;
  note?: string;
  measurements?: Partial<BodyMeasurements>;
}

interface ProgressState {
  weightHistory: WeightLog[];
  latestMeasurements: BodyMeasurements;
  checkinPhotos: CheckinPhoto[];
  checkinLogs: CheckinLog[];

  addWeightLog: (weightKg: number) => void;
  updateMeasurements: (measurements: Partial<BodyMeasurements>) => void;
  addCheckinPhoto: (photoUrl: string, note?: string) => void;
  deleteCheckinPhoto: (id: string) => void;
  addCheckinLog: (logData: Omit<CheckinLog, 'id' | 'date'>) => void;
  deleteCheckinLog: (id: string) => void;
  getCalculatedMetrics: (profileStats: Partial<BodyStats>) => CalculatedHealthMetrics;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  weightHistory: [
    { id: 'w_1', date: '2026-09-28T10:00:00.000Z', weightKg: 92.5 },
    { id: 'w_2', date: '2026-09-14T10:00:00.000Z', weightKg: 92.0 },
    { id: 'w_3', date: '2026-08-30T10:00:00.000Z', weightKg: 91.2 },
  ],
  latestMeasurements: {
    neckCm: 39,
    shouldersCm: 118,
    chestCm: 102,
    waistCm: 84,
    hipsCm: 98,
    bicepsCm: 37,
    bicepsLCm: 37,
    bicepsRCm: 37.5,
    thighsCm: 58,
    thighsLCm: 58,
    thighsRCm: 58.5,
  },
  checkinPhotos: [
    {
      id: 'pic_1',
      date: '2026-10-12T10:00:00.000Z',
      photoUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400',
      note: 'Front Physique Check-In',
    },
    {
      id: 'pic_2',
      date: '2026-09-05T10:00:00.000Z',
      photoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      note: 'Back & Delts Check-In',
    },
  ],
  checkinLogs: [
    {
      id: 'pic_1',
      date: '2026-10-12T10:00:00.000Z',
      photoUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400',
      note: 'Front Physique Check-In',
      measurements: { waistCm: 84, chestCm: 102, neckCm: 39 },
    },
    {
      id: 'chk_2',
      date: '2026-09-28T10:00:00.000Z',
      weightKg: 92.5,
      measurements: { waistCm: 84.5 },
    },
    {
      id: 'pic_2',
      date: '2026-09-05T10:00:00.000Z',
      photoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      note: 'Back & Delts Check-In',
      measurements: { bicepsLCm: 37, bicepsRCm: 37.5 },
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
      checkinLogs: state.checkinLogs.filter((l) => l.id !== id),
    })),

  addCheckinLog: (logData) => {
    const newLog: CheckinLog = {
      id: 'chk_' + Date.now(),
      date: new Date().toISOString(),
      ...logData,
    };
    set((state) => {
      const nextLogs = [newLog, ...state.checkinLogs];
      const nextWeightHistory = logData.weightKg
        ? [{ id: 'w_' + newLog.id, date: newLog.date, weightKg: logData.weightKg }, ...state.weightHistory]
        : state.weightHistory;
      const nextMeasurements = logData.measurements
        ? { ...state.latestMeasurements, ...logData.measurements }
        : state.latestMeasurements;
      const nextPhotos = logData.photoUrl
        ? [{ id: newLog.id, date: newLog.date, photoUrl: logData.photoUrl, note: logData.note }, ...state.checkinPhotos]
        : state.checkinPhotos;

      return {
        checkinLogs: nextLogs,
        weightHistory: nextWeightHistory,
        latestMeasurements: nextMeasurements,
        checkinPhotos: nextPhotos,
      };
    });
  },

  deleteCheckinLog: (id) => {
    set((state) => ({
      checkinLogs: state.checkinLogs.filter((l) => l.id !== id),
      checkinPhotos: state.checkinPhotos.filter((p) => p.id !== id),
    }));
  },

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
