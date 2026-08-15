import { create } from 'zustand';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  isOnboarded: boolean;
  isLoading: boolean;
  isAuthLoading: boolean;

  setSession: (session: any) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setProfile: (profile: UserProfile) => void;
  setRole: (role: 'CLIENT' | 'TRAINER') => void;
  setThemeMode: (mode: 'LIGHT' | 'DARK' | 'SYSTEM') => Promise<void>;
  setUnitSystem: (system: 'METRIC' | 'IMPERIAL') => Promise<void>;
  generateTrainerCode: () => string;
  linkTrainer: (code: string) => Promise<boolean>;
  unlinkTrainer: () => Promise<boolean>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<boolean>;
  updateAvatarUrl: (url?: string) => Promise<boolean>;
}

// Mapper to map database snake_case to frontend camelCase
function mapDbToProfile(dbUser: any): UserProfile {
  const trainerData = Array.isArray(dbUser.linked_trainer)
    ? dbUser.linked_trainer[0]
    : dbUser.linked_trainer;

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
  };
}

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const createSessionFromUrl = async (url: string) => {
  if (!url) return null;
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
        await AsyncStorage.setItem('@trainr_profile', JSON.stringify(updatedProfile));
      } else {
        await AsyncStorage.setItem('@trainr_theme_mode', themeMode);
      }
    } catch (e) {
      console.warn('Failed to save theme mode:', e);
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
        await AsyncStorage.setItem('@trainr_profile', JSON.stringify(updatedProfile));
      } else {
        await AsyncStorage.setItem('@trainr_unit_system', unitSystem);
      }
    } catch (e) {
      console.warn('Failed to save unit system:', e);
    }
  },

  generateTrainerCode: () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TR-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
        console.warn('Failed to fetch profile from Supabase:', error.message);
        // Fallback to local storage if offline
        const cached = await AsyncStorage.getItem('@trainr_profile');
        if (cached) {
          get().setProfile(JSON.parse(cached));
          set({ isLoading: false });
          return true;
        }
        set({ isLoading: false });
        return false;
      }
      
      if (data) {
        const profile = mapDbToProfile(data);
        await AsyncStorage.setItem('@trainr_profile', JSON.stringify(profile));
        get().setProfile(profile);
        set({ isLoading: false });
        return true;
      }
    } catch (e) {
      console.warn('Error fetching profile:', e);
    }
    set({ isLoading: false });
    return false;
  },

  linkTrainer: async (code: string) => {
    try {
      const currentProfile = get().profile;
      if (!currentProfile) return false;

      const cleanedCode = code.trim().toUpperCase();
      const { data: trainer, error: trainerError } = await supabase
        .from('users')
        .select('id, full_name, trainer_code')
        .eq('trainer_code', cleanedCode)
        .eq('role', 'TRAINER')
        .single();

      if (trainerError || !trainer) {
        showAlert('Link Error', 'Invalid Trainer Code or Trainer not found.');
        return false;
      }

      const { error: linkError } = await supabase
        .from('trainer_clients')
        .upsert({
          trainer_id: trainer.id,
          client_id: currentProfile.id,
          status: 'ACTIVE'
        }, { onConflict: 'trainer_id,client_id' });

      if (linkError) {
        console.warn('Failed linking in trainer_clients:', linkError);
        showAlert('Link Error', linkError.message);
        return false;
      }

      const { error: profileLinkError } = await supabase
        .from('users')
        .update({ linked_trainer_id: trainer.id })
        .eq('id', currentProfile.id);

      if (profileLinkError) {
        console.warn('Failed updating profile link:', profileLinkError);
        showAlert('Link Error', profileLinkError.message);
        return false;
      }

      const updatedProfile = { 
        ...currentProfile, 
        linkedTrainerId: trainer.id,
        linkedTrainerName: trainer.full_name,
        linkedTrainerCode: trainer.trainer_code || cleanedCode
      };
      get().setProfile(updatedProfile as UserProfile);
      await AsyncStorage.setItem('@trainr_profile', JSON.stringify(updatedProfile));

      return true;
    } catch (e) {
      console.error('Failed to link trainer:', e);
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
        console.warn('Failed unlinking in profile:', unlinkError);
        showAlert('Unlink Error', unlinkError.message);
        return false;
      }

      const { error: relError } = await supabase
        .from('trainer_clients')
        .update({ status: 'UNLINKED' })
        .eq('trainer_id', currentProfile.linkedTrainerId)
        .eq('client_id', currentProfile.id);

      if (relError) {
        console.warn('Failed updating trainer relationship status:', relError);
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
      await AsyncStorage.setItem('@trainr_profile', JSON.stringify(updatedProfile));
      
      return true;
    } catch (e) {
      console.error('Failed to unlink trainer:', e);
      return false;
    }
  },

  completeOnboarding: async (data: any) => {
    try {
      const session = get().session;
      const { data: userData, error: getUserError } = await supabase.auth.getUser();
      console.log('Onboarding submit - Store session user id:', session?.user?.id);
      console.log('Onboarding submit - Client auth user id:', userData?.user?.id);
      if (getUserError) {
        console.error('Onboarding submit - getUser error:', getUserError);
      }

      if (!session?.user || !userData?.user) {
        showAlert('Session Error', `No active session found. Store: ${!!session?.user}, Client: ${!!userData?.user}. getUserError: ${getUserError?.message || 'None'}`);
        return false;
      }
      
      const currentProfile = get().profile || {} as Partial<UserProfile>;
      
      const isTrainer = data.role === 'TRAINER';
      const trainerCode = isTrainer ? (get().trainerCode || get().generateTrainerCode()) : undefined;

      const updates = {
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

      // 1. Upsert users table
      const { data: updatedDb, error: userError } = await supabase
        .from('users')
        .upsert(updates, { onConflict: 'id' })
        .select()
        .single();
        
      if (userError) {
        console.warn('Failed onboarding completion in DB (users):', userError);
        showAlert('Onboarding Error (Users)', userError.message);
        return false;
      }

      // 2. Upsert macro targets if client and targets provided
      if (data.role !== 'TRAINER' && data.macroTargets) {
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
          console.warn('Failed onboarding macro targets saving:', macroError);
          showAlert('Onboarding Error (Macros)', macroError.message);
          return false;
        }
      }

      // 3. Insert body measurements if client and measurements provided
      if (data.role !== 'TRAINER' && data.bodyMeasurements) {
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
            console.warn('Failed onboarding measurements saving:', measurementsError);
            showAlert('Onboarding Error (Measurements)', measurementsError.message);
            return false;
          }
        }
      }

      // 4. Insert initial weight log if provided
      if (data.role !== 'TRAINER' && data.weightKg) {
        const { error: weightError } = await supabase
          .from('weight_logs')
          .insert({
            user_id: session.user.id,
            weight_kg: data.weightKg,
            recorded_at: new Date().toISOString()
          });

        if (weightError) {
          console.warn('Failed onboarding initial weight log saving:', weightError);
        }
      }
      
      if (updatedDb) {
        const parsed = mapDbToProfile(updatedDb);
        get().setProfile(parsed);
        await AsyncStorage.setItem('@trainr_profile', JSON.stringify(parsed));
      }

      return true;
    } catch (e: any) {
      console.error('Failed onboarding completion:', e);
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
           console.warn('Supabase OAuth notice:', error.message);
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
          console.warn('Native WebBrowser notice:', err);
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
             console.warn('Failed to insert user profile:', insertError);
          }
          profileData = insertedData || newProfile;
        }
        
        const parsedProfile = mapDbToProfile(profileData);
        get().setProfile(parsedProfile);
        await AsyncStorage.setItem('@trainr_profile', JSON.stringify(parsedProfile));
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Google Auth Error:', e);
      return false;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('@trainr_profile');
    } catch (e) {
      // ignore
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

      const { error } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', currentProfile.id);

      if (error) {
        console.warn('Failed to update avatar url in Supabase:', error.message);
        showAlert('Update Error', error.message);
        return false;
      }

      const updatedProfile = { ...currentProfile, avatarUrl: url };
      get().setProfile(updatedProfile as UserProfile);
      await AsyncStorage.setItem('@trainr_profile', JSON.stringify(updatedProfile));
      return true;
    } catch (e) {
      console.error('Failed to update avatar url:', e);
      return false;
    }
  },
}));
