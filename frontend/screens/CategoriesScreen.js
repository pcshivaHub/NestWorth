import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCategories, createCategory } from '../api/categories';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';

export default function CategoriesScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ name: '', kind: 'expense', budget: '' });
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const load = async () => {
    try {
      setError(null);
      const list = await getCategories();
      setCategories(list || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = () => { setRefreshing(true); load(); };

  const closeModal = () => {
    setModalVisible(false);
    setForm({ name: '', kind: 'expense', budget: '' });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Category name is required.');
    const budget = parseFloat(form.budget);
    setSaving(true);
    try {
      await createCategory({
        name: form.name.trim(),
        kind: form.kind,
        budget: !isNaN(budget) && budget > 0 ? budget : null,
      });
      closeModal();
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = categories.filter((c) => activeFilter === 'all' || c.kind === activeFilter);

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.screen}>
      {error && <ErrorBanner message={error} onRetry={load} />}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListEmptyComponent={<EmptyState icon="🏷️" message="No categories yet. Tap + to add one!" />}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {['all', 'income', 'expense'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, activeFilter === f && styles.filterActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'All' : f === 'income' ? '↑ Income' : '↓ Expense'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('CategoryDetail', { category: item })}>
            <Card style={styles.catCard}>
              <View style={styles.row}>
                <View style={[styles.badge, { backgroundColor: item.kind === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
                  <Text style={{ fontSize: 18 }}>{item.kind === 'income' ? '↑' : '↓'}</Text>
                </View>
                <Text style={styles.catName}>{item.name}</Text>
                <View style={styles.rightCol}>
                  <View style={[styles.typePill, { backgroundColor: item.kind === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
                    <Text style={[styles.typeText, { color: item.kind === 'income' ? C.income : C.expense }]}>
                      {item.kind}
                    </Text>
                  </View>
                  {item.budget > 0 && (
                    <Text style={styles.budgetHint}>Budget {item.budget >= 1000 ? `₹${(item.budget / 1000).toFixed(0)}k` : `₹${item.budget}`}</Text>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Category</Text>

            <Text style={styles.label}>Category Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Groceries" placeholderTextColor={C.textMuted} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeToggle}>
              {['income', 'expense'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.toggleBtn, form.kind === t && { borderColor: t === 'income' ? C.income : C.expense, backgroundColor: t === 'income' ? C.incomeSubtle : C.expenseSubtle }]}
                  onPress={() => setForm({ ...form, kind: t })}
                >
                  <Text style={[styles.toggleText, form.kind === t && { color: t === 'income' ? C.income : C.expense }]}>
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Budget Limit (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. 5000" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.budget} onChangeText={(v) => setForm({ ...form, budget: v })} />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={closeModal} style={styles.halfBtn} />
              <Button title="Save" onPress={handleAdd} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: SPACING.md, paddingBottom: 80 },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  filterActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  filterText: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  filterTextActive: { color: C.primaryLight, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10 },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
  catCard: { marginBottom: SPACING.sm, paddingVertical: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  catName: { flex: 1, color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  typePill: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  budgetHint: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: 1, borderColor: C.border },
  modalTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  input: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, color: C.textPrimary, padding: SPACING.sm + 4, fontSize: FONTS.sizes.md },
  typeToggle: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.surfaceHigh },
  toggleText: { color: C.textMuted, fontWeight: '600', fontSize: FONTS.sizes.md },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});
