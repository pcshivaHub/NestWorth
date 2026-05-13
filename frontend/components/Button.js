import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RADIUS, SPACING, FONTS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

export default function Button({ title, onPress, variant = 'primary', loading = false, style, disabled }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[styles.btn, isOutline ? styles.outline : styles.filled, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? C.primary : '#fff'} size="small" />
      ) : (
        <Text style={[styles.label, isOutline && styles.labelOutline]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (C) => StyleSheet.create({
  btn: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: C.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.primary },
  disabled: { opacity: 0.5 },
  label: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '600', letterSpacing: 0.3 },
  labelOutline: { color: C.primary },
});
