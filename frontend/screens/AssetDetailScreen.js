import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';
import { updateAsset, deleteAsset } from '../api/assets';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import Button from '../components/Button';
import Card from '../components/Card';
import TypeIcon from '../components/TypeIcon';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 2 - 32;

const ASSET_TYPE_KEYS = ['real_estate', 'gold', 'jewelry', 'vehicle', 'stocks', 'mutual_fund', 'fixed_deposit', 'other'];

export default function AssetDetailScreen({ route, navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { asset: initialAsset } = route.params;
  const [asset, setAsset] = useState(initialAsset);

  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({
    name: asset.name,
    asset_type: asset.asset_type,
    purchase_price: asset.purchase_price != null ? String(asset.purchase_price) : '',
    current_value: String(asset.current_value),
    purchase_date: asset.purchase_date || '',
    notes: asset.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cv = parseFloat(asset.current_value || 0);
  const pp = asset.purchase_price != null ? parseFloat(asset.purchase_price) : null;
  const gain = pp != null ? cv - pp : null;
  const gainPct = (pp && pp !== 0) ? ((gain / pp) * 100).toFixed(1) : null;

  const history = (asset.value_history || []).slice().reverse();

  const lineData = history.length >= 2
    ? history.map((h) => ({
        value: parseFloat(h.value),
        label: new Date(h.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        dataPointColor: C.netBalance,
        labelTextStyle: { color: C.textMuted, fontSize: 9 },
      }))
    : [];

  const handleEdit = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    if (!form.current_value) return Alert.alert('Validation', 'Current value is required.');
    setSaving(true);
    try {
      const updated = await updateAsset(asset.id, {
        name: form.name.trim(),
        asset_type: form.asset_type,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        current_value: parseFloat(form.current_value),
        purchase_date: form.purchase_date.trim() || null,
        notes: form.notes.trim() || null,
      });
      setAsset(updated);
      setEditModal(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Asset', `Delete "${asset.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await deleteAsset(asset.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      <Card style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <TypeIcon type={asset.asset_type} size={44} color={C.primaryLight} />
        </View>
        <Text style={styles.heroName}>{asset.name}</Text>
        <Text style={styles.heroLabel}>CURRENT VALUE</Text>
        <Text style={[styles.heroAmount, { color: C.netBalance }]}>{formatCurrency(cv)}</Text>
        {gain != null && (
          <View style={[styles.gainChip, { backgroundColor: gain >= 0 ? C.incomeSubtle : C.expenseSubtle }]}>
            <Text style={[styles.gainChipText, { color: gain >= 0 ? C.income : C.expense }]}>
              {gain >= 0 ? '▲' : '▼'} {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct}%)
            </Text>
          </View>
        )}
      </Card>

      <Card style={styles.infoCard}>
        <InfoRow label="Type" value={asset.asset_type.replace('_', ' ')} icon={<TypeIcon type={asset.asset_type} size={14} color={C.textMuted} />} styles={styles} />
        <View style={styles.divider} />
        <InfoRow label="Purchase Price" value={pp != null ? formatCurrency(pp) : '—'} styles={styles} />
        <View style={styles.divider} />
        <InfoRow label="Purchase Date" value={asset.purchase_date ? formatDate(asset.purchase_date) : '—'} styles={styles} />
        {asset.notes ? (
          <>
            <View style={styles.divider} />
            <InfoRow label="Notes" value={asset.notes} styles={styles} />
          </>
        ) : null}
      </Card>

      {history.length > 0 && (
        <Card style={styles.historyCard}>
          <Text style={styles.historyTitle}>VALUE HISTORY</Text>
          {lineData.length >= 2 && (
            <LineChart
              data={lineData}
              areaChart
              color={C.netBalance}
              startFillColor={C.netBalance}
              startOpacity={0.25}
              endOpacity={0.03}
              curved
              isAnimated
              width={CHART_WIDTH}
              yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }}
              xAxisColor={C.border}
              yAxisColor={C.border}
              rulesColor={C.border}
              dataPointsColor={C.netBalance}
              thickness={2}
            />
          )}
          {history.map((h, i) => (
            <View key={String(h.recorded_at)} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
              <Text style={styles.historyDate}>
                {new Date(h.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
              <Text style={[styles.historyValue, { color: C.netBalance }]}>{formatCurrency(parseFloat(h.value))}</Text>
            </View>
          ))}
        </Card>
      )}

      <Button title="✏️  Edit Asset" onPress={() => setEditModal(true)} style={styles.editBtn} />
      <Button
        title={deleting ? 'Deleting...' : '🗑️  Delete Asset'}
        variant="outline"
        onPress={handleDelete}
        loading={deleting}
        style={styles.deleteBtn}
      />

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Asset</Text>

            <Text style={styles.label}>Asset Name</Text>
            <TextInput style={styles.input} placeholderTextColor={C.textMuted} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />

            <Text style={styles.label}>Type</Text>
            <View style={styles.chipRow}>
              {ASSET_TYPE_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeChip, form.asset_type === key && styles.typeChipActive]}
                  onPress={() => setForm({ ...form, asset_type: key })}
                >
                  <View style={styles.chipLabel}>
                    <TypeIcon type={key} size={13} color={form.asset_type === key ? C.primaryLight : C.textMuted} />
                    <Text style={[styles.typeChipText, form.asset_type === key && styles.typeChipTextActive]}>
                      {key.replace('_', ' ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Current Value</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholderTextColor={C.textMuted} value={form.current_value} onChangeText={(v) => setForm({ ...form, current_value: v })} />

            <Text style={styles.label}>Purchase Price <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholderTextColor={C.textMuted} value={form.purchase_price} onChangeText={(v) => setForm({ ...form, purchase_price: v })} />

            <Text style={styles.label}>Purchase Date <Text style={styles.optional}>(YYYY-MM-DD)</Text></Text>
            <TextInput style={styles.input} placeholder="2022-03-15" placeholderTextColor={C.textMuted} value={form.purchase_date} onChangeText={(v) => setForm({ ...form, purchase_date: v })} />

            <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={[styles.input, styles.notesInput]} multiline placeholderTextColor={C.textMuted} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setEditModal(false)} style={styles.halfBtn} />
              <Button title="Save" onPress={handleEdit} loading={saving} style={styles.halfBtn} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value, icon, styles }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {icon ? (
        <View style={styles.infoValueRow}>
          {icon}
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  heroCard: { marginBottom: SPACING.md, padding: SPACING.lg, alignItems: 'center' },
  heroIconWrap: { marginBottom: SPACING.sm },
  heroName: { color: C.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700', marginBottom: SPACING.sm, textAlign: 'center' },
  heroLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  heroAmount: { fontSize: FONTS.sizes.hero, fontWeight: '800', marginVertical: SPACING.sm },
  gainChip: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 5 },
  gainChipText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

  infoCard: { marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm },
  infoLabel: { color: C.textMuted, fontSize: FONTS.sizes.md },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '60%' },
  infoValue: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: SPACING.md },
  divider: { height: 1, backgroundColor: C.border },

  historyCard: { marginBottom: SPACING.md, padding: SPACING.md },
  historyTitle: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm - 2 },
  historyDivider: { borderTopWidth: 1, borderTopColor: C.border },
  historyDate: { color: C.textSecondary, fontSize: FONTS.sizes.sm },
  historyValue: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

  editBtn: { marginBottom: SPACING.sm },
  deleteBtn: { borderColor: C.expense },

  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: 1, borderColor: C.border,
  },
  modalTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  optional: { color: C.textMuted, fontWeight: '400' },
  input: {
    backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: C.border, color: C.textPrimary, padding: SPACING.sm + 4, fontSize: FONTS.sizes.md,
  },
  notesInput: { height: 72, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh,
  },
  typeChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  typeChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  typeChipTextActive: { color: C.primaryLight },
  chipLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});
