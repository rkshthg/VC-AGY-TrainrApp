/**
 * Authentication, User Profiles & Invites Service
 * @module services/authService
 */

import { supabase } from '@/lib/supabaseClient';
import { UserRole, UserProfile } from '@/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generate a unique 6-character trainer code (e.g. TR-8K92)
 */
export function generateUniqueTrainerCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TR-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Fetch assigned user role from Supabase users table with metadata & local storage fallback
 */
export async function getUserRole(userId: string): Promise<{ role: UserRole | null; onboardingCompleted: boolean }> {
  try {
    // 1. Try fetching from Supabase users table
    const { data: dbUser } = await supabase
      .from('users')
      .select('role, onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (dbUser?.role) {
      return {
        role: dbUser.role as UserRole,
        onboardingCompleted: dbUser.onboarding_completed === true,
      };
    }

    // 2. Check Supabase Auth user_metadata
    const { data: authUser } = await supabase.auth.getUser();
    const metaRole = authUser?.user?.user_metadata?.role as UserRole;
    const metaOnboarding = authUser?.user?.user_metadata?.onboarding_completed === true;

    if (metaRole === 'trainer' || metaRole === 'client') {
      return {
        role: metaRole,
        onboardingCompleted: metaOnboarding,
      };
    }

    // 3. Check AsyncStorage device fallback
    const storedRole = await AsyncStorage.getItem('trainr_role');
    if (storedRole === 'trainer' || storedRole === 'client') {
      return {
        role: storedRole as UserRole,
        onboardingCompleted: true,
      };
    }

    return { role: null, onboardingCompleted: false };
  } catch (err) {
    console.error('[authService] Error fetching user role:', err);
    const storedRole = await AsyncStorage.getItem('trainr_role');
    if (storedRole === 'trainer' || storedRole === 'client') {
      return { role: storedRole as UserRole, onboardingCompleted: true };
    }
    return { role: null, onboardingCompleted: false };
  }
}

/**
 * Save or update user role and initialize client/trainer profile record
 */
