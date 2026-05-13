import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal,
} from 'react-native';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';
import Button from '../components/Button';
import Card from '../components/Card';
import { deleteCategory, updateCategory } from '../api/categories';

export default function CategoryDetailScreen({ route, navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { category } = route.params;
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({
    name: category.name,
    kind: category.kind,
    budget: category.budget != null ? String(category.budget) : '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    const budget = parseFloat(form.budget);
    setSaving(true);
    try {
      await updateCategory(category.id, {
        name: form.name.trim(),
        kind: form.kind,
        budget: !isNaN(budget) && budget > 0 ? budget : null,
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
    Alert.alert(
      'Delete Category',
      `Delete "${category.name}"? Transactions using it may be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteCategory(category.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <View style={[styles.iconBg, { backgroundColor: category.kind === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
          <Text style={styles.icon}>{category.kind === 'income' ? '↑' : '↓'}</Text>
        </View>
        <Text style={styles.heroName}>{category.name}</Text>
        <View style={[styles.kindPill, { backgroundColor: category.kind === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
          <Text style={[styles.kindText, { color: category.kind === 'income' ? C.income : C.expense }]}>
            {category.kind}
          </Text>
        </View>
        {category.budget > 0 && (
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>BUDGET LIMIT</Text>
            <Text style={styles.budgetAmount}>{formatCurrency(category.budget)}</Text>
          </View>
        )}
      </Card>

      <Button title="✏️  Edit Category" onPress={() => setEditModal(true)} style={styles.editBtn} />
      <Button title={deleting ? 'Deleting...' : '🗑️  Delete Category'} variant="outline" onPress={handleDelete} loading={deleting} style={styles.deleteBtn} />

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Category</Text>

            <Text style={styles.label}>Category Name</Text>
            <TextInput style={styles.input} placeholderTextColor={C.textMuted} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />

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
              <Button title="Cancel" variant="outline" onPress={() => setEditModal(false)} style={styles.halfBtn} />
              <Button title="Save" onPress={handleEdit} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
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
  icon: { color: '#fff', fontSize: 32, fontWeight: '700' },
  heroName: { color: C.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '700', marginBottom: SPACING.sm },
  kindPill: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  kindText: { fontSize: FONTS.sizes.sm, fontWeight: '600' },
  budgetRow: { marginTop: SPACING.md, alignItems: 'center' },
  budgetLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 1.5, fontWeight: '600', marginBottom: 4 },
  budgetAmount: { color: C.primaryLight, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  editBtn: { marginBottom: SPACING.sm },
  deleteBtn: { borderColor: C.expense },
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
