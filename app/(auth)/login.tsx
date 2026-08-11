import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const router = useRouter();
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
    <View style={styles.container}>
      <Text style={styles.brandTitle}>Trainr ⚡</Text>
      <Text style={styles.brandSubtitle}>Real-Time Fitness & Coaching Platform</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Sign In</Text>

        {/* Google OAuth Button */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.8}>
          <Text style={styles.googleIcon}>🌐</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR EMAIL</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="user@example.com"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#64748B"
          secureTextEntry
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
          <Text style={styles.primaryBtnText}>Sign In with Email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.linkBtnText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandTitle: {
    color: '#10B981',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
  },
  formTitle: {
    color: '#F8FAFC',
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
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkBtnText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
