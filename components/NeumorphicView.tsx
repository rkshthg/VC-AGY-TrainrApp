import React from 'react';
import { View, ViewProps, StyleSheet, Platform } from 'react-native';

export interface NeumorphicViewProps extends ViewProps {
  variant?: 'extruded' | 'inset' | 'flat' | 'goldAccent';
  glow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const NeumorphicView: React.FC<NeumorphicViewProps> = ({
  variant = 'extruded',
  glow = false,
  className = '',
  style,
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'inset':
        return styles.inset;
      case 'goldAccent':
        return styles.goldAccent;
      case 'flat':
        return styles.flat;
      case 'extruded':
      default:
        return styles.extruded;
    }
  };

  return (
    <View
      style={[
        styles.base,
        getVariantStyles(),
        glow && styles.glowBorder,
        style,
      ]}
      className={className}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  extruded: {
    backgroundColor: '#122920',
    borderWidth: 1,
    borderColor: '#1D4537',
    ...Platform.select({
      ios: {
        shadowColor: '#040A07',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '6px 6px 14px #040A07, -4px -4px 10px #1E4638',
      },
    }),
  },
  inset: {
    backgroundColor: '#08140F',
    borderWidth: 1,
    borderColor: '#0D201A',
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
        boxShadow: 'inset 3px 3px 8px #040A07, inset -2px -2px 6px #1A3C2F',
      },
    }),
  },
  goldAccent: {
    backgroundColor: '#152C22',
    borderWidth: 1.5,
    borderColor: '#D4AF3770',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '5px 5px 12px #040A07, -3px -3px 8px #1E4638, 0px 0px 8px rgba(212, 175, 55, 0.25)',
      },
    }),
  },
  flat: {
    backgroundColor: '#10241C',
    borderWidth: 1,
    borderColor: '#16362B',
  },
  glowBorder: {
    borderColor: '#E5C158',
  },
});
