import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { analyzeMealImage } from '../../lib/aiVision';
import { useNutritionStore, FoodItem } from '../../store/nutritionStore';
import { useAuthStore } from '../../store/authStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useTheme } from '../../lib/theme';
import logger from '../../lib/logger';

import * as ImagePicker from 'expo-image-picker';

export default function ScanMealScreen() {
  const router = useRouter();
  const saveMealEntry = useNutritionStore((state) => state.saveMealEntry);
  const profile = useAuthStore((state) => state.profile);
  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);
  const theme = useTheme();

  // Screen state
  const [loading, setLoading] = useState(false);
  const [scanType, setScanType] = useState<'CAMERA' | 'GALLERY' | null>(null);
  
  // Plate image details
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Form states (populated after AI scan)
  const [dishName, setDishName] = useState('');
  const [category, setCategory] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS'>('BREAKFAST');
  const [items, setItems] = useState<FoodItem[]>([]);

  // Pick / Take Photo
  const handleProcessScan = async (source: 'CAMERA' | 'GALLERY') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'CAMERA') {
        const { status } = await ImagePicker.getCameraPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
          const { status: reqStatus } = await ImagePicker.requestCameraPermissionsAsync();
          finalStatus = reqStatus;
        }
        if (finalStatus !== 'granted') {
          Alert.alert('Permission Needed', 'Camera permission is required to snap a meal photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          base64: true,
          quality: 0.6,
        });
      } else {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
          const { status: reqStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          finalStatus = reqStatus;
        }
        if (finalStatus !== 'granted') {
          Alert.alert('Permission Needed', 'Photo library permission is required to upload a meal photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          base64: true,
          quality: 0.6,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      setScanType(source);
      setPhotoUri(selectedAsset.uri);
      setLoading(true);

      // Perform AI Analysis
      const aiResult = await analyzeMealImage(selectedAsset.uri, selectedAsset.base64 || '');
      
      // Populate form
      setDishName(aiResult.dishName);
      setItems(aiResult.identifiedItems);
      setCategory('BREAKFAST'); // Default category

      setLoading(false);
    } catch (e) {
      setLoading(false);
      setPhotoUri(null);
      logger.error('Scan Error:', e);
      Alert.alert('Scan Error', 'Failed to analyze meal photo with AI. Please try again.');
    }
  };

  // Form handlers
  const handleUpdateItemField = (index: number, field: keyof FoodItem, val: string) => {
    const updated = [...items];
    const item = { ...updated[index] };
    if (field === 'name' || field === 'quantity') {
      (item as any)[field] = val;
    } else {
      (item as any)[field] = parseFloat(val) || 0;
    }
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { name: 'Custom Side Dish', quantity: '1 serving', calories: 100, proteinG: 5, carbsG: 10, fatG: 2 },
    ]);
  };

  // Real-time macro sums
  const totalCalories = items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const totalProteinG = items.reduce((sum, item) => sum + (Number(item.proteinG) || 0), 0);
  const totalCarbsG = items.reduce((sum, item) => sum + (Number(item.carbsG) || 0), 0);
  const totalFatG = items.reduce((sum, item) => sum + (Number(item.fatG) || 0), 0);

  // Reset / start over
  const handleReset = () => {
    if (Platform.OS === 'web') {
      const confirmReset = window.confirm('Are you sure you want to discard this image and start over?');
      if (confirmReset) {
        setPhotoUri(null);
        setDishName('');
        setItems([]);
      }
    } else {
      Alert.alert('Start Over', 'Are you sure you want to discard this image and start over?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPhotoUri(null);
            setDishName('');
            setItems([]);
          },
        },
      ]);
    }
  };

  // Save Meal
  const handleSaveMeal = async () => {
    if (!dishName.trim()) {
      Alert.alert('Error', 'Please enter a name for the dish.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Please include at least one food item component.');
      return;
    }

    try {
      setLoading(true);
      await saveMealEntry({
        userId: profile?.id || 'usr_1',
        dishName,
        category,
        timestamp: new Date().toISOString(),
        totalCalories,
        totalProteinG,
        totalCarbsG,
        totalFatG,
        items,
        photoUrl: photoUri || undefined,
      });

      // Share to trainer live feed
      addLiveFeedEvent({
        clientId: profile?.id || 'usr_1',
        clientName: profile?.fullName || 'Client',
        eventType: 'LOG_MEAL',
        actionVerb: 'Logged',
        targetTitle: `${dishName} (${totalCalories} kcal)`,
        tags: [
          { label: 'Nutrition', type: 'success' },
          { label: 'On Track', type: 'success' },
        ],
        timestamp: new Date().toISOString(),
      });

      setLoading(false);
      Alert.alert('Meal Logged', 'Your meal has been saved successfully!');
      router.replace('/(tabs)/nutrition');
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Failed to save meal.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            {photoUri && !loading ? 'Verify & Edit Meal' : 'AI Plate Analyzer'}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {photoUri && !loading ? 'Adjust components & portion macros' : 'Upload or snap a plate photo to compute macros'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* STATE 1: Idle (No photo selected yet) */}
      {!photoUri && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View
            style={[
              styles.idleContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={64}
              color={theme.isDark ? theme.accentGold : theme.primary}
              style={{ marginBottom: 16 }}
            />
            
            <Text style={[styles.viewfinderText, { color: theme.textSecondary, marginBottom: 24, textAlign: 'center' }]}>
              Gemini AI automatically detects dishes, portion sizes & macro breakdown
            </Text>

            <View style={[styles.actionsGroup, { width: '100%' }]}>
              <TouchableOpacity
                style={[
                  styles.btnCamera,
                  {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                    ...theme.shadowButton,
                  },
                ]}
                onPress={() => handleProcessScan('CAMERA')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="camera-outline" size={18} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
                  <Text style={[styles.btnCameraText, { color: theme.isDark ? '#0A1A12' : '#FFFFFF' }]}>
                    Take Photo with Camera
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnGallery,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                    ...theme.shadowButton,
                  },
                ]}
                onPress={() => handleProcessScan('GALLERY')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="image-outline" size={18} color={theme.isDark ? theme.accentGold : theme.primary} />
                  <Text style={[styles.btnGalleryText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                    Upload Photo from Gallery
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* STATE 2: Analyzing (Image picked, fetching AI response) */}
      {photoUri && loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.imagePreviewContainer, { borderColor: theme.border }]}>
            <Image source={{ uri: photoUri }} style={styles.largePreviewImage} />
            <View style={styles.overlayLoading}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.overlayLoadingText}>
                {scanType === 'CAMERA' ? 'Uploading snapshot...' : 'Reading image asset...'}
              </Text>
            </View>
          </View>
          <Text style={[styles.loadingBannerText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
            AI Agent is analyzing your plate...
          </Text>
        </View>
      )}

      {/* STATE 3: Edit Form (AI analysis complete, editable macro fields) */}
      {photoUri && !loading && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Compact Image Preview Row */}
          <View style={[styles.compactImageRow, { borderColor: theme.border }]}>
            <Image source={{ uri: photoUri }} style={styles.compactPreviewImage} />
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 12 }}>
              <Text style={[styles.compactImageLabel, { color: theme.textSecondary }]}>PLATE IMAGE</Text>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={handleReset}>
                <Ionicons name="refresh-outline" size={14} color={theme.isDark ? theme.accentGold : theme.primary} />
                <Text style={[styles.changePhotoText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                  Change Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border, ...theme.shadow }]}>
            {/* Dish Name */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DISH NAME</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.cardInner, borderColor: theme.border }]}
              value={dishName}
              onChangeText={setDishName}
              placeholder="e.g. Dosa & Chutney"
              placeholderTextColor={theme.textMuted}
            />

            {/* Category selection */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 8 }]}>MEAL CATEGORY</Text>
            <View style={styles.categoryPickerRow}>
              {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: category === cat ? (theme.isDark ? theme.accentGold : theme.primary) : theme.cardInner,
                      borderColor: category === cat ? (theme.isDark ? theme.accentGold : theme.primary) : theme.border,
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryPillText, { color: category === cat ? (theme.isDark ? '#0A1A12' : '#FFFFFF') : theme.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dynamic Total Macros Banner */}
            <View style={[styles.totalsBanner, { backgroundColor: theme.cardInner, borderColor: theme.border }]}>
              <Text style={[styles.totalsTitle, { color: theme.textSecondary }]}>TOTAL MEAL MACROS</Text>
              <View style={styles.totalsGrid}>
                <View style={styles.totalCol}>
                  <Text style={[styles.totalVal, { color: theme.text }]}>{totalCalories}</Text>
                  <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Calories</Text>
                </View>
                <View style={styles.totalCol}>
                  <Text style={[styles.totalVal, { color: theme.text }]}>{totalProteinG.toFixed(1)}g</Text>
                  <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Protein</Text>
                </View>
                <View style={styles.totalCol}>
                  <Text style={[styles.totalVal, { color: theme.text }]}>{totalCarbsG.toFixed(1)}g</Text>
                  <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Carbs</Text>
                </View>
                <View style={styles.totalCol}>
                  <Text style={[styles.totalVal, { color: theme.text }]}>{totalFatG.toFixed(1)}g</Text>
                  <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Fat</Text>
                </View>
              </View>
            </View>

            {/* Components Grid Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeader, { color: theme.text }]}>Meal Components</Text>
              <TouchableOpacity style={[styles.addItemBtn, { borderColor: theme.border, backgroundColor: theme.cardInner }]} onPress={handleAddItem}>
                <Ionicons name="add-outline" size={14} color={theme.isDark ? theme.accentGold : theme.primary} />
                <Text style={[styles.addItemBtnText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>Add Component</Text>
              </TouchableOpacity>
            </View>

            {/* Editable items list */}
            {items.map((item, idx) => (
              <View key={idx} style={[styles.componentCard, { backgroundColor: theme.cardInner, borderColor: theme.border }]}>
                {/* Row 1: Name and Trash button */}
                <View style={styles.componentTopRow}>
                  <TextInput
                    style={[styles.componentNameInput, { color: theme.text }]}
                    value={item.name}
                    onChangeText={(val) => handleUpdateItemField(idx, 'name', val)}
                    placeholder="Component Name"
                    placeholderTextColor={theme.textMuted}
                  />
                  <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={styles.trashBtn}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Row 2: Qty / Portion */}
                <View style={styles.componentQtyRow}>
                  <Text style={[styles.qtyLabel, { color: theme.textMuted }]}>Portion:</Text>
                  <TextInput
                    style={[styles.componentQtyInput, { color: theme.text, borderColor: theme.border }]}
                    value={item.quantity}
                    onChangeText={(val) => handleUpdateItemField(idx, 'quantity', val)}
                    placeholder="e.g. 1 serving (100g)"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                {/* Row 3: Nutrition metrics row */}
                <View style={styles.componentMacrosRow}>
                  <View style={styles.macroInputCol}>
                    <Text style={[styles.macroInputLabel, { color: theme.textMuted }]}>Calories (kcal)</Text>
                    <TextInput
                      style={[styles.macroTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                      value={String(item.calories)}
                      keyboardType="numeric"
                      onChangeText={(val) => handleUpdateItemField(idx, 'calories', val)}
                    />
                  </View>
                  <View style={styles.macroInputCol}>
                    <Text style={[styles.macroInputLabel, { color: theme.textMuted }]}>Protein (g)</Text>
                    <TextInput
                      style={[styles.macroTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                      value={String(item.proteinG)}
                      keyboardType="numeric"
                      onChangeText={(val) => handleUpdateItemField(idx, 'proteinG', val)}
                    />
                  </View>
                  <View style={styles.macroInputCol}>
                    <Text style={[styles.macroInputLabel, { color: theme.textMuted }]}>Carbs (g)</Text>
                    <TextInput
                      style={[styles.macroTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                      value={String(item.carbsG)}
                      keyboardType="numeric"
                      onChangeText={(val) => handleUpdateItemField(idx, 'carbsG', val)}
                    />
                  </View>
                  <View style={styles.macroInputCol}>
                    <Text style={[styles.macroInputLabel, { color: theme.textMuted }]}>Fat (g)</Text>
                    <TextInput
                      style={[styles.macroTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                      value={String(item.fatG)}
                      keyboardType="numeric"
                      onChangeText={(val) => handleUpdateItemField(idx, 'fatG', val)}
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Action buttons */}
            <View style={styles.formActionsRow}>
              <TouchableOpacity
                style={[styles.btnSaveMeal, { backgroundColor: theme.isDark ? theme.accentGold : theme.primary }]}
                onPress={handleSaveMeal}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnSaveMealText, { color: theme.isDark ? '#0A1A12' : '#FFFFFF' }]}>
                  Save & Log Meal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleContainer: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
  },
  viewfinderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  viewfinderText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsGroup: {
    marginTop: 20,
    gap: 12,
  },
  btnCamera: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnCameraText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnGallery: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnGalleryText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  
  // Analyzing state
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    marginBottom: 24,
  },
  largePreviewImage: {
    width: '100%',
    height: '100%',
  },
  overlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayLoadingText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  loadingBannerText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Edit / Form state
  scrollContent: {
    flex: 1,
  },
  compactImageRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  compactPreviewImage: {
    width: 90,
    height: 90,
  },
  compactImageLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  formCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  categoryPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  totalsBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  totalsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  totalsGrid: {
    flexDirection: 'row',
  },
  totalCol: {
    flex: 1,
    alignItems: 'center',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  addItemBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  componentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  componentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  componentNameInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  trashBtn: {
    padding: 4,
  },
  componentQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  qtyLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  componentQtyInput: {
    flex: 1,
    fontSize: 12.5,
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  componentMacrosRow: {
    flexDirection: 'row',
    gap: 6,
  },
  macroInputCol: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 8.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  macroTextInput: {
    fontSize: 12.5,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'monospace',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
  },
  formActionsRow: {
    marginTop: 16,
  },
  btnSaveMeal: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSaveMealText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
