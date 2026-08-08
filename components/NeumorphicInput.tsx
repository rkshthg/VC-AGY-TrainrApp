import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text, Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

export interface NeumorphicInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const NeumorphicInput: React.FC<NeumorphicInputProps> = ({
  label,
  error,
  containerClassName = '',
  style,
  onFocus,
  onBlur,
  placeholderTextColor,
  ...props
}) => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';
  const [isFocused, setIsFocused] = useState(false);

  const defaultPlaceholderColor = isLight ? '#94A3B8' : '#A3B8B0';

  return (
    <View style={styles.container} className={containerClassName}>
      {label && <Text style={[styles.label, isLight && styles.labelLight]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isLight ? styles.inputWrapperLight : styles.inputWrapperDark,
          isFocused && (isLight ? styles.focusedWrapperLight : styles.focusedWrapperDark),
          error ? styles.errorWrapper : null,
        ]}
      >
        <TextInput
          placeholderTextColor={placeholderTextColor || defaultPlaceholderColor}
          style={[styles.input, isLight && styles.inputLight, style]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A3B8B0',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelLight: {
    color: '#476355',
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    minHeight: 50,
    justifyContent: 'center',
  },
  inputWrapperDark: {
    backgroundColor: '#08140F',
    borderColor: '#153127',
  },
  inputWrapperLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  focusedWrapperDark: {
    borderColor: '#E5C158',
  },
  focusedWrapperLight: {
    borderColor: '#D4AF37',
  },
  errorWrapper: {
    borderColor: '#EF4444',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  inputLight: {
    color: '#0F291E',
  },
  errorText: {
    color: '#F87171',
    fontSize: 11,
    marginTop: 4,
  },
});