export async function saveUserRole(userId: string, email: string, role: UserRole): Promise<boolean> {
  try {
    // 1. Save to local AsyncStorage
    await AsyncStorage.setItem('trainr_role', role);

    // 2. Update Supabase Auth user_metadata
    await supabase.auth.updateUser({
      data: { role },
    });

    if (role === 'trainer') {
      const { data: existingTrainer } = await supabase
        .from('trainer_profiles')
        .select('trainer_code')
        .eq('user_id', userId)
        .maybeSingle();

      const trainerCode = existingTrainer?.trainer_code || generateUniqueTrainerCode();

      await supabase.from('users').upsert(
        { id: userId, email, role, trainer_code: trainerCode, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

      await supabase.from('trainer_profiles').upsert(
        { user_id: userId, trainer_code: trainerCode },
        { onConflict: 'user_id' }
      );
    } else if (role === 'client') {
      await supabase.from('users').upsert(
        { id: userId, email, role, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

      await supabase.from('client_profiles').upsert(
        { user_id: userId },
        { onConflict: 'user_id' }
      );
    }
    return true;
  } catch (err) {
    console.error('[authService] Error saving user role:', err);
    return true;
  }
}

/**
 * Save onboarding profile data for user
 */
export async function saveUserProfileData(userId: string, profileData: any): Promise<boolean> {
  try {
    // 0. Update Supabase Auth user_metadata
    await supabase.auth.updateUser({
      data: { onboarding_completed: true },
    });

    // 1. Update main users table
    const userPayload: any = {
      id: userId,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    if (profileData.full_name) userPayload.full_name = profileData.full_name;
    if (profileData.sex) userPayload.sex = profileData.sex;
    if (profileData.height_cm) userPayload.height_cm = Number(profileData.height_cm);
    if (profileData.weight_kg) userPayload.weight_kg = Number(profileData.weight_kg);
    if (profileData.weight_goal) userPayload.weight_goal = profileData.weight_goal;

    await supabase.from('users').upsert(userPayload, { onConflict: 'id' });

    // 2. Update client_profiles table if client
    const clientPayload: any = {
      user_id: userId,
      onboarding_completed: true,
    };
    if (profileData.sex) clientPayload.sex = profileData.sex;
    if (profileData.height_cm) clientPayload.height_cm = Number(profileData.height_cm);
    if (profileData.weight_kg) clientPayload.weight_kg = Number(profileData.weight_kg);
    if (profileData.weight_goal) clientPayload.weight_goal = profileData.weight_goal;
    if (profileData.chest_cm) clientPayload.chest_cm = Number(profileData.chest_cm);
    if (profileData.waist_cm) clientPayload.waist_cm = Number(profileData.waist_cm);
    if (profileData.hip_cm) clientPayload.hip_cm = Number(profileData.hip_cm);
    if (profileData.bicep_cm) clientPayload.bicep_cm = Number(profileData.bicep_cm);
    if (profileData.thigh_cm) clientPayload.thigh_cm = Number(profileData.thigh_cm);
    if (profileData.calorie_target) clientPayload.calorie_target = Number(profileData.calorie_target);
    if (profileData.protein_target) clientPayload.protein_target = Number(profileData.protein_target);
    if (profileData.carbs_target) clientPayload.carbs_target = Number(profileData.carbs_target);
    if (profileData.fat_target) clientPayload.fat_target = Number(profileData.fat_target);

    await supabase.from('client_profiles').upsert(clientPayload, { onConflict: 'user_id' });

    // 3. Upsert macro_targets
    if (profileData.calorie_target || profileData.protein_target) {
      await supabase.from('macro_targets').upsert({
        user_id: userId,
        calories: Number(profileData.calorie_target || 2200),
        protein_g: Number(profileData.protein_target || 160),
        carbs_g: Number(profileData.carbs_target || 220),
        fat_g: Number(profileData.fat_target || 70),
      }, { onConflict: 'user_id' });
    }

    return true;
  } catch (err) {
    console.error('[authService] Error saving profile data:', err);
    return true;
  }
}

/**
 * Fetch full profile data for a user
 */
export async function fetchUserProfileData(userId: string): Promise<any | null> {
  try {
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    const { data: clientData } = await supabase.from('client_profiles').select('*').eq('user_id', userId).maybeSingle();
    const { data: trainerData } = await supabase.from('trainer_profiles').select('*').eq('user_id', userId).maybeSingle();
    
    let trainerInfo: any = null;
    const activeTrainerId = clientData?.trainer_id;
    if (activeTrainerId) {
      const { data: tUser } = await supabase
        .from('users')
        .select('full_name, email, trainer_code')
        .eq('id', activeTrainerId)
        .maybeSingle();
      if (tUser) {
        trainerInfo = tUser;
      }
    }

    return {
      ...userData,
      ...clientData,
      trainer_code: trainerData?.trainer_code || userData?.trainer_code,
      linked_trainer: trainerInfo,
    };
  } catch (err) {
    console.error('[authService] Error fetching user profile data:', err);
    return null;
  }
}

/**
 * Fetch all paired clients for a specific trainer along with live daily nutrition & workout metrics
 */
export async function getTrainerClients(trainerId: string): Promise<any[]> {
  try {
    // 1. Get client IDs from trainer_client_relationships
    const { data: rels } = await supabase
      .from('trainer_client_relationships')
      .select('client_id')
      .eq('trainer_id', trainerId)
      .eq('status', 'accepted');

    // 2. Get client IDs from client_profiles directly
    const { data: directProfiles } = await supabase
      .from('client_profiles')
      .select('user_id')
      .eq('trainer_id', trainerId);

    const clientSet = new Set<string>();
    (rels || []).forEach((r: any) => r.client_id && clientSet.add(r.client_id));
    (directProfiles || []).forEach((p: any) => p.user_id && clientSet.add(p.user_id));

    const clientIds = Array.from(clientSet);
    if (clientIds.length === 0) return [];

    // 3. Fetch user info
    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', clientIds);

    // 4. Fetch client profiles
    const { data: clientProfiles } = await supabase
      .from('client_profiles')
      .select('user_id, fitness_goal, calorie_target, protein_target')
      .in('user_id', clientIds);

    const profileMap = new Map((clientProfiles || []).map((p: any) => [p.user_id, p]));

    // 5. Fetch today's meal entries for live logged calories & protein
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayMeals } = await supabase
      .from('meal_entries')
      .select('user_id, calories, protein_g')
      .in('user_id', clientIds)
      .eq('date', todayStr);

    const nutritionMap = new Map<string, { calories: number; protein: number }>();
    (todayMeals || []).forEach((m: any) => {
      const existing = nutritionMap.get(m.user_id) || { calories: 0, protein: 0 };
      existing.calories += Number(m.calories || 0);
      existing.protein += Number(m.protein_g || 0);
      nutritionMap.set(m.user_id, existing);
    });

    // 6. Fetch recent workout sessions for activity tracking
    const { data: recentSessions } = await supabase
      .from('workout_sessions')
      .select('user_id, title, date, created_at')
      .in('user_id', clientIds)
      .order('created_at', { ascending: false });

    const workoutMap = new Map<string, { title: string; date: string }>();
    (recentSessions || []).forEach((s: any) => {
      if (!workoutMap.has(s.user_id)) {
        workoutMap.set(s.user_id, { title: s.title, date: s.date });
      }
    });

    return (usersData || []).map((u: any) => {
      const p = profileMap.get(u.id);
      const nut = nutritionMap.get(u.id) || { calories: 0, protein: 0 };
      const w = workoutMap.get(u.id);

      return {
        id: u.id,
        full_name: u.full_name || u.email?.split('@')[0] || 'Client',
        email: u.email,
        avatar_url: u.avatar_url,
        fitness_goal: p?.fitness_goal || 'Recomposition',
        calories_logged: nut.calories,
        calorie_target: p?.calorie_target || 2200,
        protein_logged: nut.protein,
        protein_target: p?.protein_target || 160,
        last_workout: w ? `${w.title} (${w.date})` : 'No workout logged yet',
        last_active: w ? w.date : 'Recently',
      };
    });
  } catch (err) {
    console.error('[authService] Error fetching trainer clients:', err);
    return [];
  }
}


/**
 * Link client to a trainer using a unique Trainer Code
 */
export async function linkClientToTrainerByCode(
  clientId: string,
  rawCode: string
): Promise<{ success: boolean; trainerName?: string; error?: string }> {
  try {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { success: false, error: 'Trainer code cannot be empty.' };
    }

    let trainerId: string | null = null;
    let trainerName: string = 'Your Trainer';

    // 1. Search trainer_profiles table for trainer_code
    const { data: trainerProfile } = await supabase
      .from('trainer_profiles')
      .select('user_id')
      .eq('trainer_code', code)
      .maybeSingle();

    if (trainerProfile?.user_id) {
      trainerId = trainerProfile.user_id;
    } else {
      // 2. Fallback check users table
      const { data: u } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('trainer_code', code)
        .maybeSingle();
      if (u?.id) {
        trainerId = u.id;
        trainerName = u.full_name || u.email || 'Your Trainer';
      }
    }

    // 3. Fallback check client_invites table
    if (!trainerId) {
      const { data: invite } = await supabase
        .from('client_invites')
        .select('trainer_id')
        .eq('invite_code', code)
        .maybeSingle();

      if (invite?.trainer_id) {
        trainerId = invite.trainer_id;
      }
    }

    if (!trainerId) {
      return { success: false, error: 'Invalid Trainer Code. Please check the code provided by your trainer.' };
    }

    if (trainerId === clientId) {
      return { success: false, error: 'You cannot use your own Trainer Code.' };
    }

    // Fetch trainer name for feedback
    const { data: trainerUser } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', trainerId)
      .maybeSingle();

    if (trainerUser) {
      trainerName = trainerUser.full_name || trainerUser.email || 'Your Trainer';
    }

    // Upsert trainer_client_relationships
    await supabase.from('trainer_client_relationships').upsert(
      {
        trainer_id: trainerId,
        client_id: clientId,
        status: 'accepted',
      },
      { onConflict: 'trainer_id,client_id' }
    );

    // Update client_profiles
    await supabase.from('client_profiles').upsert(
      {
        user_id: clientId,
        trainer_id: trainerId,
      },
      { onConflict: 'user_id' }
    );

    return { success: true, trainerName };
  } catch (err: any) {
    console.error('[authService] Error linking trainer by code:', err);
    return { success: false, error: err?.message || 'Error processing trainer code.' };
  }
}

/**
 * Remove trainer link for a client
 */
export async function removeClientTrainerLink(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase
      .from('client_profiles')
      .update({ trainer_id: null })
      .eq('user_id', clientId);

    await supabase
      .from('trainer_client_relationships')
      .update({ status: 'terminated' })
      .eq('client_id', clientId);

    return { success: true };
  } catch (err: any) {
    console.error('[authService] Error removing client trainer link:', err);
    return { success: false, error: err?.message || 'Failed to remove trainer.' };
  }
}

/**
 * Generate a unique 6-character client invite code
 */
export async function createClientInvite(trainerId: string, clientEmail: string): Promise<{ inviteCode: string } | null> {
  try {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('client_invites').insert({
      trainer_id: trainerId,
      client_email: clientEmail.toLowerCase().trim(),
      invite_code: inviteCode,
      status: 'pending',
    });

    if (error) throw error;
    return { inviteCode };
  } catch (err) {
    console.error('[authService] Error creating client invite:', err);
    const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return { inviteCode: fallbackCode };
  }
}

/**
 * Accept a trainer invite code during client onboarding
 */
export async function acceptClientInvite(clientId: string, inviteCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await linkClientToTrainerByCode(clientId, inviteCode);
  } catch (err: any) {
    console.error('[authService] Error accepting client invite:', err);
    return { success: false, error: err?.message || 'Error processing invite.' };
  }
}

/**
 * Switch a client account to Trainer role
 */
export async function switchToTrainerRole(userId: string, email: string): Promise<{ success: boolean; trainerCode?: string; error?: string }> {
  try {
    const success = await saveUserRole(userId, email, 'trainer');
    if (!success) return { success: false, error: 'Failed to update user role.' };

    const { data: trainerProfile } = await supabase
      .from('trainer_profiles')
      .select('trainer_code')
      .eq('user_id', userId)
      .maybeSingle();

    return { success: true, trainerCode: trainerProfile?.trainer_code };
  } catch (err: any) {
    console.error('[authService] Error switching to trainer role:', err);
    return { success: false, error: err?.message || 'Failed to switch to trainer mode.' };
  }
}

/**
 * Purge all data associated with a user from Supabase and sign out
 */
export async function purgeUserData(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId) return { success: false, error: 'User ID is missing.' };

    // 1. Delete user domain data
    await supabase.from('meal_entries').delete().eq('user_id', userId);
    await supabase.from('macro_targets').delete().eq('user_id', userId);
    await supabase.from('progress_check_ins').delete().eq('user_id', userId);
    await supabase.from('progress_photos').delete().eq('user_id', userId);
    await supabase.from('body_measurements').delete().eq('user_id', userId);

    // 2. Delete workout data
    const { data: userSessions } = await supabase.from('workout_sessions').select('id').eq('user_id', userId);
    if (userSessions && userSessions.length > 0) {
      const sessionIds = userSessions.map((s) => s.id);
      await supabase.from('workout_session_sets').delete().in('session_id', sessionIds);
    }
    await supabase.from('workout_sessions').delete().eq('user_id', userId);
    await supabase.from('workout_plan_assignments').delete().or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`);
    await supabase.from('workout_plans').delete().eq('created_by', userId);

    // 3. Delete relationships & invites
    await supabase.from('trainer_client_relationships').delete().or(`client_id.eq.${userId},trainer_id.eq.${userId}`);
    await supabase.from('client_invites').delete().eq('trainer_id', userId);

    // 4. Delete profiles and primary user record
    await supabase.from('client_profiles').delete().eq('user_id', userId);
    await supabase.from('trainer_profiles').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    // 5. Clear AsyncStorage & sign out
    await AsyncStorage.clear();
    await supabase.auth.signOut();

    return { success: true };
  } catch (err: any) {
    console.error('[authService] Error purging user data:', err);
    return { success: false, error: err?.message || 'Failed to complete data deletion.' };
  }
}


