import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { completeOnboarding, generateTrainerCode, linkTrainer } = useAuthStore();

  const [step, setStep] = useState(0);

  // Form State
  const [role, setRole] = useState<'CLIENT' | 'TRAINER'>('CLIENT');
  const [fullName, setFullName] = useState('Ankit Sharma');
  const [sex, setSex] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');
  const [activityLevel, setActivityLevel] = useState<'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE'>('MODERATELY_ACTIVE');

  // Step 2 Measurements
  const [neckCm, setNeckCm] = useState('39');
  const [waistCm, setWaistCm] = useState('84');
  const [hipsCm, setHipsCm] = useState('98');

  // Step 3 Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['FAT_LOSS', 'MUSCLE_GAIN']);

  // Step 4 Nutrition Targets
  const [calories, setCalories] = useState('2200');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('220');
  const [fat, setFat] = useState('70');

  // Step 5 Trainer Code
  const [trainerCodeInput, setTrainerCodeInput] = useState('');

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      if (role === 'TRAINER') {
        generateTrainerCode();
      }
      setStep(1);
    } else if (step < 5) {
      setStep(step + 1);
    } else {
      // Final Step Complete
      if (trainerCodeInput.trim()) {
        await linkTrainer(trainerCodeInput.trim());
      }

      await completeOnboarding({
        fullName,
        role,
        sex,
        heightCm: parseFloat(heightCm) || 175,
        weightKg: parseFloat(weightKg) || 75,
        activityLevel,
        goals: selectedGoals,
        macroTargets: {
          calories: parseInt(calories) || 2200,
          protein: parseInt(protein) || 150,
          carbs: parseInt(carbs) || 220,
          fat: parseInt(fat) || 70,
        },
        bodyMeasurements: {
          neckCm: parseFloat(neckCm) || 39,
          waistCm: parseFloat(waistCm) || 84,
          hipsCm: parseFloat(hipsCm) || 98,
        },
      });

      router.replace('/(tabs)/dashboard');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text
        style={[
          styles.stepIndicator,
          { color: theme.isDark ? theme.accentGold : theme.primary },
        ]}
      >
        STEP {step + 1} OF 6
      </Text>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 0: Role Selection */}
        {step === 0 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>Are you a Trainer?</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Trainers get a 6-digit Trainer Code and a Clients Management Hub. Clients get structured meal and workout tracking.
            </Text>

            <TouchableOpacity
              style={[
                styles.roleOption,
                {
                  backgroundColor: role === 'CLIENT'
                    ? theme.isDark
                      ? theme.badgeBg
                      : '#E8F5E9'
                    : theme.cardInner,
                  borderColor: role === 'CLIENT'
                    ? theme.isDark
                      ? theme.accentGold
                      : theme.primary
                    : theme.border,
                },
              ]}
              onPress={() => setRole('CLIENT')}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={theme.isDark ? theme.accentGold : theme.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleTitle, { color: theme.text }]}>No, I am a Client / Trainee</Text>
                <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>Track personal meals, workouts & metrics</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                {
                  backgroundColor: role === 'TRAINER'
                    ? theme.isDark
                      ? theme.badgeBg
                      : '#E8F5E9'
                    : theme.cardInner,
                  borderColor: role === 'TRAINER'
                    ? theme.isDark
                      ? theme.accentGold
                      : theme.primary
                    : theme.border,
                },
              ]}
              onPress={() => setRole('TRAINER')}
            >
              <Ionicons
                name="fitness-outline"
                size={24}
                color={theme.isDark ? theme.accentGold : theme.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleTitle, { color: theme.text }]}>Yes, I am a Personal Trainer</Text>
                <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>Manage clients, assign routines & live feed</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Core Info */}
        {step === 1 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>Core Information</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Tell us about your physical profile.</Text>

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
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Biological Sex</Text>
            <View style={styles.chipRow}>
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: sex === s
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.cardInner,
                      borderColor: sex === s
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.border,
                    },
                  ]}
                  onPress={() => setSex(s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: sex === s
                          ? theme.isDark
                            ? '#0A1A12'
                            : '#FFFFFF'
                          : theme.textSecondary,
                        fontWeight: sex === s ? 'bold' : '600',
                      },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Height (cm)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current Weight (kg)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Activity Level</Text>
            <View style={styles.chipRowWrap}>
              {[
                { id: 'SEDENTARY', label: 'Sedentary' },
                { id: 'LIGHTLY_ACTIVE', label: 'Lightly Active' },
                { id: 'MODERATELY_ACTIVE', label: 'Moderately Active' },
                { id: 'VERY_ACTIVE', label: 'Very Active' },
              ].map((act) => (
                <TouchableOpacity
                  key={act.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: activityLevel === act.id
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.cardInner,
                      borderColor: activityLevel === act.id
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.border,
                    },
                  ]}
                  onPress={() => setActivityLevel(act.id as any)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: activityLevel === act.id
                          ? theme.isDark
                            ? '#0A1A12'
                            : '#FFFFFF'
                          : theme.textSecondary,
                        fontWeight: activityLevel === act.id ? 'bold' : '600',
                      },
                    ]}
                  >
                    {act.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Body Measurements */}
        {step === 2 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>Body Measurements (Optional)</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Used for calculating Navy Body Fat %.</Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Neck Circumference (cm)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={neckCm}
              onChangeText={setNeckCm}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Waist Circumference (cm)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={waistCm}
              onChangeText={setWaistCm}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hips Circumference (cm)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={hipsCm}
              onChangeText={setHipsCm}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Step 3: Fitness Goals */}
        {step === 3 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>Select Your Fitness Goals</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Choose one or multiple goals.</Text>

            {[
              { id: 'FAT_LOSS', title: 'Fat Loss', desc: 'Burn fat and improve lean definition' },
              { id: 'RECOMPOSITION', title: 'Body Recomposition', desc: 'Build muscle while dropping body fat' },
              { id: 'MUSCLE_GAIN', title: 'Muscle Gain / Hypertrophy', desc: 'Increase muscle mass and strength' },
              { id: 'STRENGTH', title: 'Pure Strength', desc: 'Maximize 1RM performance on main lifts' },
            ].map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: selectedGoals.includes(g.id)
                      ? theme.isDark
                        ? theme.badgeBg
                        : '#E8F5E9'
                      : theme.cardInner,
                    borderColor: selectedGoals.includes(g.id)
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.border,
                  },
                ]}
                onPress={() => toggleGoal(g.id)}
              >
                <Text style={[styles.goalTitle, { color: theme.text }]}>{g.title}</Text>
                <Text style={[styles.goalDesc, { color: theme.textSecondary }]}>{g.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 4: Daily Nutrition Targets */}
        {step === 4 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>Daily Nutrition Targets</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Set your daily calorie & macro goals.</Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Calorie Target (kcal)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Protein Target (g)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Carbohydrates Target (g)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Fat Target (g)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={fat}
              onChangeText={setFat}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Step 5: Trainer Pairing */}
        {step === 5 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              {role === 'TRAINER' ? 'Trainer Setup & Head Trainer Link' : 'Pair With Your Trainer'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {role === 'TRAINER'
                ? 'Your unique 6-digit Trainer Code will be generated for your clients. Optionally, enter a Head Trainer Code below if you are guided by a Master Trainer.'
                : 'Have a 6-digit Trainer Code from your personal trainer? Enter it below to link accounts (or skip to add later).'}
            </Text>

            <View style={{ marginTop: 14 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {role === 'TRAINER' ? 'Head Trainer Code (Optional)' : '6-Digit Trainer Code (Optional)'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.isDark ? theme.accentGold : theme.primary,
                    color: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
                value={trainerCodeInput}
                onChangeText={setTrainerCodeInput}
                placeholder="TR-V95Y"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
              />
            </View>

            {role === 'TRAINER' && (
              <View
                style={[
                  styles.trainerGenNotice,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.trainerGenNoticeText,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  Your client code will be generated upon completing setup.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Actions */}
      <View style={styles.footerRow}>
        {step > 0 && (
          <TouchableOpacity
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.cardInner,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            {
              backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
              ...theme.shadowButton,
            },
          ]}
          onPress={handleNext}
        >
          <Text
            style={[
              styles.nextBtnText,
              { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
            ]}
          >
            {step === 5 ? 'Complete Setup' : 'Next Step'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollContent: {
    flex: 1,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  codeInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    gap: 16,
  },
  roleIcon: {
    fontSize: 28,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  roleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  goalCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  goalDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  trainerGenNotice: {
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  trainerGenNoticeText: {
    fontSize: 11.5,
    textAlign: 'center',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtnText: {
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
