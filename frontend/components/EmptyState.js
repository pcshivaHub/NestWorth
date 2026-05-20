import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS, SPACING } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({ icon, message = 'Nothing here yet.' }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.container}>
      {typeof icon === 'string'
        ? <Text style={styles.icon}>{icon}</Text>
        : <View style={styles.iconWrap}>{icon}</View>}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xl * 2 },
  icon: { fontSize: 48, marginBottom: SPACING.md },
  iconWrap: { marginBottom: SPACING.md },
  message: { color: C.textSecondary, fontSize: FONTS.sizes.md, textAlign: 'center' },
});
