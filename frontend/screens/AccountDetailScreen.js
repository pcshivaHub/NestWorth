import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal, Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getMemberName } from '../utils/helpers';
import Button from '../components/Button';
import Card from '../components/Card';
import apiClient from '../api/config';
import BankLogo from '../components/BankLogo';
import TypeIcon from '../components/TypeIcon';
import { getAccountBalanceHistory, getAccounts, getDepositDetail, closeDeposit, getMonthlyBalances, upsertMonthlyBalance } from '../api/accounts';
import { getTransactions } from '../api/transactions';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

const ACCOUNT_TYPES = ['savings', 'checking', 'cash', 'credit', 'fd', 'rd'];
const DEPOSIT_TYPES = ['fd', 'rd'];
const HISTORY_PERIODS = [{ key: 3, label: '3M' }, { key: 6, label: '6M' }, { key: 12, label: '1Y' }];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 2 - 32;

export default function AccountDetailScreen({ route, navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family } = useAuth();

  const { account, balance } = route.params;
  const isDeposit = DEPOSIT_TYPES.includes(account.type);
  const isCC = account.type === 'credit';
  const familyMembers = family?.members || [];
  const isFamily = familyMembers.length > 1;

  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ name: account.name, type: account.type, opening_balance: String(account.opening_balance), user_id: account.user_id || null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [historyMonths, setHistoryMonths] = useState(6);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [deposit, setDeposit] = useState(null);
  const [closeModal, setCloseModal] = useState(false);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [closeForm, setCloseForm] = useState({ closing_amount: '', transferred_to_account_id: '', closed_date: '' });
  const [closing, setClosing] = useState(false);

  const [accountTxns, setAccountTxns] = useState([]);
  const [txnPeriod, setTxnPeriod] = useState('month');
  const [txnLoading, setTxnLoading] = useState(false);

  // Monthly statement (SB accounts only)
  const [monthlyExpanded, setMonthlyExpanded] = useState(false);
  const [monthlyMonths, setMonthlyMonths] = useState(6);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState(null);
  const [entryModal, setEntryModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [entryForm, setEntryForm] = useState({ opening_balance: '', manual_adj: '', note: '' });
  const [entrySaving, setEntrySaving] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getAccountBalanceHistory(account.id, historyMonths);
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [account.id, historyMonths]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const loadTxns = useCallback(async () => {
    setTxnLoading(true);
    try {
      const list = await getTransactions({ account_id: account.id });
      // Client-side guard: ensure only this account's transactions are shown
      setAccountTxns((list || []).filter((tx) => tx.account_id === account.id));
    } catch {
      setAccountTxns([]);
    } finally {
      setTxnLoading(false);
    }
  }, [account.id]);

  useEffect(() => { loadTxns(); }, [loadTxns]);

  const loadMonthly = useCallback(async () => {
    if (account.type !== 'savings') return;
    setMonthlyLoading(true);
    setMonthlyError(null);
    try {
      const data = await getMonthlyBalances(account.id, monthlyMonths);
      setMonthlyRows(data.rows || []);
    } catch (e) {
      setMonthlyError(e.message);
    } finally {
      setMonthlyLoading(false);
    }
  }, [account.id, account.type, monthlyMonths]);

  useEffect(() => {
    if (monthlyExpanded) loadMonthly();
  }, [monthlyExpanded, loadMonthly]);

  const openEntryModal = (row) => {
    setSelectedRow(row);
    setEntryForm({
      opening_balance: row.opening_balance != null ? String(row.opening_balance) : '',
      manual_adj: row.manual_adj !== 0 ? String(row.manual_adj) : '',
      note: row.note || '',
    });
    setEntryModal(true);
  };

  const handleSaveMonthly = async () => {
    if (!selectedRow) return;
    setEntrySaving(true);
    try {
      await upsertMonthlyBalance(account.id, {
        year: selectedRow.year,
        month: selectedRow.month,
        opening_balance: entryForm.opening_balance !== '' ? parseFloat(entryForm.opening_balance) : null,
        manual_adj: parseFloat(entryForm.manual_adj) || 0,
        note: entryForm.note.trim() || null,
      });
      setEntryModal(false);
      await loadMonthly();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setEntrySaving(false);
    }
  };

  useEffect(() => {
    if (!isDeposit) return;
    getDepositDetail(account.id).then(setDeposit).catch(() => setDeposit(null));
  }, [account.id, isDeposit]);

  useEffect(() => {
    if (!isDeposit) return;
    getAccounts().then((list) => {
      setSavingsAccounts((list || []).filter((a) => ['savings', 'checking', 'cash'].includes(a.type)));
    }).catch(() => {});
  }, [isDeposit]);

  const lineData = useMemo(() => history.map((p) => ({ value: p.balance, label: p.label })), [history]);
  const minVal = useMemo(() => Math.min(...lineData.map((d) => d.value), 0), [lineData]);
  const maxVal = useMemo(() => Math.max(...lineData.map((d) => d.value), 0), [lineData]);

  const monthlySpending = useMemo(() => {
    if (!isCC) return [];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const yr = d.getFullYear(); const mo = d.getMonth();
      const value = accountTxns
        .filter((tx) => {
          const td = new Date(tx.txn_date);
          return tx.type === 'expense' && td.getFullYear() === yr && td.getMonth() === mo;
        })
        .reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
      return { value, label: d.toLocaleString('default', { month: 'short' }), frontColor: C.expense };
    });
  }, [accountTxns, isCC, C.expense]);

  const filteredTxns = useMemo(() => {
    const now = new Date();
    return accountTxns.filter((tx) => {
      const d = new Date(tx.txn_date);
      if (txnPeriod === 'week') {
        const cut = new Date(now); cut.setDate(cut.getDate() - 7); return d >= cut;
      }
      if (txnPeriod === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (txnPeriod === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [accountTxns, txnPeriod]);

  const handleEdit = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    setSaving(true);
    try {
      await apiClient.put(`/accounts/${account.id}`, { name: form.name.trim(), type: form.type, opening_balance: parseFloat(form.opening_balance) || 0, user_id: form.user_id || null });
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

  const handleCloseDeposit = async () => {
    if (!closeForm.closing_amount) return Alert.alert('Validation', 'Closing amount is required.');
    if (!closeForm.transferred_to_account_id) return Alert.alert('Validation', 'Select a target account.');
    setClosing(true);
    try {
      const updated = await closeDeposit(account.id, {
        closing_amount: parseFloat(closeForm.closing_amount),
        transferred_to_account_id: closeForm.transferred_to_account_id,
        closed_date: closeForm.closed_date.trim() || null,
      });
      setDeposit(updated);
      setCloseModal(false);
      Alert.alert('Success', `₹${Math.round(parseFloat(closeForm.closing_amount)).toLocaleString('en-IN')} transferred to the selected account.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setClosing(false);
    }
  };

  const currentBalance = balance ?? account.opening_balance ?? 0;
  const isPositive = currentBalance >= 0;
  const chartColor = isPositive ? C.income : C.expense;

  const currentOwner = familyMembers.find((m) => String(m.user_id) === String(account.user_id));
  const currentOwnerName = currentOwner ? getMemberName(currentOwner, user) : 'Unassigned';

  const daysToMaturity = deposit?.maturity_date
    ? Math.ceil((new Date(deposit.maturity_date) - new Date()) / 86400000)
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Hero balance card */}
      <Card style={styles.heroCard}>
        <BankLogo name={account.name} size={56} style={styles.heroLogo} />
        <Text style={styles.heroName}>{account.name}</Text>
        <Text style={styles.heroLabel}>{isDeposit ? 'PRINCIPAL / INVESTED' : 'CURRENT BALANCE'}</Text>
        <Text style={[styles.heroAmount, { color: isPositive ? C.income : C.expense }]}>
          {formatCurrency(currentBalance)}
        </Text>
        <View style={styles.row}>
          <View style={[styles.typePill, styles.typePillContent]}>
            <TypeIcon type={account.type} size={13} color={C.textSecondary} />
            <Text style={styles.typeText}>{account.type.toUpperCase()}</Text>
          </View>
        </View>
      </Card>

      {/* Deposit details card */}
      {isDeposit && deposit && (
        <Card style={styles.depositCard}>
          <View style={styles.depositHeader}>
            <Text style={styles.sectionLabel}>
              {account.type === 'fd' ? 'FIXED DEPOSIT DETAILS' : 'RECURRING DEPOSIT DETAILS'}
            </Text>
            {deposit.is_closed ? (
              <View style={[styles.statusBadge, { backgroundColor: C.textMuted + '33' }]}>
                <Text style={[styles.statusText, { color: C.textMuted }]}>CLOSED</Text>
              </View>
            ) : daysToMaturity !== null && daysToMaturity <= 0 ? (
              <View style={[styles.statusBadge, { backgroundColor: C.income + '33' }]}>
                <Text style={[styles.statusText, { color: C.income }]}>MATURED</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: C.primary + '33' }]}>
                <Text style={[styles.statusText, { color: C.primaryLight }]}>ACTIVE</Text>
              </View>
            )}
          </View>

          <View style={styles.depositGrid}>
            {account.type === 'rd' && deposit.monthly_installment != null && (
              <DepositRow label="Monthly Installment" value={formatCurrency(deposit.monthly_installment)} C={C} styles={styles} />
            )}
            <DepositRow label="Interest Rate" value={`${deposit.interest_rate}% p.a.`} C={C} styles={styles} />
            <DepositRow label="Tenure" value={`${deposit.tenure_months} months (${(deposit.tenure_months / 12).toFixed(1)} yrs)`} C={C} styles={styles} />
            <DepositRow label="Start Date" value={formatDate(deposit.start_date)} C={C} styles={styles} />
            <DepositRow label="Maturity Date" value={formatDate(deposit.maturity_date)} C={C} styles={styles} />
            <DepositRow
              label="Maturity Amount"
              value={formatCurrency(deposit.maturity_amount)}
              valueColor={C.income}
              C={C} styles={styles}
            />
            {daysToMaturity !== null && !deposit.is_closed && daysToMaturity > 0 && (
              <DepositRow label="Days to Maturity" value={`${daysToMaturity} days`} C={C} styles={styles} />
            )}
            {deposit.is_closed && (
              <>
                <View style={styles.closedDivider} />
                <DepositRow label="Closing Amount" value={formatCurrency(deposit.closing_amount)} valueColor={C.expense} C={C} styles={styles} />
                <DepositRow label="Closed On" value={formatDate(deposit.closed_date)} C={C} styles={styles} />
              </>
            )}
          </View>

          {!deposit.is_closed && (
            <Button
              title="Close / Pre-mature Withdrawal"
              variant="outline"
              onPress={() => {
                setCloseForm({ closing_amount: deposit.maturity_amount ? String(Math.round(deposit.maturity_amount)) : '', transferred_to_account_id: savingsAccounts[0]?.id || '', closed_date: '' });
                setCloseModal(true);
              }}
              style={styles.closeBtn}
            />
          )}
        </Card>
      )}

      {/* Transactions for this account */}
      <Card style={styles.txnCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionLabel}>{isCC ? 'CC STATEMENT' : 'TRANSACTIONS'}</Text>
          <View style={styles.periodRow}>
            {[{ key: 'week', label: '7D' }, { key: 'month', label: '1M' }, { key: 'year', label: '1Y' }].map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodChip, txnPeriod === p.key && styles.periodChipActive]}
                onPress={() => setTxnPeriod(p.key)}
              >
                <Text style={[styles.periodChipText, txnPeriod === p.key && styles.periodChipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {txnLoading ? (
          <Text style={styles.chartPlaceholder}>Loading…</Text>
        ) : filteredTxns.length === 0 ? (
          <Text style={styles.chartPlaceholder}>No transactions in this period</Text>
        ) : (
          filteredTxns.map((tx) => (
            <TouchableOpacity key={tx.id} style={styles.txRow} onPress={() => navigation.navigate('TransactionDetail', { transaction: tx })} activeOpacity={0.7}>
              <View style={[styles.txIconBg, { backgroundColor: tx.type === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
                <Text style={{ color: tx.type === 'income' ? C.income : C.expense, fontSize: 14, fontWeight: '700' }}>
                  {tx.type === 'income' ? '↑' : '↓'}
                </Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txCategory}>{tx.category_name || '—'}</Text>
                <Text style={styles.txMeta}>{formatDate(tx.txn_date)}{tx.note ? ` · ${tx.note}` : ''}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'income' ? C.income : C.expense }]}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </Card>

      {/* Chart — CC: monthly spending bar chart; others: balance history line chart */}
      <Card style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionLabel}>{isCC ? 'MONTHLY SPENDING' : 'BALANCE HISTORY'}</Text>
          {!isCC && (
            <View style={styles.periodRow}>
              {HISTORY_PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodChip, historyMonths === p.key && styles.periodChipActive]}
                  onPress={() => setHistoryMonths(p.key)}
                >
                  <Text style={[styles.periodChipText, historyMonths === p.key && styles.periodChipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {isCC ? (
          monthlySpending.every((d) => d.value === 0) ? (
            <Text style={styles.chartPlaceholder}>No spending data yet</Text>
          ) : (
            <BarChart
              data={monthlySpending}
              width={CHART_WIDTH} barWidth={32} spacing={16}
              barBorderRadius={4}
              yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }}
              xAxisColor={C.border} yAxisColor={C.border} rulesColor={C.border}
              noOfSections={4}
              formatYLabel={(v) => {
                const n = parseFloat(v);
                if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
                if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
                return String(Math.round(n));
              }}
              xAxisLabelTextStyle={{ color: C.textMuted, fontSize: 8 }}
              isAnimated
            />
          )
        ) : historyLoading ? (
          <Text style={styles.chartPlaceholder}>Loading…</Text>
        ) : lineData.length < 2 ? (
          <Text style={styles.chartPlaceholder}>Not enough data yet</Text>
        ) : (
          <LineChart
            data={lineData} areaChart color={chartColor} startFillColor={chartColor}
            startOpacity={0.3} endOpacity={0.05} curved isAnimated width={CHART_WIDTH}
            minValue={minVal < 0 ? minVal * 1.1 : 0} maxValue={maxVal * 1.1 || 100}
            yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }} xAxisColor={C.border}
            yAxisColor={C.border} rulesColor={C.border} dataPointsColor={chartColor} thickness={2}
            hideDataPoints={lineData.length > 8}
            formatYLabel={(v) => {
              const n = parseFloat(v);
              if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
              if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
              return String(Math.round(n));
            }}
            xAxisLabelTextStyle={{ color: C.textMuted, fontSize: 8 }} noOfSections={4}
            showValuesAsDataPointsText={false}
          />
        )}
      </Card>

      {/* Info card */}
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
          <Text style={styles.infoValue}>{account.type.toUpperCase()}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Opening Balance</Text>
          <Text style={styles.infoValue}>{formatCurrency(account.opening_balance)}</Text>
        </View>
      </Card>

      {/* Monthly statement — SB accounts only */}
      {account.type === 'savings' && (() => {
        const today = new Date();
        return (
          <Card style={styles.monthlyCard}>
            <TouchableOpacity style={styles.monthlyHeader} onPress={() => setMonthlyExpanded(!monthlyExpanded)}>
              <Text style={styles.monthlySectionLabel}>MONTHLY STATEMENT</Text>
              <Text style={styles.monthlyChevron}>{monthlyExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {monthlyExpanded && (
              <>
                <View style={styles.monthlyPeriodRow}>
                  {[{ key: 6, label: '6M' }, { key: 12, label: '1Y' }].map((o) => (
                    <TouchableOpacity
                      key={o.key}
                      style={[styles.periodChip, monthlyMonths === o.key && styles.periodChipActive]}
                      onPress={() => setMonthlyMonths(o.key)}
                    >
                      <Text style={[styles.periodChipText, monthlyMonths === o.key && styles.periodChipTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {monthlyLoading && <LoadingSpinner />}
                {monthlyError && <ErrorBanner message={monthlyError} onRetry={loadMonthly} />}

                {!monthlyLoading && !monthlyError && monthlyRows.map((row) => {
                  const isCurrent = row.year === today.getFullYear() && row.month === (today.getMonth() + 1);
                  return (
                    <TouchableOpacity
                      key={`${row.year}-${row.month}`}
                      style={[styles.monthRow, row.is_draft && styles.monthRowDraft]}
                      onPress={() => openEntryModal(row)}
                    >
                      <View style={styles.monthRowLeft}>
                        <View style={styles.monthLabelRow}>
                          <Text style={[styles.monthLabel, row.is_draft && { color: C.textMuted }]}>{row.label}</Text>
                          {isCurrent && <View style={styles.inProgressBadge}><Text style={styles.inProgressText}>IN PROGRESS</Text></View>}
                        </View>
                        {row.is_draft && row.opening_balance == null && (
                          <Text style={styles.draftHint}>Tap to set OB</Text>
                        )}
                      </View>
                      <View style={styles.monthRowRight}>
                        <Text style={[styles.monthOB, row.is_draft && { color: C.textMuted }]}>
                          {row.opening_balance != null ? formatCurrency(row.opening_balance) : '—'}
                        </Text>
                        <Text style={styles.monthArrow}> → </Text>
                        <Text style={[styles.monthActual, { color: row.actual_closing != null ? C.income : C.textMuted }]}>
                          {row.actual_closing != null ? formatCurrency(row.actual_closing) : '—'}
                        </Text>
                        {row.manual_adj !== 0 && (
                          <View style={styles.adjBadge}>
                            <Text style={styles.adjBadgeText}>
                              {row.manual_adj > 0 ? '+' : ''}{formatCurrency(row.manual_adj)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </Card>
        );
      })()}

      <Button title="✏️  Edit Account" onPress={() => setEditModal(true)} style={styles.editBtn} />
      <Button title={deleting ? 'Deleting...' : '🗑️  Delete Account'} variant="outline" onPress={handleDelete} loading={deleting} style={styles.deleteBtn} />

      {/* Edit modal */}
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
                  <View style={styles.chipLabel}>
                    <TypeIcon type={t} size={13} color={form.type === t ? C.primaryLight : C.textMuted} />
                    <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>{t.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Opening Balance</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholderTextColor={C.textMuted} value={form.opening_balance} onChangeText={(v) => setForm({ ...form, opening_balance: v })} />
            {isFamily && (
              <>
                <Text style={styles.label}>Belongs To</Text>
                <View style={styles.belongsToBox}>
                  <Text style={styles.belongsToText}>{currentOwnerName}</Text>
                </View>
                <Text style={styles.label}>Change To</Text>
                <View style={styles.typeRow}>
                  {familyMembers.map((m) => (
                    <TouchableOpacity
                      key={m.user_id}
                      style={[styles.typeChip, form.user_id === m.user_id && styles.typeChipActive]}
                      onPress={() => setForm({ ...form, user_id: m.user_id })}
                    >
                      <Text style={[styles.typeChipText, form.user_id === m.user_id && styles.typeChipTextActive]}>
                        {getMemberName(m, user)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setEditModal(false)} style={styles.halfBtn} />
              <Button title="Save" onPress={handleEdit} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Close deposit modal */}
      <Modal visible={closeModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Close Deposit</Text>

            <Text style={styles.label}>Closing / Maturity Amount ₹ *</Text>
            <TextInput
              style={styles.input} keyboardType="numeric" placeholderTextColor={C.textMuted}
              placeholder="Actual amount received"
              value={closeForm.closing_amount}
              onChangeText={(v) => setCloseForm({ ...closeForm, closing_amount: v })}
            />

            <Text style={styles.label}>Transfer to Account *</Text>
            {savingsAccounts.length === 0 ? (
              <Text style={styles.noAccountsText}>No savings/checking accounts found. Please create one first.</Text>
            ) : (
              <View style={styles.accountPicker}>
                {savingsAccounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountOption, closeForm.transferred_to_account_id === acc.id && styles.accountOptionActive]}
                    onPress={() => setCloseForm({ ...closeForm, transferred_to_account_id: acc.id })}
                  >
                    <BankLogo name={acc.name} size={22} style={{ marginRight: 8 }} />
                    <Text style={[styles.accountOptionText, closeForm.transferred_to_account_id === acc.id && { color: C.primaryLight }]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Date of Closure (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input} placeholderTextColor={C.textMuted} placeholder="defaults to today"
              value={closeForm.closed_date}
              onChangeText={(v) => setCloseForm({ ...closeForm, closed_date: v })}
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setCloseModal(false)} style={styles.halfBtn} />
              <Button title="Confirm Close" onPress={handleCloseDeposit} loading={closing} style={styles.halfBtn} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Monthly entry modal */}
      <Modal visible={entryModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{selectedRow?.label} — Statement</Text>

            <Text style={styles.label}>Opening Balance ₹</Text>
            <TextInput
              style={styles.input} keyboardType="numeric" placeholderTextColor={C.textMuted}
              placeholder="e.g. 48600"
              value={entryForm.opening_balance}
              onChangeText={(v) => setEntryForm({ ...entryForm, opening_balance: v })}
            />

            {(() => {
              const ob = entryForm.opening_balance !== '' ? parseFloat(entryForm.opening_balance) || 0 : null;
              const adj = parseFloat(entryForm.manual_adj) || 0;
              const computed = ob != null ? ob + (selectedRow?.income || 0) - (selectedRow?.expenses || 0) : null;
              const actual = computed != null ? computed + adj : null;
              return (
                <>
                  <View style={styles.roRow}>
                    <Text style={styles.roLabel}>Income</Text>
                    <Text style={[styles.roValue, { color: C.income }]}>{formatCurrency(selectedRow?.income || 0)}</Text>
                  </View>
                  <View style={styles.roRow}>
                    <Text style={styles.roLabel}>Expenses</Text>
                    <Text style={[styles.roValue, { color: C.expense }]}>{formatCurrency(selectedRow?.expenses || 0)}</Text>
                  </View>
                  <View style={styles.roRow}>
                    <Text style={styles.roLabel}>Computed Closing</Text>
                    <Text style={styles.roValue}>{computed != null ? formatCurrency(computed) : '—'}</Text>
                  </View>
                </>
              );
            })()}

            <Text style={styles.label}>Manual Adjustment ₹</Text>
            <TextInput
              style={styles.input} keyboardType="numeric" placeholderTextColor={C.textMuted}
              placeholder="0 (optional)"
              value={entryForm.manual_adj}
              onChangeText={(v) => setEntryForm({ ...entryForm, manual_adj: v })}
            />

            {(() => {
              const ob = entryForm.opening_balance !== '' ? parseFloat(entryForm.opening_balance) || 0 : null;
              const adj = parseFloat(entryForm.manual_adj) || 0;
              const computed = ob != null ? ob + (selectedRow?.income || 0) - (selectedRow?.expenses || 0) : null;
              const actual = computed != null ? computed + adj : null;
              return actual != null ? (
                <View style={[styles.roRow, styles.roRowActual]}>
                  <Text style={[styles.roLabel, { fontWeight: '700' }]}>Actual Closing</Text>
                  <Text style={[styles.roValue, { fontWeight: '800', color: actual >= 0 ? C.income : C.expense }]}>{formatCurrency(actual)}</Text>
                </View>
              ) : null;
            })()}

            <Text style={styles.label}>Note</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]} multiline placeholderTextColor={C.textMuted}
              placeholder="Optional note"
              value={entryForm.note}
              onChangeText={(v) => setEntryForm({ ...entryForm, note: v })}
            />

            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setEntryModal(false)} style={styles.halfBtn} />
              <Button title="Save" onPress={handleSaveMonthly} loading={entrySaving} style={styles.halfBtn} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DepositRow({ label, value, valueColor, C, styles }) {
  return (
    <View style={styles.depositRow}>
      <Text style={styles.depositLabel}>{label}</Text>
      <Text style={[styles.depositValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  heroCard: { marginBottom: SPACING.md, padding: SPACING.lg, alignItems: 'center' },
  heroLogo: { marginBottom: SPACING.sm },
  heroName: { color: C.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700', marginBottom: SPACING.sm },
  heroLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  heroAmount: { fontSize: FONTS.sizes.hero, fontWeight: '800', marginVertical: SPACING.sm },
  row: { flexDirection: 'row' },
  typePill: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  typePillContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeText: { color: C.textSecondary, fontSize: FONTS.sizes.sm },

  depositCard: { marginBottom: SPACING.md, padding: SPACING.md },
  depositHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1 },
  depositGrid: { gap: 2 },
  depositRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  depositLabel: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  depositValue: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '700', textAlign: 'right', flexShrink: 1, marginLeft: SPACING.sm },
  closedDivider: { height: 1, backgroundColor: C.border, marginVertical: SPACING.sm },
  closeBtn: { marginTop: SPACING.md, borderColor: C.expense },

  historyCard: { marginBottom: SPACING.md, padding: SPACING.md, overflow: 'hidden' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  periodRow: { flexDirection: 'row', gap: SPACING.xs },
  periodChip: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  periodChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  periodChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  periodChipTextActive: { color: C.primaryLight, fontWeight: '700' },
  chartPlaceholder: { color: C.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center', paddingVertical: SPACING.lg },

  txnCard: { marginBottom: SPACING.md, padding: SPACING.md },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  txIconBg: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  txInfo: { flex: 1 },
  txCategory: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  txMeta: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  txAmount: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

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
  belongsToBox: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, padding: SPACING.sm + 4 },
  belongsToText: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  typeChip: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  typeChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  typeChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  typeChipTextActive: { color: C.primaryLight },
  chipLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  halfBtn: { flex: 1 },

  accountPicker: { gap: SPACING.xs },
  accountOption: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  accountOptionActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  accountOptionText: { color: C.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  noAccountsText: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontStyle: 'italic', marginTop: SPACING.xs },

  // Monthly statement
  monthlyCard: { marginBottom: SPACING.md, padding: SPACING.md },
  monthlyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthlySectionLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  monthlyChevron: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  monthlyPeriodRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  monthRowDraft: { opacity: 0.6 },
  monthRowLeft: { flex: 1 },
  monthLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthLabel: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  inProgressBadge: { backgroundColor: C.primary + '33', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1 },
  inProgressText: { color: C.primaryLight, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  draftHint: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  monthRowRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  monthOB: { color: C.textSecondary, fontSize: FONTS.sizes.xs },
  monthArrow: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  monthActual: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  adjBadge: { backgroundColor: C.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4 },
  adjBadgeText: { color: C.primaryLight, fontSize: 9, fontWeight: '700' },

  // Monthly entry modal read-only rows
  roRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  roRowActual: { marginTop: SPACING.sm, borderBottomWidth: 0 },
  roLabel: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  roValue: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
