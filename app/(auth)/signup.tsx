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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedAvatar(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('ImagePicker error:', e);
    }
  };

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
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.container}
    >
      <Text
        style={[
          styles.brandTitle,
          { color: theme.isDark ? theme.accentGold : theme.primary },
        ]}
      >
        Trainr
      </Text>
      <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>Create Your Account</Text>

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
        <Text style={[styles.formTitle, { color: theme.text }]}>Sign Up</Text>

        {/* Profile Picture Selection */}
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Profile Picture (Optional)</Text>
        <View
          style={[
            styles.avatarPickerRow,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.avatarPreviewBox,
              { borderColor: theme.isDark ? theme.accentGold : theme.primary },
            ]}
            onPress={pickImage}
          >
            {selectedAvatar ? (
              <Image source={{ uri: selectedAvatar }} style={styles.avatarPreviewImg} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                {fullName ? (
                  <Text
                    style={[
                      styles.avatarPlaceholderText,
                      { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                    ]}
                  >
                    {fullName.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={theme.isDark ? '#0A1A12' : '#FFFFFF'}
                  />
                )}
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.avatarPickerHint, { color: theme.textMuted }]}>Choose a preset or upload custom photo:</Text>
            <View style={styles.presetRow}>
              {avatarPresets.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.presetCircle,
                    selectedAvatar === uri && {
                      borderColor: theme.isDark ? theme.accentGold : theme.primary,
                    },
                  ]}
                  onPress={() => setSelectedAvatar(uri)}
                >
                  <Image source={{ uri }} style={styles.presetImg} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.presetCircle,
                  {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
                onPress={pickImage}
              >
                <Ionicons name="camera-outline" size={16} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Google OAuth Button */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignup} activeOpacity={0.8}>
          <Ionicons name="logo-google" size={18} color="#0F172A" />
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR EMAIL</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ankit Sharma"
          placeholderTextColor={theme.textMuted}
        />

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
          onPress={handleSignup}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.primaryBtnText,
              { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
            ]}
          >
            Continue to Setup
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={[styles.linkBtnText, { color: theme.textSecondary }]}>
            Already have an account?{' '}
            <Text style={{ color: theme.isDark ? theme.accentGold : theme.primary, fontWeight: 'bold' }}>
              Sign In
            </Text>
          </Text>
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
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatarPreviewBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
  },
  avatarPreviewImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatarPickerHint: {
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
  presetImg: {
    width: '100%',
    height: '100%',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  googleIcon: {
    fontSize: 18,
  },
  googleBtnText: {
    color: '#0F172A',
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
  },
  dividerText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  linkBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
