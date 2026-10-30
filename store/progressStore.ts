import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { queueOfflineTransaction } from '../lib/offlineSync';
import { computeFullHealthMetrics, CalculatedHealthMetrics, BodyStats } from '../lib/healthMetrics';
import logger from '../lib/logger';
import { localDayKey } from '../lib/dates';
import { ensureUploaded, toDisplayUrls, storedRefFor, deleteMedia } from '../lib/photoStorage';

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
  photoUrls?: string[];
  note?: string;
}

export interface CheckinLog {
  id: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  photoUrl?: string;
  photoUrls?: string[];
  note?: string;
  measurements?: Partial<BodyMeasurements>;
}

interface ProgressState {
  weightHistory: WeightLog[];
  latestMeasurements: BodyMeasurements;
  checkinPhotos: CheckinPhoto[];
  checkinLogs: CheckinLog[];
  isLoading: boolean;

  fetchProgressData: (userId: string) => Promise<void>;
  addWeightLog: (userId: string, weightKg: number) => void;
  updateMeasurements: (userId: string, measurements: Partial<BodyMeasurements>) => void;
  addCheckinPhoto: (userId: string, photoUrl: string, note?: string) => void;
  deleteCheckinPhoto: (id: string) => void;
  addCheckinLog: (userId: string, logData: Omit<CheckinLog, 'id' | 'date'>) => void;
  deleteCheckinLog: (id: string) => void;
  getCalculatedMetrics: (profileStats: Partial<BodyStats>) => CalculatedHealthMetrics;
  reset: () => void;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  weightHistory: [],
  latestMeasurements: {},
  checkinPhotos: [],
  checkinLogs: [],
  isLoading: false,

