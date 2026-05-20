import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAccounts, createAccount, getAccountBalance, createDepositDetail, createTransfer, getAllTransfers, updateTransfer, deleteTransfer } from '../api/accounts';
import { getAssets, createAsset } from '../api/assets';
import { getOutstandings, createOutstanding, settleOutstanding, deleteOutstanding } from '../api/outstandings';
import { FONTS, SPACING, RADIUS, makeShadow } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate, getMemberName } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import BankLogo from '../components/BankLogo';
import TypeIcon from '../components/TypeIcon';
import { Bank, Briefcase, Handshake, ArrowsLeftRight } from 'phosphor-react-native';

const ACCOUNT_TYPES = ['savings', 'checking', 'cash', 'credit', 'fd', 'rd', 'mutual_fund', 'equity', 'lic', 'ppf', 'nps'];
const TYPE_LABELS = {
  savings: 'Savings', checking: 'Checking', cash: 'Cash', credit: 'Credit Card',
  fd: 'Fixed Deposit', rd: 'Recurring Deposit',
  mutual_fund: 'Mutual Fund', equity: 'Equity / Stocks', lic: 'LIC Policy',
  ppf: 'PPF', nps: 'NPS',
};
const DEPOSIT_TYPES = ['fd', 'rd'];
const EMPTY_TRANSFER_FORM = { from_account_id: '', to_account_id: '', amount: '', txn_date: '', note: '' };

const ASSET_TYPE_KEYS = ['real_estate', 'gold', 'jewelry', 'vehicle', 'stocks', 'mutual_fund', 'fixed_deposit', 'other'];

const EMPTY_ASSET_FORM = {
  name: '', asset_type: 'gold', purchase_price: '',
  current_value: '', purchase_date: '', notes: '',
};

const EMPTY_OUTSTANDING_FORM = {
  person_name: '', amount: '', description: '', direction: 'lent', due_date: '',
};

