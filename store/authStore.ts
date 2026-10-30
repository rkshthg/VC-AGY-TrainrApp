import { create } from 'zustand';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../lib/logger';
import { secureSetProfile, secureGetProfile, secureRemoveProfile } from '../lib/secureProfileCache';
import { ensureUploaded, toDisplayUrls, clearMediaCache, deleteAllMyMedia } from '../lib/photoStorage';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'CLIENT' | 'TRAINER';
  trainerCode?: string;
  linkedTrainerId?: string;
  linkedTrainerName?: string;
  linkedTrainerCode?: string;
  heightCm?: number;
  weightKg?: number;
  dob?: string;
  sex?: 'MALE' | 'FEMALE' | 'OTHER';
  activityLevel?: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE';
  goals?: string[];
  themeMode?: 'LIGHT' | 'DARK' | 'SYSTEM';
  unitSystem?: 'METRIC' | 'IMPERIAL';
  isOnboarded?: boolean;
  macroTargets?: { calories: number; protein: number; carbs: number; fat: number };
  bodyMeasurements?: {
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
  };
}

interface AuthState {
  session: any | null;
  profile: UserProfile | null;
  role: 'CLIENT' | 'TRAINER';
  trainerCode: string | null;
  linkedTrainerId: string | null;
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM';
  unitSystem: 'METRIC' | 'IMPERIAL';
  weightStep: number;
  isOnboarded: boolean;
  isLoading: boolean;
  isAuthLoading: boolean;

  setSession: (session: any) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setProfile: (profile: UserProfile) => void;
  setRole: (role: 'CLIENT' | 'TRAINER') => void;
  setThemeMode: (mode: 'LIGHT' | 'DARK' | 'SYSTEM') => Promise<void>;
  setUnitSystem: (system: 'METRIC' | 'IMPERIAL') => Promise<void>;
  setWeightStep: (step: number) => Promise<void>;
  generateTrainerCode: () => string;

  linkTrainer: (code: string) => Promise<boolean>;
  unlinkTrainer: () => Promise<boolean>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<boolean>;
  updateAvatarUrl: (url?: string) => Promise<boolean>;
  updateDob: (dob: string | null) => Promise<boolean>;
  switchToTrainer: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

/** Profile with its avatar swapped for a viewable URL. */
async function withDisplayAvatar(profile: UserProfile): Promise<UserProfile> {
  const [avatar] = await toDisplayUrls([profile.avatarUrl]);
  return { ...profile, avatarUrl: avatar };
}

const isTrainerCodeConflict = (err: any) =>
  err?.code === '23505' && String(err?.message || '').includes('trainer_code');

// Mapper to map database snake_case to frontend camelCase
function mapDbToProfile(dbUser: any): UserProfile {
  const trainerData = Array.isArray(dbUser.linked_trainer)
    ? dbUser.linked_trainer[0]
    : dbUser.linked_trainer;

  const macroData = Array.isArray(dbUser.macro_targets)
    ? dbUser.macro_targets[0]
    : dbUser.macro_targets;

  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.full_name,
    avatarUrl: dbUser.avatar_url,
    role: dbUser.role as 'CLIENT' | 'TRAINER',
    trainerCode: dbUser.trainer_code,
    linkedTrainerId: dbUser.linked_trainer_id,
    linkedTrainerName: trainerData?.full_name,
    linkedTrainerCode: trainerData?.trainer_code,
    heightCm: dbUser.height_cm,
    weightKg: dbUser.weight_kg,
    dob: dbUser.dob,
    sex: dbUser.sex,
    activityLevel: dbUser.activity_level,
    goals: dbUser.goals,
    themeMode: dbUser.theme_mode,
    unitSystem: dbUser.unit_system,
    isOnboarded: dbUser.is_onboarded,
    macroTargets: macroData ? {
      calories: macroData.calories,
      protein: macroData.protein_g,
      carbs: macroData.carbs_g,
      fat: macroData.fat_g,
    } : undefined,
  };
}


const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

/** Allowed URL schemes for deep link auth processing. */
const ALLOWED_AUTH_SCHEMES = ['trainr://', 'com.trainr.trainrapp://', 'com.anonymous.trainrapp://'];

/**
 * Parse and validate an auth callback URL, then exchange it for a Supabase session.
 * SECURITY: Only accepts URLs with registered app schemes to prevent injection.
 */
