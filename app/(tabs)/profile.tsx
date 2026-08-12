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
} from 'react-native';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { CalendarLogModal } from '../../components/CalendarLogModal';
import { WeeklyProfileAnalytics } from '../../components/WeeklyProfileAnalytics';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useTrainerStore } from '../../store/trainerStore';

export default function ProfileScreen() {
  const { profile, role, trainerCode, setProfile } = useAuthStore();
  const {
    weightHistory,
    checkinPhotos,
    latestMeasurements,
    getCalculatedMetrics,
    addWeightLog,
    updateMeasurements,
    addCheckinPhoto,
    deleteCheckinPhoto,
  } = useProgressStore();
  const personalRecords = useWorkoutStore((state) => state.personalRecords);
  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

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
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400',
  ]);

  const stats = getCalculatedMetrics({
    heightCm: profile?.heightCm || 175,
    weightKg: weightHistory[0]?.weightKg || 75,
    sex: profile?.sex || 'MALE',
    neckCm: latestMeasurements?.neckCm || 39,
    waistCm: latestMeasurements?.waistCm || 84,
    hipsCm: latestMeasurements?.hipsCm || 98,
    activityLevel: profile?.activityLevel || 'MODERATELY_ACTIVE',
  });

  const handleAddSamplePhoto = () => {
    if (uploadedPhotos.length >= 3) {
      Alert.alert('Photo Limit Reached', 'You can upload up to 3 transformation check-in photos per entry.');
      return;
    }
    const sampleImgs = [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400',
    ];
    const nextImg = sampleImgs[uploadedPhotos.length - 1] || sampleImgs[0];
    setUploadedPhotos([...uploadedPhotos, nextImg]);
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== index));
  };

  const handleSaveCheckin = () => {
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

    if (!isNaN(parsedWeight) && parsedWeight > 0) {
      addWeightLog(parsedWeight);
      updatedSummaryList.push(`${parsedWeight} kg`);
    }

    const measurementsToUpdate: Record<string, number> = {};
    if (!isNaN(parsedNeck) && parsedNeck > 0) measurementsToUpdate.neckCm = parsedNeck;
    if (!isNaN(parsedWaist) && parsedWaist > 0) measurementsToUpdate.waistCm = parsedWaist;
    if (!isNaN(parsedHips) && parsedHips > 0) measurementsToUpdate.hipsCm = parsedHips;
    if (!isNaN(parsedChest) && parsedChest > 0) measurementsToUpdate.chestCm = parsedChest;
    if (!isNaN(parsedBicepsL) && parsedBicepsL > 0) measurementsToUpdate.bicepsLCm = parsedBicepsL;
    if (!isNaN(parsedBicepsR) && parsedBicepsR > 0) measurementsToUpdate.bicepsRCm = parsedBicepsR;
    if (!isNaN(parsedThighsL) && parsedThighsL > 0) measurementsToUpdate.thighsLCm = parsedThighsL;
    if (!isNaN(parsedThighsR) && parsedThighsR > 0) measurementsToUpdate.thighsRCm = parsedThighsR;

    if (Object.keys(measurementsToUpdate).length > 0) {
      updateMeasurements(measurementsToUpdate);
      updatedSummaryList.push('Body Measurements');
    }

    if (!isNaN(parsedHeight) && parsedHeight > 0 && profile) {
      setProfile({
        ...profile,
        heightCm: parsedHeight,
      });
      updatedSummaryList.push(`Height: ${parsedHeight}cm`);
    }

    uploadedPhotos.forEach((uri) => {
      addCheckinPhoto(uri, 'Transformation Check-In');
    });
    if (uploadedPhotos.length > 0) {
      updatedSummaryList.push(`${uploadedPhotos.length} Photo(s)`);
    }

    const summaryText = updatedSummaryList.length > 0
      ? updatedSummaryList.join(' & ')
      : `${weightHistory[0]?.weightKg || 76.4} kg Retained`;

    addLiveFeedEvent({
      clientId: profile?.id || 'usr_1',
      clientName: profile?.fullName || 'Client',
      eventType: 'UPLOAD_CHECKIN',
      timeAgo: 'Just now',
      actionVerb: 'Logged',
      targetTitle: `Transformation Check-In (${summaryText})`,
      tags: [
        { label: 'Check-In', type: 'success' },
        { label: 'Metrics Updated', type: 'success' },
      ],
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
    <View style={styles.container}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 👤 COMPACT HORIZONTAL PROFILE HEADER */}
        <View style={styles.profileHeaderCard}>
          {/* Avatar (Tappable to change profile picture) */}
          <TouchableOpacity
            style={styles.avatarGoldBorder}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.8}
          >
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.centeredAvatarImg} />
            ) : (
              <View style={styles.centeredAvatarPlaceholder}>
                <Text style={styles.centeredAvatarText}>
                  {(profile?.fullName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={{ fontSize: 13 }}>📷</Text>
            </View>
          </TouchableOpacity>

          {/* Identity Info */}
          <View style={styles.profileHeaderInfo}>
            <Text style={styles.heroNameText}>{profile?.fullName || 'Alex Rivers'}</Text>
            <Text style={styles.heroSubText}>
              {role === 'TRAINER' ? 'Elite Conditioning Specialist' : 'Fitness Enthusiast'}
            </Text>

            {/* Trainer Code Chip (Trainer Account) */}
            {role === 'TRAINER' && (
              <View style={styles.trainerCodeChip}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trainerCodeChipLabel}>YOUR TRAINER CODE</Text>
                  <Text style={styles.trainerCodeChipVal}>Code: {trainerCode || 'TRN-882'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.trainerCodeCopyBtn}
                  onPress={() => {
                    Alert.alert('Copied!', `Trainer code "${trainerCode || 'TRN-882'}" copied to clipboard.`);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12 }}>📋</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Linked Trainer Chip */}
            <View style={styles.linkedTrainerChip}>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkedTrainerChipLabel}>LINKED TRAINER</Text>
                <Text style={styles.linkedTrainerChipName}>Coach Marcus Vance</Text>
                <Text style={styles.linkedTrainerChipCode}>Code: MV-7X21</Text>
              </View>
              <TouchableOpacity
                style={styles.unlinkTrainerBtn}
                onPress={() => {
                  Alert.alert(
                    'Unlink Trainer',
                    'Are you sure you want to unlink from Coach Marcus Vance?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Unlink', style: 'destructive', onPress: () => { } },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.unlinkTrainerBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ACTION PILL ROW */}
        <View style={styles.actionPillRow}>
          <TouchableOpacity
            style={styles.calendarPillBtn}
            onPress={() => setCalendarModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.calendarPillText}>Log Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkinPillBtn}
            onPress={() => setCheckinModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.checkinPillText}>Check-In</Text>
          </TouchableOpacity>
        </View>

        {/* 📊 PERFORMANCE ANALYTICS (PRESERVED CHART) */}
        <WeeklyProfileAnalytics />

        {/* 🩺 HEALTH METRICS 2X2 GRID */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Health Metrics</Text>

          <View style={styles.metricsGrid}>
            {/* BMI */}
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>BMI</Text>
              <Text style={styles.metricVal}>{stats.bmi}</Text>
              <Text style={styles.metricSub}>{stats.bmiCategory}</Text>
            </View>

            {/* BODY FAT % */}
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>BODY FAT %</Text>
              <Text style={styles.metricVal}>
                {stats.estimatedBodyFatPct ? `${stats.estimatedBodyFatPct}%` : '12%'}
              </Text>
              <Text style={styles.metricSub}>U.S. Navy Method</Text>
            </View>

            {/* BMR */}
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>BMR</Text>
              <Text style={styles.metricVal}>{stats.bmrKcal}</Text>
              <Text style={styles.metricSub}>kcal/day</Text>
            </View>

            {/* TDEE TARGET */}
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>TDEE TARGET</Text>
              <Text style={styles.metricVal}>{stats.tdeeKcal}</Text>
              <Text style={styles.metricSub}>Maintenance</Text>
            </View>
          </View>
        </View>

        {/* 📏 MEASUREMENTS SECTION (2-COLUMN GRID) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Measurements</Text>

          <View style={styles.measurementsGrid}>
            {/* Height */}
            <View style={styles.measureTile}>
              <View style={styles.measureTileHeader}>
                <Text style={styles.measureTileIcon}>↨</Text>
                <Text style={styles.measureTileLabel}>HEIGHT</Text>
              </View>
              <Text style={styles.measureTileVal}>{profile?.heightCm || 185} <Text style={styles.measureTileUnit}>cm</Text></Text>
            </View>

            {/* Weight */}
            <View style={styles.measureTile}>
              <View style={styles.measureTileHeader}>
                <Text style={styles.measureTileIcon}>⚖️</Text>
                <Text style={styles.measureTileLabel}>WEIGHT</Text>
              </View>
              <Text style={styles.measureTileVal}>{weightHistory[0]?.weightKg || 92} <Text style={styles.measureTileUnit}>kg</Text></Text>
            </View>

            {/* Neck */}
            {latestMeasurements?.neckCm ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>📏</Text>
                  <Text style={styles.measureTileLabel}>NECK</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements.neckCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}

            {/* Chest */}
            {latestMeasurements?.chestCm ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>📏</Text>
                  <Text style={styles.measureTileLabel}>CHEST</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements.chestCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}

            {/* Waist */}
            {latestMeasurements?.waistCm ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>📏</Text>
                  <Text style={styles.measureTileLabel}>WAIST</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements.waistCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}

            {/* Hips */}
            {latestMeasurements?.hipsCm ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>📏</Text>
                  <Text style={styles.measureTileLabel}>HIPS</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements.hipsCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}

            {/* Biceps L */}
            {(latestMeasurements?.bicepsLCm || latestMeasurements?.bicepsCm) ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>💪</Text>
                  <Text style={styles.measureTileLabel}>BICEPS (L)</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements?.bicepsLCm || latestMeasurements?.bicepsCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}

            {/* Biceps R */}
            {(latestMeasurements?.bicepsRCm || latestMeasurements?.bicepsCm) ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>💪</Text>
                  <Text style={styles.measureTileLabel}>BICEPS (R)</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements?.bicepsRCm || latestMeasurements?.bicepsCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}

            {/* Thighs L */}
            {(latestMeasurements?.thighsLCm || latestMeasurements?.thighsCm) ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>🦵</Text>
                  <Text style={styles.measureTileLabel}>THIGHS (L)</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements?.thighsLCm || latestMeasurements?.thighsCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}

            {/* Thighs R */}
            {(latestMeasurements?.thighsRCm || latestMeasurements?.thighsCm) ? (
              <View style={styles.measureTile}>
                <View style={styles.measureTileHeader}>
                  <Text style={styles.measureTileIcon}>🦵</Text>
                  <Text style={styles.measureTileLabel}>THIGHS (R)</Text>
                </View>
                <Text style={styles.measureTileVal}>{latestMeasurements?.thighsRCm || latestMeasurements?.thighsCm} <Text style={styles.measureTileUnit}>cm</Text></Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 🏋️ PERSONAL RECORDS — KPI CARDS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Records</Text>

          <View style={styles.prGrid}>
            {/* Bench Press */}
            <View style={styles.prKpiCard}>
              <View style={styles.prKpiIconWrap}>
                <Text style={styles.prKpiIcon}>🏋️</Text>
              </View>
              <Text style={styles.prKpiLabel}>BENCH PRESS</Text>
              <Text style={styles.prKpiValue}>
                {personalRecords['ex_01']?.oneRmKg ? `${personalRecords['ex_01'].oneRmKg}` : '100'}
              </Text>
              <Text style={styles.prKpiUnit}>kg · 1RM</Text>
            </View>

            {/* Squat */}
            <View style={styles.prKpiCard}>
              <View style={styles.prKpiIconWrap}>
                <Text style={styles.prKpiIcon}>🦵</Text>
              </View>
              <Text style={styles.prKpiLabel}>SQUAT</Text>
              <Text style={styles.prKpiValue}>
                {personalRecords['ex_07']?.oneRmKg ? `${personalRecords['ex_07'].oneRmKg}` : '140'}
              </Text>
              <Text style={styles.prKpiUnit}>kg · 1RM</Text>
            </View>

            {/* Deadlift */}
            <View style={styles.prKpiCard}>
              <View style={styles.prKpiIconWrap}>
                <Text style={styles.prKpiIcon}>💀</Text>
              </View>
              <Text style={styles.prKpiLabel}>DEADLIFT</Text>
              <Text style={styles.prKpiValue}>
                {personalRecords['ex_08']?.oneRmKg ? `${personalRecords['ex_08'].oneRmKg}` : '180'}
              </Text>
              <Text style={styles.prKpiUnit}>kg · 1RM</Text>
            </View>
          </View>
        </View>

        {/* 📖 CHECK-IN JOURNAL (VERTICAL TIMELINE LAYOUT) */}
        <View style={styles.sectionCard}>
          <View style={styles.journalHeaderRow}>
            <Text style={styles.sectionTitle}>Check-In Journal</Text>
            <TouchableOpacity
              style={styles.addCheckinGoldBtn}
              onPress={() => setCheckinModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addCheckinGoldBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Vertical Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.verticalTimelineLine} />

            {/* Photo Check-in Items */}
            {checkinPhotos.map((photo, idx) => (
              <View key={photo.id} style={styles.timelineRow}>
                <View style={styles.timelineNode}>
                  <Text style={styles.timelineNodeIcon}>📷</Text>
                </View>

                <View style={styles.timelineCard}>
                  <Image source={{ uri: photo.photoUrl }} style={styles.timelineCardImg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineDateText}>
                      {new Date(photo.date).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}
                    </Text>
                    <Text style={styles.timelineSubText}>Photo Update</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.timelineDeleteBtn}
                    onPress={() => {
                      Alert.alert(
                        'Delete Check-In Photo',
                        'Are you sure you want to remove this photo?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteCheckinPhoto(photo.id) },
                        ]
                      );
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Weight Check-in Timeline Items */}
            {weightHistory.slice(0, 3).map((wLog, idx) => (
              <View key={wLog.id} style={styles.timelineRow}>
                <View style={styles.timelineNode}>
                  <Text style={styles.timelineNodeIcon}>🔲</Text>
                </View>

                <View style={styles.timelineCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineDateText}>
                      {new Date(wLog.date).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}
                    </Text>
                    <Text style={styles.timelineWeightVal}>
                      {wLog.weightKg} kg <Text style={{ color: '#EAB308', fontSize: 11 }}>↑0.5kg</Text>
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* CHECK-IN MODAL (PRESERVED) */}
      <Modal
        visible={checkinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transformation Check-In</Text>
              <TouchableOpacity onPress={() => setCheckinModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubText}>
              Update your body stats & measurements below (all optional). Omitted fields retain previous values.
            </Text>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {/* Section 1: Basic Body Stats */}
              <Text style={styles.sectionSubHeader}>Basic Stats (Optional)</Text>
              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={heightInput}
                    onChangeText={setHeightInput}
                    placeholder={String(profile?.heightCm || 175)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder={String(weightHistory[0]?.weightKg || 76.4)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Section 2: Upper Body Measurements */}
              <Text style={styles.sectionSubHeader}>Upper Body (cm)</Text>
              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Chest</Text>
                  <TextInput
                    style={styles.input}
                    value={chestInput}
                    onChangeText={setChestInput}
                    placeholder={String(latestMeasurements?.chestCm || 102)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Neck</Text>
                  <TextInput
                    style={styles.input}
                    value={neckInput}
                    onChangeText={setNeckInput}
                    placeholder={String(latestMeasurements?.neckCm || 39)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Biceps (Left)</Text>
                  <TextInput
                    style={styles.input}
                    value={bicepsLInput}
                    onChangeText={setBicepsLInput}
                    placeholder={String(latestMeasurements?.bicepsLCm || 37)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Biceps (Right)</Text>
                  <TextInput
                    style={styles.input}
                    value={bicepsRInput}
                    onChangeText={setBicepsRInput}
                    placeholder={String(latestMeasurements?.bicepsRCm || 37)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Section 3: Core & Lower Body Measurements */}
              <Text style={styles.sectionSubHeader}>Core & Lower Body (cm)</Text>
              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Waist</Text>
                  <TextInput
                    style={styles.input}
                    value={waistInput}
                    onChangeText={setWaistInput}
                    placeholder={String(latestMeasurements?.waistCm || 84)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Hips</Text>
                  <TextInput
                    style={styles.input}
                    value={hipsInput}
                    onChangeText={setHipsInput}
                    placeholder={String(latestMeasurements?.hipsCm || 98)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Thighs (Left)</Text>
                  <TextInput
                    style={styles.input}
                    value={thighsLInput}
                    onChangeText={setThighsLInput}
                    placeholder={String(latestMeasurements?.thighsLCm || 58)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Thighs (Right)</Text>
                  <TextInput
                    style={styles.input}
                    value={thighsRInput}
                    onChangeText={setThighsRInput}
                    placeholder={String(latestMeasurements?.thighsRCm || 58)}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Section 4: Check-In Photos */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.sectionSubHeader}>Check-In Photos (Max 3)</Text>
                  <TouchableOpacity onPress={handleAddSamplePhoto} style={styles.addPhotoBtn}>
                    <Text style={styles.addPhotoBtnText}>+ Add Photo</Text>
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
                        <Text style={styles.removePhotoBadgeText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {uploadedPhotos.length < 3 && (
                    <TouchableOpacity style={styles.uploadSlotEmpty} onPress={handleAddSamplePhoto}>
                      <Text style={styles.uploadSlotIcon}>📷</Text>
                      <Text style={styles.uploadSlotText}>Upload</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCheckinModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveCheckin} activeOpacity={0.8}>
                <Text style={styles.modalSaveText}>Update</Text>
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

      {/* 🖼️ CHANGE PROFILE PICTURE MODAL */}
      <Modal
        visible={avatarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubText}>Select a photo preset or remove photo to use initials:</Text>

            <View style={styles.avatarPresetGrid}>
              {avatarPresets.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.avatarPresetSlot,
                    profile?.avatarUrl === uri && styles.avatarPresetSlotActive,
                  ]}
                  onPress={() => handleSelectAvatar(uri)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.avatarPresetImg} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.removeAvatarBtn}
              onPress={() => handleSelectAvatar(undefined)}
              activeOpacity={0.8}
            >
              <Text style={styles.removeAvatarBtnText}>Remove Photo (Use Initials)</Text>
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
    backgroundColor: '#06110D',
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
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  avatarGoldBorder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#10B981',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06110D',
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#06110D',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
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
  avatarPresetSlotActive: {
    borderColor: '#10B981',
  },
  avatarPresetImg: {
    width: '100%',
    height: '100%',
  },
  removeAvatarBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF444444',
  },
  removeAvatarBtnText: {
    color: '#EF4444',
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
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredAvatarText: {
    color: '#FFFFFF',
    fontSize: 75,
    fontWeight: 'bold',
  },
  profileHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  heroNameText: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: 'bold',
    paddingLeft: 12,
  },
  heroSubText: {
    color: '#94A3B8',
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
    backgroundColor: '#06110D',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAB30844',
  },
  trainerCodeChipLabel: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  trainerCodeChipVal: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  trainerCodeCopyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAB30844',
  },

  /* Linked Trainer Chip (Client account) */
  linkedTrainerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: '#06110D',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  linkedTrainerChipLabel: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  linkedTrainerChipName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 1,
  },
  linkedTrainerChipCode: {
    color: '#64748B',
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
    backgroundColor: '#091512',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B98166',
  },
  calendarPillText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  checkinPillBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EAB308',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  checkinPillText: {
    color: '#06110D',
    fontSize: 12.5,
    fontWeight: 'bold',
  },

  /* SECTION CARDS */
  sectionCard: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  sectionTitle: {
    color: '#F8FAFC',
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
    backgroundColor: '#06110D',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAB30833',
  },
  metricLabel: {
    color: '#EAB308',
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  metricSub: {
    color: '#94A3B8',
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
    backgroundColor: '#06110D',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B98122',
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
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  measureTileVal: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  measureTileUnit: {
    color: '#64748B',
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
    backgroundColor: '#06110D',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAB30833',
  },
  prKpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#451A03',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  prKpiIcon: {
    fontSize: 18,
  },
  prKpiLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 4,
  },
  prKpiValue: {
    color: '#EAB308',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  prKpiUnit: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  /* CHECK-IN JOURNAL TIMELINE */
  journalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addCheckinGoldBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCheckinGoldBtnText: {
    color: '#06110D',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 20,
    gap: 12,
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 11,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#10B98133',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  timelineNode: {
    position: 'absolute',
    left: -20,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineNodeIcon: {
    fontSize: 11,
  },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06110D',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  timelineCardImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  timelineDateText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineSubText: {
    color: '#EAB308',
    fontSize: 11,
    marginTop: 2,
  },
  timelineWeightVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  timelineDeleteBtn: {
    padding: 6,
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubText: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginBottom: 14,
    lineHeight: 16,
  },
  sectionSubHeader: {
    color: '#A7F3D0',
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
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addPhotoBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addPhotoBtnText: {
    color: '#10B981',
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
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadSlotIcon: {
    fontSize: 18,
  },
  uploadSlotText: {
    color: '#10B981',
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
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1.5,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#064E3B',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
