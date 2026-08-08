import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { saveUserProfileData, fetchUserProfileData, linkClientToTrainerByCode } from '@/services/authService';
import { useRouter } from 'expo-router';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, role, setOnboardingCompleted } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightGoal, setWeightGoal] = useState('Recomposition');
  const [trainerCode, setTrainerCode] = useState('');
  const [assignedTrainerCode, setAssignedTrainerCode] = useState('');
  
  // Optional Body Measurements
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipCm, setHipCm] = useState('');
  const [bicepCm, setBicepCm] = useState('');
  const [thighCm, setThighCm] = useState('');

  // Optional Daily Nutrition Goals
  const [calorieTarget, setCalorieTarget] = useState('2200');
  const [proteinTarget, setProteinTarget] = useState('160');
  const [carbsTarget, setCarbsTarget] = useState('220');
  const [fatTarget, setFatTarget] = useState('70');

  useEffect(() => {
    if (user?.id) {
      fetchUserProfileData(user.id).then((p) => {
        if (p?.trainer_code) {
          setAssignedTrainerCode(p.trainer_code);
        }
      });
    }
  }, [user?.id]);

  const handleSubmitProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }
    if (!heightCm || !weightKg) {
      Alert.alert('Required Fields', 'Please provide height and weight to customize your experience.');
      return;
    }

    if (!user?.id) return;
    setIsSubmitting(true);

    const profilePayload = {
      full_name: fullName.trim(),
      sex,
      height_cm: heightCm,
      weight_kg: weightKg,
      weight_goal: weightGoal,
      chest_cm: chestCm,
      waist_cm: waistCm,
      hip_cm: hipCm,
      bicep_cm: bicepCm,
      thigh_cm: thighCm,
      calorie_target: calorieTarget,
      protein_target: proteinTarget,
      carbs_target: carbsTarget,
      fat_target: fatTarget,
    };

    await saveUserProfileData(user.id, profilePayload);

    // If user provided a Trainer Code, link them to that trainer
    if (trainerCode.trim()) {
      const linkRes = await linkClientToTrainerByCode(user.id, trainerCode);
      if (linkRes.success) {
        Alert.alert('Trainer Linked! 🏋️', `You have been linked to your trainer (${linkRes.trainerName}).`);
      } else {
        Alert.alert('Trainer Code Warning', linkRes.error || 'Could not link trainer code, but profile was saved.');
      }
    }

    setOnboardingCompleted(true);
    setIsSubmitting(false);

    // Route to main dashboard based on active role
    if (role === 'trainer') {
      router.replace('/(trainer)');
    } else {
      router.replace('/(client)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-deepGreen"
    >
      <ScrollView
        className="flex-1 px-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 20) + 120,
        }}
      >
        <Text className="text-sm text-gold-light font-bold uppercase tracking-widest mb-1">
          WELCOME TO TRAINR
        </Text>
        <Text className="text-3xl font-black text-white mb-2">Build Your Profile</Text>
        <Text className="text-sm text-sage mb-6">
          Let's log your starting metrics so we can personalize your training, nutrition targets, and progress tracking.
        </Text>

        {/* Basic Metrics Section */}
        <NeumorphicView variant="extruded" className="p-5 mb-5">
          <Text className="text-base font-bold text-white mb-4">1. Core Information</Text>

          <NeumorphicInput
            label="Full Name *"
            placeholder="e.g. Alex Johnson"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text className="text-xs font-semibold text-sage mb-2 mt-3">Sex / Gender *</Text>
          <View className="flex-row space-x-2 mb-4">
            {(['Male', 'Female', 'Other'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setSex(option)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  sex === option ? 'bg-gold-light border-gold-bright' : 'bg-deepGreen-elevated border-deepGreen-border'
                }`}
              >
                <Text className={`text-xs font-bold ${sex === option ? 'text-deepGreen-dark' : 'text-sage'}`}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row space-x-3 mb-4">
            <View className="flex-1">
              <NeumorphicInput
                label="Height (cm) *"
                placeholder="e.g. 178"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <NeumorphicInput
                label="Weight (kg) *"
                placeholder="e.g. 75"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text className="text-xs font-semibold text-sage mb-2">Fitness / Weight Goal (Optional)</Text>
          <View className="flex-row space-x-2 mb-4">
            {['Fat Loss', 'Recomposition', 'Muscle Gain'].map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setWeightGoal(g)}
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  weightGoal === g ? 'bg-gold-dark border-gold-bright' : 'bg-deepGreen-elevated border-deepGreen-border'
                }`}
              >
                <Text className={`text-[11px] font-bold ${weightGoal === g ? 'text-white' : 'text-sage'}`}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Trainer Code Section */}
          {role === 'trainer' && (
            <View className="mt-2 mb-4 p-3 bg-gold-dark/20 rounded-xl border border-gold-bright/30">
              <Text className="text-xs font-bold text-gold-light uppercase">Your Unique Trainer Code</Text>
              <Text className="text-xl font-black text-white mt-1">{assignedTrainerCode || 'Generating...'}</Text>
              <Text className="text-[10px] text-sage mt-1">
                Share this unique code with your athletes so they can pair with you upon signup or from their profile.
              </Text>
            </View>
          )}

          <View className="mt-1">
            <NeumorphicInput
              label={role === 'trainer' ? "Your Coach's Trainer Code (Optional)" : "Trainer Code (Optional)"}
              placeholder="e.g. TR-8K92"
              value={trainerCode}
              onChangeText={setTrainerCode}
              autoCapitalize="characters"
            />
            <Text className="text-[11px] text-sage mt-1">
              {role === 'trainer'
                ? "Have a head coach or mentor trainer? Enter their code to link your account to them."
                : "Have a code from your personal coach? Enter it to pair your account automatically."}
            </Text>
          </View>
        </NeumorphicView>

        {/* Body Measurements (Optional) */}
        <NeumorphicView variant="extruded" className="p-5 mb-5">
          <Text className="text-base font-bold text-white mb-1">2. Body Measurements (Optional)</Text>
          <Text className="text-xs text-sage mb-4">Track initial circumference (in cm) for precise body composition tracking.</Text>

          <View className="flex-row space-x-3 mb-3">
            <View className="flex-1">
              <NeumorphicInput label="Chest (cm)" placeholder="e.g. 98" value={chestCm} onChangeText={setChestCm} keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <NeumorphicInput label="Waist (cm)" placeholder="e.g. 82" value={waistCm} onChangeText={setWaistCm} keyboardType="numeric" />
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <NeumorphicInput label="Hips (cm)" placeholder="e.g. 95" value={hipCm} onChangeText={setHipCm} keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <NeumorphicInput label="Biceps (cm)" placeholder="e.g. 36" value={bicepCm} onChangeText={setBicepCm} keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <NeumorphicInput label="Thighs (cm)" placeholder="e.g. 58" value={thighCm} onChangeText={setThighCm} keyboardType="numeric" />
            </View>
          </View>
        </NeumorphicView>

        {/* Daily Nutrition Goals (Optional) */}
        <NeumorphicView variant="extruded" className="p-5 mb-6">
          <Text className="text-base font-bold text-white mb-1">3. Daily Nutrition Goals (Optional)</Text>
          <Text className="text-xs text-sage mb-4">Set your starting macro targets. You or your trainer can adjust these anytime.</Text>

          <View className="flex-row space-x-3 mb-3">
            <View className="flex-1">
              <NeumorphicInput label="Calories (kcal)" placeholder="2200" value={calorieTarget} onChangeText={setCalorieTarget} keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <NeumorphicInput label="Protein (g)" placeholder="160" value={proteinTarget} onChangeText={setProteinTarget} keyboardType="numeric" />
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <NeumorphicInput label="Carbs (g)" placeholder="220" value={carbsTarget} onChangeText={setCarbsTarget} keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <NeumorphicInput label="Fats (g)" placeholder="70" value={fatTarget} onChangeText={setFatTarget} keyboardType="numeric" />
            </View>
          </View>
        </NeumorphicView>

        <NeumorphicButton
          title={isSubmitting ? 'Saving Profile...' : 'Complete Profile & Launch Trainr'}
          variant="gold"
          size="lg"
          className="w-full"
          onPress={handleSubmitProfile}
          disabled={isSubmitting}
        />

        {isSubmitting && (
          <ActivityIndicator color="#E5C158" className="mt-4" />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

