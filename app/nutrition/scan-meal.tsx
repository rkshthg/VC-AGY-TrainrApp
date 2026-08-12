import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { analyzeMealImage } from '../../lib/aiVision';
import { useNutritionStore } from '../../store/nutritionStore';
import { useTheme } from '../../lib/theme';

export default function ScanMealScreen() {
  const router = useRouter();
  const setPendingScanResult = useNutritionStore((state) => state.setPendingScanResult);
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [scanType, setScanType] = useState<'CAMERA' | 'GALLERY' | null>(null);

  const handleProcessScan = async (source: 'CAMERA' | 'GALLERY') => {
    setScanType(source);
    setLoading(true);
    try {
      // Simulate Gemini 2.0 Flash Vision meal photo parsing
      const result = await analyzeMealImage('mock_base64_data');
      setPendingScanResult({
        dishName: result.dishName,
        items: result.identifiedItems,
        totalCalories: result.totalCalories,
        totalProteinG: result.totalProteinG,
        totalCarbsG: result.totalCarbsG,
        totalFatG: result.totalFatG,
      });
      setLoading(false);
      router.replace('/nutrition/verify-meal');
    } catch (e) {
      setLoading(false);
      Alert.alert('Scan Error', 'Failed to analyze meal photo.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>AI Meal Scanner</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            Snap a photo or upload from your device
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

      {/* Viewfinder Target Box */}
      <View
        style={[
          styles.viewfinder,
          {
            backgroundColor: theme.card,
            borderColor: theme.isDark ? theme.accentGold : theme.primary,
            ...theme.shadow,
          },
        ]}
      >
        <Ionicons
          name="camera-outline"
          size={56}
          color={theme.isDark ? theme.accentGold : theme.primary}
          style={{ marginBottom: 16 }}
        />
        <Text style={[styles.viewfinderTitle, { color: theme.text }]}>
          Position Meal Plate within Frame
        </Text>
        <Text style={[styles.viewfinderText, { color: theme.textSecondary }]}>
          Gemini AI automatically detects dishes, portion sizes & macro breakdown
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.isDark ? theme.accentGold : theme.primary} />
          <Text
            style={[
              styles.loadingText,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          >
            {scanType === 'CAMERA'
              ? 'Processing camera photo with Gemini AI Vision...'
              : 'Reading gallery photo & computing macros...'}
          </Text>
        </View>
      ) : (
        <View style={styles.actionsGroup}>
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
              <Text
                style={[
                  styles.btnCameraText,
                  { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                ]}
              >
                Take Photo with Camera
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnGallery,
              {
                backgroundColor: theme.card,
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
                ...theme.shadowButton,
              },
            ]}
            onPress={() => handleProcessScan('GALLERY')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="image-outline" size={18} color={theme.isDark ? theme.accentGold : theme.primary} />
              <Text
                style={[
                  styles.btnGalleryText,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                Upload Photo from Gallery
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
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
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewfinder: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  viewfinderIcon: {
    fontSize: 56,
    marginBottom: 16,
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
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    textAlign: 'center',
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
});
