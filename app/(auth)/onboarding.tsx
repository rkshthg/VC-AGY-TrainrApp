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
import { useAuthStore } from '../../store/authStore';

export default function OnboardingScreen() {
  const router = useRouter();
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
    <View style={styles.container}>
      <Text style={styles.stepIndicator}>STEP {step + 1} OF 6</Text>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 0: Role Selection */}
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Are you a Trainer?</Text>
            <Text style={styles.subtitle}>
              Trainers get a 6-digit Trainer Code and a Clients Management Hub. Clients get structured meal and workout tracking.
            </Text>

            <TouchableOpacity
              style={[styles.roleOption, role === 'CLIENT' && styles.roleOptionActive]}
              onPress={() => setRole('CLIENT')}
            >
              <Text style={styles.roleIcon}>🏋️</Text>
              <View>
                <Text style={styles.roleTitle}>No, I am a Client / Trainee</Text>
                <Text style={styles.roleDesc}>Track personal meals, workouts & metrics</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, role === 'TRAINER' && styles.roleOptionActive]}
              onPress={() => setRole('TRAINER')}
            >
              <Text style={styles.roleIcon}>⚡</Text>
              <View>
                <Text style={styles.roleTitle}>Yes, I am a Personal Trainer</Text>
                <Text style={styles.roleDesc}>Manage clients, assign routines & live feed</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Core Info */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.title}>Core Information</Text>
            <Text style={styles.subtitle}>Tell us about your physical profile.</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

            <Text style={styles.inputLabel}>Biological Sex</Text>
            <View style={styles.chipRow}>
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, sex === s && styles.chipActive]}
                  onPress={() => setSex(s)}
                >
                  <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput style={styles.input} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" />

            <Text style={styles.inputLabel}>Current Weight (kg)</Text>
            <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" />

            <Text style={styles.inputLabel}>Activity Level</Text>
            <View style={styles.chipRowWrap}>
              {[
                { id: 'SEDENTARY', label: 'Sedentary' },
                { id: 'LIGHTLY_ACTIVE', label: 'Lightly Active' },
                { id: 'MODERATELY_ACTIVE', label: 'Moderately Active' },
                { id: 'VERY_ACTIVE', label: 'Very Active' },
              ].map((act) => (
                <TouchableOpacity
                  key={act.id}
                  style={[styles.chip, activityLevel === act.id && styles.chipActive]}
                  onPress={() => setActivityLevel(act.id as any)}
                >
                  <Text style={[styles.chipText, activityLevel === act.id && styles.chipTextActive]}>
                    {act.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Body Measurements */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.title}>Body Measurements (Optional)</Text>
            <Text style={styles.subtitle}>Used for calculating Navy Body Fat %.</Text>

            <Text style={styles.inputLabel}>Neck Circumference (cm)</Text>
            <TextInput style={styles.input} value={neckCm} onChangeText={setNeckCm} keyboardType="numeric" />

            <Text style={styles.inputLabel}>Waist Circumference (cm)</Text>
            <TextInput style={styles.input} value={waistCm} onChangeText={setWaistCm} keyboardType="numeric" />

            <Text style={styles.inputLabel}>Hips Circumference (cm)</Text>
            <TextInput style={styles.input} value={hipsCm} onChangeText={setHipsCm} keyboardType="numeric" />
          </View>
        )}

        {/* Step 3: Fitness Goals */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.title}>Select Your Fitness Goals</Text>
            <Text style={styles.subtitle}>Choose one or multiple goals.</Text>

            {[
              { id: 'FAT_LOSS', title: 'Fat Loss', desc: 'Burn fat and improve lean definition' },
              { id: 'RECOMPOSITION', title: 'Body Recomposition', desc: 'Build muscle while dropping body fat' },
              { id: 'MUSCLE_GAIN', title: 'Muscle Gain / Hypertrophy', desc: 'Increase muscle mass and strength' },
              { id: 'STRENGTH', title: 'Pure Strength', desc: 'Maximize 1RM performance on main lifts' },
            ].map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalCard, selectedGoals.includes(g.id) && styles.goalCardActive]}
                onPress={() => toggleGoal(g.id)}
              >
                <Text style={styles.goalTitle}>{g.title}</Text>
                <Text style={styles.goalDesc}>{g.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 4: Daily Nutrition Targets */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.title}>Daily Nutrition Targets</Text>
            <Text style={styles.subtitle}>Set your daily calorie & macro goals.</Text>

            <Text style={styles.inputLabel}>Calorie Target (kcal)</Text>
            <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="numeric" />

            <Text style={styles.inputLabel}>Protein Target (g)</Text>
            <TextInput style={styles.input} value={protein} onChangeText={setProtein} keyboardType="numeric" />

            <Text style={styles.inputLabel}>Carbohydrates Target (g)</Text>
            <TextInput style={styles.input} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />

            <Text style={styles.inputLabel}>Fat Target (g)</Text>
            <TextInput style={styles.input} value={fat} onChangeText={setFat} keyboardType="numeric" />
          </View>
        )}

        {/* Step 5: Trainer Pairing */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.title}>
              {role === 'TRAINER' ? 'Trainer Setup & Head Trainer Link' : 'Pair With Your Trainer'}
            </Text>
            <Text style={styles.subtitle}>
              {role === 'TRAINER'
                ? 'Your unique 6-digit Trainer Code will be generated for your clients. Optionally, enter a Head Trainer Code below if you are guided by a Master Trainer.'
                : 'Have a 6-digit Trainer Code from your personal trainer? Enter it below to link accounts (or skip to add later).'}
            </Text>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>
                {role === 'TRAINER' ? 'Head Trainer Code (Optional)' : '6-Digit Trainer Code (Optional)'}
              </Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={trainerCodeInput}
                onChangeText={setTrainerCodeInput}
                placeholder="TR-V95Y"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
              />
            </View>

            {role === 'TRAINER' && (
              <View style={styles.trainerGenNotice}>
                <Text style={styles.trainerGenNoticeText}>
                  ✨ Your client code will be generated upon completing setup.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Actions */}
      <View style={styles.footerRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{step === 5 ? 'Complete Setup 🚀' : 'Next Step →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  stepIndicator: {
    color: '#10B981',
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
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
    color: '#10B981',
    borderColor: '#10B981',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 16,
  },
  roleOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  roleIcon: {
    fontSize: 28,
  },
  roleTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  roleDesc: {
    color: '#94A3B8',
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
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  goalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  goalCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  goalTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  goalDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  trainerGenNotice: {
    marginTop: 14,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#064E3B',
  },
  trainerGenNoticeText: {
    color: '#10B981',
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
    backgroundColor: '#334155',
  },
  backBtnText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
