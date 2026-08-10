import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/core/data/supabaseClient';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
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
      <View className="w-full max-w-sm">
        {/* Brand Header */}
        <View className="mb-6 items-center">
          <Text className="text-4xl font-black text-white tracking-tighter mb-1">TRAINR</Text>
          <Text className="text-xs text-sage text-center">High-performance tracking for elite athletes.</Text>
        </View>

        {/* Auth Card Container */}
        <NeumorphicView variant="extruded" className="p-6 w-full rounded-2xl">
          {/* Segmented Tab Bar Layout */}
          <View className="flex-row p-1 bg-deepGreen-inset rounded-xl mb-6">
            <TouchableOpacity className="flex-1 py-2.5 items-center rounded-lg bg-deepGreen-elevated border border-deepGreen-border">
              <Text className="text-xs font-bold text-white uppercase tracking-wider">Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2.5 items-center rounded-lg"
              onPress={() => router.replace('/(auth)/sign-up')}
            >
              <Text className="text-xs font-bold text-sage uppercase tracking-wider">Create Account</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-semibold text-sage text-center mb-6">
            Sign in to access your customized workout roster & AI nutrition scanner.
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
            className="mt-6 items-center"
            onPress={() => router.back()}
            disabled={isAuthenticating}
          >
            <Text className="text-sage text-xs font-semibold">← Back to Welcome</Text>
          </TouchableOpacity>
        </NeumorphicView>
      </View>
    </View>
  );
}