  fetchProgressData: async (userId: string) => {
    set({ isLoading: true });
    try {
      const [weightRes, measurementRes, photoRes] = await Promise.all([
        supabase.from('weight_logs').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }),
        supabase.from('body_measurements').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }),
        supabase.from('checkin_photos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      const weightHistory = (weightRes.data || []).map(w => ({
        id: w.id,
        date: w.recorded_at,
        weightKg: w.weight_kg
      }));

      const measurementsHistory = (measurementRes.data || []).map(m => ({
        id: m.id,
        date: m.recorded_at,
        neckCm: m.neck_cm,
        shouldersCm: m.shoulders_cm,
        chestCm: m.chest_cm,
        waistCm: m.waist_cm,
        hipsCm: m.hips_cm,
        bicepsCm: m.biceps_cm,
        bicepsLCm: m.biceps_l_cm,
        bicepsRCm: m.biceps_r_cm,
        thighsCm: m.thighs_cm,
        thighsLCm: m.thighs_l_cm,
        thighsRCm: m.thighs_r_cm,
      }));

      const latest = measurementsHistory[0] || {};
      const latestMeasurements: BodyMeasurements = {
        neckCm: latest.neckCm,
        shouldersCm: latest.shouldersCm,
        chestCm: latest.chestCm,
        waistCm: latest.waistCm,
        hipsCm: latest.hipsCm,
        bicepsCm: latest.bicepsCm,
        bicepsLCm: latest.bicepsLCm,
        bicepsRCm: latest.bicepsRCm,
        thighsCm: latest.thighsCm,
        thighsLCm: latest.thighsLCm,
        thighsRCm: latest.thighsRCm,
      };

      const photoRows = photoRes.data || [];
      const photoDisplay = await toDisplayUrls(photoRows.map((p: any) => p.photo_url));
      const checkinPhotos = photoRows
        .map((p: any, i: number) => ({
          id: p.id,
          date: p.created_at,
          photoUrl: photoDisplay[i] as string,
          photoUrls: [photoDisplay[i] as string], // Since old schema used single URL
          note: p.note
        }))
        .filter((p: any) => !!p.photoUrl);

      // Reconstruct checkinLogs by grouping weight logs, body measurements, and photos by calendar date (YYYY-MM-DD)
      const logsByDay: Record<string, CheckinLog> = {};

      // 1. Process photos
      checkinPhotos.forEach(p => {
        if (!p.date) return;
        const dayKey = localDayKey(p.date); // local "YYYY-MM-DD"
        if (!logsByDay[dayKey]) {
          logsByDay[dayKey] = {
            id: 'chk_' + dayKey,
            date: p.date,
            photoUrl: p.photoUrl,
            photoUrls: p.photoUrls || [p.photoUrl],
            note: p.note,
          };
        } else {
          const currentUrls = logsByDay[dayKey].photoUrls || [];
          if (p.photoUrl && !currentUrls.includes(p.photoUrl)) {
            currentUrls.push(p.photoUrl);
          }
          logsByDay[dayKey].photoUrls = currentUrls;
          if (!logsByDay[dayKey].photoUrl) {
            logsByDay[dayKey].photoUrl = p.photoUrl;
          }
          if (p.note) {
            logsByDay[dayKey].note = logsByDay[dayKey].note ? logsByDay[dayKey].note + '; ' + p.note : p.note;
          }
        }
      });

      // 2. Process body measurements
      measurementsHistory.forEach(m => {
        if (!m.date) return;
        const dayKey = localDayKey(m.date);
        const measurements: Partial<BodyMeasurements> = {
          neckCm: m.neckCm,
          shouldersCm: m.shouldersCm,
          chestCm: m.chestCm,
          waistCm: m.waistCm,
          hipsCm: m.hipsCm,
          bicepsCm: m.bicepsCm,
          bicepsLCm: m.bicepsLCm,
          bicepsRCm: m.bicepsRCm,
          thighsCm: m.thighsCm,
          thighsLCm: m.thighsLCm,
          thighsRCm: m.thighsRCm,
        };
        
        // Remove undefined fields
        Object.keys(measurements).forEach(k => {
          if (measurements[k as keyof BodyMeasurements] === undefined) {
            delete measurements[k as keyof BodyMeasurements];
          }
        });

        if (Object.keys(measurements).length === 0) return;

        if (!logsByDay[dayKey]) {
          logsByDay[dayKey] = {
            id: 'chk_' + dayKey,
            date: m.date,
            measurements,
          };
        } else {
          logsByDay[dayKey].measurements = {
            ...measurements,
            ...logsByDay[dayKey].measurements,
          };
        }
      });

      // 3. Process weight logs
      weightHistory.forEach(w => {
        if (!w.date) return;
        const dayKey = localDayKey(w.date);
        if (!logsByDay[dayKey]) {
          logsByDay[dayKey] = {
            id: 'chk_' + dayKey,
            date: w.date,
            weightKg: w.weightKg,
          };
        } else {
          if (logsByDay[dayKey].weightKg === undefined) {
            logsByDay[dayKey].weightKg = w.weightKg;
          }
        }
      });

      const checkinLogs = Object.values(logsByDay).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      set({ weightHistory, latestMeasurements, checkinPhotos, checkinLogs, isLoading: false });
    } catch (e) {
      logger.warn('Failed to fetch progress data', e);
      set({ isLoading: false });
    }
  },

  addWeightLog: async (userId, weightKg) => {
    const newLog: WeightLog = {
      id: 'w_' + Date.now(),
      date: new Date().toISOString(),
      weightKg,
    };
    set((state) => ({ weightHistory: [newLog, ...state.weightHistory] }));
    
    const { error } = await supabase.from('weight_logs').insert({
      user_id: userId,
      weight_kg: weightKg,
      recorded_at: newLog.date
    });
    
    if (error) {
      queueOfflineTransaction('ADD_WEIGHT', { userId, weightKg, date: newLog.date });
    }
  },

  updateMeasurements: async (userId, newMeasurements) => {
    set((state) => ({
      latestMeasurements: { ...state.latestMeasurements, ...newMeasurements },
    }));
    
    const payload = {
      user_id: userId,
      neck_cm: newMeasurements.neckCm,
      shoulders_cm: newMeasurements.shouldersCm,
      chest_cm: newMeasurements.chestCm,
      waist_cm: newMeasurements.waistCm,
      hips_cm: newMeasurements.hipsCm,
      biceps_cm: newMeasurements.bicepsCm,
      biceps_l_cm: newMeasurements.bicepsLCm,
      biceps_r_cm: newMeasurements.bicepsRCm,
      thighs_cm: newMeasurements.thighsCm,
      thighs_l_cm: newMeasurements.thighsLCm,
      thighs_r_cm: newMeasurements.thighsRCm,
    };

    const { error } = await supabase.from('body_measurements').insert(payload);
    if (error) {
      queueOfflineTransaction('UPDATE_MEASUREMENTS', payload);
    }
  },

  addCheckinPhoto: async (userId, photoUrl, note) => {
    const newPic: CheckinPhoto = {
      id: 'pic_' + Date.now(),
      date: new Date().toISOString(),
      photoUrl,
      photoUrls: [photoUrl],
      note,
    };
    set((state) => ({ checkinPhotos: [newPic, ...state.checkinPhotos] }));
    
    const payload = { user_id: userId, photo_url: photoUrl, note, created_at: newPic.date };
    try {
      payload.photo_url = (await ensureUploaded(photoUrl, 'checkins')) || photoUrl;
      const { error } = await supabase.from('checkin_photos').insert(payload);
      if (error) queueOfflineTransaction('ADD_CHECKIN', payload);
    } catch (e) {
      queueOfflineTransaction('ADD_CHECKIN', payload);
    }
  },

  deleteCheckinPhoto: async (idOrUrl) => {
    const isUrl = idOrUrl.startsWith('http') || idOrUrl.startsWith('ph:') || idOrUrl.startsWith('file:') || idOrUrl.includes('/') || idOrUrl.includes('.');

    set((state) => {
      const nextPhotos = state.checkinPhotos.filter((p) => isUrl ? p.photoUrl !== idOrUrl : p.id !== idOrUrl);
      const nextLogs = state.checkinLogs.map(log => {
        if (isUrl) {
          const photoUrls = (log.photoUrls || []).filter(url => url !== idOrUrl);
          return {
            ...log,
            photoUrl: log.photoUrl === idOrUrl ? photoUrls[0] : log.photoUrl,
            photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
          };
        } else {
          return log;
        }
      }).filter(log => {
        const hasWeight = log.weightKg !== undefined;
        const hasMeasurements = log.measurements && Object.keys(log.measurements).length > 0;
        const hasPhotos = log.photoUrls && log.photoUrls.length > 0;
        return hasWeight || hasMeasurements || hasPhotos;
      });

      return {
        checkinPhotos: nextPhotos,
        checkinLogs: nextLogs,
      };
    });

    if (isUrl) {
      const ref = storedRefFor(idOrUrl);
      const { error } = await supabase.from('checkin_photos').delete().eq('photo_url', ref);
      if (!error) deleteMedia(ref);
    } else {
      await supabase.from('checkin_photos').delete().eq('id', idOrUrl);
    }
  },

  addCheckinLog: async (userId, logData) => {
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
      const nextPhotos = logData.photoUrls && logData.photoUrls.length > 0
        ? [
            ...logData.photoUrls.map((url, i) => ({
              id: newLog.id + '_' + i,
              date: newLog.date,
              photoUrl: url,
              photoUrls: [url],
              note: logData.note
            })),
            ...state.checkinPhotos
          ]
        : logData.photoUrl 
        ? [{ id: newLog.id, date: newLog.date, photoUrl: logData.photoUrl, photoUrls: [logData.photoUrl], note: logData.note }, ...state.checkinPhotos]
        : state.checkinPhotos;

      return {
        checkinLogs: nextLogs,
        weightHistory: nextWeightHistory,
        latestMeasurements: nextMeasurements,
        checkinPhotos: nextPhotos,
      };
    });

    // Sync to Supabase; anything that fails goes to the offline queue.
    const date = newLog.date;
    const tryInsert = async (
      table: string,
      row: any,
      queueType: 'ADD_WEIGHT' | 'UPDATE_MEASUREMENTS' | 'ADD_CHECKIN',
      queuePayload: any
    ) => {
      try {
        const { error } = await supabase.from(table).insert(row);
        if (error) queueOfflineTransaction(queueType, queuePayload);
      } catch {
        queueOfflineTransaction(queueType, queuePayload);
      }
    };

    const jobs: Promise<void>[] = [];
    if (logData.weightKg) {
      jobs.push(tryInsert('weight_logs', { user_id: userId, weight_kg: logData.weightKg, recorded_at: date },
        'ADD_WEIGHT', { userId, weightKg: logData.weightKg, date }));
    }
    if (logData.measurements) {
      const m = logData.measurements;
      const row = {
        user_id: userId,
        neck_cm: m.neckCm, shoulders_cm: m.shouldersCm, chest_cm: m.chestCm, waist_cm: m.waistCm,
        hips_cm: m.hipsCm, biceps_cm: m.bicepsCm, biceps_l_cm: m.bicepsLCm, biceps_r_cm: m.bicepsRCm,
        thighs_cm: m.thighsCm, thighs_l_cm: m.thighsLCm, thighs_r_cm: m.thighsRCm,
        recorded_at: date,
      };
      jobs.push(tryInsert('body_measurements', row, 'UPDATE_MEASUREMENTS', row));
    }
    const urls = logData.photoUrls && logData.photoUrls.length > 0
      ? logData.photoUrls
      : logData.photoUrl ? [logData.photoUrl] : [];
    urls.forEach((url) => {
      jobs.push((async () => {
        const row = { user_id: userId, photo_url: url, note: logData.note, created_at: date };
        try {
          row.photo_url = (await ensureUploaded(url, 'checkins')) || url;
        } catch {
          queueOfflineTransaction('ADD_CHECKIN', row);
          return;
        }
        await tryInsert('checkin_photos', row, 'ADD_CHECKIN', row);
      })());
    });
    await Promise.all(jobs);
  },

  deleteCheckinLog: (id) => {
    set((state) => ({
      checkinLogs: state.checkinLogs.filter((l) => l.id !== id),
      checkinPhotos: state.checkinPhotos.filter((p) => p.id !== id),
    }));
  },

  // Pure calculation over the stats passed in. Callers pass the person's own
  // numbers (this is also used for a trainer viewing a client, so it must not
  // mix in the signed-in user's stored weight/measurements).
  getCalculatedMetrics: (profileStats) => {
    const stats: BodyStats = {
      heightCm: profileStats.heightCm || 0,
      weightKg: profileStats.weightKg || 0,
      sex: profileStats.sex || 'MALE',
      ageYears: profileStats.ageYears,
      neckCm: profileStats.neckCm,
      waistCm: profileStats.waistCm,
      hipsCm: profileStats.hipsCm,
      activityLevel: profileStats.activityLevel || 'MODERATELY_ACTIVE',
    };

    return computeFullHealthMetrics(stats);
  },

  reset: () =>
    set({ weightHistory: [], latestMeasurements: {}, checkinPhotos: [], checkinLogs: [], isLoading: false }),
}));
