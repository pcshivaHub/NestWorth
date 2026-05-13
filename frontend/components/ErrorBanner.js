import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONTS, RADIUS, SPACING } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

export default function ErrorBanner({ message, onRetry }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚠️  {message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={styles.retry}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: {
    backgroundColor: C.expenseBg,
    borderWidth: 1,
    borderColor: C.expense,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    margin: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { color: C.expense, fontSize: FONTS.sizes.sm, flex: 1 },
  retry: { color: C.primary, fontSize: FONTS.sizes.sm, fontWeight: '600', marginLeft: SPACING.sm },
});
