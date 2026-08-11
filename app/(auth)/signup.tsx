import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function SignupScreen() {
  const router = useRouter();
  const setProfile = useAuthStore((state) => state.setProfile);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(undefined);

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  ];

  const handleSignup = () => {
    if (!email || !fullName) {
      Alert.alert('Missing Fields', 'Please complete all required fields.');
      return;
    }
    setProfile({
      id: 'usr_' + Date.now(),
      email,
      fullName,
      avatarUrl: selectedAvatar,
      role: 'CLIENT',
      isOnboarded: false,
    });
    router.replace('/(auth)/onboarding');
  };

  const handleGoogleSignup = async () => {
    const success = await signInWithGoogle();
    if (success) {
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0F172A' }} contentContainerStyle={styles.container}>
      <Text style={styles.brandTitle}>Trainr ⚡</Text>
      <Text style={styles.brandSubtitle}>Create Your Account</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Sign Up</Text>

        {/* Profile Picture Selection */}
        <Text style={styles.inputLabel}>Profile Picture (Optional)</Text>
        <View style={styles.avatarPickerRow}>
          <TouchableOpacity
            style={styles.avatarPreviewBox}
            onPress={() => setSelectedAvatar(avatarPresets[0])}
          >
            {selectedAvatar ? (
              <Image source={{ uri: selectedAvatar }} style={styles.avatarPreviewImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {fullName ? fullName.charAt(0).toUpperCase() : '📸'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.avatarPickerHint}>Choose a photo preset below:</Text>
            <View style={styles.presetRow}>
              {avatarPresets.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetCircle, selectedAvatar === uri && styles.presetCircleActive]}
                  onPress={() => setSelectedAvatar(uri)}
                >
                  <Image source={{ uri }} style={styles.presetImg} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Google OAuth Button */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignup} activeOpacity={0.8}>
          <Text style={styles.googleIcon}>🌐</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR EMAIL</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ankit Sharma"
          placeholderTextColor="#64748B"
        />

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

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Continue to Setup</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.linkBtnText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 50,
    justifyContent: 'center',
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
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarPreviewBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  avatarPreviewImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatarPickerHint: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCircleActive: {
    borderColor: '#10B981',
  },
  presetImg: {
    width: '100%',
    height: '100%',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  googleIcon: {
    fontSize: 18,
  },
  googleBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#064E3B',
    fontSize: 15,
    fontWeight: 'bold',
  },
  linkBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});
