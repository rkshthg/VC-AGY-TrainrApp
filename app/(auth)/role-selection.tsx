import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { fetchUserProfileData, acceptClientInvite } from '@/features/auth/data/authService';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { NeumorphicInput } from '@/core/presentation/components/NeumorphicInput';

import { useRouter } from 'expo-router';

export default function RoleSelection() {
  const router = useRouter();
  const { setRole, setOnboardingCompleted, user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkExistingOnboarding = async (targetRole: 'trainer' | 'client') => {
    if (user?.id) {
      const profile = await fetchUserProfileData(user.id);
      if (profile?.onboarding_completed) {
        setOnboardingCompleted(true);
        if (targetRole === 'trainer') {
          router.replace('/(trainer)');
        } else {
          router.replace('/(client)');
        }
        return true;
      }
    }
    return false;
  };

  const handleSelectTrainer = async () => {
    setIsSubmitting(true);
    await setRole('trainer');
    const isCompleted = await checkExistingOnboarding('trainer');
    setIsSubmitting(false);
    if (!isCompleted) {
      router.replace('/(auth)/onboarding');
    }
  };

  const handleSelectClientPrompt = async () => {
    setIsSubmitting(true);
    await setRole('client');
    const isCompleted = await checkExistingOnboarding('client');
    setIsSubmitting(false);
    if (!isCompleted) {
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <View
      className="flex-1 items-center justify-center bg-deepGreen p-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="w-full max-w-sm">
        {/* Brand / Header */}
        <View className="items-center mb-6">
          <Text className="text-4xl font-black tracking-tighter text-gold-light mb-1">TRAINR</Text>
          <Text className="text-xs text-sage font-medium">Select Your Role</Text>
        </View>

        {/* Modal-style Container */}
        <NeumorphicView variant="extruded" className="p-6 rounded-2xl w-full">
          <Text className="text-lg font-bold text-center text-white mb-6">Are you a Trainer?</Text>
          
          <View className="space-y-4">
            {/* Trainer Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSelectTrainer}
              disabled={isSubmitting}
            >
              <NeumorphicView variant="goldAccent" className="p-5 rounded-2xl items-center">
                <View className="w-14 h-14 rounded-full bg-deepGreen-inset items-center justify-center mb-3 border border-gold-bright/30">
                  <Text className="text-2xl">📋</Text>
                </View>
                <Text className="text-xs font-bold uppercase tracking-wider text-gold-light mb-1">Trainer</Text>
                <Text className="text-xs text-sage text-center leading-5">
                  Manage clients, build programs, generate access codes.
                </Text>
              </NeumorphicView>
            </TouchableOpacity>

            {/* Client Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSelectClientPrompt}
              className="mt-3"
              disabled={isSubmitting}
            >
              <NeumorphicView variant="extruded" className="p-5 rounded-2xl items-center">
                <View className="w-14 h-14 rounded-full bg-deepGreen-inset items-center justify-center mb-3 border border-deepGreen-border">
                  <Text className="text-2xl">🏋️</Text>
                </View>
                <Text className="text-xs font-bold uppercase tracking-wider text-white mb-1">Client / Athlete</Text>
                <Text className="text-xs text-sage text-center leading-5">
                  Track workouts, view progress, connect with trainers.
                </Text>
              </NeumorphicView>
            </TouchableOpacity>
          </View>
        </NeumorphicView>
      </View>

      {isSubmitting && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <ActivityIndicator size="large" color="#E5C158" />
        </View>
      )}
    </View>
  );
}



