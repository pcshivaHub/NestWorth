import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Platform,
} from 'react-native';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { createTransaction } from '../api/transactions';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AddTransactionScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    account_id: null,
    category_id: null,
    amount: '',
    type: 'expense',
    txn_date: new Date().toISOString().split('T')[0],
    note: '',
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
        account_id: form.account_id,
        category_id: form.category_id,
        amount: parseFloat(form.amount),
        type: form.type,
        txn_date: form.txn_date,
        note: form.note.trim() || null,
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

      {/* Type Toggle */}
      <Text style={styles.label}>Transaction Type</Text>
      <View style={styles.typeToggle}>
        {['expense', 'income'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, form.type === t && styles.typeBtnActive(t)]}
            onPress={() => { set('type', t); set('category_id', null); }}
          >
            <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive(t)]}>
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount */}
      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={[styles.input, styles.amountInput]}
        placeholder="0.00"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="numeric"
        value={form.amount}
        onChangeText={(v) => set('amount', v)}
      />

      {/* Account Selector */}
      <Text style={styles.label}>Account</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
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

      {/* Category Selector */}
      <Text style={styles.label}>Category</Text>
      {filteredCategories.length === 0 ? (
        <Text style={styles.noData}>No {form.type} categories found. Add one first.</Text>
      ) : (
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
      )}

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
      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={[styles.input, styles.noteInput]}
        placeholder="Add a note..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        value={form.note}
        onChangeText={(v) => set('note', v)}
      />

      {/* Inline error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Submit */}
      <Button
        title={saving ? 'Saving...' : 'Add Transaction'}
        onPress={handleSubmit}
        loading={saving}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 8, marginTop: SPACING.md, fontWeight: '500' },

  typeToggle: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh, alignItems: 'center',
  },
  typeBtnActive: (t) => ({
    borderColor: t === 'income' ? COLORS.income : COLORS.expense,
    backgroundColor: t === 'income' ? '#0D3D2E' : '#3D0D1A',
  }),
  typeBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONTS.sizes.md },
  typeBtnTextActive: (t) => ({ color: t === 'income' ? COLORS.income : COLORS.expense }),

  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.textPrimary,
    padding: SPACING.sm + 4, fontSize: FONTS.sizes.md,
  },
  amountInput: { fontSize: FONTS.sizes.xxl, fontWeight: '700', textAlign: 'center', paddingVertical: SPACING.md },
  noteInput: { height: 80, textAlignVertical: 'top' },

  chipScroll: { flexGrow: 0, marginBottom: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh, marginRight: 8, marginBottom: 4,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  chipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  chipTextActive: { color: COLORS.primaryLight, fontWeight: '600' },
  noData: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontStyle: 'italic', paddingVertical: SPACING.sm },

  submitBtn: { marginTop: SPACING.xl },
  errorBox: {
    backgroundColor: '#2D1620', borderWidth: 1, borderColor: COLORS.expense,
    borderRadius: RADIUS.md, padding: SPACING.sm + 4, marginTop: SPACING.md,
  },
  errorText: { color: COLORS.expense, fontSize: FONTS.sizes.sm },
});