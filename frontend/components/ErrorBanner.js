import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';

export default function ErrorBanner({ message, onRetry }) {
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2D1620',
    borderWidth: 1,
    borderColor: COLORS.expense,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    margin: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { color: COLORS.expense, fontSize: FONTS.sizes.sm, flex: 1 },
  retry: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
});
