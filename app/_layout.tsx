import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useTrainerStore } from '../store/trainerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          console.error('Deep link auth error:', e);
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
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession) {
        // getUser() validates the token against the backend to verify it hasn't been deleted or invalidated
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.warn('Stale session detected, logging out:', error?.message);
          await supabase.auth.signOut();
          await AsyncStorage.removeItem('@trainr_profile');
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

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const syncAllData = async (userId: string) => {
    const authStore = useAuthStore.getState();
    await authStore.fetchProfile(userId);
    
    // Only fetch other stores once profile is loaded
    const profile = useAuthStore.getState().profile;
    if (profile) {
      if (profile.role === 'CLIENT') {
         useProgressStore.getState().fetchProgressData(userId);
         useWorkoutStore.getState().fetchWorkoutData(userId);
         const today = new Date().toISOString().split('T')[0];
         useNutritionStore.getState().fetchNutritionData(userId, today);
      } else if (profile.role === 'TRAINER') {
         useTrainerStore.getState().fetchRoster();
      }
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
