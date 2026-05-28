import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Receipt, Bank, Tag, UsersThree } from 'phosphor-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSummary } from '../api/summary';
import { getTransactions } from '../api/transactions';
import { getAccounts, getAccountBalance } from '../api/accounts';
import { FONTS, SPACING, RADIUS, makeShadow } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getInitials, getMemberName } from '../utils/helpers';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import BankLogo from '../components/BankLogo';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getMonthPeriods = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, current month
  const months = Array.from({ length: month + 1 }, (_, i) => ({
    key: `${year}-${String(i + 1).padStart(2, '0')}`,
    label: MONTH_LABELS[i],
  })).reverse(); // latest first
  months.push({ key: String(year - 1), label: 'Last Year' });
  return months;
};

const BREAKUP_PERIODS = getMonthPeriods();
const CURRENT_MONTH_KEY = BREAKUP_PERIODS[0].key;

function CategoryBreakup({ title, items = [], color, navigation, txnType }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const empty = <Text style={styles.breakupEmpty}>No category data yet</Text>;

  const goToCategory = (item) => {
    if (!navigation || !item.category_id) return;
    navigation.navigate('Transactions', { categoryId: item.category_id, typeFilter: txnType, _nav_ts: Date.now() });
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.breakupBlock}>
        <Text style={styles.accountsLabel}>{title}</Text>
        {items.length === 0 ? empty : (
          <View style={styles.budgetGrid}>
            {items.map((item) => {
              const hasBudget = item.budget > 0;
              const pct = hasBudget ? Math.min(item.amount / item.budget, 1) : 0;
              const barColor = pct < 0.6 ? C.income : pct < 0.85 ? C.warning : C.expense;
              const isOver = hasBudget && pct >= 1;
              return (
                <TouchableOpacity key={item.category_id || item.category_name} style={styles.budgetTile} onPress={() => goToCategory(item)} activeOpacity={0.75}>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {item.category_name || 'Uncategorized'}{isOver ? ' ⚠' : ''}
                  </Text>
                  <Text style={[styles.tileAmount, { color }]}>{formatCurrency(item.amount)}</Text>
                  {hasBudget && (
                    <>
                      <View style={styles.budgetBarTrack}>
                        <View style={[styles.budgetBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[styles.budgetBarLabel, { color: barColor }]}>
                        {Math.round(pct * 100)}% of {formatCurrency(item.budget)}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.breakupBlock}>
      <Text style={styles.accountsLabel}>{title}</Text>
      {items.length === 0 ? empty : (
        items.map((item) => {
          const hasBudget = item.budget > 0;
          const pct = hasBudget ? Math.min(item.amount / item.budget, 1) : 0;
          const barColor = pct < 0.6 ? C.income : pct < 0.85 ? C.warning : C.expense;
          const isOver = hasBudget && pct >= 1;
          return (
            <TouchableOpacity key={item.category_id || item.category_name} style={styles.catRow} onPress={() => goToCategory(item)} activeOpacity={0.75}>
              <View style={styles.catRowTop}>
                <Text style={styles.catName} numberOfLines={1}>
                  {item.category_name || 'Uncategorized'}{isOver ? '  ⚠' : ''}
                </Text>
                <Text style={[styles.catAmount, { color }]}>{formatCurrency(item.amount)}</Text>
              </View>
              {hasBudget && (
                <View style={styles.catBarRow}>
                  <View style={styles.catBarTrack}>
                    <View style={[styles.catBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.catBarPct, { color: barColor }]}>
                    {Math.round(pct * 100)}% of {formatCurrency(item.budget)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family } = useAuth();

  const [summary, setSummary] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [breakupPeriod, setBreakupPeriod] = useState(CURRENT_MONTH_KEY);
  const [txFilter, setTxFilter] = useState('mine');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [sum, txList, accs] = await Promise.all([getSummary(breakupPeriod), getTransactions(), getAccounts()]);
      setSummary(sum);
      setRecentTx(txList || []);
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

  const isFamily = (family?.members?.length ?? 0) > 1;
  const memberMap = Object.fromEntries(
    (family?.members || []).map((m) => [m.user_id, getMemberName(m, user)])
  );
  const filteredTx = (txFilter === 'mine'
    ? recentTx.filter((tx) => tx.user_id === user?.id)
    : recentTx
  ).slice(0, 10);

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
            <View style={styles.familyChipInner}>
              <UsersThree size={14} color={C.primaryLight} />
              <Text style={styles.familyChipText}>
                {family.name} · {family.members.length} members
              </Text>
            </View>
          </View>
        )}
      </View>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {summary && (
        <Card style={styles.heroCard}>
          <View style={styles.heroLabelRow}>
            <View style={[styles.statIconBg, { backgroundColor: C.netBalance + '28' }]}>
              <Ionicons name="wallet-outline" size={15} color={C.netBalance} />
            </View>
            <Text style={styles.heroLabel}>NET BALANCE</Text>
          </View>
          <Text style={[styles.heroAmount, { color: ENTITY_THEME.netBalance.color, textAlign: 'center' }]}>
            {formatCurrency(summary.net)}
          </Text>

          <View style={styles.breakupDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: C.income + '28' }]}>
                <Ionicons name="trending-up" size={18} color={C.income} />
              </View>
              <Text style={styles.statLabel}>INCOME</Text>
              <Text style={[styles.statAmount, { color: C.income }]} numberOfLines={1}>{formatCurrency(summary.total_income)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: C.expense + '28' }]}>
                <Ionicons name="trending-down" size={18} color={C.expense} />
              </View>
              <Text style={styles.statLabel}>EXPENSES</Text>
              <Text style={[styles.statAmount, { color: C.expense }]} numberOfLines={1}>{formatCurrency(summary.total_expense)}</Text>
            </View>
          </View>

          {accounts.length > 0 && (() => {
            const isFamily = (family?.members?.length ?? 0) > 1;
            const myAccounts = accounts.filter((a) =>
              (['savings', 'checking'].includes(a.type) || (a.type === 'credit' && a.user_id === user?.id)) &&
              a.user_id === user?.id
            );
            const othersAccounts = isFamily ? accounts.filter((a) =>
              ['savings', 'checking'].includes(a.type) && a.user_id !== user?.id
            ) : [];
            if (myAccounts.length === 0 && othersAccounts.length === 0) return null;

            const renderAccountChip = (acc) => (
              <TouchableOpacity key={acc.id} style={styles.accountChipMobile} onPress={() => navigation.navigate('AccountDetail', { account: acc, balance: balances[acc.id] })}>
                <BankLogo name={acc.name} size={28} style={styles.accountChipLogo} />
                <Text style={styles.accountChipName} numberOfLines={1}>{acc.name}</Text>
                <Text style={[styles.accountChipBalance, { color: (balances[acc.id] ?? acc.opening_balance ?? 0) >= 0 ? C.income : C.expense }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatCurrency(balances[acc.id] ?? acc.opening_balance ?? 0)}
                </Text>
              </TouchableOpacity>
            );

            const hasBoth = myAccounts.length > 0 && othersAccounts.length > 0;

            return (
              <>
                <View style={styles.breakupDivider} />
                {hasBoth ? (
                  <View style={styles.accountsRow}>
                    <View style={styles.accountsCol}>
                      <Text style={styles.accountsLabel}>MY ACCOUNTS</Text>
                      <View style={styles.accountsChipWrap}>
                        {myAccounts.map(renderAccountChip)}
                      </View>
                    </View>
                    <View style={styles.accountsColDivider} />
                    <View style={styles.accountsCol}>
                      <Text style={styles.accountsLabel}>FAMILY ACCOUNTS</Text>
                      <View style={styles.accountsChipWrap}>
                        {othersAccounts.map(renderAccountChip)}
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.accountsLabel}>{isFamily ? 'MY ACCOUNTS' : 'SAVINGS & CHECKING'}</Text>
                    <View style={styles.accountsChipWrap}>
                      {(myAccounts.length > 0 ? myAccounts : othersAccounts).map(renderAccountChip)}
                    </View>
                  </>
                )}
              </>
            );
          })()}

          <View style={styles.breakupDivider} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodRow} contentContainerStyle={styles.periodRowContent}>
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
          </ScrollView>

          <CategoryBreakup
            title={`INCOME BY CATEGORY — ${(BREAKUP_PERIODS.find((p) => p.key === breakupPeriod)?.label || breakupPeriod).toUpperCase()}`}
            items={summary.income_by_category || []}
            color={ENTITY_THEME.income.color}
            navigation={navigation}
            txnType="income"
          />
          <CategoryBreakup
            title={`EXPENSES BY CATEGORY — ${(BREAKUP_PERIODS.find((p) => p.key === breakupPeriod)?.label || breakupPeriod).toUpperCase()}`}
            items={summary.expense_by_category || []}
            color={ENTITY_THEME.expense.color}
            navigation={navigation}
            txnType="expense"
          />
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {isFamily && (
        <View style={styles.txFilterRow}>
          {[{ key: 'mine', label: 'Mine' }, { key: 'all', label: 'All' }].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.txFilterChip, txFilter === f.key && styles.txFilterChipActive]}
              onPress={() => setTxFilter(f.key)}
            >
              <Text style={[styles.txFilterText, txFilter === f.key && styles.txFilterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {filteredTx.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet. Add one!</Text>
      ) : (
        filteredTx.map((tx) => {
          const isOther = tx.user_id && tx.user_id !== user?.id;
          return (
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
                    {isOther && (
                      <Text style={styles.txOwner}>by {memberMap[tx.user_id] || 'Family Member'}</Text>
                    )}
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === 'income' ? C.income : C.expense }]}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
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
  familyChipInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  familyChipText: { color: C.primaryLight, fontSize: FONTS.sizes.xs, fontWeight: '600' },

  heroCard: { marginBottom: SPACING.md, padding: SPACING.lg },
  heroLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  heroAmount: { fontSize: FONTS.sizes.xxl, fontWeight: '800', marginTop: 4 },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  statIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 1.5, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  statAmount: { fontSize: FONTS.sizes.xl, fontWeight: '800', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: C.border, marginHorizontal: SPACING.md },
  breakupDivider: { height: 1, backgroundColor: C.border, marginVertical: SPACING.md },

  periodRow: { flexGrow: 0, marginBottom: SPACING.sm },
  periodRowContent: { flexDirection: 'row', gap: SPACING.sm },
  periodChip: { paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  periodChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  periodChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  periodChipTextActive: { color: C.primaryLight, fontWeight: '700' },

  breakupBlock: { marginTop: SPACING.md },
  breakupEmpty: { color: C.textMuted, fontSize: FONTS.sizes.xs, paddingVertical: SPACING.sm },
  catRow: { marginBottom: SPACING.sm },
  catRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catName: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600', flex: 1 },
  catAmount: { fontSize: FONTS.sizes.sm, fontWeight: '700', marginLeft: SPACING.sm },
  catBarRow: { gap: 3 },
  catBarTrack: { height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 2 },
  catBarPct: { fontSize: FONTS.sizes.xs, fontWeight: '600' },

  budgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  budgetTile: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, alignItems: 'center', minWidth: 110, flex: 1 },
  tileName: { color: C.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  tileAmount: { fontSize: FONTS.sizes.md, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  budgetBarTrack: { height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden', alignSelf: 'stretch' },
  budgetBarFill: { height: '100%', borderRadius: 2 },
  budgetBarLabel: { fontSize: FONTS.sizes.xs, marginTop: 3, textAlign: 'center' },
  accountsDivider: { height: 1, backgroundColor: C.border, marginVertical: SPACING.md },
  accountsLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.sm },
  accountsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  accountsCol: { flex: 1 },
  accountsColDivider: { width: 1, backgroundColor: C.border, marginHorizontal: SPACING.sm, alignSelf: 'stretch' },
  accountsChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  accountChip: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, alignItems: 'center', minWidth: 110, flex: 1 },
  accountsScrollMobile: { marginHorizontal: -SPACING.sm },
  accountChipMobile: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, alignItems: 'center', width: 130, marginHorizontal: SPACING.xs },
  accountChipLogo: { marginBottom: 4 },
  accountChipName: { color: C.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600', marginBottom: 4 },
  accountChipBalance: { fontSize: FONTS.sizes.md, fontWeight: '800' },

  quickActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  actionBtn: { flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, alignItems: 'center', padding: SPACING.md },
  actionIcon: { marginBottom: 4 },
  actionLabel: { color: C.textSecondary, fontSize: FONTS.sizes.xs, textAlign: 'center', lineHeight: 16 },
  addTxnBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: C.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.sm + 2, marginBottom: SPACING.lg, ...makeShadow(C.primary, { opacity: 0.4 }) },
  addTxnLabel: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { color: C.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  seeAll: { color: C.primary, fontSize: FONTS.sizes.sm },
  emptyText: { color: C.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center', paddingVertical: SPACING.lg },

  txFilterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  txFilterChip: { paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  txFilterChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  txFilterText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  txFilterTextActive: { color: C.primaryLight },

  txCard: { marginBottom: SPACING.sm, padding: SPACING.sm + 4 },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  txIconBg: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  txInfo: { flex: 1 },
  txCategory: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  txAccountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  txBankLogo: { marginRight: 6 },
  txAccount: { flex: 1, color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  txOwner: { color: C.primaryLight, fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },
  txAmount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
});
