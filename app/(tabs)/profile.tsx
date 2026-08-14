import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { CalendarLogModal } from '../../components/CalendarLogModal';
import { WeeklyProfileAnalytics } from '../../components/WeeklyProfileAnalytics';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore, CheckinPhoto } from '../../store/progressStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useTheme } from '../../lib/theme';
import {
  formatWeight,
  formatLength,
  formatHeight,
  formatVolume,
  getWeightUnitLabel,
  getLengthUnitLabel,
} from '../../lib/units';

export default function ProfileScreen() {
  const { profile, role, trainerCode, linkedTrainerId, setProfile, unitSystem, unlinkTrainer, linkTrainer } = useAuthStore();
  const theme = useTheme();
  const {
    weightHistory,
    checkinPhotos,
    checkinLogs,
    latestMeasurements,
    getCalculatedMetrics,
    addWeightLog,
    updateMeasurements,
    addCheckinPhoto,
    deleteCheckinPhoto,
    addCheckinLog,
    deleteCheckinLog,
  } = useProgressStore();
  const personalRecords = useWorkoutStore((state) => state.personalRecords);
  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<{ id: string; date: string; photoUrls: string[]; note?: string } | null>(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState(0);
  const [linkTrainerModalVisible, setLinkTrainerModalVisible] = useState(false);
  const [trainerCodeInput, setTrainerCodeInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [expandedTimelineIds, setExpandedTimelineIds] = useState<string[]>(['PHOTO_pic_1']);

  const toggleTimelineExpand = (id: string) => {
    setExpandedTimelineIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
  ];

  const handleSelectAvatar = (url?: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      avatarUrl: url,
    });
    setAvatarModalVisible(false);
    Alert.alert('Profile Picture Updated', 'Your profile picture has been updated!');
  };

  const handleLinkTrainer = async () => {
    if (!trainerCodeInput.trim()) {
      Alert.alert('Error', 'Please enter a trainer code.');
      return;
    }
    setIsLinking(true);
    const success = await linkTrainer(trainerCodeInput.trim().toUpperCase());
    setIsLinking(false);
    if (success) {
      Alert.alert('Success', 'Successfully linked with trainer.');
      setLinkTrainerModalVisible(false);
      setTrainerCodeInput('');
    }
  };

  // Check-In Modal state (All optional, start empty with placeholders showing current values)
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [neckInput, setNeckInput] = useState('');
  const [waistInput, setWaistInput] = useState('');
  const [hipsInput, setHipsInput] = useState('');
  const [chestInput, setChestInput] = useState('');
  const [bicepsLInput, setBicepsLInput] = useState('');
  const [bicepsRInput, setBicepsRInput] = useState('');
  const [thighsLInput, setThighsLInput] = useState('');
  const [thighsRInput, setThighsRInput] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const stats = getCalculatedMetrics({
    heightCm: profile?.heightCm || 175,
    weightKg: weightHistory[0]?.weightKg || 75,
    sex: profile?.sex || 'MALE',
    neckCm: latestMeasurements?.neckCm || 39,
    waistCm: latestMeasurements?.waistCm || 84,
    hipsCm: latestMeasurements?.hipsCm || 98,
    activityLevel: profile?.activityLevel || 'MODERATELY_ACTIVE',
  });

  const handlePickPhotos = async () => {
    if (uploadedPhotos.length >= 3) {
      Alert.alert('Photo Limit Reached', 'You can upload up to 3 transformation check-in photos per entry.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access photo library is required.');
        return;
      }
      const remainingSlots = 3 - uploadedPhotos.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a: ImagePicker.ImagePickerAsset) => a.uri).slice(0, remainingSlots);
        setUploadedPhotos((prev) => [...prev, ...newUris].slice(0, 3));
      }
    } catch (e) {
      console.warn('ImagePicker error:', e);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== index));
  };

  const handleSaveCheckin = () => {
    const userId = profile?.id;
    if (!userId) {
      Alert.alert('Error', 'User profile not found.');
      return;
    }

    const parsedHeight = parseFloat(heightInput);
    const parsedWeight = parseFloat(weightInput);
    const parsedNeck = parseFloat(neckInput);
    const parsedWaist = parseFloat(waistInput);
    const parsedHips = parseFloat(hipsInput);
    const parsedChest = parseFloat(chestInput);
    const parsedBicepsL = parseFloat(bicepsLInput);
    const parsedBicepsR = parseFloat(bicepsRInput);
    const parsedThighsL = parseFloat(thighsLInput);
    const parsedThighsR = parseFloat(thighsRInput);

    const updatedSummaryList: string[] = [];
    const measurementsToUpdate: Record<string, number> = {};
    if (!isNaN(parsedNeck) && parsedNeck > 0) measurementsToUpdate.neckCm = parsedNeck;
    if (!isNaN(parsedWaist) && parsedWaist > 0) measurementsToUpdate.waistCm = parsedWaist;
    if (!isNaN(parsedHips) && parsedHips > 0) measurementsToUpdate.hipsCm = parsedHips;
    if (!isNaN(parsedChest) && parsedChest > 0) measurementsToUpdate.chestCm = parsedChest;
    if (!isNaN(parsedBicepsL) && parsedBicepsL > 0) measurementsToUpdate.bicepsLCm = parsedBicepsL;
    if (!isNaN(parsedBicepsR) && parsedBicepsR > 0) measurementsToUpdate.bicepsRCm = parsedBicepsR;
    if (!isNaN(parsedThighsL) && parsedThighsL > 0) measurementsToUpdate.thighsLCm = parsedThighsL;
    if (!isNaN(parsedThighsR) && parsedThighsR > 0) measurementsToUpdate.thighsRCm = parsedThighsR;

    // Log complete check-in entry with all updated fields
    addCheckinLog(userId, {
      weightKg: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
      heightCm: !isNaN(parsedHeight) && parsedHeight > 0 ? parsedHeight : undefined,
      photoUrl: uploadedPhotos.length > 0 ? uploadedPhotos[0] : undefined,
      photoUrls: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
      measurements: Object.keys(measurementsToUpdate).length > 0 ? measurementsToUpdate : undefined,
      note: 'Transformation Check-In',
    });

    if (!isNaN(parsedWeight) && parsedWeight > 0) {
      updatedSummaryList.push(`${parsedWeight} kg`);
    }

    if (Object.keys(measurementsToUpdate).length > 0) {
      updatedSummaryList.push('Body Measurements');
    }

    if (!isNaN(parsedHeight) && parsedHeight > 0 && profile) {
      setProfile({
        ...profile,
        heightCm: parsedHeight,
      });
      updatedSummaryList.push(`Height: ${parsedHeight}cm`);
    }

    if (uploadedPhotos.length > 0) {
      updatedSummaryList.push(`${uploadedPhotos.length} Photo(s)`);
    }

    // Collect updated values for Trainer live feed activity card
    const liveFeedUpdatedValues: { label: string; value: string }[] = [];
    if (!isNaN(parsedWeight) && parsedWeight > 0) {
      liveFeedUpdatedValues.push({ label: 'Body Weight', value: `${parsedWeight} kg` });
    }
    if (!isNaN(parsedHeight) && parsedHeight > 0) {
      liveFeedUpdatedValues.push({ label: 'Height', value: `${parsedHeight} cm` });
    }
    if (measurementsToUpdate.bicepsLCm) {
      liveFeedUpdatedValues.push({ label: 'Biceps L', value: `${measurementsToUpdate.bicepsLCm} cm` });
    }
    if (measurementsToUpdate.bicepsRCm) {
      liveFeedUpdatedValues.push({ label: 'Biceps R', value: `${measurementsToUpdate.bicepsRCm} cm` });
    }
    if (measurementsToUpdate.neckCm) {
      liveFeedUpdatedValues.push({ label: 'Neck', value: `${measurementsToUpdate.neckCm} cm` });
    }
    if (measurementsToUpdate.chestCm) {
      liveFeedUpdatedValues.push({ label: 'Chest', value: `${measurementsToUpdate.chestCm} cm` });
    }
    if (measurementsToUpdate.waistCm) {
      liveFeedUpdatedValues.push({ label: 'Waist', value: `${measurementsToUpdate.waistCm} cm` });
    }
    if (measurementsToUpdate.hipsCm) {
      liveFeedUpdatedValues.push({ label: 'Hips', value: `${measurementsToUpdate.hipsCm} cm` });
    }
    if (measurementsToUpdate.thighsLCm) {
      liveFeedUpdatedValues.push({ label: 'Thighs L', value: `${measurementsToUpdate.thighsLCm} cm` });
    }
    if (measurementsToUpdate.thighsRCm) {
      liveFeedUpdatedValues.push({ label: 'Thighs R', value: `${measurementsToUpdate.thighsRCm} cm` });
    }
    if (uploadedPhotos.length > 0) {
      liveFeedUpdatedValues.push({ label: 'Photo Upload', value: 'Transformation Photo Attached' });
    }

    addLiveFeedEvent({
      clientId: profile?.id || 'usr_1',
      clientName: profile?.fullName || 'Client',
      eventType: 'UPLOAD_CHECKIN',
      actionVerb: 'logged',
      targetTitle: 'Transformation Check-In',
      tags: [
        { label: 'Check-In', type: 'success' },
        { label: 'Transformation', type: 'success' },
      ],
      photoUrl: uploadedPhotos.length > 0 ? uploadedPhotos[0] : undefined,
      updatedValues: liveFeedUpdatedValues.length > 0 ? liveFeedUpdatedValues : [{ label: 'Check-In Update', value: 'Transformation Logged' }],
      timestamp: new Date().toISOString(),
    });

    // Reset optional input fields back to empty (placeholders display current values)
    setHeightInput('');
    setWeightInput('');
    setNeckInput('');
    setWaistInput('');
    setHipsInput('');
    setChestInput('');
    setBicepsLInput('');
    setBicepsRInput('');
    setThighsLInput('');
    setThighsRInput('');

    setCheckinModalVisible(false);
    Alert.alert(
      'Check-In Complete',
      'Your transformation check-in has been logged. Your health metrics have been updated and your trainer has been notified!'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 👤 COMPACT HORIZONTAL PROFILE HEADER */}
        <View
          style={[
            styles.profileHeaderCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          {/* Avatar (Tappable to change profile picture) */}
          <TouchableOpacity
            style={[
              styles.avatarGoldBorder,
              {
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
                backgroundColor: theme.cardInner,
              },
            ]}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.8}
          >
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.centeredAvatarImg} />
            ) : (
              <View
                style={[
                  styles.centeredAvatarPlaceholder,
                  { backgroundColor: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.centeredAvatarText,
                    { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                  ]}
                >
                  {(profile?.fullName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.avatarEditBadge,
                {
                  backgroundColor: theme.cardInner,
                  borderColor: theme.isDark ? theme.accentGold : theme.primary,
                },
              ]}
            >
              <Ionicons name="camera-outline" size={13} color={theme.text} />
            </View>
          </TouchableOpacity>

          {/* Identity Info */}
          <View style={styles.profileHeaderInfo}>
            <Text style={[styles.heroNameText, { color: theme.text }]}>{profile?.fullName || 'Alex Rivers'}</Text>
            <Text style={[styles.heroSubText, { color: theme.textSecondary }]}>
              {role === 'TRAINER' ? 'Elite Conditioning Specialist' : 'Fitness Enthusiast'}
            </Text>

            {/* Trainer Code Chip (Trainer Account) */}
            {role === 'TRAINER' && (
              <View
                style={[
                  styles.trainerCodeChip,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.borderGold,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trainerCodeChipLabel, { color: theme.accentGold }]}>YOUR TRAINER CODE</Text>
                  <Text style={[styles.trainerCodeChipVal, { color: theme.text }]}>Code: {trainerCode || 'TRN-882'}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.trainerCodeCopyBtn,
                    {
                      backgroundColor: theme.cardAlt,
                      borderColor: theme.borderGold,
                    },
                  ]}
                  onPress={() => {
                    Alert.alert('Copied!', `Trainer code "${trainerCode || 'TRN-882'}" copied to clipboard.`);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={13} color={theme.accentGold} />
                </TouchableOpacity>
              </View>
            )}

            {/* Linked Trainer Chip */}
            {linkedTrainerId ? (
              <View
                style={[
                  styles.linkedTrainerChip,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.linkedTrainerChipLabel,
                      { color: theme.isDark ? theme.accentGold : theme.primary },
                    ]}
                  >
                    LINKED TRAINER
                  </Text>
                  <Text style={[styles.linkedTrainerChipName, { color: theme.text }]}>
                    Active Trainer ({linkedTrainerId})
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unlinkTrainerBtn}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      const confirmUnlink = window.confirm('Are you sure you want to unlink from your trainer?');
                      if (confirmUnlink) {
                        unlinkTrainer().then(() => {
                          Alert.alert('Unlinked', 'Trainer unlinked successfully.');
                        });
                      }
                    } else {
                      Alert.alert(
                        'Unlink Trainer',
                        'Are you sure you want to unlink from your trainer?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Unlink',
                            style: 'destructive',
                            onPress: async () => {
                              await unlinkTrainer();
                              Alert.alert('Unlinked', 'Trainer unlinked successfully.');
                            },
                          },
                        ]
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.linkedTrainerChip,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.linkedTrainerChipLabel, { color: theme.textMuted }]}>
                    NO TRAINER LINKED
                  </Text>
                  <Text style={[styles.linkedTrainerChipName, { color: theme.textSecondary, fontSize: 12 }]}>
                    Enter a trainer code to link with your coach
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.linkTrainerBtn,
                    {
                      backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                    },
                  ]}
                  onPress={() => setLinkTrainerModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.linkTrainerBtnText, { color: theme.isDark ? '#0A1A12' : '#FFFFFF' }]}>
                    Link
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ACTION PILL ROW */}
        <View style={styles.actionPillRow}>
          <TouchableOpacity
            style={[
              styles.calendarPillBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
                ...theme.shadowButton,
              },
            ]}
            onPress={() => setCalendarModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.calendarPillText,
                { color: theme.isDark ? theme.accentGold : theme.primary },
              ]}
            >
              Log Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkinPillBtn,
              {
                backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                ...theme.shadowButton,
              },
            ]}
            onPress={() => setCheckinModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.checkinPillText,
                { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
              ]}
            >
              Check-In
            </Text>
          </TouchableOpacity>
        </View>

        {/* 📊 PERFORMANCE ANALYTICS (PRESERVED CHART) */}
        <WeeklyProfileAnalytics />

        {/* 🩺 HEALTH METRICS 2X2 GRID */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Health Metrics</Text>

          <View style={styles.metricsGrid}>
            {/* BMI */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricLabel, { color: theme.accentGold }]}>BMI</Text>
              <Text style={[styles.metricVal, { color: theme.text }]}>{stats.bmi}</Text>
              <Text style={[styles.metricSub, { color: theme.textSecondary }]}>{stats.bmiCategory}</Text>
            </View>

            {/* BODY FAT % */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricLabel, { color: theme.accentGold }]}>BODY FAT %</Text>
              <Text style={[styles.metricVal, { color: theme.text }]}>
                {stats.estimatedBodyFatPct ? `${stats.estimatedBodyFatPct}%` : '12%'}
              </Text>
              <Text style={[styles.metricSub, { color: theme.textSecondary }]}>U.S. Navy Method</Text>
            </View>

            {/* BMR */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricLabel, { color: theme.accentGold }]}>BMR</Text>
              <Text style={[styles.metricVal, { color: theme.text }]}>{stats.bmrKcal}</Text>
              <Text style={[styles.metricSub, { color: theme.textSecondary }]}>kcal/day</Text>
            </View>

            {/* TDEE TARGET */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricLabel, { color: theme.accentGold }]}>TDEE TARGET</Text>
              <Text style={[styles.metricVal, { color: theme.text }]}>{stats.tdeeKcal}</Text>
              <Text style={[styles.metricSub, { color: theme.textSecondary }]}>Maintenance</Text>
            </View>
          </View>
        </View>

        {/* 📏 MEASUREMENTS SECTION (2-COLUMN GRID) */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Measurements</Text>

          <View style={styles.measurementsGrid}>
            {/* Height */}
            <View
              style={[
                styles.measureTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <View style={styles.measureTileHeader}>
                <Ionicons name="resize-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>HEIGHT</Text>
              </View>
              <Text style={[styles.measureTileVal, { color: theme.text }]}>
                {formatHeight(profile?.heightCm || 185, unitSystem)}
              </Text>
            </View>

            {/* Weight */}
            <View
              style={[
                styles.measureTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <View style={styles.measureTileHeader}>
                <Ionicons name="scale-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>WEIGHT</Text>
              </View>
              <Text style={[styles.measureTileVal, { color: theme.text }]}>
                {formatWeight(weightHistory[0]?.weightKg || profile?.weightKg || 70, unitSystem)}
              </Text>
            </View>

            {/* Neck */}
            {latestMeasurements?.neckCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>NECK</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements.neckCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Chest */}
            {latestMeasurements?.chestCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>CHEST</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements.chestCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Waist */}
            {latestMeasurements?.waistCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>WAIST</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements.waistCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Hips */}
            {latestMeasurements?.hipsCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>HIPS</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements.hipsCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Biceps L */}
            {(latestMeasurements?.bicepsLCm || latestMeasurements?.bicepsCm) ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="fitness-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>BICEPS (L)</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements?.bicepsLCm || latestMeasurements?.bicepsCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Biceps R */}
            {(latestMeasurements?.bicepsRCm || latestMeasurements?.bicepsCm) ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="fitness-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>BICEPS (R)</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements?.bicepsRCm || latestMeasurements?.bicepsCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Thighs L */}
            {(latestMeasurements?.thighsLCm || latestMeasurements?.thighsCm) ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="walk-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>THIGHS (L)</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements?.thighsLCm || latestMeasurements?.thighsCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Thighs R */}
            {(latestMeasurements?.thighsRCm || latestMeasurements?.thighsCm) ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="walk-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>THIGHS (R)</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(latestMeasurements?.thighsRCm || latestMeasurements?.thighsCm, unitSystem)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* PERSONAL RECORDS — KPI CARDS */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Records</Text>

          <View style={styles.prGrid}>
            {/* Bench Press */}
            <View
              style={[
                styles.prKpiCard,
                { backgroundColor: theme.cardInner, borderColor: theme.borderGold },
              ]}
            >
              <View style={[styles.prKpiIconWrap, { backgroundColor: theme.isDark ? '#3B1A08' : '#FEF3C7' }]}>
                <Ionicons name="barbell-outline" size={16} color={theme.accentGold} />
              </View>
              <Text style={[styles.prKpiLabel, { color: theme.textSecondary }]}>BENCH PRESS</Text>
              <Text style={[styles.prKpiValue, { color: theme.accentGold }]}>
                {formatWeight(personalRecords['ex_01']?.oneRmKg, unitSystem)}
              </Text>
              <Text style={[styles.prKpiUnit, { color: theme.textMuted }]}>1RM Max</Text>
            </View>

            {/* Squat */}
            <View
              style={[
                styles.prKpiCard,
                { backgroundColor: theme.cardInner, borderColor: theme.borderGold },
              ]}
            >
              <View style={[styles.prKpiIconWrap, { backgroundColor: theme.isDark ? '#3B1A08' : '#FEF3C7' }]}>
                <Ionicons name="walk-outline" size={16} color={theme.accentGold} />
              </View>
              <Text style={[styles.prKpiLabel, { color: theme.textSecondary }]}>SQUAT</Text>
              <Text style={[styles.prKpiValue, { color: theme.accentGold }]}>
                {formatWeight(personalRecords['ex_07']?.oneRmKg, unitSystem)}
              </Text>
              <Text style={[styles.prKpiUnit, { color: theme.textMuted }]}>1RM Max</Text>
            </View>

            {/* Deadlift */}
            <View
              style={[
                styles.prKpiCard,
                { backgroundColor: theme.cardInner, borderColor: theme.borderGold },
              ]}
            >
              <View style={[styles.prKpiIconWrap, { backgroundColor: theme.isDark ? '#3B1A08' : '#FEF3C7' }]}>
                <Ionicons name="fitness-outline" size={16} color={theme.accentGold} />
              </View>
              <Text style={[styles.prKpiLabel, { color: theme.textSecondary }]}>DEADLIFT</Text>
              <Text style={[styles.prKpiValue, { color: theme.accentGold }]}>
                {formatWeight(personalRecords['ex_08']?.oneRmKg, unitSystem)}
              </Text>
              <Text style={[styles.prKpiUnit, { color: theme.textMuted }]}>1RM Max</Text>
            </View>
          </View>
        </View>

        {/* CHECK-IN JOURNAL (VERTICAL TIMELINE LAYOUT MATCHING DESIGN) */}
        {(() => {
          const sortedLogs = [...checkinLogs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          return (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  ...theme.shadow,
                },
              ]}
            >
              <View style={styles.journalHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Check-In Journal</Text>
                <TouchableOpacity
                  style={[
                    styles.addCheckinGoldBtn,
                    { backgroundColor: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                  onPress={() => setCheckinModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
                </TouchableOpacity>
              </View>

              {/* Vertical Timeline */}
              <View style={styles.timelineContainer}>
                <View style={[styles.verticalTimelineLine, { backgroundColor: theme.border }]} />

                {sortedLogs.map((log, index) => {
                  const isTopNode = index === 0;
                  const idKey = `log_${log.id}`;
                  const isExpanded = expandedTimelineIds.includes(idKey);
                  const formattedDate = new Date(log.date)
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    .toUpperCase();

                  const logWeight = log.weightKg || profile?.weightKg || 70;
                  const logHeight = log.heightCm || profile?.heightCm || 175;
                  const logStats = {
                    heightCm: logHeight,
                    weightKg: logWeight,
                    sex: profile?.sex || 'MALE',
                    ageYears: 26,
                    neckCm: log.measurements?.neckCm || latestMeasurements?.neckCm || profile?.bodyMeasurements?.neckCm,
                    waistCm: log.measurements?.waistCm || latestMeasurements?.waistCm || profile?.bodyMeasurements?.waistCm,
                    hipsCm: log.measurements?.hipsCm || latestMeasurements?.hipsCm || profile?.bodyMeasurements?.hipsCm,
                    activityLevel: profile?.activityLevel || 'MODERATELY_ACTIVE',
                  };
                  const metrics = getCalculatedMetrics(logStats);

                  // Extract all fields updated in this specific check-in
                  const updatedFields: { label: string; value: string }[] = [];
                  if (log.weightKg) {
                    updatedFields.push({ label: 'Body Weight', value: `${log.weightKg} kg` });
                  }
                  if (log.heightCm) {
                    updatedFields.push({ label: 'Height', value: `${log.heightCm} cm` });
                  }
                  if (log.measurements?.bicepsLCm) {
                    updatedFields.push({ label: 'Biceps L', value: `${log.measurements.bicepsLCm} cm` });
                  }
                  if (log.measurements?.bicepsRCm) {
                    updatedFields.push({ label: 'Biceps R', value: `${log.measurements.bicepsRCm} cm` });
                  }
                  if (log.measurements?.neckCm) {
                    updatedFields.push({ label: 'Neck', value: `${log.measurements.neckCm} cm` });
                  }
                  if (log.measurements?.chestCm) {
                    updatedFields.push({ label: 'Chest', value: `${log.measurements.chestCm} cm` });
                  }
                  if (log.measurements?.waistCm) {
                    updatedFields.push({ label: 'Waist', value: `${log.measurements.waistCm} cm` });
                  }
                  if (log.measurements?.hipsCm) {
                    updatedFields.push({ label: 'Hips', value: `${log.measurements.hipsCm} cm` });
                  }
                  if (log.measurements?.thighsLCm) {
                    updatedFields.push({ label: 'Thighs L', value: `${log.measurements.thighsLCm} cm` });
                  }
                  if (log.measurements?.thighsRCm) {
                    updatedFields.push({ label: 'Thighs R', value: `${log.measurements.thighsRCm} cm` });
                  }
                  if (log.photoUrl) {
                    updatedFields.push({ label: 'Photo Upload', value: 'Transformation Photo Attached' });
                  }

                  const summarySubtext = updatedFields.length > 0
                    ? updatedFields.map((f) => f.label).join(' • ')
                    : 'Check-In Update';

                  return (
                    <View key={idKey} style={styles.timelineRow}>
                      {/* Timeline Node Icon */}
                      <View
                        style={[
                          styles.timelineNode,
                          {
                            backgroundColor: isTopNode
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.cardInner,
                            borderColor: isTopNode
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.border,
                            borderWidth: isTopNode ? 0 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={log.photoUrl ? 'camera-outline' : 'radio-button-on-outline'}
                          size={14}
                          color={
                            isTopNode
                              ? theme.isDark
                                ? '#0A1A12'
                                : '#FFFFFF'
                              : theme.isDark
                                ? theme.accentGold
                                : theme.primary
                          }
                        />
                      </View>

                      {/* Timeline Card Container */}
                      <View
                        style={[
                          styles.timelineCard,
                          {
                            backgroundColor: theme.cardInner,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        {/* Main Header Row: [Date] [Image (if any)] [drop down] */}
                        <TouchableOpacity
                          style={styles.timelineCardHeaderRow}
                          onPress={() => toggleTimelineExpand(idKey)}
                          activeOpacity={0.8}
                        >
                          {/* [Date] on Left */}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.timelineDateText, { color: theme.text }]}>
                              {formattedDate}
                            </Text>
                            <Text
                              style={[
                                styles.timelineSubText,
                                { color: theme.isDark ? theme.accentGold : theme.primary },
                              ]}
                              numberOfLines={1}
                            >
                              {summarySubtext}
                            </Text>
                          </View>

                          {/* [Image (if any)] in Center */}
                          {log.photoUrl && (
                            <TouchableOpacity
                              onPress={() => {
                                setViewingPhoto({ id: log.id, date: log.date, photoUrls: log.photoUrls?.length ? log.photoUrls : [log.photoUrl!], note: log.note });
                                setViewingPhotoIndex(0);
                              }}
                              activeOpacity={0.8}
                              style={{ marginHorizontal: 8 }}
                            >
                              <Image source={{ uri: log.photoUrl }} style={styles.timelineHeaderImg} />
                            </TouchableOpacity>
                          )}

                          {/* [drop down] Icon on Right */}
                          <View style={styles.chevronWrap}>
                            <Ionicons
                              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                              size={18}
                              color={theme.textSecondary}
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Expanded Dropdown Details Section */}
                        {isExpanded && (
                          <View style={[styles.dropdownDetails, { borderTopColor: theme.border }]}>
                            {/* Row 2: [Field [New Value]] - Only updated fields visible */}
                            <Text style={[styles.dropdownTitle, { color: theme.textSecondary }]}>UPDATED FIELDS & VALUES:</Text>

                            <View style={styles.fieldsGrid}>
                              {updatedFields.map((f, fIdx) => (
                                <View
                                  key={fIdx}
                                  style={[
                                    updatedFields.length === 1 ? styles.fieldBadgeFull : styles.fieldBadge,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                  ]}
                                >
                                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{f.label}</Text>
                                  <Text style={[styles.fieldVal, { color: theme.text }]}>{f.value}</Text>
                                </View>
                              ))}
                            </View>

                            {/* Row 3: UPDATED METRICS */}
                            <Text style={[styles.dropdownTitle, { color: theme.textSecondary, marginTop: 10 }]}>
                              UPDATED METRICS:
                            </Text>

                            <View style={[styles.calcMetricsBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                              <View style={styles.calcMetricCol}>
                                <Text style={[styles.calcMetricVal, { color: theme.text }]}>
                                  {metrics.bmi.toFixed(1)}
                                </Text>
                                <Text style={[styles.calcMetricLabel, { color: theme.textMuted }]}>BMI Index</Text>
                              </View>

                              <View style={[styles.calcMetricDivider, { backgroundColor: theme.border }]} />

                              <View style={styles.calcMetricCol}>
                                <Text style={[styles.calcMetricVal, { color: theme.text }]}>
                                  {metrics.estimatedBodyFatPct ? `${metrics.estimatedBodyFatPct.toFixed(1)}%` : '15.0%'}
                                </Text>
                                <Text style={[styles.calcMetricLabel, { color: theme.textMuted }]}>Est. Body Fat</Text>
                              </View>

                              <View style={[styles.calcMetricDivider, { backgroundColor: theme.border }]} />

                              <View style={styles.calcMetricCol}>
                                <Text style={[styles.calcMetricVal, { color: theme.text }]}>
                                  {Math.round(metrics.bmrKcal).toLocaleString()} kcal
                                </Text>
                                <Text style={[styles.calcMetricLabel, { color: theme.textMuted }]}>Daily BMR</Text>
                              </View>
                            </View>

                            {log.photoUrl && (
                              <TouchableOpacity
                                style={[
                                  styles.viewFullPhotoBtn,
                                  { backgroundColor: theme.isDark ? theme.accentGold : theme.primary },
                                ]}
                                onPress={() => {
                                  setViewingPhoto({ id: log.id, date: log.date, photoUrls: log.photoUrls?.length ? log.photoUrls : [log.photoUrl!], note: log.note });
                                  setViewingPhotoIndex(0);
                                }}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="expand-outline" size={14} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
                                <Text
                                  style={[
                                    styles.viewFullPhotoBtnText,
                                    { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                                  ]}
                                >
                                  Inspect Full Photo
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}
      </ScrollView>

      {/* CHECK-IN MODAL */}
      <Modal
        visible={checkinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Transformation Check-In</Text>
              <TouchableOpacity onPress={() => setCheckinModalVisible(false)}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubText, { color: theme.textSecondary }]}>
              Update your body stats & measurements below (all optional). Omitted fields retain previous values.
            </Text>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {/* Section 1: Basic Body Stats */}
              <Text style={[styles.sectionSubHeader, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                Basic Stats (Optional)
              </Text>
              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
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
                    value={heightInput}
                    onChangeText={setHeightInput}
                    placeholder={String(profile?.heightCm || 175)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Weight (kg)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder={String(weightHistory[0]?.weightKg || 75)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Section 2: Upper Body Measurements */}
              <Text style={[styles.sectionSubHeader, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                Upper Body (cm)
              </Text>
              <View style={styles.inputGridTriple}>
                <View style={styles.inputColTriple}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Neck</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={neckInput}
                    onChangeText={setNeckInput}
                    placeholder={String(latestMeasurements?.neckCm || 39)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputColTriple}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Chest</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={chestInput}
                    onChangeText={setChestInput}
                    placeholder={String(latestMeasurements?.chestCm || 102)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputColTriple}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Waist</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={waistInput}
                    onChangeText={setWaistInput}
                    placeholder={String(latestMeasurements?.waistCm || 84)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Biceps L (cm)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={bicepsLInput}
                    onChangeText={setBicepsLInput}
                    placeholder={String(latestMeasurements?.bicepsLCm || 37)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Biceps R (cm)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={bicepsRInput}
                    onChangeText={setBicepsRInput}
                    placeholder={String(latestMeasurements?.bicepsRCm || 37.5)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Section 3: Lower Body Measurements */}
              <Text style={[styles.sectionSubHeader, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                Core & Lower Body (cm)
              </Text>
              <View style={styles.inputGridTriple}>
                <View style={styles.inputColTriple}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hips</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={hipsInput}
                    onChangeText={setHipsInput}
                    placeholder={String(latestMeasurements?.hipsCm || 98)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputColTriple}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Thighs L</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={thighsLInput}
                    onChangeText={setThighsLInput}
                    placeholder={String(latestMeasurements?.thighsLCm || 58)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputColTriple}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Thighs R</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    value={thighsRInput}
                    onChangeText={setThighsRInput}
                    placeholder={String(latestMeasurements?.thighsRCm || 58.5)}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Section 4: Physique Photos */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Text style={[styles.sectionSubHeader, { color: theme.isDark ? theme.accentGold : theme.primary, marginTop: 0 }]}>
                  Physique Photos (Optional)
                </Text>
                <TouchableOpacity
                  style={[
                    styles.addPhotoBtn,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.isDark ? theme.accentGold : theme.primary,
                    },
                  ]}
                  onPress={handlePickPhotos}
                >
                  <Text
                    style={[
                      styles.addPhotoBtnText,
                      { color: theme.isDark ? theme.accentGold : theme.primary },
                    ]}
                  >
                    + Add Photo
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.photoUploadRow}>
                {uploadedPhotos.map((uri, idx) => (
                  <View key={idx} style={styles.uploadSlot}>
                    <Image source={{ uri }} style={styles.uploadSlotImg} />
                    <TouchableOpacity
                      style={styles.removePhotoBadge}
                      onPress={() => handleRemovePhoto(idx)}
                    >
                      <Ionicons name="close-outline" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {uploadedPhotos.length < 3 && (
                  <TouchableOpacity
                    style={[
                      styles.uploadSlotEmpty,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.isDark ? theme.accentGold : theme.primary,
                      },
                    ]}
                    onPress={handlePickPhotos}
                  >
                    <Ionicons name="camera-outline" size={20} color={theme.isDark ? theme.accentGold : theme.primary} />
                    <Text
                      style={[
                        styles.uploadSlotText,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      Upload
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setCheckinModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
                onPress={handleSaveCheckin}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                  ]}
                >
                  Update
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CALENDAR LOG MODAL */}
      <CalendarLogModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
      />

      {/* CHANGE PROFILE PICTURE MODAL */}
      <Modal
        visible={avatarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubText, { color: theme.textSecondary }]}>
              Select a photo preset or remove photo to use initials:
            </Text>

            <View style={styles.avatarPresetGrid}>
              {avatarPresets.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.avatarPresetSlot,
                    profile?.avatarUrl === uri && {
                      borderColor: theme.isDark ? theme.accentGold : theme.primary,
                    },
                  ]}
                  onPress={() => handleSelectAvatar(uri)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.avatarPresetImg} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.removeAvatarBtn,
                {
                  backgroundColor: theme.cardInner,
                  borderColor: theme.danger,
                },
              ]}
              onPress={() => handleSelectAvatar(undefined)}
              activeOpacity={0.8}
            >
              <Text style={[styles.removeAvatarBtnText, { color: theme.danger }]}>
                Remove Photo (Use Initials)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EXPANDED CHECK-IN PHOTO INSPECTION MODAL */}
      <Modal
        visible={!!viewingPhoto}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewingPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {viewingPhoto
                  ? new Date(viewingPhoto.date)
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    .toUpperCase()
                  : 'Check-In Photo'}
              </Text>
              <TouchableOpacity onPress={() => setViewingPhoto(null)}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubText, { color: theme.textSecondary }]}>
              {viewingPhoto?.note || 'Transformation Photo Update'}
            </Text>

            {viewingPhoto && (
              <View style={styles.expandedPhotoContainer}>
                <Image
                  source={{ uri: viewingPhoto.photoUrls[viewingPhotoIndex] }}
                  style={styles.expandedPhotoImg}
                  resizeMode="cover"
                />
                
                {viewingPhoto.photoUrls.length > 1 && (
                  <View style={{ position: 'absolute', flexDirection: 'row', width: '100%', justifyContent: 'space-between', top: '50%', marginTop: -15, paddingHorizontal: 10 }}>
                    <TouchableOpacity 
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', opacity: viewingPhotoIndex === 0 ? 0 : 1 }}
                      onPress={() => setViewingPhotoIndex(prev => Math.max(0, prev - 1))}
                      disabled={viewingPhotoIndex === 0}
                    >
                      <Ionicons name="chevron-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', opacity: viewingPhotoIndex === viewingPhoto.photoUrls.length - 1 ? 0 : 1 }}
                      onPress={() => setViewingPhotoIndex(prev => Math.min(viewingPhoto.photoUrls.length - 1, prev + 1))}
                      disabled={viewingPhotoIndex === viewingPhoto.photoUrls.length - 1}
                    >
                      <Ionicons name="chevron-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}
                {/* Dots indicator */}
                {viewingPhoto.photoUrls.length > 1 && (
                  <View style={{ position: 'absolute', bottom: 10, flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 6 }}>
                    {viewingPhoto.photoUrls.map((_, i) => (
                      <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === viewingPhotoIndex ? (theme.isDark ? theme.accentGold : theme.primary) : 'rgba(255,255,255,0.5)' }} />
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
                onPress={() => setViewingPhoto(null)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDeleteBtn, { backgroundColor: theme.danger }]}
                onPress={() => {
                  if (!viewingPhoto) return;

                  const performDelete = () => {
                    const photoUrlToDelete = viewingPhoto.photoUrls[viewingPhotoIndex];
                    if (photoUrlToDelete) {
                      deleteCheckinPhoto(photoUrlToDelete);
                      useTrainerStore.getState().deleteLiveFeedEventByPhotoUrl(photoUrlToDelete);
                      useTrainerStore.getState().removePhotoFromLiveFeed(photoUrlToDelete);
                    }
                    setViewingPhoto(null);
                  };

                  if (Platform.OS === 'web') {
                    const confirmDelete = window.confirm('Are you sure you want to remove this photo from your check-in journal?');
                    if (confirmDelete) {
                      performDelete();
                    }
                  } else {
                    Alert.alert(
                      'Delete Check-In Photo',
                      'Are you sure you want to remove this photo from your check-in journal?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: performDelete,
                        },
                      ]
                    );
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>Delete Photo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LINK TRAINER MODAL */}
      <Modal
        visible={linkTrainerModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLinkTrainerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.linkModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.linkModalHeader}>
              <Text style={[styles.linkModalTitle, { color: theme.text }]}>Link with Trainer</Text>
              <TouchableOpacity onPress={() => setLinkTrainerModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.linkModalSub, { color: theme.textSecondary }]}>
              Enter the unique trainer code provided by your coach (e.g. TRN-882).
            </Text>

            <TextInput
              style={[
                styles.linkModalInput,
                {
                  color: theme.text,
                  backgroundColor: theme.cardInner,
                  borderColor: theme.border,
                },
              ]}
              placeholder="TRN-XXXX"
              placeholderTextColor={theme.textMuted}
              value={trainerCodeInput}
              onChangeText={setTrainerCodeInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[
                styles.linkSubmitBtn,
                {
                  backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                },
              ]}
              onPress={handleLinkTrainer}
              disabled={isLinking}
            >
              <Text style={[styles.linkSubmitBtnText, { color: theme.isDark ? '#0A1A12' : '#FFFFFF' }]}>
                {isLinking ? 'Linking...' : 'Connect Coach'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* COMPACT HORIZONTAL PROFILE HEADER */
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1,
  },
  avatarGoldBorder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  avatarPresetSlot: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarPresetImg: {
    width: '100%',
    height: '100%',
  },
  removeAvatarBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  removeAvatarBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  centeredAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
  },
  centeredAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredAvatarText: {
    fontSize: 75,
    fontWeight: 'bold',
  },
  profileHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  heroNameText: {
    fontSize: 26,
    fontWeight: 'bold',
    paddingLeft: 12,
  },
  heroSubText: {
    fontSize: 15,
    marginTop: 2,
    paddingLeft: 12,
  },

  /* Trainer Code Chip (Trainer account) */
  trainerCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  trainerCodeChipLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  trainerCodeChipVal: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  trainerCodeCopyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  /* Linked Trainer Chip (Client account) */
  linkedTrainerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  linkedTrainerChipLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  linkedTrainerChipName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 1,
  },
  linkedTrainerChipCode: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  unlinkTrainerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D1215',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF444444',
  },
  unlinkTrainerBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* ACTION PILL ROW (2 PILLS) */
  actionPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  calendarPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  calendarPillText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  checkinPillBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  checkinPillText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },

  /* SECTION CARDS */
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  /* HEALTH METRICS 2X2 GRID */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  metricSub: {
    fontSize: 10.5,
    marginTop: 2,
  },

  /* MEASUREMENTS 2-COLUMN GRID */
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measureTile: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  measureTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  measureTileIcon: {
    fontSize: 14,
  },
  measureTileLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  measureTileVal: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  measureTileUnit: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* PR KPI CARDS (3-COLUMN ROW) */
  prGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  prKpiCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  prKpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  prKpiIcon: {
    fontSize: 18,
  },
  prKpiLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 4,
  },
  prKpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  prKpiUnit: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  /* CHECK-IN JOURNAL TIMELINE */
  journalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCheckinGoldBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCheckinGoldBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 38,
    gap: 16,
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 14,
    top: 16,
    bottom: 16,
    width: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  timelineNode: {
    position: 'absolute',
    left: -38,
    top: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineNodeIcon: {
    fontSize: 14,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginLeft: 12,
  },
  timelineCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  chevronWrap: {
    padding: 4,
  },
  timelineCardImg: {
    width: 76,
    height: 76,
    borderRadius: 12,
  },
  timelineDateText: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  timelineSubText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  timelineWeightVal: {
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  dropdownDetails: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dropdownTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldBadge: {
    width: '48%',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldBadgeFull: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  timelineHeaderImg: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  calcMetricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  calcMetricCol: {
    alignItems: 'center',
    flex: 1,
  },
  calcMetricVal: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  calcMetricLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  calcMetricDivider: {
    width: 1,
    height: 24,
  },
  viewFullPhotoBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  viewFullPhotoBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandedPhotoContainer: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 14,
  },
  expandedPhotoImg: {
    width: '100%',
    height: '100%',
  },
  modalDeleteBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubText: {
    fontSize: 11.5,
    marginBottom: 14,
    lineHeight: 16,
  },
  sectionSubHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  inputCol: {
    flex: 1,
  },
  inputGridTriple: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  inputColTriple: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addPhotoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  addPhotoBtnText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  photoUploadRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  uploadSlot: {
    position: 'relative',
    width: 70,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
  },
  uploadSlotImg: {
    width: '100%',
    height: '100%',
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  uploadSlotEmpty: {
    width: 70,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadSlotIcon: {
    fontSize: 18,
  },
  uploadSlotText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  /* Link Trainer Styles */
  linkTrainerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTrainerBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  linkModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  linkModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  linkModalSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  linkModalInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  linkSubmitBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkSubmitBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