export default function AccountsScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family } = useAuth();

  const memberMap = Object.fromEntries(
    (family?.members || []).map((m) => [m.user_id, getMemberName(m, user)])
  );

  const [section, setSection] = useState('accounts');

  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [accountModal, setAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'savings', balance: '' });
  const [depositForm, setDepositForm] = useState({ interest_rate: '', tenure_months: '', monthly_installment: '', maturity_amount: '', start_date: '' });
  const [savingAccount, setSavingAccount] = useState(false);

  const [assets, setAssets] = useState([]);
  const [assetModal, setAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState(EMPTY_ASSET_FORM);
  const [savingAsset, setSavingAsset] = useState(false);

  const [outstandings, setOutstandings] = useState({ total_lent: 0, total_borrowed: 0, net_outstanding: 0, items: [] });
  const [showSettled, setShowSettled] = useState(false);
  const [outstandingModal, setOutstandingModal] = useState(false);
  const [outstandingForm, setOutstandingForm] = useState(EMPTY_OUTSTANDING_FORM);
  const [savingOutstanding, setSavingOutstanding] = useState(false);

  const [transfers, setTransfers] = useState([]);
  const [transferModal, setTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER_FORM);
  const [editingTransferId, setEditingTransferId] = useState(null);
  const [savingTransfer, setSavingTransfer] = useState(false);

  const [showMine, setShowMine] = useState(true);
  const [acctTypeFilter, setAcctTypeFilter] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isFamily = (family?.members?.length ?? 0) > 1;

  const load = async () => {
    try {
      setError(null);
      const [list, assetList, outData, txfrList] = await Promise.all([
        getAccounts(), getAssets(), getOutstandings(showSettled), getAllTransfers(),
      ]);
      setAccounts(list || []);
      setAssets(assetList || []);
      setOutstandings(outData || { total_lent: 0, total_borrowed: 0, net_outstanding: 0, items: [] });
      setTransfers(txfrList || []);
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

  useFocusEffect(useCallback(() => { load(); }, [showSettled]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleAddOutstanding = async () => {
    if (!outstandingForm.person_name.trim()) return Alert.alert('Validation', 'Person name is required.');
    if (!outstandingForm.amount) return Alert.alert('Validation', 'Amount is required.');
    setSavingOutstanding(true);
    try {
      await createOutstanding({
        person_name: outstandingForm.person_name.trim(),
        amount: parseFloat(outstandingForm.amount),
        description: outstandingForm.description.trim() || null,
        direction: outstandingForm.direction,
        due_date: outstandingForm.due_date.trim() || null,
      });
      setOutstandingModal(false);
      setOutstandingForm(EMPTY_OUTSTANDING_FORM);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingOutstanding(false);
    }
  };

  const handleOutstandingAction = (item) => {
    const options = item.is_settled
      ? [{ text: 'Delete', style: 'destructive', onPress: () => confirmDelete(item.id) }]
      : [
          { text: 'Mark Settled', onPress: () => confirmSettle(item.id) },
          { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(item.id) },
        ];
    Alert.alert(item.person_name, `${item.direction === 'lent' ? 'Lent to' : 'Borrowed from'} — ${formatCurrency(item.amount)}`, [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmSettle = (id) => {
    settleOutstanding(id).then(load).catch((e) => Alert.alert('Error', e.message));
  };

  const confirmDelete = (id) => {
    deleteOutstanding(id).then(load).catch((e) => Alert.alert('Error', e.message));
  };

  const handleAddAccount = async () => {
    if (!accountForm.name.trim()) return Alert.alert('Validation', 'Account name is required.');
    const isDeposit = DEPOSIT_TYPES.includes(accountForm.type);
    if (isDeposit) {
      if (!depositForm.interest_rate) return Alert.alert('Validation', 'Interest rate is required.');
      if (!depositForm.tenure_months) return Alert.alert('Validation', 'Tenure (months) is required.');
      if (accountForm.type === 'rd' && !depositForm.monthly_installment) return Alert.alert('Validation', 'Monthly installment is required.');
      if (accountForm.type === 'fd' && !accountForm.balance) return Alert.alert('Validation', 'Principal amount is required.');
    }
    setSavingAccount(true);
    try {
      const principal = isDeposit && accountForm.type === 'fd' ? parseFloat(accountForm.balance) || 0 : parseFloat(accountForm.balance) || 0;
      const account = await createAccount({ name: accountForm.name.trim(), type: accountForm.type, opening_balance: principal });
      if (isDeposit) {
        await createDepositDetail(account.id, {
          principal_amount: accountForm.type === 'fd' ? parseFloat(accountForm.balance) || 0 : parseFloat(depositForm.monthly_installment) || 0,
          monthly_installment: accountForm.type === 'rd' ? parseFloat(depositForm.monthly_installment) || 0 : null,
          interest_rate: parseFloat(depositForm.interest_rate),
          tenure_months: parseInt(depositForm.tenure_months, 10),
          maturity_amount: depositForm.maturity_amount ? parseFloat(depositForm.maturity_amount) : null,
          start_date: depositForm.start_date.trim() || null,
        });
      }
      setAccountModal(false);
      setAccountForm({ name: '', type: 'savings', balance: '' });
      setDepositForm({ interest_rate: '', tenure_months: '', monthly_installment: '', maturity_amount: '', start_date: '' });
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.from_account_id) return Alert.alert('Validation', 'Select source account.');
    if (!transferForm.to_account_id)   return Alert.alert('Validation', 'Select destination account.');
    if (transferForm.from_account_id === transferForm.to_account_id)
      return Alert.alert('Validation', 'Source and destination must be different.');
    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0)
      return Alert.alert('Validation', 'Enter a valid amount.');
    setSavingTransfer(true);
    const payload = {
      from_account_id: transferForm.from_account_id,
      to_account_id:   transferForm.to_account_id,
      amount:          parseFloat(transferForm.amount),
      txn_date:        transferForm.txn_date || new Date().toISOString().split('T')[0],
      note:            transferForm.note.trim() || null,
    };
    try {
      if (editingTransferId) {
        await updateTransfer(editingTransferId, payload);
      } else {
        await createTransfer(payload);
      }
      setTransferModal(false);
      setTransferForm(EMPTY_TRANSFER_FORM);
      setEditingTransferId(null);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleTransferAction = (item) => {
    Alert.alert(
      `${item.from_account_name} → ${item.to_account_name}`,
      `${formatCurrency(item.amount)} · ${formatDate(item.txn_date)}`,
      [
        {
          text: 'Edit', onPress: () => {
            setEditingTransferId(item.id);
            setTransferForm({
              from_account_id: item.from_account_id,
              to_account_id:   item.to_account_id,
              amount:          String(item.amount),
              txn_date:        item.txn_date,
              note:            item.note || '',
            });
            setTransferModal(true);
          },
        },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            deleteTransfer(item.id).then(load).catch((e) => Alert.alert('Error', e.message));
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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

      {isFamily && (
        <View style={styles.ownerRow}>
          {[{ key: true, label: 'Mine' }, { key: false, label: 'All Members' }].map((opt) => (
            <TouchableOpacity
              key={String(opt.key)}
              style={[styles.ownerChip, showMine === opt.key && styles.ownerChipActive]}
              onPress={() => setShowMine(opt.key)}
            >
              <Text style={[styles.ownerChipText, showMine === opt.key && styles.ownerChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {section === 'accounts' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterRow} contentContainerStyle={styles.typeFilterContent}>
          {[null, 'savings', 'checking', 'cash', 'credit', 'fd', 'rd', 'mutual_fund', 'equity', 'ppf', 'nps'].map((t) => {
            const exists = t === null || accounts.some((a) => a.type === t);
            if (!exists) return null;
            return (
              <TouchableOpacity
                key={String(t)}
                style={[styles.typeFilterChip, acctTypeFilter === t && styles.typeFilterChipActive]}
                onPress={() => setAcctTypeFilter(acctTypeFilter === t ? null : t)}
              >
                <Text style={[styles.typeFilterChipText, acctTypeFilter === t && styles.typeFilterChipTextActive]}>
                  {t === null ? 'All Types' : TYPE_LABELS[t] || t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.sectionRow}>
        {[
          { key: 'accounts',     label: 'Accounts' },
          { key: 'assets',       label: 'Assets' },
          { key: 'outstandings', label: 'Loans' },
          { key: 'transfers',    label: 'Transfers' },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sectionChip, section === s.key && styles.sectionChipActive]}
            onPress={() => setSection(s.key)}
          >
            <Text style={[styles.sectionChipText, section === s.key && styles.sectionChipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'accounts' && (
        <FlatList
          data={(showMine && isFamily ? accounts.filter((a) => a.user_id === user?.id) : accounts).filter((a) => !acctTypeFilter || a.type === acctTypeFilter)}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={<EmptyState icon={<Bank size={48} color={C.textMuted} />} message="No accounts yet. Tap + to add one!" />}
          renderItem={({ item }) => {
            const isOther = item.user_id && item.user_id !== user?.id;
            const ownerName = isOther ? (memberMap[item.user_id] || 'Family Member') : null;
            return (
              <TouchableOpacity onPress={() => navigation.navigate('AccountDetail', { account: item, balance: balances[item.id] })}>
                <Card style={styles.accountCard}>
                  <View style={styles.row}>
                    <BankLogo name={item.name} size={44} style={styles.avatar} />
                    <View style={styles.info}>
                      <Text style={styles.name}>{item.name}</Text>
                      <View style={styles.tagRow}>
                        <View style={styles.typePill}>
                          <View style={styles.typePillContent}>
                            <TypeIcon type={item.type} size={11} color={C.textMuted} />
                            <Text style={styles.typeText}>{item.type}</Text>
                          </View>
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
      )}

      {section === 'assets' && (
        <FlatList
          data={showMine && isFamily ? assets.filter((a) => a.user_id === user?.id) : assets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={assets.length > 0 ? (
            <View style={styles.portfolioHeader}>
              <Text style={styles.portfolioLabel}>TOTAL PORTFOLIO</Text>
              <Text style={[styles.portfolioValue, { color: C.netBalance }]}>{formatCurrency(totalAssetValue)}</Text>
            </View>
          ) : null}
          ListEmptyComponent={<EmptyState icon={<Briefcase size={48} color={C.textMuted} />} message="No assets yet. Tap + to add one!" />}
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
                      <TypeIcon type={item.asset_type} size={22} color={C.primaryLight} />
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

      {section === 'transfers' && (
        <FlatList
          data={transfers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={<EmptyState icon={<ArrowsLeftRight size={48} color={C.textMuted} />} message="No transfers yet. Tap ⇄ to add one!" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleTransferAction(item)}>
              <Card style={styles.accountCard}>
                <View style={styles.row}>
                  <View style={[styles.transferIconWrap, { backgroundColor: C.primary + '22' }]}>
                    <ArrowsLeftRight size={20} color={C.primaryLight} />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.transferRoute}>
                      <BankLogo name={item.from_account_name} size={16} />
                      <Text style={styles.transferArrow}> → </Text>
                      <BankLogo name={item.to_account_name} size={16} />
                      <Text style={styles.transferAccountName} numberOfLines={1}>
                        {item.from_account_name} → {item.to_account_name}
                      </Text>
                    </View>
                    <Text style={styles.txMeta}>{formatDate(item.txn_date)}{item.note ? ` · ${item.note}` : ''}</Text>
                  </View>
                  <Text style={[styles.balance, { color: C.primaryLight }]}>{formatCurrency(item.amount)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {section === 'outstandings' && (
        <FlatList
          data={showMine && isFamily ? outstandings.items.filter((i) => i.user_id === user?.id) : outstandings.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={(
            <>
              <View style={styles.outstandingSummary}>
                <View style={styles.outStat}>
                  <Text style={styles.outStatLabel}>Lent Out</Text>
                  <Text style={[styles.outStatValue, { color: C.income }]}>{formatCurrency(outstandings.total_lent)}</Text>
                </View>
                <View style={styles.outStatDivider} />
                <View style={styles.outStat}>
                  <Text style={styles.outStatLabel}>Borrowed</Text>
                  <Text style={[styles.outStatValue, { color: C.expense }]}>{formatCurrency(outstandings.total_borrowed)}</Text>
                </View>
                <View style={styles.outStatDivider} />
                <View style={styles.outStat}>
                  <Text style={styles.outStatLabel}>Net</Text>
                  <Text style={[styles.outStatValue, { color: outstandings.net_outstanding >= 0 ? C.income : C.expense }]}>
                    {formatCurrency(outstandings.net_outstanding)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.settledToggle}
                onPress={() => setShowSettled((v) => !v)}
              >
                <Text style={[styles.settledToggleText, { color: showSettled ? C.primaryLight : C.textMuted }]}>
                  {showSettled ? '✓ Showing Settled' : 'Show Settled'}
                </Text>
              </TouchableOpacity>
            </>
          )}
          ListEmptyComponent={<EmptyState icon={<Handshake size={48} color={C.textMuted} />} message={showSettled ? 'No settled loans.' : 'No active loans. Tap + to add one!'} />}
          renderItem={({ item }) => {
            const isLent = item.direction === 'lent';
            const isOverdue = item.due_date && !item.is_settled && new Date(item.due_date) < new Date();
            return (
              <TouchableOpacity onPress={() => handleOutstandingAction(item)}>
                <Card style={[styles.accountCard, item.is_settled && styles.settledCard]}>
                  <View style={styles.row}>
                    <View style={[styles.outIconWrap, { backgroundColor: isLent ? C.income + '22' : C.expense + '22' }]}>
                      <Text style={styles.outIcon}>{isLent ? '↗' : '↙'}</Text>
                    </View>
                    <View style={styles.info}>
                      <View style={styles.outNameRow}>
                        <Text style={styles.name}>{item.person_name}</Text>
                        {item.is_settled && <View style={styles.settledBadge}><Text style={styles.settledBadgeText}>Settled</Text></View>}
                      </View>
                      <Text style={styles.outDirection}>{isLent ? 'Lent to' : 'Borrowed from'}{item.description ? ` · ${item.description}` : ''}</Text>
                      {item.due_date && (
                        <Text style={[styles.dueDate, { color: isOverdue ? C.expense : C.textMuted }]}>
                          {isOverdue ? '⚠️ ' : ''}Due {item.due_date}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.balance, { color: isLent ? C.income : C.expense }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Transfer FAB */}
      {(section === 'accounts' || section === 'transfers') && (
        <TouchableOpacity
          style={[styles.fab, styles.fabTransfer]}
          onPress={() => { setEditingTransferId(null); setTransferForm(EMPTY_TRANSFER_FORM); setTransferModal(true); }}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>⇄</Text>
        </TouchableOpacity>
      )}

      {section !== 'transfers' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (section === 'accounts') setAccountModal(true);
            else if (section === 'assets') setAssetModal(true);
            else setOutstandingModal(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Account add modal */}
      <Modal visible={accountModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>New Account</Text>

            <Text style={styles.label}>Account Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC FD 2024"
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
                  <View style={styles.chipLabel}>
                    <TypeIcon type={t} size={13} color={accountForm.type === t ? C.primaryLight : C.textMuted} />
                    <Text style={[styles.typeChipText, accountForm.type === t && styles.typeChipTextActive]}>
                      {TYPE_LABELS[t] || t.toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {DEPOSIT_TYPES.includes(accountForm.type) ? (
              <>
                {accountForm.type === 'fd' ? (
                  <>
                    <Text style={styles.label}>Principal Amount <Text style={styles.required}>*</Text></Text>
                    <TextInput style={styles.input} placeholder="e.g. 100000" placeholderTextColor={C.textMuted} keyboardType="numeric" value={accountForm.balance} onChangeText={(v) => setAccountForm({ ...accountForm, balance: v })} />
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Monthly Installment <Text style={styles.required}>*</Text></Text>
                    <TextInput style={styles.input} placeholder="e.g. 5000" placeholderTextColor={C.textMuted} keyboardType="numeric" value={depositForm.monthly_installment} onChangeText={(v) => setDepositForm({ ...depositForm, monthly_installment: v })} />
                  </>
                )}
                <Text style={styles.label}>Interest Rate (% p.a.) <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholder="e.g. 7.5" placeholderTextColor={C.textMuted} keyboardType="numeric" value={depositForm.interest_rate} onChangeText={(v) => setDepositForm({ ...depositForm, interest_rate: v })} />

                <Text style={styles.label}>Tenure (months) <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholder="e.g. 24" placeholderTextColor={C.textMuted} keyboardType="numeric" value={depositForm.tenure_months} onChangeText={(v) => setDepositForm({ ...depositForm, tenure_months: v })} />

                <Text style={styles.label}>Start Date <Text style={styles.optional}>(YYYY-MM-DD)</Text></Text>
                <TextInput style={styles.input} placeholder="defaults to today" placeholderTextColor={C.textMuted} value={depositForm.start_date} onChangeText={(v) => setDepositForm({ ...depositForm, start_date: v })} />

                <Text style={styles.label}>Maturity Amount <Text style={styles.optional}>(auto-computed if blank)</Text></Text>
                <TextInput style={styles.input} placeholder="Leave blank to auto-calculate" placeholderTextColor={C.textMuted} keyboardType="numeric" value={depositForm.maturity_amount} onChangeText={(v) => setDepositForm({ ...depositForm, maturity_amount: v })} />
              </>
            ) : (
              <>
                <Text style={styles.label}>Opening Balance</Text>
                <TextInput style={styles.input} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={accountForm.balance} onChangeText={(v) => setAccountForm({ ...accountForm, balance: v })} />
              </>
            )}

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => { setAccountModal(false); setAccountForm({ name: '', type: 'savings', balance: '' }); setDepositForm({ interest_rate: '', tenure_months: '', monthly_installment: '', maturity_amount: '', start_date: '' }); }} style={styles.halfBtn} />
              <Button title="Save" onPress={handleAddAccount} loading={savingAccount} style={styles.halfBtn} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Outstanding add modal */}
      <Modal visible={outstandingModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>New Loan Entry</Text>

            <Text style={styles.label}>Direction</Text>
            <View style={styles.chipRow}>
              {[{ key: 'lent', label: '↗ I Lent' }, { key: 'borrowed', label: '↙ I Borrowed' }].map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.typeChip, outstandingForm.direction === d.key && styles.typeChipActive]}
                  onPress={() => setOutstandingForm({ ...outstandingForm, direction: d.key })}
                >
                  <Text style={[styles.typeChipText, outstandingForm.direction === d.key && styles.typeChipTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Person Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ravi Kumar"
              placeholderTextColor={C.textMuted}
              value={outstandingForm.person_name}
              onChangeText={(v) => setOutstandingForm({ ...outstandingForm, person_name: v })}
            />

            <Text style={styles.label}>Amount <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={outstandingForm.amount}
              onChangeText={(v) => setOutstandingForm({ ...outstandingForm, amount: v })}
            />

            <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Emergency loan"
              placeholderTextColor={C.textMuted}
              value={outstandingForm.description}
              onChangeText={(v) => setOutstandingForm({ ...outstandingForm, description: v })}
            />

            <Text style={styles.label}>Due Date <Text style={styles.optional}>(YYYY-MM-DD)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="2025-12-31"
              placeholderTextColor={C.textMuted}
              value={outstandingForm.due_date}
              onChangeText={(v) => setOutstandingForm({ ...outstandingForm, due_date: v })}
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => { setOutstandingModal(false); setOutstandingForm(EMPTY_OUTSTANDING_FORM); }} style={styles.halfBtn} />
              <Button title="Save" onPress={handleAddOutstanding} loading={savingOutstanding} style={styles.halfBtn} />
            </View>
          </ScrollView>
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
              {ASSET_TYPE_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeChip, assetForm.asset_type === key && styles.typeChipActive]}
                  onPress={() => setAssetForm({ ...assetForm, asset_type: key })}
                >
                  <View style={styles.chipLabel}>
                    <TypeIcon type={key} size={13} color={assetForm.asset_type === key ? C.primaryLight : C.textMuted} />
                    <Text style={[styles.typeChipText, assetForm.asset_type === key && styles.typeChipTextActive]}>
                      {key.replace('_', ' ')}
                    </Text>
                  </View>
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

      {/* Transfer modal */}
      <Modal visible={transferModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editingTransferId ? 'Edit Transfer' : 'Transfer Money'}</Text>

            <Text style={styles.label}>From Account <Text style={styles.required}>*</Text></Text>
            <View style={styles.chipRow}>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.typeChip, transferForm.from_account_id === a.id && styles.typeChipActive]}
                  onPress={() => setTransferForm({ ...transferForm, from_account_id: a.id })}
                >
                  <View style={styles.chipLabel}>
                    <TypeIcon type={a.type} size={13} color={transferForm.from_account_id === a.id ? C.primaryLight : C.textMuted} />
                    <Text style={[styles.typeChipText, transferForm.from_account_id === a.id && styles.typeChipTextActive]}>
                      {a.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>To Account <Text style={styles.required}>*</Text></Text>
            <View style={styles.chipRow}>
              {accounts.filter((a) => a.id !== transferForm.from_account_id).map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.typeChip, transferForm.to_account_id === a.id && styles.typeChipActive]}
                  onPress={() => setTransferForm({ ...transferForm, to_account_id: a.id })}
                >
                  <View style={styles.chipLabel}>
                    <TypeIcon type={a.type} size={13} color={transferForm.to_account_id === a.id ? C.primaryLight : C.textMuted} />
                    <Text style={[styles.typeChipText, transferForm.to_account_id === a.id && styles.typeChipTextActive]}>
                      {a.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Amount <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="₹0"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={transferForm.amount}
              onChangeText={(v) => setTransferForm({ ...transferForm, amount: v })}
            />

            <Text style={styles.label}>Date <Text style={styles.optional}>(YYYY-MM-DD, default today)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={new Date().toISOString().split('T')[0]}
              placeholderTextColor={C.textMuted}
              value={transferForm.txn_date}
              onChangeText={(v) => setTransferForm({ ...transferForm, txn_date: v })}
            />

            <Text style={styles.label}>Note <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CC bill payment, FD maturity"
              placeholderTextColor={C.textMuted}
              value={transferForm.note}
              onChangeText={(v) => setTransferForm({ ...transferForm, note: v })}
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => { setTransferModal(false); setTransferForm(EMPTY_TRANSFER_FORM); setEditingTransferId(null); }} style={styles.halfBtn} />
              <Button title={editingTransferId ? 'Save' : 'Transfer'} onPress={handleTransfer} loading={savingTransfer} style={styles.halfBtn} />
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

  ownerRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 4 },
  typeFilterRow: { flexGrow: 0, paddingTop: 4, paddingBottom: 4 },
  typeFilterContent: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md },
  typeFilterChip: { paddingHorizontal: SPACING.sm + 2, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  typeFilterChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  typeFilterChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  typeFilterChipTextActive: { color: C.primaryLight, fontWeight: '700' },
  ownerChip: { paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  ownerChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  ownerChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  ownerChipTextActive: { color: C.primaryLight },

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
    ...makeShadow(C.primary, { opacity: 0.5, elevation: 10 }),
  },
  fabTransfer: { bottom: 90, backgroundColor: C.income },
  fabIcon: { color: '#fff', fontSize: 26, lineHeight: 30 },

  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: SPACING.sm },
  assetIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },

  info: { flex: 1 },
  name: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  typePill: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  typePillContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeText: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  ownerPill: { backgroundColor: C.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  ownerText: { color: C.primaryLight, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  dateBadge: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  balance: { fontWeight: '700', fontSize: FONTS.sizes.lg },
  assetRight: { alignItems: 'flex-end' },
  gainBadge: { fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },

  outstandingSummary: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: C.border, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  outStat: { flex: 1, alignItems: 'center' },
  outStatLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginBottom: 4 },
  outStatValue: { fontSize: FONTS.sizes.md, fontWeight: '800' },
  outStatDivider: { width: 1, backgroundColor: C.border, marginHorizontal: SPACING.sm },
  settledToggle: { alignSelf: 'flex-end', marginBottom: SPACING.sm, paddingVertical: 4, paddingHorizontal: SPACING.sm },
  settledToggleText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  transferIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  transferRoute: { flexDirection: 'row', alignItems: 'center' },
  transferArrow: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  transferAccountName: { flex: 1, color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600', marginLeft: 4 },
  txMeta: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  outIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  outIcon: { fontSize: 20, fontWeight: '700' },
  outNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outDirection: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  dueDate: { fontSize: FONTS.sizes.xs, marginTop: 2 },
  settledCard: { opacity: 0.6 },
  settledBadge: { backgroundColor: C.income + '22', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  settledBadgeText: { color: C.income, fontSize: FONTS.sizes.xs, fontWeight: '700' },

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
  chipLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },
});
