import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text, Platform } from 'react-native';

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
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container} className={containerClassName}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          error ? styles.errorWrapper : null,
        ]}
      >
        <TextInput
          placeholderTextColor="#A3B8B0"
          style={[styles.input, style]}
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
  inputWrapper: {
    backgroundColor: '#08140F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#153127',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    minHeight: 50,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: 'inset 3px 3px 6px #040A07, inset -2px -2px 5px #1A3C2F',
      },
    }),
  },
  focusedWrapper: {
    borderColor: '#E5C158',
    ...Platform.select({
      web: {
        boxShadow: 'inset 3px 3px 6px #040A07, inset -2px -2px 5px #1A3C2F, 0px 0px 6px rgba(229, 193, 88, 0.4)',
      },
    }),
  },
  errorWrapper: {
    borderColor: '#EF4444',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#F87171',
    fontSize: 11,
    marginTop: 4,
  },
});
