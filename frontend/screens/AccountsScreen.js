import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAccounts, createAccount, getAccountBalance } from '../api/accounts';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency, getInitials } from '../utils/helpers';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';

const ACCOUNT_TYPES = ['savings', 'checking', 'cash', 'credit'];
const TYPE_ICONS = { savings: '🏦', checking: '💳', cash: '💵', credit: '🔖' };

export default function AccountsScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'savings', balance: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const list = await getAccounts();
      setAccounts(list || []);
      // Fetch balances in parallel
      const bals = await Promise.allSettled(
        (list || []).map((a) => getAccountBalance(a.id).then((r) => ({ id: a.id, balance: r.balance })))
      );
      const balMap = {};
      bals.forEach((r) => { if (r.status === 'fulfilled') balMap[r.value.id] = r.value.balance; });
      setBalances(balMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleAdd = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Account name is required.');
    setSaving(true);
    try {
      await createAccount({
        name: form.name.trim(),
        type: form.type,
        opening_balance: parseFloat(form.balance) || 0,
      });
      setModalVisible(false);
      setForm({ name: '', type: 'savings', balance: '' });
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.screen}>
      {error && <ErrorBanner message={error} onRetry={load} />}

      <FlatList
        data={accounts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={<EmptyState icon="🏦" message="No accounts yet. Tap + to add one!" />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('AccountDetail', { account: item, balance: balances[item.id] })}>
          <Card style={styles.accountCard}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.typePill}>
                  <Text style={styles.typeText}>
                    {TYPE_ICONS[item.type] || '💰'} {item.type}
                  </Text>
                </View>
              </View>
              <Text style={styles.balance}>
                {formatCurrency(balances[item.id] ?? item.opening_balance ?? 0)}
              </Text>
            </View>
          </Card>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Account Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Account</Text>

            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC Savings"
              placeholderTextColor={COLORS.textMuted}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                  onPress={() => setForm({ ...form, type: t })}
                >
                  <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                    {TYPE_ICONS[t]} {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Opening Balance</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={form.balance}
              onChangeText={(v) => setForm({ ...form, balance: v })}
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setModalVisible(false)} style={styles.halfBtn} />
              <Button title="Save" onPress={handleAdd} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  list: { padding: SPACING.md, paddingBottom: 80 },
  accountCard: { marginBottom: SPACING.sm },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8,
    elevation: 10,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  avatarText: { color: COLORS.primaryLight, fontWeight: '700', fontSize: FONTS.sizes.md },
  info: { flex: 1 },
  name: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  typeText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  balance: { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.sizes.lg },

  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: SPACING.xl,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.textPrimary, padding: SPACING.sm + 4,
    fontSize: FONTS.sizes.md,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceHigh,
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  typeChipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  typeChipTextActive: { color: COLORS.primaryLight },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});