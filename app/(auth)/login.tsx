import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setProfile = useAuthStore((state) => state.setProfile);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    setProfile({
      id: 'usr_' + Date.now(),
      email: email,
      fullName: email.split('@')[0] || 'User',
      role: 'CLIENT',
      isOnboarded: false,
    });
    router.replace('/(auth)/onboarding');
  };

  const handleGoogleLogin = async () => {
    const success = await signInWithGoogle();
    if (success) {
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text
        style={[
          styles.brandTitle,
          { color: theme.isDark ? theme.accentGold : theme.primary },
        ]}
      >
        Trainr
      </Text>
      <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
        Real-Time Fitness & Coaching Platform
      </Text>

      <View
        style={[
          styles.formCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            ...theme.shadow,
          },
        ]}
      >
        <Text style={[styles.formTitle, { color: theme.text }]}>Sign In</Text>

        {/* Google OAuth Button */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.8}>
          <Ionicons name="logo-google" size={18} color="#0F172A" />
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR EMAIL</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="user@example.com"
          placeholderTextColor={theme.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
              ...theme.shadowButton,
            },
          ]}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.primaryBtnText,
              { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
            ]}
          >
            Sign In with Email
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/(auth)/signup')}>
          <Text style={[styles.linkBtnText, { color: theme.textSecondary }]}>
            Don't have an account?{' '}
            <Text style={{ color: theme.isDark ? theme.accentGold : theme.primary, fontWeight: 'bold' }}>
              Sign Up
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
  },
  googleBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkBtnText: {
    fontSize: 14,
  },
});
