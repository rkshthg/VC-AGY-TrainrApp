import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { fetchUserProfileData, saveUserProfileData, linkClientToTrainerByCode, removeClientTrainerLink } from '@/features/auth/data/authService';
import { fetchUserProgressCheckIns, saveProgressCheckIn } from '@/features/progress/data/progressService';
import { supabase } from '@/core/data/supabaseClient';
import { AppHeader } from '@/core/presentation/components/AppHeader';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { NeumorphicInput } from '@/core/presentation/components/NeumorphicInput';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, userName, setUserName } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const [profile, setProfile] = useState<any>(null);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Trainer Code & Management State
  const [trainerCodeInput, setTrainerCodeInput] = useState('');
  const [linkingTrainer, setLinkingTrainer] = useState(false);

  // 1RM Personal Bests state
  const [squat1RM, setSquat1RM] = useState('140');
  const [bench1RM, setBench1RM] = useState('100');
  const [deadlift1RM, setDeadlift1RM] = useState('180');
  const [ohp1RM, setOhp1RM] = useState('65');

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editChest, setEditChest] = useState('');
  const [editWaist, setEditWaist] = useState('');
  const [editHip, setEditHip] = useState('');
  const [editBicep, setEditBicep] = useState('');
  const [editThigh, setEditThigh] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    setLoading(true);
    if (user?.id) {
      const data = await fetchUserProfileData(user.id);
      setProfile(data);
      if (data) {
        setEditName(data.full_name || '');
        if (data.full_name) setUserName(data.full_name);
        setEditHeight(String(data.height_cm || ''));
        setEditWeight(String(data.weight_kg || ''));
        setEditChest(String(data.chest_cm || ''));
        setEditWaist(String(data.waist_cm || ''));
        setEditHip(String(data.hip_cm || ''));
        setEditBicep(String(data.bicep_cm || ''));
        setEditThigh(String(data.thigh_cm || ''));
      }
      const history = await fetchUserProgressCheckIns(user.id);
      setCheckIns(history);
    }
    setLoading(false);
  };

  const handleLinkTrainer = async () => {
    if (!user?.id || !trainerCodeInput.trim()) return;
    setLinkingTrainer(true);
    const res = await linkClientToTrainerByCode(user.id, trainerCodeInput);
    setLinkingTrainer(false);
    if (res.success) {
      Alert.alert('Trainer Linked! 🏋️', `You are now paired with ${res.trainerName}.`);
      setTrainerCodeInput('');
      loadProfileData();
    } else {
      Alert.alert('Trainer Code Error', res.error || 'Failed to link trainer.');
    }
  };

  const handleRemoveTrainer = async () => {
    Alert.alert(
      'Remove Trainer',
      'Are you sure you want to remove your trainer? You will no longer share live workout & macro logs with them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setLinkingTrainer(true);
            await removeClientTrainerLink(user.id);
            setLinkingTrainer(false);
            Alert.alert('Trainer Removed', 'Your trainer link has been detached.');
            loadProfileData();
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    await saveUserProfileData(user.id, {
      full_name: editName,
      height_cm: editHeight,
      weight_kg: editWeight,
      chest_cm: editChest,
      waist_cm: editWaist,
      hip_cm: editHip,
      bicep_cm: editBicep,
      thigh_cm: editThigh,
    });

    if (editName.trim()) setUserName(editName.trim());

    if (trainerCodeInput.trim()) {
      const res = await linkClientToTrainerByCode(user.id, trainerCodeInput);
      if (res.success) {
        Alert.alert('Trainer Linked! 🏋️', `You are now paired with ${res.trainerName}.`);
        setTrainerCodeInput('');
      } else {
        Alert.alert('Trainer Code Warning', res.error || 'Could not link trainer code.');
      }
    }

    setSaving(false);
    setEditModalVisible(false);
    loadProfileData();
  };

  const handleAddProgressPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Media library access is needed to pick a progress photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri && user?.id) {
      const today = new Date().toISOString().split('T')[0];
      await saveProgressCheckIn({
        user_id: user.id,
        check_in_date: today,
        weight_kg: Number(profile?.weight_kg || 75),
        photo_uri: result.assets[0].uri,
        is_starred: true, // Auto-star new uploaded photos
      });
      Alert.alert('Progress Photo Saved 📸', 'Photo uploaded and starred (preserved from 90-day cleanup)!');
      loadProfileData();
    }
  };

  const toggleStarCheckIn = async (checkInId: string, currentStarred: boolean) => {
    await supabase
      .from('progress_check_ins')
      .update({ is_starred: !currentStarred })
      .eq('id', checkInId);

    setCheckIns((prev) =>
      prev.map((c) => (c.id === checkInId ? { ...c, is_starred: !currentStarred } : c))
    );
  };

  const displayName = profile?.full_name || userName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User Profile';

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="User Profile" subtitle="Your Body Metrics & Personal Bests" />

      {/* Primary Profile Card */}
      <NeumorphicView variant="goldAccent" className="p-6 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-start mb-4">
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text className={`text-2xl font-black ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{displayName}</Text>
            <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{user?.email}</Text>
            <View className={`px-2.5 py-0.5 rounded-full mt-2 self-start border ${
              isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/50 border-gold-bright/30'
            }`}>
              <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                Goal: {profile?.weight_goal || 'Recomposition'}
              </Text>
            </View>
          </View>

          <NeumorphicButton title="Edit Profile" variant="gold" size="sm" onPress={() => setEditModalVisible(true)} />
        </View>

        {/* Height & Weight grid */}
        <View className="flex-row space-x-3 mt-2">
          <View className={`flex-1 p-3 rounded-2xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-dark/40 border-deepGreen-border'
          }`}>
            <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Height</Text>
            <Text className={`text-lg font-black font-mono mt-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              {profile?.height_cm || 178} cm
            </Text>
          </View>

          <View className={`flex-1 p-3 rounded-2xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-dark/40 border-deepGreen-border'
          }`}>
            <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Weight</Text>
            <Text className={`text-lg font-black font-mono mt-0.5 ${isLight ? 'text-[#C5A028]' : 'text-gold-bright'}`}>
              {profile?.weight_kg || 75} kg
            </Text>
          </View>

          <View className={`flex-1 p-3 rounded-2xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-dark/40 border-deepGreen-border'
          }`}>
            <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Sex</Text>
            <Text className={`text-lg font-black mt-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              {profile?.sex || 'Male'}
            </Text>
          </View>
        </View>
      </NeumorphicView>

      {/* Trainer Management Card */}
      {profile?.linked_trainer ? (
        <NeumorphicView variant="goldAccent" className="p-5 mb-6 rounded-2xl">
          <View className="flex-row justify-between items-center mb-2">
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                My Personal Coach
              </Text>
              <Text className={`text-xl font-black mt-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                {profile.linked_trainer.full_name || profile.linked_trainer.email}
              </Text>
              <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{profile.linked_trainer.email}</Text>
            </View>
            <NeumorphicButton
              title="Remove Trainer"
              variant="green"
              size="sm"
              onPress={handleRemoveTrainer}
              disabled={linkingTrainer}
            />
          </View>
          <Text className={`text-xs mt-2 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
            Your coach can monitor your daily workouts, macro logs, and assign custom workout splits.
          </Text>
        </NeumorphicView>
      ) : (
        <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
          <Text className={`text-base font-bold mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Personal Trainer</Text>
          <Text className={`text-xs mb-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
            Add a trainer using their unique code to share live logs and receive custom workout plans.
          </Text>
          <View className="space-y-3">
            <NeumorphicInput
              label="Trainer Code"
              placeholder="e.g. TR-8K92"
              value={trainerCodeInput}
              onChangeText={setTrainerCodeInput}
              autoCapitalize="characters"
            />
            <NeumorphicButton
              title={linkingTrainer ? 'Linking...' : '+ Add Trainer'}
              variant="gold"
              size="md"
              onPress={handleLinkTrainer}
              disabled={linkingTrainer || !trainerCodeInput.trim()}
              className="w-full"
            />
          </View>
        </NeumorphicView>
      )}

      {/* Body Measurements */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <Text className={`text-base font-bold mb-3 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Body Circumferences (cm)</Text>
        <View className="flex-row flex-wrap -mx-1">
          {[
            { label: 'Chest', val: profile?.chest_cm || '98' },
            { label: 'Waist', val: profile?.waist_cm || '82' },
            { label: 'Hips', val: profile?.hip_cm || '95' },
            { label: 'Biceps', val: profile?.bicep_cm || '36' },
            { label: 'Thighs', val: profile?.thigh_cm || '58' },
          ].map((item) => (
            <View key={item.label} className="w-1/3 p-1 mb-2">
              <NeumorphicView variant="inset" className="p-3 items-center rounded-2xl">
                <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{item.label}</Text>
                <Text className={`text-base font-black font-mono mt-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{item.val} cm</Text>
              </NeumorphicView>
            </View>
          ))}
        </View>
      </NeumorphicView>

      {/* Personal Bests (1RMs) */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <Text className={`text-base font-bold mb-3 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Personal Bests (Estimated 1RMs)
        </Text>

        <View className="flex-row space-x-3 mb-3">
          <View className="flex-1">
            <NeumorphicInput label="Squat (kg)" value={squat1RM} onChangeText={setSquat1RM} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <NeumorphicInput label="Bench Press (kg)" value={bench1RM} onChangeText={setBench1RM} keyboardType="numeric" />
          </View>
        </View>

        <View className="flex-row space-x-3">
          <View className="flex-1">
            <NeumorphicInput label="Deadlift (kg)" value={deadlift1RM} onChangeText={setDeadlift1RM} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <NeumorphicInput label="OH Press (kg)" value={ohp1RM} onChangeText={setOhp1RM} keyboardType="numeric" />
          </View>
        </View>
      </NeumorphicView>

      {/* Progress Tracking & Photos */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-center mb-3">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
            Progress Check-Ins ({checkIns.length})
          </Text>
          <NeumorphicButton title="+ Photo Check-In" variant="gold" size="sm" onPress={handleAddProgressPhoto} />
        </View>
        <Text className={`text-xs mb-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
          Star photos to preserve them indefinitely beyond the 90-day automatic cloud storage cleanup.
        </Text>

        {checkIns.length === 0 ? (
          <Text className={`text-xs text-center py-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
            No check-ins logged yet. Add your first progress photo!
          </Text>
        ) : (
          checkIns.map((c) => (
            <View
              key={c.id || c.check_in_date}
              className={`py-3 flex-row justify-between items-center border-b ${
                isLight ? 'border-slate-200' : 'border-deepGreen-border'
              }`}
            >
              <View className="flex-row items-center space-x-3">
                <TouchableOpacity onPress={() => toggleStarCheckIn(c.id, c.is_starred)}>
                  <Text className="text-xl">{c.is_starred ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
                <View>
                  <Text className={`font-bold text-sm font-mono ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{c.check_in_date}</Text>
                  <Text className={`text-xs font-mono ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                    {c.weight_kg} kg • {c.is_starred ? 'Starred (Preserved)' : 'Subject to 90d cleanup'}
                  </Text>
                </View>
              </View>

              {c.photo_uri ? (
                <Image source={{ uri: c.photo_uri }} className="w-12 h-12 rounded-xl border border-slate-300" />
              ) : (
                <View className={`px-2.5 py-1 rounded-full ${isLight ? 'bg-slate-100' : 'bg-deepGreen-elevated'}`}>
                  <Text className={`text-xs font-mono ${isLight ? 'text-[#0F291E]' : 'text-sage'}`}>{c.weight_kg} kg</Text>
                </View>
              )}
            </View>
          ))
        )}
      </NeumorphicView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/80 p-5">
          <NeumorphicView variant="goldAccent" className="p-6 w-full max-w-sm rounded-3xl">
            <Text className={`text-xl font-bold mb-4 text-center ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              Edit Profile & Metrics
            </Text>
            
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
              <NeumorphicInput label="Full Name" value={editName} onChangeText={setEditName} />
              <View className="flex-row space-x-2">
                <View className="flex-1"><NeumorphicInput label="Height (cm)" value={editHeight} onChangeText={setEditHeight} keyboardType="numeric" /></View>
                <View className="flex-1"><NeumorphicInput label="Weight (kg)" value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" /></View>
              </View>

              {!profile?.linked_trainer && (
                <View className="mt-3">
                  <NeumorphicInput
                    label="Add Trainer Code (Optional)"
                    placeholder="e.g. TR-8K92"
                    value={trainerCodeInput}
                    onChangeText={setTrainerCodeInput}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              <Text className={`text-xs font-bold mt-3 mb-1 uppercase ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                Circumferences (cm)
              </Text>
              <View className="flex-row space-x-2">
                <View className="flex-1"><NeumorphicInput label="Chest" value={editChest} onChangeText={setEditChest} keyboardType="numeric" /></View>
                <View className="flex-1"><NeumorphicInput label="Waist" value={editWaist} onChangeText={setEditWaist} keyboardType="numeric" /></View>
              </View>
              <View className="flex-row space-x-2">
                <View className="flex-1"><NeumorphicInput label="Hips" value={editHip} onChangeText={setEditHip} keyboardType="numeric" /></View>
                <View className="flex-1"><NeumorphicInput label="Biceps" value={editBicep} onChangeText={setEditBicep} keyboardType="numeric" /></View>
                <View className="flex-1"><NeumorphicInput label="Thighs" value={editThigh} onChangeText={setEditThigh} keyboardType="numeric" /></View>
              </View>
            </ScrollView>

            <View className="flex-row space-x-3 mt-4">
              <View className="flex-1">
                <NeumorphicButton title="Cancel" variant="green" onPress={() => setEditModalVisible(false)} />
              </View>
              <View className="flex-1">
                <NeumorphicButton title={saving ? 'Saving...' : 'Save'} variant="gold" onPress={handleSaveProfile} disabled={saving} />
              </View>
            </View>
          </NeumorphicView>
        </View>
      </Modal>
    </ScrollView>
  );
}



