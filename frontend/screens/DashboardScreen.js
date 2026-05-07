import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSummary } from '../api/summary';
import { getTransactions } from '../api/transactions';
import { getAccounts, getAccountBalance } from '../api/accounts';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatCurrency, formatDate, getInitials } from '../utils/helpers';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

const TYPE_ICONS = { savings: '🏦', checking: '💳', cash: '💵', credit: '🔖' };

export default function DashboardScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setError(null);
      const [sum, txList, accs] = await Promise.all([
        getSummary(),
        getTransactions(),
        getAccounts(),
      ]);
      setSummary(sum);
      setRecentTx((txList || []).slice(0, 5));
      setAccounts(accs || []);

      // Fetch balances for all accounts in parallel
      const balResults = await Promise.allSettled(
        (accs || []).map((a) =>
          getAccountBalance(a.id).then((r) => ({ id: a.id, balance: r.balance }))
        )
      );
      const balMap = {};
      balResults.forEach((r) => {
        if (r.status === 'fulfilled') balMap[r.value.id] = r.value.balance;
      });
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

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good day 👋</Text>
        <Text style={styles.subtitle}>Here's your financial overview</Text>
      </View>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Net Balance Hero Card */}
      {summary && (
        <Card style={styles.heroCard}>

          {/* Account Balances — shown FIRST */}
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
                    <Text style={styles.accountChipIcon}>{TYPE_ICONS[acc.type] || '💰'}</Text>
                    <Text style={styles.accountChipName} numberOfLines={1}>{acc.name}</Text>
                    <Text style={[
                      styles.accountChipBalance,
                      { color: (balances[acc.id] ?? acc.opening_balance ?? 0) >= 0 ? COLORS.income : COLORS.expense }
                    ]}>
                      {formatCurrency(balances[acc.id] ?? acc.opening_balance ?? 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.accountsDivider} />
            </>
          )}

          {/* Net Balance */}
          <Text style={styles.heroLabel}>NET BALANCE</Text>
          <Text style={[styles.heroAmount, { color: summary.net >= 0 ? COLORS.income : COLORS.expense }]}>
            {formatCurrency(summary.net)}
          </Text>

          {/* Income / Expense stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: COLORS.income }]} />
              <View>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={[styles.statAmount, { color: COLORS.income }]}>
                  {formatCurrency(summary.total_income)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: COLORS.expense }]} />
              <View>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={[styles.statAmount, { color: COLORS.expense }]}>
                  {formatCurrency(summary.total_expense)}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { label: 'Transactions', icon: '🧾', tab: 'Transactions' },
          { label: 'Accounts', icon: '🏦', tab: 'Accounts' },
          { label: 'Categories', icon: '🏷️', tab: 'Categories' },
        ].map((action) => (
          <TouchableOpacity
            key={action.tab}
            style={styles.actionBtn}
            onPress={() => navigation.navigate(action.tab)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Transactions */}
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
              <View style={[styles.txIconBg, {
                backgroundColor: tx.type === 'income' ? '#0D3D2E' : '#3D0D1A',
              }]}>
                <Text style={styles.txIcon}>{tx.type === 'income' ? '↑' : '↓'}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txCategory}>{tx.category_name || '—'}</Text>
                <Text style={styles.txAccount}>{tx.account_name} · {formatDate(tx.txn_date)}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'income' ? COLORS.income : COLORS.expense }]}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  header: { marginBottom: SPACING.lg },
  greeting: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, marginTop: 2 },

  heroCard: { marginBottom: SPACING.md, padding: SPACING.lg },
  heroLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  heroAmount: { fontSize: FONTS.sizes.hero, fontWeight: '800', marginTop: 4, marginBottom: SPACING.md },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  statAmount: { fontSize: FONTS.sizes.md, fontWeight: '700', marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },

  accountsDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  accountsLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.sm },
  accountsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  accountChip: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    minWidth: 110,
    flex: 1,
  },
  accountChipIcon: { fontSize: 20, marginBottom: 4 },
  accountChipName: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '600', marginBottom: 4 },
  accountChipBalance: { fontSize: FONTS.sizes.md, fontWeight: '800' },

  quickActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    padding: SPACING.md,
  },
  actionIcon: { fontSize: 22, marginBottom: 4 },
  actionLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, textAlign: 'center', lineHeight: 16 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  seeAll: { color: COLORS.primary, fontSize: FONTS.sizes.sm },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center', paddingVertical: SPACING.lg },

  txCard: { marginBottom: SPACING.sm, padding: SPACING.sm + 4 },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  txIconBg: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  txIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  txInfo: { flex: 1 },
  txCategory: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  txAccount: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  txAmount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
});r