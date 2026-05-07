import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency, formatDate } from '../utils/helpers';
import Button from '../components/Button';
import Card from '../components/Card';
import apiClient from '../api/config';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';

export default function TransactionDetailScreen({ route, navigation }) {
  const { transaction } = route.params;

  const [editModal, setEditModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    account_id: transaction.account_id,
    category_id: transaction.category_id,
    amount: String(transaction.amount),
    type: transaction.type,
    txn_date: transaction.txn_date,
    note: transaction.note || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [accs, cats] = await Promise.all([getAccounts(), getCategories()]);
      setAccounts(accs || []);
      setCategories(cats || []);
    };
    load();
  }, []);

  const filteredCategories = categories.filter((c) => c.kind === form.type);

  const handleEdit = async () => {
    if (!form.amount || isNaN(parseFloat(form.amount)))
      return Alert.alert('Validation', 'Enter a valid amount.');
    setSaving(true);
    try {
      await apiClient.put(`/transactions/${transaction.id}`, {
        account_id: form.account_id,
        category_id: form.category_id,
        amount: parseFloat(form.amount),
        type: form.type,
        txn_date: form.txn_date,
        note: form.note || null,
      });
      setEditModal(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm
      ? window.confirm('Delete this transaction? This cannot be undone.')
      : true;
    if (!confirmed) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/transactions/${transaction.id}`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setDeleting(false);
    }
  };

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Hero */}
      <Card style={styles.heroCard}>
        <View style={[styles.iconBg, { backgroundColor: transaction.type === 'income' ? '#0D3D2E' : '#3D0D1A' }]}>
          <Text style={styles.icon}>{transaction.type === 'income' ? '↑' : '↓'}</Text>
        </View>
        <Text style={[styles.heroAmount, { color: transaction.type === 'income' ? COLORS.income : COLORS.expense }]}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.heroCategory}>{transaction.category_name}</Text>
      </Card>

      {/* Info */}
      <Card style={styles.infoCard}>
        {[
          { label: 'Account', value: transaction.account_name },
          { label: 'Category', value: transaction.category_name },
          { label: 'Type', value: transaction.type },
          { label: 'Date', value: formatDate(transaction.txn_date) },
          { label: 'Note', value: transaction.note || '—' },
        ].map(({ label, value }, i, arr) => (
          <View key={label}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>

      {/* Actions */}
      <Button title="✏️  Edit Transaction" onPress={() => setEditModal(true)} style={styles.editBtn} />
      <Button
        title={deleting ? 'Deleting...' : '🗑️  Delete Transaction'}
        variant="outline"
        onPress={handleDelete}
        loading={deleting}
        style={styles.deleteBtn}
      />

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>

              {/* Type */}
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeToggle}>
                {['expense', 'income'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toggleBtn, form.type === t && styles.toggleBtnActive(t)]}
                    onPress={() => { set('type', t); set('category_id', null); }}
                  >
                    <Text style={[styles.toggleText, form.type === t && styles.toggleTextActive(t)]}>
                      {t === 'income' ? '↑ Income' : '↓ Expense'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={form.amount}
                onChangeText={(v) => set('amount', v)}
              />

              {/* Account */}
              <Text style={styles.label}>Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {accounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chip, form.account_id === a.id && styles.chipActive]}
                    onPress={() => set('account_id', a.id)}
                  >
                    <Text style={[styles.chipText, form.account_id === a.id && styles.chipTextActive]}>
                      🏦 {a.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category */}
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipGrid}>
                {filteredCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, form.category_id === c.id && styles.chipActive]}
                    onPress={() => set('category_id', c.id)}
                  >
                    <Text style={[styles.chipText, form.category_id === c.id && styles.chipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date */}
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={form.txn_date}
                onChangeText={(v) => set('txn_date', v)}
                maxLength={10}
              />

              {/* Note */}
              <Text style={styles.label}>Note</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholderTextColor={COLORS.textMuted}
                value={form.note}
                onChangeText={(v) => set('note', v)}
              />

              <View style={styles.modalBtns}>
                <Button title="Cancel" variant="outline" onPress={() => setEditModal(false)} style={styles.halfBtn} />
                <Button title="Save" onPress={handleEdit} loading={saving} style={styles.halfBtn} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  heroCard: { marginBottom: SPACING.md, padding: SPACING.lg, alignItems: 'center' },
  iconBg: { width: 64, height: 64, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  icon: { color: '#fff', fontSize: 32, fontWeight: '700' },
  heroAmount: { fontSize: FONTS.sizes.hero, fontWeight: '800', marginBottom: 4 },
  heroCategory: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },

  infoCard: { marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  infoLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  infoValue: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.border },

  editBtn: { marginBottom: SPACING.sm },
  deleteBtn: { borderColor: COLORS.expense },

  overlay: { flex: 1, backgroundColor: '#000000AA' },
  modal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl,
    borderTopWidth: 1, borderColor: COLORS.border, marginTop: 60,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.textPrimary, padding: SPACING.sm + 4,
    fontSize: FONTS.sizes.md,
  },
  amountInput: { fontSize: FONTS.sizes.xl, fontWeight: '700', textAlign: 'center' },
  typeToggle: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surfaceHigh,
  },
  toggleBtnActive: (t) => ({
    borderColor: t === 'income' ? COLORS.income : COLORS.expense,
    backgroundColor: t === 'income' ? '#0D3D2E' : '#3D0D1A',
  }),
  toggleText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sizes.md },
  toggleTextActive: (t) => ({ color: t === 'income' ? COLORS.income : COLORS.expense }),
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceHigh, marginRight: 8, marginBottom: 4,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  chipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  chipTextActive: { color: COLORS.primaryLight, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});