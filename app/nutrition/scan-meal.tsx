import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { analyzeMealImage } from '../../lib/aiVision';
import { useNutritionStore } from '../../store/nutritionStore';

export default function ScanMealScreen() {
  const router = useRouter();
  const setPendingScanResult = useNutritionStore((state) => state.setPendingScanResult);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Meal Scanner</Text>
          <Text style={styles.headerSub}>Snap a photo or upload from your device</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Viewfinder Target Box */}
      <View style={styles.viewfinder}>
        <Text style={styles.viewfinderIcon}>📸</Text>
        <Text style={styles.viewfinderTitle}>Position Meal Plate within Frame</Text>
        <Text style={styles.viewfinderText}>
          Gemini AI automatically detects South Asian dishes, portion sizes & macro breakdown
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>
            {scanType === 'CAMERA'
              ? 'Processing camera photo with Gemini AI Vision...'
              : 'Reading gallery photo & computing macros...'}
          </Text>
        </View>
      ) : (
        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={styles.btnCamera}
            onPress={() => handleProcessScan('CAMERA')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnCameraText}>📸 Take Photo with Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGallery}
            onPress={() => handleProcessScan('GALLERY')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnGalleryText}>🖼️ Upload Photo from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewfinder: {
    flex: 1,
    backgroundColor: '#091512',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  viewfinderIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  viewfinderTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  viewfinderText: {
    color: '#94A3B8',
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
    color: '#10B981',
    fontSize: 13.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionsGroup: {
    marginTop: 20,
    gap: 12,
  },
  btnCamera: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnCameraText: {
    color: '#064E3B',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnGallery: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  btnGalleryText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