const createSessionFromUrl = async (url: string) => {
  if (!url) return null;

  // Validate URL scheme — only accept our registered deep link schemes
  const lowerUrl = url.toLowerCase();
  const isAllowedScheme = ALLOWED_AUTH_SCHEMES.some(scheme => lowerUrl.startsWith(scheme));
  if (!isAllowedScheme && !lowerUrl.startsWith('https://')) {
    logger.warn('Rejected deep link with unrecognized scheme:', url.substring(0, 50));
    return null;
  }

  let paramsString = '';
  if (url.includes('#')) {
    paramsString = url.split('#')[1];
  } else if (url.includes('?')) {
    paramsString = url.split('?')[1];
  }

  const params: Record<string, string> = {};
  if (paramsString) {
    paramsString.split('&').forEach((part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
  }

  const { code, access_token, refresh_token } = params;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  } else if (access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });
    if (error) throw error;
    return data.session;
  }
  return null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  role: 'CLIENT',
  trainerCode: null,
  linkedTrainerId: null,
  themeMode: 'DARK',
  unitSystem: 'METRIC',
  weightStep: 2.5,
  isOnboarded: false,
  isLoading: false,
  isAuthLoading: true,

  setSession: (session) => set({ session, profile: session?.user ? get().profile : null }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setProfile: (profile) =>
    set({
      profile,
      role: profile.role || 'CLIENT',
      trainerCode: profile.trainerCode || null,
      linkedTrainerId: profile.linkedTrainerId || null,
      isOnboarded: profile.isOnboarded || false,
      themeMode: profile.themeMode || 'DARK',
      unitSystem: profile.unitSystem || 'METRIC',
    }),
  setRole: (role) => set({ role }),
  setThemeMode: async (themeMode) => {
    set({ themeMode });
    try {
      const currentProfile = get().profile;
      if (currentProfile) {
        supabase.from('users').update({ theme_mode: themeMode }).eq('id', currentProfile.id).then();
        const updatedProfile = { ...currentProfile, themeMode };
        set({ profile: updatedProfile });
        await secureSetProfile(updatedProfile);
      } else {
        await AsyncStorage.setItem('@trainr_theme_mode', themeMode);
      }
    } catch (e) {
      logger.warn('Failed to save theme mode:', e);
    }
  },

  setUnitSystem: async (unitSystem) => {
    set({ unitSystem });
    try {
      const currentProfile = get().profile;
      if (currentProfile) {
        supabase.from('users').update({ unit_system: unitSystem }).eq('id', currentProfile.id).then();
        const updatedProfile = { ...currentProfile, unitSystem };
        set({ profile: updatedProfile });
        await secureSetProfile(updatedProfile);
      } else {
        await AsyncStorage.setItem('@trainr_unit_system', unitSystem);
      }
    } catch (e) {
      logger.warn('Failed to save unit system:', e);
    }
  },

  setWeightStep: async (weightStep: number) => {
    set({ weightStep });
    try {
      await AsyncStorage.setItem('@trainr_weight_step', String(weightStep));
    } catch (e) {
      logger.warn('Failed to save weight step:', e);
    }
  },


  generateTrainerCode: () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    // Format XX-XXXX: 6 random characters (no look-alikes such as 0/O, 1/I).
    let raw = '';
    for (let i = 0; i < 6; i++) {
      raw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${raw.slice(0, 2)}-${raw.slice(2)}`;
  },

  fetchProfile: async (userId: string) => {
    try {
      set({ isLoading: true });
      let { data, error } = await supabase
        .from('users')
        .select(`
           *,
           linked_trainer:linked_trainer_id(full_name, trainer_code)
        `)
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
         // User not found in trainr.users. Create an empty shell so onboarding can UPDATE it.
         const { data: userAuthData } = await supabase.auth.getUser();
         const user = userAuthData?.user;
         
         const newProfile = {
            id: userId,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'New User',
            avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture,
            role: 'CLIENT',
            is_onboarded: false
         };
         
         const { data: insertedData, error: insertError } = await supabase.from('users').insert(newProfile).select().single();
         if (!insertError && insertedData) {
            data = insertedData;
            error = null;
         }
      }

      if (error) {
        logger.warn('Failed to fetch profile from Supabase:', error.message);
        // Fallback to secure local cache if offline
        const cached = await secureGetProfile();
        if (cached) {
          get().setProfile(cached);
          set({ isLoading: false });
          return true;
        }
        set({ isLoading: false });
        return false;
      }
      
      if (data) {
        const profile = await withDisplayAvatar(mapDbToProfile(data));
        await secureSetProfile(profile);
        get().setProfile(profile);
        set({ isLoading: false });
        return true;
      }
    } catch (e) {
      logger.warn('Error fetching profile:', e);
    }
    set({ isLoading: false });
    return false;
  },

  linkTrainer: async (code: string) => {
    try {
      const currentProfile = get().profile;
      if (!currentProfile) return false;

      const cleanedCode = code.trim().toUpperCase();

      // Server-side lookup + link (trainr.link_trainer_by_code). Trainer
      // profiles are not readable until the link exists.
      const { data: trainer, error: linkError } = await supabase
        .rpc('link_trainer_by_code', { p_code: cleanedCode });

      if (linkError || !trainer) {
        logger.warn('Failed linking trainer:', linkError);
        showAlert('Link Error', linkError?.message || 'Invalid Trainer Code or Trainer not found.');
        return false;
      }

      const updatedProfile = { 
        ...currentProfile, 
        linkedTrainerId: trainer.id,
        linkedTrainerName: trainer.full_name,
        linkedTrainerCode: trainer.trainer_code || cleanedCode
      };
      get().setProfile(updatedProfile as UserProfile);
      await secureSetProfile(updatedProfile);

      return true;
    } catch (e) {
      logger.error('Failed to link trainer:', e);
      return false;
    }
  },

  unlinkTrainer: async () => {
    try {
      const currentProfile = get().profile;
      if (!currentProfile || !currentProfile.linkedTrainerId) return false;

      const { error: unlinkError } = await supabase
        .from('users')
        .update({ linked_trainer_id: null })
        .eq('id', currentProfile.id);

      if (unlinkError) {
        logger.warn('Failed unlinking in profile:', unlinkError);
        showAlert('Unlink Error', unlinkError.message);
        return false;
      }

      const { error: relError } = await supabase
        .from('trainer_clients')
        .update({ status: 'UNLINKED' })
        .eq('trainer_id', currentProfile.linkedTrainerId)
        .eq('client_id', currentProfile.id);

      if (relError) {
        logger.warn('Failed updating trainer relationship status:', relError);
        showAlert('Unlink Error', relError.message);
        return false;
      }

      const updatedProfile = { 
        ...currentProfile, 
        linkedTrainerId: undefined,
        linkedTrainerName: undefined,
        linkedTrainerCode: undefined
      };
      get().setProfile(updatedProfile as UserProfile);
      await secureSetProfile(updatedProfile);
      
      return true;
    } catch (e) {
      logger.error('Failed to unlink trainer:', e);
      return false;
    }
  },

  completeOnboarding: async (data: any) => {
    try {
      const session = get().session;
      const { data: userData, error: getUserError } = await supabase.auth.getUser();
      logger.log('Onboarding submit - Store session user id:', session?.user?.id);
      logger.log('Onboarding submit - Client auth user id:', userData?.user?.id);
      if (getUserError) {
        logger.error('Onboarding submit - getUser error:', getUserError);
      }

      if (!session?.user || !userData?.user) {
        showAlert('Session Error', `No active session found. Store: ${!!session?.user}, Client: ${!!userData?.user}. getUserError: ${getUserError?.message || 'None'}`);
        return false;
      }
      
      const currentProfile = get().profile || {} as Partial<UserProfile>;
      
      const isTrainer = data.role === 'TRAINER';
      let trainerCode = isTrainer
        ? (currentProfile.trainerCode || get().trainerCode || get().generateTrainerCode())
        : undefined;

      let avatarRef: string | undefined;
      try {
        avatarRef = await ensureUploaded(data.avatarUrl, 'avatars');
      } catch (e) {
        logger.warn('Avatar upload failed during onboarding; continuing without it:', e);
      }

      const updates: Record<string, any> = {
        id: session.user.id,
        email: session.user.email || '',
        full_name: data.fullName || currentProfile.fullName || session.user.user_metadata?.full_name || 'User',
        role: data.role || 'CLIENT',
        trainer_code: trainerCode,
        height_cm: data.heightCm,
        weight_kg: data.weightKg,
        dob: data.dob,
        sex: data.sex,
        activity_level: data.activityLevel,
        goals: data.goals,
        is_onboarded: true,
      };
      if (avatarRef) updates.avatar_url = avatarRef;

      // 1. Upsert users table (retry with a fresh code if the trainer code is taken)
      let { data: updatedDb, error: userError } = await supabase
        .from('users')
        .upsert(updates, { onConflict: 'id' })
        .select()
        .single();
      for (let attempt = 0; isTrainer && isTrainerCodeConflict(userError) && attempt < 5; attempt++) {
        trainerCode = get().generateTrainerCode();
        updates.trainer_code = trainerCode;
        ({ data: updatedDb, error: userError } = await supabase
          .from('users')
          .upsert(updates, { onConflict: 'id' })
          .select()
          .single());
      }
        
      if (userError) {
        logger.warn('Failed onboarding completion in DB (users):', userError);
        showAlert('Onboarding Error (Users)', userError.message);
        return false;
      }

      // 2. Upsert macro targets (trainers have every client feature, PRD 2.1)
      if (data.macroTargets) {
        const { error: macroError } = await supabase
          .from('macro_targets')
          .upsert({
            user_id: session.user.id,
            calories: data.macroTargets.calories,
            protein_g: data.macroTargets.protein,
            carbs_g: data.macroTargets.carbs,
            fat_g: data.macroTargets.fat,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
          
        if (macroError) {
          logger.warn('Failed onboarding macro targets saving:', macroError);
          showAlert('Onboarding Error (Macros)', macroError.message);
          return false;
        }

        try {
          const { useNutritionStore } = require('./nutritionStore');
          useNutritionStore.getState().setMacroTargets(data.macroTargets);
        } catch (e) {
          logger.warn('Could not sync macro targets to nutritionStore:', e);
        }
      }

      // 3. Insert body measurements if provided
      if (data.bodyMeasurements) {
        const hasMeasurements = Object.values(data.bodyMeasurements).some(v => v !== undefined);
        if (hasMeasurements) {
          const { error: measurementsError } = await supabase
            .from('body_measurements')
            .insert({
              user_id: session.user.id,
              neck_cm: data.bodyMeasurements.neckCm,
              chest_cm: data.bodyMeasurements.chestCm,
              waist_cm: data.bodyMeasurements.waistCm,
              biceps_l_cm: data.bodyMeasurements.bicepsLCm,
              biceps_r_cm: data.bodyMeasurements.bicepsRCm,
              hips_cm: data.bodyMeasurements.hipsCm,
              thighs_l_cm: data.bodyMeasurements.thighsLCm,
              thighs_r_cm: data.bodyMeasurements.thighsRCm,
              recorded_at: new Date().toISOString()
            });

          if (measurementsError) {
            logger.warn('Failed onboarding measurements saving:', measurementsError);
            showAlert('Onboarding Error (Measurements)', measurementsError.message);
            return false;
          }
        }
      }

      // 4. Insert initial weight log if provided
      if (data.weightKg) {
        const { error: weightError } = await supabase
          .from('weight_logs')
          .insert({
            user_id: session.user.id,
            weight_kg: data.weightKg,
            recorded_at: new Date().toISOString()
          });

        if (weightError) {
          logger.warn('Failed onboarding initial weight log saving:', weightError);
        }
      }
      
      if (updatedDb) {
        const parsed = await withDisplayAvatar(mapDbToProfile(updatedDb));
        if (data.avatarUrl && !parsed.avatarUrl) parsed.avatarUrl = data.avatarUrl;
        if (data.macroTargets) {
          parsed.macroTargets = data.macroTargets;
        }
        get().setProfile(parsed);
        await secureSetProfile(parsed);
      }


      return true;
    } catch (e: any) {
      logger.error('Failed onboarding completion:', e);
      showAlert('Onboarding Exception', e.message || 'An unexpected error occurred.');
      return false;
    }
  },

  signInWithGoogle: async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) {
           logger.warn('Supabase OAuth notice:', error.message);
           return false;
        }
        // Browser will redirect to Google Auth. Hang the promise so we don't execute further.
        return new Promise<boolean>(() => {});
      } else {
        try {
          const WebBrowser = require('expo-web-browser');
          const { makeRedirectUri } = require('expo-auth-session');
          const redirectUrl = makeRedirectUri({ scheme: 'trainr' });
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: true,
            },
          });
          if (error) throw error;
          if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          
          if (result.type === 'success' && result.url) {
            const session = await createSessionFromUrl(result.url);
            if (session) {
              set({ session });
            } else {
              return false;
            }
          } else {
            return false;
          }
        } catch (err) {
          logger.warn('Native WebBrowser notice:', err);
          return false;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (user) {
        let { data: profileData } = await supabase.from('users').select('*').eq('id', user.id).single();
        
        if (!profileData) {
          const newProfile = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Google User',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            role: 'CLIENT',
            is_onboarded: false
          };
          const { data: insertedData, error: insertError } = await supabase.from('users').insert(newProfile).select().single();
          if (insertError) {
             logger.warn('Failed to insert user profile:', insertError);
          }
          profileData = insertedData || newProfile;
        }
        
        const parsedProfile = await withDisplayAvatar(mapDbToProfile(profileData));
        get().setProfile(parsedProfile);
        await secureSetProfile(parsedProfile);
        return true;
      }
      
      return false;
    } catch (e) {
      logger.error('Google Auth Error:', e);
      return false;
    }
  },

  updateDob: async (dob) => {
    try {
      const currentProfile = get().profile;
      if (!currentProfile) return false;
      const { error } = await supabase
        .from('users')
        .update({ dob })
        .eq('id', currentProfile.id);
      if (error) {
        logger.warn('Failed to update date of birth:', error.message);
        showAlert('Update Error', 'Could not save your date of birth. Check your connection and try again.');
        return false;
      }
      const updatedProfile = { ...currentProfile, dob: dob ?? undefined };
      get().setProfile(updatedProfile as UserProfile);
      await secureSetProfile(updatedProfile);
      return true;
    } catch (e) {
      logger.error('Failed to update date of birth:', e);
      return false;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      await secureRemoveProfile();
    } catch (e) {
      // ignore
    }

    // Clear every other store and per-user cache so the next account on
    // this device never sees the previous user's data.
    try {
      require('./workoutStore').useWorkoutStore.getState().reset();
      require('./nutritionStore').useNutritionStore.getState().reset();
      require('./progressStore').useProgressStore.getState().reset();
      require('./trainerStore').useTrainerStore.getState().reset();
      require('../lib/realtime').stopRealtime();
      clearMediaCache();
      await AsyncStorage.multiRemove(['@trainr_custom_exercises', '@trainr_workout_session']);
    } catch (e) {
      logger.warn('Failed to reset local state on logout:', e);
    }
    set({
      session: null,
      profile: null,
      role: 'CLIENT',
      trainerCode: null,
      linkedTrainerId: null,
      isOnboarded: false,
    });
  },

  updateAvatarUrl: async (url?: string) => {
    try {
      const currentProfile = get().profile;
      if (!currentProfile) return false;

      let ref: string | undefined;
      try {
        ref = await ensureUploaded(url, 'avatars');
      } catch (e: any) {
        logger.warn('Avatar upload failed:', e);
        showAlert('Upload Error', 'Could not upload your photo. Check your connection and try again.');
        return false;
      }

      const { error } = await supabase
        .from('users')
        .update({ avatar_url: ref ?? null })
        .eq('id', currentProfile.id);

      if (error) {
        logger.warn('Failed to update avatar url in Supabase:', error.message);
        showAlert('Update Error', error.message);
        return false;
      }

      const updatedProfile = { ...currentProfile, avatarUrl: url };
      get().setProfile(updatedProfile as UserProfile);
      await secureSetProfile(updatedProfile);
      return true;
    } catch (e) {
      logger.error('Failed to update avatar url:', e);
      return false;
    }
  },

  switchToTrainer: async () => {
    const currentProfile = get().profile;
    if (!currentProfile) return false;
    if (currentProfile.role === 'TRAINER') return true;

    try {
      let code = currentProfile.trainerCode || get().generateTrainerCode();
      let { error } = await supabase
        .from('users')
        .update({ role: 'TRAINER', trainer_code: code })
        .eq('id', currentProfile.id);
      for (let attempt = 0; isTrainerCodeConflict(error) && attempt < 5; attempt++) {
        code = get().generateTrainerCode();
        ({ error } = await supabase
          .from('users')
          .update({ role: 'TRAINER', trainer_code: code })
          .eq('id', currentProfile.id));
      }
      if (error) {
        logger.warn('Failed switching to trainer:', error);
        showAlert('Switch Failed', error.message);
        return false;
      }

      const updatedProfile: UserProfile = { ...currentProfile, role: 'TRAINER', trainerCode: code };
      get().setProfile(updatedProfile);
      await secureSetProfile(updatedProfile);
      require('./trainerStore').useTrainerStore.getState().fetchRoster();
      return true;
    } catch (e) {
      logger.error('Failed switching to trainer:', e);
      return false;
    }
  },

  deleteAccount: async () => {
    const currentProfile = get().profile;
    if (!currentProfile) return false;
    try {
      // Files first: storage objects can't be removed from SQL.
      await deleteAllMyMedia(currentProfile.id);

      // Deletes the auth user; every trainr row cascades from it.
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        logger.warn('Account deletion failed:', error);
        showAlert('Delete Failed', error.message);
        return false;
      }

      try {
        await AsyncStorage.removeItem('@trainr_offline_queue');
      } catch {}
      await get().logout();
      return true;
    } catch (e: any) {
      logger.error('Account deletion failed:', e);
      showAlert('Delete Failed', e?.message || 'Could not delete your account. Please try again.');
      return false;
    }
  },
}));
