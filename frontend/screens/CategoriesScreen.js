import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCategories, createCategory } from '../api/categories';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ name: '', kind: 'expense' });
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

  const handleAdd = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Category name is required.');
    setSaving(true);
    try {
      await createCategory({ name: form.name.trim(), kind: form.kind });
      setModalVisible(false);
      setForm({ name: '', kind: 'expense' });
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
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
              <View style={[styles.badge, { backgroundColor: item.kind === 'income' ? '#0D3D2E' : '#3D0D1A' }]}>
                <Text style={{ fontSize: 18 }}>{item.kind === 'income' ? '↑' : '↓'}</Text>
              </View>
              <Text style={styles.catName}>{item.name}</Text>
              <View style={[styles.typePill, { backgroundColor: item.kind === 'income' ? '#0D3D2E' : '#3D0D1A' }]}>
                <Text style={[styles.typeText, { color: item.kind === 'income' ? COLORS.income : COLORS.expense }]}>
                  {item.kind}
                </Text>
              </View>
            </View>
          </Card>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Category Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Category</Text>

            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries"
              placeholderTextColor={COLORS.textMuted}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeToggle}>
              {['income', 'expense'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.toggleBtn, form.kind === t && styles.toggleBtnActive(t)]}
                  onPress={() => setForm({ ...form, kind: t })}
                >
                  <Text style={[styles.toggleText, form.kind === t && styles.toggleTextActive(t)]}>
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh,
  },
  filterActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  filterText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  filterTextActive: { color: COLORS.primaryLight, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8,
    elevation: 10,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },

  catCard: { marginBottom: SPACING.sm, paddingVertical: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  catName: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  typePill: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },

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
  typeToggle: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: COLORS.surfaceHigh,
  },
  toggleBtnActive: (t) => ({
    borderColor: t === 'income' ? COLORS.income : COLORS.expense,
    backgroundColor: t === 'income' ? '#0D3D2E' : '#3D0D1A',
  }),
  toggleText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sizes.md },
  toggleTextActive: (t) => ({ color: t === 'income' ? COLORS.income : COLORS.expense }),
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});