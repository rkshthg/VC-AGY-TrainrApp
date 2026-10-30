import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { convertWeight, parseWeightToKg, getWeightUnitLabel, UnitSystem } from '../lib/units';

interface WeightInputProps {
  valueKg: number;
  unitSystem: UnitSystem;
  weightStep: number; // e.g. 2.5 or 0.5
  onChangeWeightKg: (kg: number) => void;
  theme: any;
}

export const WeightInput: React.FC<WeightInputProps> = ({
  valueKg,
  unitSystem,
  weightStep = 2.5,
  onChangeWeightKg,
  theme,
}) => {
  const displayVal = convertWeight(valueKg, unitSystem);
  const [localText, setLocalText] = useState<string>(String(displayVal));

  useEffect(() => {
    // Sync local state if external value changed and differs from parsed localText
    const parsedLocal = parseFloat(localText.replace(',', '.'));
    if (isNaN(parsedLocal) || Math.abs(parsedLocal - displayVal) >= 0.01) {
      setLocalText(String(displayVal));
    }
  }, [displayVal]);

  const handleChangeText = (rawVal: string) => {
    const normalized = rawVal.replace(',', '.');
    // Allow empty string or valid partial decimal like "12." or "12.5"
    if (normalized === '' || /^\d+(\.\d{0,2})?$/.test(normalized) || /^\d+\.$/.test(normalized)) {
      setLocalText(rawVal);
      const parsed = parseFloat(normalized);
      if (!isNaN(parsed)) {
        const kg = parseWeightToKg(parsed, unitSystem);
        onChangeWeightKg(kg);
      } else if (normalized === '') {
        onChangeWeightKg(0);
      }
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(localText.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      setLocalText(String(displayVal));
    } else {
      setLocalText(String(parsed));
    }
  };

  const handleStep = (direction: -1 | 1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const current = parseFloat(localText.replace(',', '.')) || displayVal || 0;
    const nextVal = Math.max(0, parseFloat((current + direction * weightStep).toFixed(2)));
    setLocalText(String(nextVal));
    const kg = parseWeightToKg(nextVal, unitSystem);
    onChangeWeightKg(kg);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.cardAlt,
          borderColor: theme.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: theme.border }]}
        onPress={() => handleStep(-1)}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="remove" size={13} color={theme.isDark ? theme.accentGold : theme.primary} />
      </TouchableOpacity>

      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={localText}
        keyboardType="decimal-pad"
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        selectTextOnFocus
      />
      <Text style={[styles.unitLabel, { color: theme.textMuted }]}>
        {getWeightUnitLabel(unitSystem)}
      </Text>

      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: theme.border }]}
        onPress={() => handleStep(1)}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="add" size={13} color={theme.isDark ? theme.accentGold : theme.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 3,
    height: 38,
  },
  stepperBtn: {
    width: 22,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  unitLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginRight: 2,
  },
});
