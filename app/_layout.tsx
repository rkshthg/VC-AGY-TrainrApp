import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Platform, AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';
import { secureGetProfile } from '../lib/secureProfileCache';
import { localDateStr } from '../lib/dates';
import { processQueue } from '../lib/offlineSync';
import { startRealtime } from '../lib/realtime';

WebBrowser.maybeCompleteAuthSession();
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useTrainerStore } from '../store/trainerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Allowed URL schemes for deep link auth processing. */
const ALLOWED_AUTH_SCHEMES = ['trainr://', 'com.trainr.trainrapp://', 'com.anonymous.trainrapp://'];

export default function RootLayout() {
  const theme = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const session = useAuthStore((state) => state.session);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const isOnboarded = useAuthStore((state) => state.isOnboarded);

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!url) return;

      // SECURITY: Validate URL scheme before processing auth parameters
      const lowerUrl = url.toLowerCase();
      const isAllowedScheme = ALLOWED_AUTH_SCHEMES.some(scheme => lowerUrl.startsWith(scheme));
      if (!isAllowedScheme && !lowerUrl.startsWith('https://')) {
        logger.warn('Rejected deep link with unrecognized scheme');
        return;
      }

      if (url.includes('code=') || url.includes('access_token=')) {
        try {
          useAuthStore.getState().setIsAuthLoading(true);
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
            await supabase.auth.exchangeCodeForSession(code);
          } else if (access_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });
          }
        } catch (e) {
          logger.error('Deep link auth error:', e);
        }
      }
    };

    const linkSub = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const initAuth = async () => {
      // Load cached profile immediately to prevent default state flashes
      // SECURITY: Profile cache now uses encrypted SecureStore on native platforms
      try {
        const cached = await secureGetProfile();
        if (cached) {
          useAuthStore.getState().setProfile(cached);
        } else {
          const savedTheme = await AsyncStorage.getItem('@trainr_theme_mode');
          if (savedTheme) await useAuthStore.getState().setThemeMode(savedTheme as any);
          const savedUnits = await AsyncStorage.getItem('@trainr_unit_system');
          if (savedUnits) await useAuthStore.getState().setUnitSystem(savedUnits as any);
        }
        const savedStep = await AsyncStorage.getItem('@trainr_weight_step');
        if (savedStep) {
          const parsedStep = parseFloat(savedStep);
          if (!isNaN(parsedStep) && parsedStep > 0) {
            useAuthStore.getState().setWeightStep(parsedStep);
          }
        }
      } catch (e) {
        logger.warn('Failed to restore cached profile:', e);
      }


      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession) {
        // getUser() validates the token against the backend to verify it hasn't been deleted or invalidated
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          logger.warn('Stale session detected, logging out');
          await supabase.auth.signOut();
          useAuthStore.getState().logout();
          useAuthStore.getState().setIsAuthLoading(false);
          return;
        }
        useAuthStore.getState().setSession(initialSession);
        await syncAllData(user.id);
      }
      useAuthStore.getState().setIsAuthLoading(false);
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      useAuthStore.getState().setSession(newSession);
      if (newSession?.user) {
         await syncAllData(newSession.user.id);
      }
      useAuthStore.getState().setIsAuthLoading(false);
    });

    // Offline queue: retry when the app comes back to the foreground and
    // every minute while anything is still pending.
    const flushQueue = async () => {
      const userId = useAuthStore.getState().session?.user?.id;
      if (!userId) return;
      const { synced } = await processQueue();
      if (synced > 0) refreshPersonalData(userId);
    };
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushQueue();
    });
    const retryTimer = setInterval(flushQueue, 60 * 1000);

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
      appStateSub.remove();
      clearInterval(retryTimer);
    };
  }, []);

  const refreshPersonalData = (userId: string) => {
    useProgressStore.getState().fetchProgressData(userId);
    useWorkoutStore.getState().fetchWorkoutData(userId);
    useNutritionStore.getState().fetchNutritionData(userId, localDateStr());
  };

  const syncAllData = async (userId: string) => {
    const authStore = useAuthStore.getState();
    await authStore.fetchProfile(userId);
    
    const profile = useAuthStore.getState().profile;
    if (profile) {
      // Send anything saved while offline before loading, so it shows up.
      await processQueue();

      // Fetch personal fitness stores for ALL accounts (both CLIENT and TRAINER)
      refreshPersonalData(userId);

      // If user is a Trainer, additionally fetch their client roster
      if (profile.role === 'TRAINER') {
         useTrainerStore.getState().fetchRoster();
      }

      startRealtime(userId, profile.role);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      if (isOnboarded) {
        // If onboarded and trying to access an auth screen or the root, go to dashboard
        const isWeb = Platform.OS === 'web';
        const browserPath = isWeb ? window.location.pathname : '';
        
        const isRoot = isWeb 
          ? (browserPath === '/' || browserPath === '/index' || browserPath.endsWith('/index'))
          : (!segments[0] || segments[0] === 'index');
          
        const isAuth = isWeb 
          ? (browserPath.includes('/login') || browserPath.includes('/register') || browserPath.includes('/onboarding'))
          : inAuthGroup;

        if (isAuth || isRoot) {
          router.replace('/(tabs)/dashboard');
        }
      } else {
        // If not onboarded and not on the onboarding screen, go to onboarding
        if (segments[0] !== '(auth)' || segments[1] !== 'onboarding') {
          router.replace('/(auth)/onboarding');
        }
      }
    }
  }, [session, isOnboarded, isAuthLoading, segments]);

  if (isAuthLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="nutrition/scan-meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/builder" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/assign-modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/active-session" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="clients/[clientId]" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
