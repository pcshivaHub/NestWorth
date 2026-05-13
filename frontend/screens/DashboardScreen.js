import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSummary } from '../api/summary';
import { getTransactions } from '../api/transactions';
import { getAccounts, getAccountBalance } from '../api/accounts';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getInitials } from '../utils/helpers';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import BankLogo from '../components/BankLogo';

const TYPE_ICONS = { savings: '🏦', checking: '💳', cash: '💵', credit: '🔖' };
const BREAKUP_PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

function CategoryBreakup({ title, items = [], color }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.breakupBlock}>
      <Text style={styles.accountsLabel}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.breakupEmpty}>No category data yet</Text>
      ) : (
        <View style={styles.accountsGrid}>
          {items.map((item) => {
            const hasBudget = item.budget > 0;
            const pct = hasBudget ? Math.min(item.amount / item.budget, 1) : 0;
            const barColor = pct < 0.6 ? C.income : pct < 0.85 ? C.warning : C.expense;
            return (
              <View key={item.category_id || item.category_name} style={styles.accountChip}>
                <Text style={styles.accountChipIcon}>{getInitials(item.category_name || '?')}</Text>
                <Text style={styles.accountChipName} numberOfLines={1}>
                  {item.category_name || 'Uncategorized'}
                </Text>
                <Text style={[styles.accountChipBalance, { color }]}>
                  {formatCurrency(item.amount)}
                </Text>
                {hasBudget && (
                  <View style={styles.budgetBarWrap}>
                    <View style={styles.budgetBarTrack}>
                      <View style={[styles.budgetBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.budgetBarLabel}>
                      {Math.round(pct * 100)}% of {formatCurrency(item.budget)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { family } = useAuth();

  const [summary, setSummary] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [breakupPeriod, setBreakupPeriod] = useState('month');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [sum, txList, accs] = await Promise.all([getSummary(breakupPeriod), getTransactions(), getAccounts()]);
      setSummary(sum);
      setRecentTx((txList || []).slice(0, 5));
      setAccounts(accs || []);
      const balResults = await Promise.allSettled(
        (accs || []).map((a) => getAccountBalance(a.id).then((r) => ({ id: a.id, balance: r.balance })))
      );
      const balMap = {};
      balResults.forEach((r) => { if (r.status === 'fulfilled') balMap[r.value.id] = r.value.balance; });
      setBalances(balMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [breakupPeriod]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <LoadingSpinner />;

  const ENTITY_THEME = {
    netBalance: { color: C.netBalance, label: 'Net Balance' },
    income: { color: C.income, label: 'Income' },
    expense: { color: C.expense, label: 'Expenses' },
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Good day 👋</Text>
        <Text style={styles.subtitle}>Here's your financial overview</Text>
        {family && family.members.length > 1 && (
          <View style={styles.familyChip}>
            <Text style={styles.familyChipText}>
              👨‍👩‍👧 {family.name} · {family.members.length} members
            </Text>
          </View>
        )}
      </View>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {summary && (
        <Card style={styles.heroCard}>
          {accounts.length > 0 && (
            <>
              <Text style={styles.accountsLabel}>ACCOUNT BALANCES</Text>
              <View style={styles.accountsGrid}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={styles.accountChip}
                    onPress={() => navigation.navigate('AccountDetail', { account: acc, balance: balances[acc.id] })}
                  >
                    <BankLogo name={acc.name} fallback={TYPE_ICONS[acc.type] || '💰'} size={30} style={styles.accountChipLogo} />
                    <Text style={styles.accountChipName} numberOfLines={1}>{acc.name}</Text>
                    <Text style={[styles.accountChipBalance, {
                      color: (balances[acc.id] ?? acc.opening_balance ?? 0) >= 0 ? C.income : C.expense,
                    }]}>
                      {formatCurrency(balances[acc.id] ?? acc.opening_balance ?? 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.accountsDivider} />
            </>
          )}

          <View style={styles.heroLabelRow}>
            <View style={[styles.statIconBg, { backgroundColor: C.netBalance + '28' }]}>
              <Ionicons name="wallet-outline" size={15} color={C.netBalance} />
            </View>
            <Text style={styles.heroLabel}>NET BALANCE</Text>
          </View>
          <Text style={[styles.heroAmount, { color: ENTITY_THEME.netBalance.color }]}>
            {formatCurrency(summary.net)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: C.income + '28' }]}>
                <Ionicons name="trending-up" size={16} color={C.income} />
              </View>
              <View>
                <Text style={styles.statLabel}>{ENTITY_THEME.income.label}</Text>
                <Text style={[styles.statAmount, { color: ENTITY_THEME.income.color }]}>{formatCurrency(summary.total_income)}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: C.expense + '28' }]}>
                <Ionicons name="trending-down" size={16} color={C.expense} />
              </View>
              <View>
                <Text style={styles.statLabel}>{ENTITY_THEME.expense.label}</Text>
                <Text style={[styles.statAmount, { color: ENTITY_THEME.expense.color }]}>{formatCurrency(summary.total_expense)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.breakupDivider} />
          <View style={styles.periodRow}>
            {BREAKUP_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[styles.periodChip, breakupPeriod === period.key && styles.periodChipActive]}
                onPress={() => setBreakupPeriod(period.key)}
              >
                <Text style={[styles.periodChipText, breakupPeriod === period.key && styles.periodChipTextActive]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <CategoryBreakup
            title={`INCOME BY CATEGORY — ${BREAKUP_PERIODS.find((p) => p.key === breakupPeriod)?.label.toUpperCase()}`}
            items={summary.income_by_category || []}
            color={ENTITY_THEME.income.color}
          />
          <CategoryBreakup
            title={`EXPENSES BY CATEGORY — ${BREAKUP_PERIODS.find((p) => p.key === breakupPeriod)?.label.toUpperCase()}`}
            items={summary.expense_by_category || []}
            color={ENTITY_THEME.expense.color}
          />
        </Card>
      )}

      <View style={styles.quickActions}>
        {[
          { label: 'Transactions', icon: '🧾', tab: 'Transactions' },
          { label: 'Accounts', icon: '🏦', tab: 'Accounts' },
          { label: 'Categories', icon: '🏷️', tab: 'Categories' },
        ].map((action) => (
          <TouchableOpacity key={action.tab} style={styles.actionBtn} onPress={() => navigation.navigate(action.tab)}>
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {recentTx.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet. Add one!</Text>
      ) : (
        recentTx.map((tx) => (
          <TouchableOpacity key={tx.id} onPress={() => navigation.navigate('Transactions')}>
            <Card style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={[styles.txIconBg, { backgroundColor: tx.type === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
                  <Ionicons
                    name={tx.type === 'income' ? 'arrow-up' : 'arrow-down'}
                    size={18}
                    color={tx.type === 'income' ? C.income : C.expense}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txCategory}>{tx.category_name || '—'}</Text>
                  <View style={styles.txAccountRow}>
                    <BankLogo name={tx.account_name} size={18} style={styles.txBankLogo} />
                    <Text style={styles.txAccount}>{tx.account_name} · {formatDate(tx.txn_date)}</Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'income' ? C.income : C.expense }]}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  header: { marginBottom: SPACING.lg },
  greeting: { color: C.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '700' },
  subtitle: { color: C.textSecondary, fontSize: FONTS.sizes.md, marginTop: 2 },
  familyChip: { alignSelf: 'flex-start', backgroundColor: C.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm + 2, paddingVertical: 4, marginTop: SPACING.sm, borderWidth: 1, borderColor: C.primary + '44' },
  familyChipText: { color: C.primaryLight, fontSize: FONTS.sizes.xs, fontWeight: '600' },

  heroCard: { marginBottom: SPACING.md, padding: SPACING.lg },
  heroLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  heroAmount: { fontSize: FONTS.sizes.xxl, fontWeight: '800', marginTop: 4, marginBottom: SPACING.md },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIconBg: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  statAmount: { fontSize: FONTS.sizes.lg, fontWeight: '800', marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: C.border, marginHorizontal: SPACING.md },
  breakupDivider: { height: 1, backgroundColor: C.border, marginVertical: SPACING.md },

  periodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  periodChip: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  periodChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  periodChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  periodChipTextActive: { color: C.primaryLight, fontWeight: '700' },

  breakupBlock: { marginTop: SPACING.md },
  breakupEmpty: { color: C.textMuted, fontSize: FONTS.sizes.xs, paddingVertical: SPACING.sm },
  accountsDivider: { height: 1, backgroundColor: C.border, marginVertical: SPACING.md },
  accountsLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.sm },
  accountsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  accountChip: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, alignItems: 'center', minWidth: 110, flex: 1 },
  accountChipLogo: { marginBottom: 4 },
  accountChipIcon: { fontSize: 20, marginBottom: 4 },
  accountChipName: { color: C.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600', marginBottom: 4 },
  accountChipBalance: { fontSize: FONTS.sizes.md, fontWeight: '800' },
  budgetBarWrap: { alignSelf: 'stretch', marginTop: 6 },
  budgetBarTrack: { height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 2 },
  budgetBarLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 3, textAlign: 'center' },

  quickActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  actionBtn: { flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, alignItems: 'center', padding: SPACING.md },
  actionIcon: { fontSize: 22, marginBottom: 4 },
  actionLabel: { color: C.textSecondary, fontSize: FONTS.sizes.xs, textAlign: 'center', lineHeight: 16 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { color: C.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  seeAll: { color: C.primary, fontSize: FONTS.sizes.sm },
  emptyText: { color: C.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center', paddingVertical: SPACING.lg },

  txCard: { marginBottom: SPACING.sm, padding: SPACING.sm + 4 },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  txIconBg: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  txInfo: { flex: 1 },
  txCategory: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  txAccountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  txBankLogo: { marginRight: 6 },
  txAccount: { flex: 1, color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  txAmount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
});
