import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

export default function Card({ children, style }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const makeStyles = (C) => StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.card,
  },
});
