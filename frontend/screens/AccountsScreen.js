import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAccounts, createAccount, getAccountBalance } from '../api/accounts';
import { getAssets, createAsset } from '../api/assets';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import BankLogo from '../components/BankLogo';

const ACCOUNT_TYPES = ['savings', 'checking', 'cash', 'credit'];
const TYPE_ICONS = { savings: '🏦', checking: '💳', cash: '💵', credit: '🔖' };

const ASSET_TYPES = {
  real_estate:   '🏠',
  gold:          '🪙',
  jewelry:       '💍',
  vehicle:       '🚗',
  stocks:        '📈',
  mutual_fund:   '📊',
  fixed_deposit: '🏦',
  other:         '💼',
};

const EMPTY_ASSET_FORM = {
  name: '', asset_type: 'gold', purchase_price: '',
  current_value: '', purchase_date: '', notes: '',
};

export default function AccountsScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family } = useAuth();

  const memberMap = Object.fromEntries(
    (family?.members || []).map((m) => [m.user_id, m.display_name || null])
  );

  const [section, setSection] = useState('accounts');

  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [accountModal, setAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'savings', balance: '' });
  const [savingAccount, setSavingAccount] = useState(false);

  const [assets, setAssets] = useState([]);
  const [assetModal, setAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState(EMPTY_ASSET_FORM);
  const [savingAsset, setSavingAsset] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setError(null);
      const [list, assetList] = await Promise.all([getAccounts(), getAssets()]);
      setAccounts(list || []);
      setAssets(assetList || []);
      const bals = await Promise.allSettled(
        (list || []).map((a) => getAccountBalance(a.id).then((r) => ({ id: a.id, balance: r.balance })))
      );
      const balMap = {};
      bals.forEach((r) => { if (r.status === 'fulfilled') balMap[r.value.id] = r.value.balance; });
      setBalances(balMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleAddAccount = async () => {
    if (!accountForm.name.trim()) return Alert.alert('Validation', 'Account name is required.');
    setSavingAccount(true);
    try {
      await createAccount({ name: accountForm.name.trim(), type: accountForm.type, opening_balance: parseFloat(accountForm.balance) || 0 });
      setAccountModal(false);
      setAccountForm({ name: '', type: 'savings', balance: '' });
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleAddAsset = async () => {
    if (!assetForm.name.trim()) return Alert.alert('Validation', 'Asset name is required.');
    if (!assetForm.current_value) return Alert.alert('Validation', 'Current value is required.');
    setSavingAsset(true);
    try {
      await createAsset({
        name: assetForm.name.trim(),
        asset_type: assetForm.asset_type,
        purchase_price: assetForm.purchase_price ? parseFloat(assetForm.purchase_price) : null,
        current_value: parseFloat(assetForm.current_value),
        purchase_date: assetForm.purchase_date.trim() || null,
        notes: assetForm.notes.trim() || null,
      });
      setAssetModal(false);
      setAssetForm(EMPTY_ASSET_FORM);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingAsset(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const totalAssetValue = assets.reduce((sum, a) => sum + parseFloat(a.current_value || 0), 0);

  return (
    <View style={styles.screen}>
      {error && <ErrorBanner message={error} onRetry={load} />}

      <View style={styles.sectionRow}>
        <TouchableOpacity
          style={[styles.sectionChip, section === 'accounts' && styles.sectionChipActive]}
          onPress={() => setSection('accounts')}
        >
          <Text style={[styles.sectionChipText, section === 'accounts' && styles.sectionChipTextActive]}>
            🏦 Accounts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionChip, section === 'assets' && styles.sectionChipActive]}
          onPress={() => setSection('assets')}
        >
          <Text style={[styles.sectionChipText, section === 'assets' && styles.sectionChipTextActive]}>
            💼 Assets
          </Text>
        </TouchableOpacity>
      </View>

      {section === 'accounts' ? (
        <FlatList
          data={accounts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={<EmptyState icon="🏦" message="No accounts yet. Tap + to add one!" />}
          renderItem={({ item }) => {
            const isOther = item.user_id && item.user_id !== user?.id;
            const ownerName = isOther ? (memberMap[item.user_id] || 'Member') : null;
            return (
              <TouchableOpacity onPress={() => navigation.navigate('AccountDetail', { account: item, balance: balances[item.id] })}>
                <Card style={styles.accountCard}>
                  <View style={styles.row}>
                    <BankLogo name={item.name} size={44} style={styles.avatar} />
                    <View style={styles.info}>
                      <Text style={styles.name}>{item.name}</Text>
                      <View style={styles.tagRow}>
                        <View style={styles.typePill}>
                          <Text style={styles.typeText}>{TYPE_ICONS[item.type] || '💰'} {item.type}</Text>
                        </View>
                        {ownerName && (
                          <View style={styles.ownerPill}>
                            <Text style={styles.ownerText}>by {ownerName}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.balance, { color: (balances[item.id] ?? item.opening_balance ?? 0) >= 0 ? C.income : C.expense }]}>
                      {formatCurrency(balances[item.id] ?? item.opening_balance ?? 0)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={assets.length > 0 ? (
            <View style={styles.portfolioHeader}>
              <Text style={styles.portfolioLabel}>TOTAL PORTFOLIO</Text>
              <Text style={[styles.portfolioValue, { color: C.netBalance }]}>{formatCurrency(totalAssetValue)}</Text>
            </View>
          ) : null}
          ListEmptyComponent={<EmptyState icon="💼" message="No assets yet. Tap + to add one!" />}
          renderItem={({ item }) => {
            const cv = parseFloat(item.current_value || 0);
            const pp = item.purchase_price != null ? parseFloat(item.purchase_price) : null;
            const gain = pp != null ? cv - pp : null;
            const gainPct = (pp && pp !== 0) ? ((gain / pp) * 100).toFixed(1) : null;
            return (
              <TouchableOpacity onPress={() => navigation.navigate('AssetDetail', { asset: item })}>
                <Card style={styles.accountCard}>
                  <View style={styles.row}>
                    <View style={styles.assetIconWrap}>
                      <Text style={styles.assetIcon}>{ASSET_TYPES[item.asset_type] || '💼'}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name}>{item.name}</Text>
                      <View style={styles.tagRow}>
                        <View style={styles.typePill}>
                          <Text style={styles.typeText}>{item.asset_type.replace('_', ' ')}</Text>
                        </View>
                        {item.purchase_date && (
                          <Text style={styles.dateBadge}>{formatDate(item.purchase_date)}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.assetRight}>
                      <Text style={[styles.balance, { color: C.netBalance }]}>{formatCurrency(cv)}</Text>
                      {gain != null && (
                        <Text style={[styles.gainBadge, { color: gain >= 0 ? C.income : C.expense }]}>
                          {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct}%)
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => section === 'accounts' ? setAccountModal(true) : setAssetModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Account add modal */}
      <Modal visible={accountModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Account</Text>

            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC Savings"
              placeholderTextColor={C.textMuted}
              value={accountForm.name}
              onChangeText={(v) => setAccountForm({ ...accountForm, name: v })}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.chipRow}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, accountForm.type === t && styles.typeChipActive]}
                  onPress={() => setAccountForm({ ...accountForm, type: t })}
                >
                  <Text style={[styles.typeChipText, accountForm.type === t && styles.typeChipTextActive]}>
                    {TYPE_ICONS[t]} {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Opening Balance</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={accountForm.balance}
              onChangeText={(v) => setAccountForm({ ...accountForm, balance: v })}
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setAccountModal(false)} style={styles.halfBtn} />
              <Button title="Save" onPress={handleAddAccount} loading={savingAccount} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Asset add modal */}
      <Modal visible={assetModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>New Asset</Text>

            <Text style={styles.label}>Asset Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Apartment in Chennai"
              placeholderTextColor={C.textMuted}
              value={assetForm.name}
              onChangeText={(v) => setAssetForm({ ...assetForm, name: v })}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.chipRow}>
              {Object.entries(ASSET_TYPES).map(([key, icon]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeChip, assetForm.asset_type === key && styles.typeChipActive]}
                  onPress={() => setAssetForm({ ...assetForm, asset_type: key })}
                >
                  <Text style={[styles.typeChipText, assetForm.asset_type === key && styles.typeChipTextActive]}>
                    {icon} {key.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Current Value <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Market value today"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={assetForm.current_value}
              onChangeText={(v) => setAssetForm({ ...assetForm, current_value: v })}
            />

            <Text style={styles.label}>Purchase Price <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="What you paid"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={assetForm.purchase_price}
              onChangeText={(v) => setAssetForm({ ...assetForm, purchase_price: v })}
            />

            <Text style={styles.label}>Purchase Date <Text style={styles.optional}>(YYYY-MM-DD)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="2022-03-15"
              placeholderTextColor={C.textMuted}
              value={assetForm.purchase_date}
              onChangeText={(v) => setAssetForm({ ...assetForm, purchase_date: v })}
            />

            <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Any details..."
              placeholderTextColor={C.textMuted}
              multiline
              value={assetForm.notes}
              onChangeText={(v) => setAssetForm({ ...assetForm, notes: v })}
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => { setAssetModal(false); setAssetForm(EMPTY_ASSET_FORM); }} style={styles.halfBtn} />
              <Button title="Save" onPress={handleAddAsset} loading={savingAsset} style={styles.halfBtn} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: SPACING.md, paddingBottom: 80 },

  sectionRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, paddingBottom: SPACING.sm },
  sectionChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceHigh,
  },
  sectionChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  sectionChipText: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  sectionChipTextActive: { color: C.primaryLight },

  portfolioHeader: { marginBottom: SPACING.md },
  portfolioLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  portfolioValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', marginTop: 2 },

  accountCard: { marginBottom: SPACING.sm },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },

  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: SPACING.sm },
  assetIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  assetIcon: { fontSize: 22 },
  info: { flex: 1 },
  name: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  typePill: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  ownerPill: { backgroundColor: C.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  ownerText: { color: C.primaryLight, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  dateBadge: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  balance: { fontWeight: '700', fontSize: FONTS.sizes.lg },
  assetRight: { alignItems: 'flex-end' },
  gainBadge: { fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },

  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: 1, borderColor: C.border,
  },
  modalTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  required: { color: C.expense },
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
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});
