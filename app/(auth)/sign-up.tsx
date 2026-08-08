import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSession } = useAuthStore();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

  const signInWithGoogle = async () => {
    try {
      setIsAuthenticating(true);
      const redirectUri = makeRedirectUri({ scheme: 'trainr' });

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri,
          },
        });
        if (error) throw error;
        return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const session = await createSessionFromUrl(result.url);
        if (session) {
          setSession(session);
        }
      }
    } catch (err: any) {
      Alert.alert('Auth Error', err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View
      className="flex-1 items-center justify-center bg-deepGreen p-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <NeumorphicView variant="goldAccent" className="p-8 w-full max-w-sm items-center">
        <Text className="text-3xl font-bold text-white mb-2">Create Account</Text>
        <Text className="text-sm text-sage text-center mb-8">
          Join Trainr to streamline workouts, AI nutrition, and client coaching.
        </Text>
        
        <NeumorphicButton
          title={isAuthenticating ? 'Connecting to Google...' : 'Continue with Google'}
          variant="gold"
          size="lg"
          className="w-full"
          onPress={signInWithGoogle}
          disabled={isAuthenticating}
        />

        {isAuthenticating && (
          <ActivityIndicator color="#E5C158" className="mt-4" />
        )}
        
        <TouchableOpacity 
          className="mt-6"
          onPress={() => router.back()}
          disabled={isAuthenticating}
        >
          <Text className="text-sage text-sm font-semibold">← Back</Text>
        </TouchableOpacity>
      </NeumorphicView>
    </View>
  );
}
