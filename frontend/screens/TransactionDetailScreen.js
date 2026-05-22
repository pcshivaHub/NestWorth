import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal,
} from 'react-native';
import { ArrowUp, ArrowDown } from 'phosphor-react-native';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { getMemberName } from '../utils/helpers';
import Button from '../components/Button';
import Card from '../components/Card';
import apiClient from '../api/config';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import BankLogo from '../components/BankLogo';

export default function TransactionDetailScreen({ route, navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family } = useAuth();

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
      const filtered = (accs || []).filter((a) =>
        (['savings', 'checking', 'credit'].includes(a.type) && (!a.user_id || a.user_id === user?.id)) ||
        (['savings', 'checking'].includes(a.type) && a.user_id && a.user_id !== user?.id)
      );
      setAccounts(filtered);
      setCategories(cats || []);
    };
    load();
  }, [user?.id]);

  const filteredCategories = categories.filter((c) => c.kind === form.type);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleEdit = async () => {
    if (!form.amount || isNaN(parseFloat(form.amount)))
      return Alert.alert('Validation', 'Enter a valid amount.');
    setSaving(true);
    try {
      await apiClient.put(`/transactions/${transaction.id}`, {
        account_id: form.account_id, category_id: form.category_id,
        amount: parseFloat(form.amount), type: form.type,
        txn_date: form.txn_date, note: form.note || null,
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <View style={[styles.iconBg, { backgroundColor: transaction.type === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
          {transaction.type === 'income'
            ? <ArrowUp size={32} color={C.income} weight="bold" />
            : <ArrowDown size={32} color={C.expense} weight="bold" />}
        </View>
        <Text style={[styles.heroAmount, { color: transaction.type === 'income' ? C.income : C.expense }]}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.heroCategory}>{transaction.category_name}</Text>
      </Card>

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
              {label === 'Account' ? (
                <View style={styles.infoValueRow}>
                  <BankLogo name={value} size={20} style={styles.infoLogo} />
                  <Text style={styles.infoValue}>{value}</Text>
                </View>
              ) : (
                <Text style={styles.infoValue}>{value}</Text>
              )}
            </View>
            {i < arr.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>

      <Button title="✏️  Edit Transaction" onPress={() => setEditModal(true)} style={styles.editBtn} />
      <Button title={deleting ? 'Deleting...' : '🗑️  Delete Transaction'} variant="outline" onPress={handleDelete} loading={deleting} style={styles.deleteBtn} />

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeToggle}>
                {['expense', 'income'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toggleBtn, form.type === t && { borderColor: t === 'income' ? C.income : C.expense, backgroundColor: t === 'income' ? C.incomeSubtle : C.expenseSubtle }]}
                    onPress={() => { set('type', t); set('category_id', null); }}
                  >
                    <View style={styles.toggleContent}>
                      {t === 'income'
                        ? <ArrowUp size={16} color={form.type === t ? C.income : C.textMuted} weight="bold" />
                        : <ArrowDown size={16} color={form.type === t ? C.expense : C.textMuted} weight="bold" />}
                      <Text style={[styles.toggleText, form.type === t && { color: t === 'income' ? C.income : C.expense }]}>
                        {t === 'income' ? 'Income' : 'Expense'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput style={[styles.input, styles.amountInput]} keyboardType="numeric" placeholderTextColor={C.textMuted} value={form.amount} onChangeText={(v) => set('amount', v)} />

              <Text style={styles.label}>Account</Text>
              {(() => {
                const isFamily = (family?.members?.length ?? 0) > 1;
                const myAccs = accounts.filter((a) => !a.user_id || a.user_id === user?.id);
                const othersAccs = accounts.filter((a) => a.user_id && a.user_id !== user?.id);
                const renderChip = (a) => (
                  <TouchableOpacity key={a.id} style={[styles.chip, form.account_id === a.id && styles.chipActive]} onPress={() => set('account_id', a.id)}>
                    <View style={styles.accountChipContent}>
                      <BankLogo name={a.name} size={18} style={styles.accountChipLogo} />
                      <Text style={[styles.chipText, form.account_id === a.id && styles.chipTextActive]}>{a.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
                return (
                  <View>
                    {isFamily && myAccs.length > 0 && <Text style={styles.groupLabel}>MY ACCOUNTS</Text>}
                    <View style={styles.chipGrid}>{myAccs.map(renderChip)}</View>
                    {othersAccs.length > 0 && (
                      <>
                        <Text style={styles.groupLabel}>FAMILY ACCOUNTS</Text>
                        <View style={styles.chipGrid}>{othersAccs.map(renderChip)}</View>
                      </>
                    )}
                  </View>
                );
              })()}

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipGrid}>
                {filteredCategories.map((c) => (
                  <TouchableOpacity key={c.id} style={[styles.chip, form.category_id === c.id && styles.chipActive]} onPress={() => set('category_id', c.id)}>
                    <Text style={[styles.chipText, form.category_id === c.id && styles.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} value={form.txn_date} onChangeText={(v) => set('txn_date', v)} maxLength={10} />

              <Text style={styles.label}>Note</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholderTextColor={C.textMuted} value={form.note} onChangeText={(v) => set('note', v)} />

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

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  heroCard: { marginBottom: SPACING.md, padding: SPACING.lg, alignItems: 'center' },
  iconBg: { width: 64, height: 64, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  heroAmount: { fontSize: FONTS.sizes.hero, fontWeight: '800', marginBottom: 4 },
  heroCategory: { color: C.textSecondary, fontSize: FONTS.sizes.md },
  infoCard: { marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  infoLabel: { color: C.textMuted, fontSize: FONTS.sizes.md },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '60%' },
  infoLogo: { marginRight: 6 },
  infoValue: { flexShrink: 1, color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: C.border },
  editBtn: { marginBottom: SPACING.sm },
  deleteBtn: { borderColor: C.expense },
  overlay: { flex: 1, backgroundColor: '#000000AA' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: 1, borderColor: C.border, marginTop: 60 },
  modalTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  input: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, color: C.textPrimary, padding: SPACING.sm + 4, fontSize: FONTS.sizes.md },
  amountInput: { fontSize: FONTS.sizes.xl, fontWeight: '700', textAlign: 'center' },
  typeToggle: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.surfaceHigh },
  toggleContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { color: C.textMuted, fontWeight: '600', fontSize: FONTS.sizes.md },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1.5, marginTop: SPACING.sm, marginBottom: 6 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceHigh, marginRight: 8, marginBottom: 4 },
  chipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  accountChipContent: { flexDirection: 'row', alignItems: 'center' },
  accountChipLogo: { marginRight: 6 },
  chipText: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  chipTextActive: { color: C.primaryLight, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});
