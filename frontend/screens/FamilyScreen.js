import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Clipboard,
} from 'react-native';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getMemberName } from '../utils/helpers';
import { leaveFamily } from '../api/family';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function FamilyScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family, familyLoading, refreshFamily } = useAuth();

  const isAdmin = family?.members?.some(
    (m) => m.user_id === user?.id && m.role === 'admin'
  );

  const handleCopy = () => {
    Clipboard.setString(family.invite_code);
    Alert.alert('Copied!', 'Invite code copied to clipboard.');
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Family',
      isAdmin && family.members.length > 1
        ? 'Transfer admin role to another member before leaving.'
        : `Are you sure you want to leave "${family.name}"?`,
      isAdmin && family.members.length > 1
        ? [{ text: 'OK' }]
        : [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave', style: 'destructive',
              onPress: async () => {
                try {
                  await leaveFamily();
                  await refreshFamily();
                } catch (e) {
                  Alert.alert('Error', e.message);
                }
              },
            },
          ]
    );
  };

  if (familyLoading) return <LoadingSpinner />;

  if (!family) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👨‍👩‍👧</Text>
          <Text style={styles.emptyTitle}>No Family Yet</Text>
          <Text style={styles.emptySubtitle}>
            Invite your household to share finances together.
          </Text>
          <Button
            title="Create a Family"
            onPress={() => navigation.navigate('FamilySetup', { mode: 'create' })}
            style={styles.emptyBtn}
          />
          <Button
            title="Join a Family"
            variant="outline"
            onPress={() => navigation.navigate('FamilySetup', { mode: 'join' })}
            style={styles.emptyBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.heroIcon}>👨‍👩‍👧</Text>
        <Text style={styles.heroName}>{family.name}</Text>
        <Text style={styles.memberCount}>{family.members.length} member{family.members.length !== 1 ? 's' : ''}</Text>
      </Card>

      <Text style={styles.sectionLabel}>INVITE CODE</Text>
      <Card style={styles.codeCard}>
        <Text style={styles.codeText}>{family.invite_code}</Text>
        <Text style={styles.codeHint}>Share this code with family members so they can join.</Text>
        <View style={styles.codeBtns}>
          <Button title="Copy Code" onPress={handleCopy} style={styles.halfBtn} />
          {isAdmin && (
            <Button
              title="Regenerate"
              variant="outline"
              onPress={() => {
                Alert.alert(
                  'Regenerate Code',
                  'The current code will stop working. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Regenerate',
                      onPress: async () => {
                        try {
                          const { regenerateInviteCode } = require('../api/family');
                          await regenerateInviteCode();
                          await refreshFamily();
                        } catch (e) {
                          Alert.alert('Error', e.message);
                        }
                      },
                    },
                  ]
                );
              }}
              style={styles.halfBtn}
            />
          )}
        </View>
      </Card>

      <Text style={styles.sectionLabel}>MEMBERS</Text>
      <Card style={styles.membersCard}>
        {family.members.map((m, i, arr) => (
          <View key={String(m.user_id)}>
            <View style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: C.primary + '33' }]}>
                <Text style={styles.avatarText}>
                  {getMemberName(m, user).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {getMemberName(m, user)}
                </Text>
                <Text style={styles.memberJoined}>Joined {formatDate(m.joined_at)}</Text>
              </View>
              <View style={[styles.rolePill, m.role === 'admin' ? styles.adminPill : styles.memberPill]}>
                <Text style={[styles.roleText, m.role === 'admin' ? styles.adminText : styles.memberText]}>
                  {m.role}
                </Text>
              </View>
            </View>
            {i < arr.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>

      <Button
        title="Leave Family"
        variant="outline"
        onPress={handleLeave}
        style={styles.leaveBtn}
      />
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  emptyIcon: { fontSize: 64, marginBottom: SPACING.md },
  emptyTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.sm },
  emptySubtitle: { color: C.textSecondary, fontSize: FONTS.sizes.md, textAlign: 'center', marginBottom: SPACING.lg },
  emptyBtn: { width: '100%', marginBottom: SPACING.sm },

  heroCard: { alignItems: 'center', padding: SPACING.lg, marginBottom: SPACING.md },
  heroIcon: { fontSize: 48, marginBottom: SPACING.sm },
  heroName: { color: C.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '800', marginBottom: 4 },
  memberCount: { color: C.textSecondary, fontSize: FONTS.sizes.md },

  sectionLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.sm, marginTop: SPACING.sm },

  codeCard: { marginBottom: SPACING.md, padding: SPACING.lg, alignItems: 'center' },
  codeText: { color: C.primary, fontSize: 28, fontWeight: '800', letterSpacing: 4, marginBottom: SPACING.sm },
  codeHint: { color: C.textMuted, fontSize: FONTS.sizes.xs, textAlign: 'center', marginBottom: SPACING.md },
  codeBtns: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  halfBtn: { flex: 1 },

  membersCard: { marginBottom: SPACING.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  avatarText: { color: C.primary, fontSize: FONTS.sizes.md, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  memberJoined: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  rolePill: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  adminPill: { backgroundColor: C.primary + '33' },
  memberPill: { backgroundColor: C.surfaceHigh },
  roleText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  adminText: { color: C.primaryLight },
  memberText: { color: C.textMuted },
  divider: { height: 1, backgroundColor: C.border },

  leaveBtn: { borderColor: C.expense },
});
