import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import apiClient from '../api/config';

export default function CategoryDetailScreen({ route, navigation }) {
  const { category } = route.params;

  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ name: category.name, kind: category.kind });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    setSaving(true);
    try {
      await apiClient.put(`/categories/${category.id}`, {
        name: form.name.trim(),
        kind: form.kind,
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
      ? window.confirm(`Delete "${category.name}"? Transactions using it may be affected.`)
      : true;
    if (!confirmed) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/categories/${category.id}`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Hero */}
      <Card style={styles.heroCard}>
        <View style={[styles.iconBg, { backgroundColor: category.kind === 'income' ? '#0D3D2E' : '#3D0D1A' }]}>
          <Text style={styles.icon}>{category.kind === 'income' ? '↑' : '↓'}</Text>
        </View>
        <Text style={styles.heroName}>{category.name}</Text>
        <View style={[styles.kindPill, { backgroundColor: category.kind === 'income' ? '#0D3D2E' : '#3D0D1A' }]}>
          <Text style={[styles.kindText, { color: category.kind === 'income' ? COLORS.income : COLORS.expense }]}>
            {category.kind}
          </Text>
        </View>
      </Card>

      {/* Actions */}
      <Button title="✏️  Edit Category" onPress={() => setEditModal(true)} style={styles.editBtn} />
      <Button
        title={deleting ? 'Deleting...' : '🗑️  Delete Category'}
        variant="outline"
        onPress={handleDelete}
        loading={deleting}
        style={styles.deleteBtn}
      />

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Category</Text>

            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
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
              <Button title="Cancel" variant="outline" onPress={() => setEditModal(false)} style={styles.halfBtn} />
              <Button title="Save" onPress={handleEdit} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
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
  heroName: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '700', marginBottom: SPACING.sm },
  kindPill: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  kindText: { fontSize: FONTS.sizes.sm, fontWeight: '600' },

  editBtn: { marginBottom: SPACING.sm },
  deleteBtn: { borderColor: COLORS.expense },

  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl,
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