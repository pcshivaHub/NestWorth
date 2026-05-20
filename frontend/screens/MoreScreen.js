import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tag, UsersThree, ChartBar } from 'phosphor-react-native';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/helpers';

const MORE_ITEMS = [
  { label: 'Categories', Icon: Tag, screen: 'Categories', description: 'Manage income & expense categories' },
  { label: 'Family', Icon: UsersThree, screen: 'Family', description: 'Family members & sharing' },
  { label: 'Reports', Icon: ChartBar, screen: 'Reports', description: 'Net worth, trends & insights' },
];

export default function MoreScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = makeStyles(C);
  const { user } = useAuth();

  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  return (
    <View style={styles.screen}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>
      </View>

      {MORE_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.row}
          onPress={() => navigation.navigate(item.screen)}
        >
          <View style={styles.iconWrap}>
            <item.Icon size={24} color={C.primaryLight} />
          </View>
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

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: C.border,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primary + '33',
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: { color: C.primaryLight, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { color: C.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  profileEmail: { color: C.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: C.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rowText: { flex: 1 },
  label: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '700' },
  desc: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  chevron: { color: C.textMuted, fontSize: 22, fontWeight: '300' },
});
