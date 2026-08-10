import '../global.css';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { supabase } from '@/core/data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { session, role, isLoading, initialize, setSession, setRole } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const storedRole = await AsyncStorage.getItem('trainr_role');
      initialize(session, storedRole as any);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session) {
        setRole(null);
      } else if (session.user) {
        const storedRole = await AsyncStorage.getItem('trainr_role');
        const currentRole = useAuthStore.getState().role;
        if (!currentRole) {
          const { getUserRole } = await import('@/features/auth/data/authService');
          const res = await getUserRole(session.user.id);
          const activeRole = res.role || (storedRole as any);
          if (activeRole) {
            await setRole(activeRole);
          }
          if (res.onboardingCompleted) {
            useAuthStore.getState().setOnboardingCompleted(true);
          }
        }
      }
    });

    const handleDeepLink = async (event: { url: string }) => {
      if (event.url && (event.url.includes('code=') || event.url.includes('access_token='))) {
        try {
          let paramsString = '';
          if (event.url.includes('#')) {
            paramsString = event.url.split('#')[1];
          } else if (event.url.includes('?')) {
            paramsString = event.url.split('?')[1];
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
            const { data } = await supabase.auth.exchangeCodeForSession(code);
            if (data.session) setSession(data.session);
          } else if (access_token) {
            const { data } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });
            if (data.session) setSession(data.session);
          }
        } catch (e) {
          console.error('Deep link auth error:', e);
        }
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inClientGroup = segments[0] === '(client)';
    const inTrainerGroup = segments[0] === '(trainer)';
    const inCalendar = segments[0] === 'calendar';

    if (!session && !inAuthGroup) {
      // Redirect unauthenticated users to the auth group
      router.replace('/(auth)/welcome');
    } else if (session && !inCalendar) {
      const { onboardingCompleted } = useAuthStore.getState();
      if (!role && segments[1] !== 'role-selection' && segments[1] !== 'onboarding') {
        router.replace('/(auth)/role-selection');
      } else if (role === 'client' && !inClientGroup) {
        if (onboardingCompleted || segments[1] !== 'onboarding') {
          router.replace('/(client)');
        }
      } else if (role === 'trainer' && !inTrainerGroup) {
        if (onboardingCompleted || segments[1] !== 'onboarding') {
          router.replace('/(trainer)');
        }
      }
    }
  }, [session, role, isLoading, segments]);

  if (isLoading) return null; // Or a loading spinner

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: '#0A1913' } }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
      <Stack.Screen name="(trainer)" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
