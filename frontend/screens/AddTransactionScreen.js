import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Platform,
} from 'react-native';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { createTransaction } from '../api/transactions';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import BankLogo from '../components/BankLogo';

export default function AddTransactionScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    account_id: null, category_id: null, amount: '',
    type: 'expense', txn_date: new Date().toISOString().split('T')[0], note: '',
  });

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [accs, cats] = await Promise.all([getAccounts(), getCategories()]);
        setAccounts(accs || []);
        setCategories(cats || []);
      } catch (e) {
        setError('Could not load accounts/categories. Is the backend running?');
      } finally {
        setLoadingData(false);
      }
    };
    loadDropdowns();
  }, []);

  const filteredCategories = categories.filter((c) => c.kind === form.type);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.account_id) return setError('Please select an account.');
    if (!form.category_id) return setError('Please select a category.');
    if (!form.amount || isNaN(parseFloat(form.amount))) return setError('Enter a valid amount.');
    if (!form.txn_date) return setError('Please enter a date.');
    setSaving(true);
    try {
      await createTransaction({
        account_id: form.account_id, category_id: form.category_id,
        amount: parseFloat(form.amount), type: form.type,
        txn_date: form.txn_date, note: form.note.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <Text style={styles.label}>Transaction Type</Text>
      <View style={styles.typeToggle}>
        {['expense', 'income'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, form.type === t && { borderColor: t === 'income' ? C.income : C.expense, backgroundColor: t === 'income' ? C.incomeSubtle : C.expenseSubtle }]}
            onPress={() => { set('type', t); set('category_id', null); }}
          >
            <Text style={[styles.typeBtnText, form.type === t && { color: t === 'income' ? C.income : C.expense }]}>
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput style={[styles.input, styles.amountInput]} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.amount} onChangeText={(v) => set('amount', v)} />

      <Text style={styles.label}>Account</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {accounts.map((a) => (
          <TouchableOpacity key={a.id} style={[styles.chip, form.account_id === a.id && styles.chipActive]} onPress={() => set('account_id', a.id)}>
            <View style={styles.accountChipContent}>
              <BankLogo name={a.name} size={18} style={styles.accountChipLogo} />
              <Text style={[styles.chipText, form.account_id === a.id && styles.chipTextActive]}>{a.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Category</Text>
      {filteredCategories.length === 0 ? (
        <Text style={styles.noData}>No {form.type} categories found. Add one first.</Text>
      ) : (
        <View style={styles.chipGrid}>
          {filteredCategories.map((c) => (
            <TouchableOpacity key={c.id} style={[styles.chip, form.category_id === c.id && styles.chipActive]} onPress={() => set('category_id', c.id)}>
              <Text style={[styles.chipText, form.category_id === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Date</Text>
      <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} value={form.txn_date} onChangeText={(v) => set('txn_date', v)} maxLength={10} />

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput style={[styles.input, styles.noteInput]} placeholder="Add a note..." placeholderTextColor={C.textMuted} multiline value={form.note} onChangeText={(v) => set('note', v)} />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <Button title={saving ? 'Saving...' : 'Add Transaction'} onPress={handleSubmit} loading={saving} style={styles.submitBtn} />
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 8, marginTop: SPACING.md, fontWeight: '500' },
  typeToggle: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: { flex: 1, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceHigh, alignItems: 'center' },
  typeBtnText: { color: C.textMuted, fontWeight: '700', fontSize: FONTS.sizes.md },
  input: { backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, color: C.textPrimary, padding: SPACING.sm + 4, fontSize: FONTS.sizes.md },
  amountInput: { fontSize: FONTS.sizes.xxl, fontWeight: '700', textAlign: 'center', paddingVertical: SPACING.md },
  noteInput: { height: 80, textAlignVertical: 'top' },
  chipScroll: { flexGrow: 0, marginBottom: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceHigh, marginRight: 8, marginBottom: 4 },
  chipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  accountChipContent: { flexDirection: 'row', alignItems: 'center' },
  accountChipLogo: { marginRight: 6 },
  chipText: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  chipTextActive: { color: C.primaryLight, fontWeight: '600' },
  noData: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontStyle: 'italic', paddingVertical: SPACING.sm },
  submitBtn: { marginTop: SPACING.xl },
  errorBox: { backgroundColor: C.expenseBg, borderWidth: 1, borderColor: C.expense, borderRadius: RADIUS.md, padding: SPACING.sm + 4, marginTop: SPACING.md },
  errorText: { color: C.expense, fontSize: FONTS.sizes.sm },
});
