import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

const MORE_ITEMS = [
  { label: 'Categories', icon: '🏷️', screen: 'Categories', description: 'Manage income & expense categories' },
  { label: 'Family', icon: '👨‍👩‍👧', screen: 'Family', description: 'Family members & sharing' },
  { label: 'Reports', icon: '📊', screen: 'Reports', description: 'Net worth, trends & insights' },
];

export default function MoreScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = makeStyles(C);
  return (
    <View style={styles.screen}>
      {MORE_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.row}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Text style={styles.icon}>{item.icon}</Text>
          <View style={styles.rowText}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, padding: SPACING.md, paddingTop: SPACING.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  icon: { fontSize: 28, marginRight: SPACING.md },
  rowText: { flex: 1 },
  label: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '700' },
  desc: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  chevron: { color: C.textMuted, fontSize: 22, fontWeight: '300' },
});
