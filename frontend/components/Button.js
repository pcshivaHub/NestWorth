import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../utils/theme';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  style,
  disabled,
}) {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        isOutline ? styles.outline : styles.filled,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.primary : '#fff'} size="small" />
      ) : (
        <Text style={[styles.label, isOutline && styles.labelOutline]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: COLORS.primary },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  disabled: { opacity: 0.5 },
  label: {
    color: '#fff',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelOutline: { color: COLORS.primary },
});
