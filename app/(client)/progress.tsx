import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useProgressStore } from '@/features/progress/presentation/progressStore';
import { BodyCheckIn } from '@/features/progress/domain/progress';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { NeumorphicInput } from '@/core/presentation/components/NeumorphicInput';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { checkIns, fetchCheckIns, addCheckIn } = useProgressStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [bicep, setBicep] = useState('');
  const [hip, setHip] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCheckIns(user.id);
    }
  }, [user?.id]);

  const latestCheckIn = checkIns[0] || null;
  const oldestCheckIn = checkIns[checkIns.length - 1] || null;

  const currentWeight = latestCheckIn ? latestCheckIn.weight_kg : 80;
  const startingWeight = oldestCheckIn ? oldestCheckIn.weight_kg : currentWeight;
  const netWeightChange = (currentWeight - startingWeight).toFixed(1);

  // Body Composition metrics
  const currentBodyFat = latestCheckIn?.body_fat_percentage || 16.9;
  const currentWaist = latestCheckIn?.waist_cm || 83;
  const currentChest = latestCheckIn?.chest_cm || 103;
  const currentBicep = latestCheckIn?.bicep_cm || 37;

  // Auto calculate BMI (assumes average height 1.75m for display)
  const heightM = 1.75;
  const calculatedBMI = (currentWeight / (heightM * heightM)).toFixed(1);
  const leanMassKg = currentWeight * (1 - currentBodyFat / 100);
  const calculatedFFMI = (leanMassKg / (heightM * heightM)).toFixed(1);

  const handlePickPhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Required', 'Permission is required to capture/select progress photos.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 0.7 });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSaveCheckIn = async () => {
    if (!weight) {
      Alert.alert('Missing Weight', 'Please enter your weight.');
      return;
    }

    const wNum = parseFloat(weight);
    const bfNum = bodyFat ? parseFloat(bodyFat) : undefined;

    await addCheckIn(
      {
        date: new Date().toISOString().split('T')[0],
        weight_kg: wNum,
        body_fat_percentage: bfNum,
        waist_cm: waist ? parseFloat(waist) : undefined,
        chest_cm: chest ? parseFloat(chest) : undefined,
        bicep_cm: bicep ? parseFloat(bicep) : undefined,
        hip_cm: hip ? parseFloat(hip) : undefined,
        photo_url: photoUri || undefined,
        notes: notes || undefined,
        bmi: parseFloat((wNum / (heightM * heightM)).toFixed(1)),
        ffmi: bfNum ? parseFloat(((wNum * (1 - bfNum / 100)) / (heightM * heightM)).toFixed(1)) : undefined,
      },
      user?.id
    );

    // Reset & close
    setWeight('');
    setBodyFat('');
    setWaist('');
    setChest('');
    setBicep('');
    setHip('');
    setNotes('');
    setPhotoUri(null);
    setModalVisible(false);
    Alert.alert('Check-In Saved! 🎉', 'Your body metrics and progress have been updated.');
  };

  const photosList = checkIns.filter((c) => c.photo_url);

  return (
    <ScrollView
      className="flex-1 bg-deepGreen p-5"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      {/* Header Bar */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-black text-white tracking-wide">Body Metrics</Text>
          <Text className="text-xs text-sage">Track weight, measurements & progress photos</Text>
        </View>
        <NeumorphicButton
          title="+ Check-In"
          variant="gold"
          size="sm"
          onPress={() => setModalVisible(true)}
        />
      </View>

      {/* Main Body Weight Banner */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-start mb-2">
          <View>
            <Text className="text-xs text-sage font-medium uppercase tracking-widest">Current Weight</Text>
            <Text className="text-3xl font-black font-mono text-white mt-0.5">{currentWeight} <Text className="text-base text-gold-light">kg</Text></Text>
          </View>
          <View className={`px-3 py-1.5 rounded-full border ${parseFloat(netWeightChange) <= 0 ? 'bg-emerald-500/20 border-emerald-400/40' : 'bg-amber-500/20 border-amber-400/40'}`}>
            <Text className={`text-xs font-mono font-bold ${parseFloat(netWeightChange) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {parseFloat(netWeightChange) <= 0 ? `${netWeightChange} kg 📉` : `+${netWeightChange} kg 📈`}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between pt-3 mt-3 border-t border-gold-bright/20">
          <View>
            <Text className="text-[10px] text-sage">Starting Weight</Text>
            <Text className="text-xs font-mono font-bold text-white mt-0.5">{startingWeight} kg</Text>
          </View>
          <View>
            <Text className="text-[10px] text-sage">Body Fat %</Text>
            <Text className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{currentBodyFat}%</Text>
          </View>
          <View>
            <Text className="text-[10px] text-sage">BMI</Text>
            <Text className="text-xs font-mono font-bold text-white mt-0.5">{calculatedBMI}</Text>
          </View>
          <View>
            <Text className="text-[10px] text-sage">FFMI</Text>
            <Text className="text-xs font-mono font-bold text-gold-light mt-0.5">{calculatedFFMI}</Text>
          </View>
        </View>
      </NeumorphicView>

      {/* Circumference Measurements Grid */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <Text className="text-base font-bold text-white mb-3">Circumference Tracker (cm)</Text>
        <View className="flex-row flex-wrap -mx-1.5">
          <View className="w-1/2 p-1.5">
            <View className="bg-deepGreen-card p-3 rounded-2xl border border-deepGreen-border">
              <Text className="text-[11px] text-sage mb-0.5">Waist</Text>
              <Text className="text-lg font-bold font-mono text-white">{currentWaist} <Text className="text-xs text-sage">cm</Text></Text>
            </View>
          </View>
          <View className="w-1/2 p-1.5">
            <View className="bg-deepGreen-card p-3 rounded-2xl border border-deepGreen-border">
              <Text className="text-[11px] text-sage mb-0.5">Chest</Text>
              <Text className="text-lg font-bold font-mono text-white">{currentChest} <Text className="text-xs text-sage">cm</Text></Text>
            </View>
          </View>
          <View className="w-1/2 p-1.5">
            <View className="bg-deepGreen-card p-3 rounded-2xl border border-deepGreen-border">
              <Text className="text-[11px] text-sage mb-0.5">Biceps</Text>
              <Text className="text-lg font-bold font-mono text-white">{currentBicep} <Text className="text-xs text-sage">cm</Text></Text>
            </View>
          </View>
          <View className="w-1/2 p-1.5">
            <View className="bg-deepGreen-card p-3 rounded-2xl border border-deepGreen-border">
              <Text className="text-[11px] text-sage mb-0.5">Hips</Text>
              <Text className="text-lg font-bold font-mono text-white">{latestCheckIn?.hip_cm || 96} <Text className="text-xs text-sage">cm</Text></Text>
            </View>
          </View>
        </View>
      </NeumorphicView>

      {/* Progress Photos Gallery */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-bold text-white">Progress Photos</Text>
          <Text className="text-xs font-mono text-sage">{photosList.length} Photos</Text>
        </View>

        {photosList.length === 0 ? (
          <View className="py-4 items-center">
            <Text className="text-xs text-sage text-center mb-3">No progress photos logged yet. Take your first photo!</Text>
            <NeumorphicButton
              title="📷 Add Progress Photo"
              variant="gold"
              size="sm"
              onPress={() => setModalVisible(true)}
            />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {photosList.map((p) => (
              <View key={p.id} className="mr-3 items-center">
                <Image
                  source={{ uri: p.photo_url }}
                  style={{ width: 110, height: 140, borderRadius: 12 }}
                  className="bg-deepGreen-card border border-deepGreen-border mb-1.5"
                />
                <Text className="text-[10px] text-gold-light font-mono font-bold">{p.date}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </NeumorphicView>

      {/* Timeline Check-In History */}
      <Text className="text-sm font-bold text-sage uppercase tracking-widest mb-3">Check-In Timeline</Text>
      {checkIns.map((c) => (
        <NeumorphicView key={c.id} variant="extruded" className="p-4 mb-3 rounded-2xl">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="font-bold font-mono text-white text-sm">🗓️ {c.date}</Text>
            <Text className="text-sm font-bold font-mono text-gold-light">{c.weight_kg} kg</Text>
          </View>

          <View className="flex-row flex-wrap space-x-3 mt-1">
            {c.body_fat_percentage && <Text className="text-xs font-mono text-emerald-400">Fat: {c.body_fat_percentage}%</Text>}
            {c.waist_cm && <Text className="text-xs font-mono text-sage">Waist: {c.waist_cm}cm</Text>}
            {c.chest_cm && <Text className="text-xs font-mono text-sage">Chest: {c.chest_cm}cm</Text>}
            {c.bicep_cm && <Text className="text-xs font-mono text-sage">Bicep: {c.bicep_cm}cm</Text>}
          </View>

          {c.notes && (
            <Text className="text-xs text-sage italic mt-2 border-t border-deepGreen-border pt-1.5">
              "{c.notes}"
            </Text>
          )}
        </NeumorphicView>
      ))}

      {/* Log Progress Check-In Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-deepGreen border-t border-gold-bright/30 rounded-t-3xl p-5 max-h-[85%]">
            <Text className="text-xl font-black text-white mb-1">+ Log Body Check-In</Text>
            <Text className="text-xs text-sage mb-4">Record your weight, body measurements & progress photo</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row space-x-3 mb-3">
                <View className="flex-1">
                  <NeumorphicInput
                    label="Weight (kg) *"
                    placeholder="78.5"
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
                <View className="flex-1">
                  <NeumorphicInput
                    label="Body Fat %"
                    placeholder="16.5"
                    keyboardType="numeric"
                    value={bodyFat}
                    onChangeText={setBodyFat}
                  />
                </View>
              </View>

              <Text className="text-xs font-bold text-sage uppercase tracking-wider mb-2">Body Circumferences (cm)</Text>
              <View className="flex-row space-x-3 mb-3">
                <View className="flex-1">
                  <NeumorphicInput
                    label="Waist"
                    placeholder="82.0"
                    keyboardType="numeric"
                    value={waist}
                    onChangeText={setWaist}
                  />
                </View>
                <View className="flex-1">
                  <NeumorphicInput
                    label="Chest"
                    placeholder="103.0"
                    keyboardType="numeric"
                    value={chest}
                    onChangeText={setChest}
                  />
                </View>
              </View>

              <View className="flex-row space-x-3 mb-3">
                <View className="flex-1">
                  <NeumorphicInput
                    label="Biceps"
                    placeholder="37.0"
                    keyboardType="numeric"
                    value={bicep}
                    onChangeText={setBicep}
                  />
                </View>
                <View className="flex-1">
                  <NeumorphicInput
                    label="Hips"
                    placeholder="96.0"
                    keyboardType="numeric"
                    value={hip}
                    onChangeText={setHip}
                  />
                </View>
              </View>

              <NeumorphicInput
                label="Notes / Reflections"
                placeholder="Feeling stronger, energy levels high..."
                value={notes}
                onChangeText={setNotes}
                className="mb-4"
              />

              {/* Progress Photo Picker */}
              <Text className="text-xs font-bold text-sage uppercase tracking-wider mb-2">Progress Photo</Text>
              {photoUri ? (
                <View className="items-center mb-4">
                  <Image source={{ uri: photoUri }} style={{ width: 140, height: 160, borderRadius: 12 }} />
                  <TouchableOpacity onPress={() => setPhotoUri(null)} className="mt-2">
                    <Text className="text-xs text-rose-400 font-bold">Remove Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row space-x-3 mb-5">
                  <TouchableOpacity
                    className="flex-1 bg-deepGreen-card p-3 rounded-xl border border-deepGreen-border items-center"
                    onPress={() => handlePickPhoto(true)}
                  >
                    <Text className="text-xs font-bold text-gold-light">📷 Take Camera Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-deepGreen-card p-3 rounded-xl border border-deepGreen-border items-center"
                    onPress={() => handlePickPhoto(false)}
                  >
                    <Text className="text-xs font-bold text-sage">🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View className="flex-row space-x-3 mb-4">
                <NeumorphicButton
                  title="Cancel"
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onPress={() => setModalVisible(false)}
                />
                <NeumorphicButton
                  title="Save Check-In"
                  variant="gold"
                  size="md"
                  className="flex-1"
                  onPress={handleSaveCheckIn}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
