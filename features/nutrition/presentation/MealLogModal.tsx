import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Image, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNutritionStore } from './nutritionStore';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { NeumorphicInput } from '@/core/presentation/components/NeumorphicInput';

interface MealLogModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MealLogModal: React.FC<MealLogModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { analyzeMealPhoto, addMeal, isAnalyzing } = useNutritionStore();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<'cloud_ai' | 'local_ai' | null>(null);

  const processSelectedImage = async (uri: string, base64?: string) => {
    setPhotoUri(uri);
    const result = await analyzeMealPhoto(uri, base64);
    setMealName(result.meal_name);
    setCalories(result.calories.toString());
    setProtein(result.protein_g.toString());
    setCarbs(result.carbs_g.toString());
    setFat(result.fat_g.toString());
    setAnalysisSource(result.analysis_source || 'local_ai');
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to scan meal photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processSelectedImage(result.assets[0].uri, result.assets[0].base64 || undefined);
    }
  };

  const handleChooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processSelectedImage(result.assets[0].uri, result.assets[0].base64 || undefined);
    }
  };

  const handleSave = async () => {
    if (!mealName || !calories) {
      Alert.alert('Missing Info', 'Please enter a meal name and calories.');
      return;
    }

    await addMeal({
      date: new Date().toISOString().split('T')[0],
      meal_type: mealType,
      meal_name: mealName,
      calories: parseFloat(calories) || 0,
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fat_g: parseFloat(fat) || 0,
      image_url: photoUri || undefined,
      user_id: user?.id || 'current_user',
    });

    // Reset inputs & close
    setMealName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setPhotoUri(null);
    setAnalysisSource(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/80"
      >
        <NeumorphicView
          variant="goldAccent"
          className="rounded-t-3xl p-6 max-h-[90%]"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 20) + 120 }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-xl font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                Log Meal (AI Hybrid Scanner)
              </Text>
              {analysisSource && (
                <View className={`px-2.5 py-1 rounded-full border ${
                  isLight ? 'bg-amber-100 border-amber-300' : 'bg-deepGreen-elevated border-gold-border'
                }`}>
                  <Text className={`text-[10px] font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                    {analysisSource === 'cloud_ai' ? 'Cloud AI Vision' : 'On-Device AI'}
                  </Text>
                </View>
              )}
            </View>

            {/* Photo Scan Options */}
            {!photoUri ? (
              <View className="flex-row space-x-3 mb-4">
                <TouchableOpacity
                  className={`flex-1 p-3 rounded-xl items-center flex-row justify-center space-x-2 border ${
                    isLight ? 'bg-slate-100 border-amber-400' : 'bg-deepGreen-elevated border-gold-border'
                  }`}
                  onPress={handleTakePhoto}
                  disabled={isAnalyzing}
                >
                  <Text className={`font-semibold text-xs ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 p-3 rounded-xl items-center flex-row justify-center space-x-2 border ${
                    isLight ? 'bg-slate-100 border-slate-300' : 'bg-deepGreen-elevated border-gold-border'
                  }`}
                  onPress={handleChooseFromGallery}
                  disabled={isAnalyzing}
                >
                  <Text className={`font-semibold text-xs ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Gallery</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className={`flex-row items-center space-x-3 mb-4 p-3 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-elevated border-deepGreen-border'
              }`}>
                <Image source={{ uri: photoUri }} className="w-14 h-14 rounded-lg bg-black/40" />
                <View className="flex-1">
                  <Text className={`text-xs font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Meal Photo Attached</Text>
                  <Text className={`text-[10px] ${isLight ? 'text-[#476355]' : 'text-sage'}`}>AI pre-filled parameters below</Text>
                </View>
                <TouchableOpacity onPress={handleTakePhoto}>
                  <Text className={`text-xs font-semibold ${isLight ? 'text-[#C5A028]' : 'text-gold-light'}`}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}

            {isAnalyzing && (
              <View className="items-center my-3 flex-row justify-center space-x-2">
                <ActivityIndicator color={isLight ? '#C5A028' : '#E5C158'} />
                <Text className={`text-xs font-semibold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Analyzing image with AI...</Text>
              </View>
            )}

            {/* Manual Override Fields */}
            <NeumorphicInput
              label="Meal Name (Editable)"
              placeholder="e.g. Grilled Salmon Bowl"
              value={mealName}
              onChangeText={setMealName}
            />

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <NeumorphicInput
                  label="Calories (kcal)"
                  placeholder="550"
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>
              <View className="flex-1">
                <NeumorphicInput
                  label="Protein (g)"
                  placeholder="42"
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <NeumorphicInput
                  label="Carbs (g)"
                  placeholder="50"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>
              <View className="flex-1">
                <NeumorphicInput
                  label="Fat (g)"
                  placeholder="16"
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
            </View>

            <View className="flex-row justify-between space-x-3 mt-3 mb-2">
              <View className="flex-1">
                <NeumorphicButton
                  title="Cancel"
                  variant="green"
                  onPress={onClose}
                />
              </View>
              <View className="flex-1">
                <NeumorphicButton
                  title="Save Meal"
                  variant="gold"
                  onPress={handleSave}
                />
              </View>
            </View>
          </ScrollView>
        </NeumorphicView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

