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
import apiClient from '../api/config';
import BankLogo from '../components/BankLogo';

const ACCOUNT_TYPES = ['savings', 'checking', 'cash', 'credit'];
const TYPE_ICONS = { savings: '🏦', checking: '💳', cash: '💵', credit: '🔖' };

export default function AccountDetailScreen({ route, navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { account, balance } = route.params;
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ name: account.name, type: account.type, opening_balance: String(account.opening_balance) });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    setSaving(true);
    try {
      await apiClient.put(`/accounts/${account.id}`, { name: form.name.trim(), type: form.type, opening_balance: parseFloat(form.opening_balance) || 0 });
      setEditModal(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm ? window.confirm(`Delete "${account.name}"? This cannot be undone.`) : true;
    if (!confirmed) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/accounts/${account.id}`);
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
        <BankLogo name={account.name} size={56} style={styles.heroLogo} />
        <Text style={styles.heroName}>{account.name}</Text>
        <Text style={styles.heroLabel}>CURRENT BALANCE</Text>
        <Text style={styles.heroAmount}>{formatCurrency(balance ?? account.opening_balance)}</Text>
        <View style={styles.row}>
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{TYPE_ICONS[account.type]} {account.type}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Name</Text>
          <View style={styles.infoValueRow}>
            <BankLogo name={account.name} size={20} style={styles.infoLogo} />
            <Text style={styles.infoValue}>{account.name}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type</Text>
          <Text style={styles.infoValue}>{account.type}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Opening Balance</Text>
          <Text style={styles.infoValue}>{formatCurrency(account.opening_balance)}</Text>
        </View>
      </Card>

      <Button title="✏️  Edit Account" onPress={() => setEditModal(true)} style={styles.editBtn} />
      <Button title={deleting ? 'Deleting...' : '🗑️  Delete Account'} variant="outline" onPress={handleDelete} loading={deleting} style={styles.deleteBtn} />

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Account</Text>

            <Text style={styles.label}>Account Name</Text>
            <TextInput style={styles.input} placeholderTextColor={C.textMuted} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.typeChip, form.type === t && styles.typeChipActive]} onPress={() => setForm({ ...form, type: t })}>
                  <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>{TYPE_ICONS[t]} {t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Opening Balance</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholderTextColor={C.textMuted} value={form.opening_balance} onChangeText={(v) => setForm({ ...form, opening_balance: v })} />

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
  heroLogo: { marginBottom: SPACING.sm },
  heroName: { color: C.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700', marginBottom: SPACING.sm },
  heroLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  heroAmount: { color: C.textPrimary, fontSize: FONTS.sizes.hero, fontWeight: '800', marginVertical: SPACING.sm },
  row: { flexDirection: 'row' },
  typePill: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  typeText: { color: C.textSecondary, fontSize: FONTS.sizes.sm },
  infoCard: { marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  infoLabel: { color: C.textMuted, fontSize: FONTS.sizes.md },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '60%' },
  infoLogo: { marginRight: 6 },
  infoValue: { flexShrink: 1, color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600', textAlign: 'right' },
  divider: { height: 1, backgroundColor: C.border },
  editBtn: { marginBottom: SPACING.sm },
  deleteBtn: { borderColor: C.expense },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: 1, borderColor: C.border },
  modalTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  input: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, color: C.textPrimary, padding: SPACING.sm + 4, fontSize: FONTS.sizes.md },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  typeChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  typeChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  typeChipTextActive: { color: C.primaryLight },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});
