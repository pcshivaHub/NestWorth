import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions } from '../api/transactions';
import { getCategories } from '../api/categories';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import BankLogo from '../components/BankLogo';

const startOfWeek = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d; };
const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; };
const isInPeriod = (txnDateStr, period) => {
  if (period === 'all') return true;
  const txnDate = new Date(txnDateStr);
  if (period === 'week') return txnDate >= startOfWeek();
  if (period === 'month') return txnDate >= startOfMonth();
  return true;
};

export default function TransactionsScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family } = useAuth();

  const memberMap = Object.fromEntries(
    (family?.members || []).map((m) => [m.user_id, m.display_name || 'Member'])
  );

  const [allTransactions, setAllTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(null);

  const load = async () => {
    try {
      setError(null);
      const [list, cats] = await Promise.all([getTransactions(), getCategories()]);
      setAllTransactions(list || []);
      setCategories(cats || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = allTransactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (!isInPeriod(tx.txn_date, periodFilter)) return false;
    if (categoryFilter && tx.category_id !== categoryFilter) return false;
    return true;
  });

  const visibleCategories = categories.filter((c) => typeFilter === 'all' || c.kind === typeFilter);

  if (loading) return <LoadingSpinner />;

  const typeChipActive = (f) => ({
    borderColor: f === 'income' ? C.income : f === 'expense' ? C.expense : C.primary,
    backgroundColor: f === 'income' ? C.incomeSubtle : f === 'expense' ? C.expenseSubtle : C.primary + '22',
  });
  const typeChipTextActive = (f) => ({
    color: f === 'income' ? C.income : f === 'expense' ? C.expense : C.primaryLight,
  });

  return (
    <View style={styles.screen}>
      {error && <ErrorBanner message={error} onRetry={load} />}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListEmptyComponent={<EmptyState icon="🧾" message="No transactions found." />}
        ListHeaderComponent={
          <>
            <View style={styles.typeRow}>
              {['all', 'income', 'expense'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.typeChip, typeFilter === f && typeChipActive(f)]}
                  onPress={() => { setTypeFilter(f); setCategoryFilter(null); }}
                >
                  <Text style={[styles.typeChipText, typeFilter === f && typeChipTextActive(f)]}>
                    {f === 'all' ? 'All' : f === 'income' ? '↑ Income' : '↓ Expense'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.periodRow}>
              {[
                { key: 'all', label: '📅 All Time' },
                { key: 'month', label: '🗓 This Month' },
                { key: 'week', label: '📆 This Week' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodChip, periodFilter === p.key && styles.periodChipActive]}
                  onPress={() => setPeriodFilter(p.key)}
                >
                  <Text style={[styles.periodChipText, periodFilter === p.key && styles.periodChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {visibleCategories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                <TouchableOpacity
                  style={[styles.catChip, categoryFilter === null && styles.catChipActive]}
                  onPress={() => setCategoryFilter(null)}
                >
                  <Text style={[styles.catChipText, categoryFilter === null && styles.catChipTextActive]}>All Categories</Text>
                </TouchableOpacity>
                {visibleCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, categoryFilter === c.id && styles.catChipActive]}
                    onPress={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
                  >
                    <Text style={[styles.catChipText, categoryFilter === c.id && styles.catChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.countLabel}>
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              {periodFilter !== 'all' ? ` · ${periodFilter === 'week' ? 'This Week' : 'This Month'}` : ''}
              {categoryFilter ? ` · ${categories.find(c => c.id === categoryFilter)?.name}` : ''}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}>
            <Card style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={[styles.iconBg, { backgroundColor: item.type === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
                  <Text style={styles.txArrow}>{item.type === 'income' ? '↑' : '↓'}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txCategory}>{item.category_name || '—'}</Text>
                  <View style={styles.txMetaRow}>
                    <BankLogo name={item.account_name} size={18} style={styles.txBankLogo} />
                    <Text style={styles.txMeta}>{item.account_name} · {formatDate(item.txn_date)}</Text>
                  </View>
                  {item.user_id && item.user_id !== user?.id && (
                    <Text style={styles.txOwner}>by {memberMap[item.user_id] || 'Member'}</Text>
                  )}
                  {item.note ? <Text style={styles.txNote} numberOfLines={1}>📝 {item.note}</Text> : null}
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: item.type === 'income' ? C.income : C.expense }]}>
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: item.type === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
                    <Text style={[styles.badgeText, { color: item.type === 'income' ? C.income : C.expense }]}>
                      {item.type}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddTransaction')} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: SPACING.md, paddingBottom: 80 },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceHigh },
  typeChipText: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  periodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  periodChip: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  periodChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  periodChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  periodChipTextActive: { color: C.primaryLight, fontWeight: '700' },
  catScroll: { flexGrow: 0, marginBottom: SPACING.sm },
  catChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh, marginRight: SPACING.sm },
  catChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  catChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  catChipTextActive: { color: C.primaryLight, fontWeight: '700' },
  countLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginBottom: SPACING.sm },
  txCard: { marginBottom: SPACING.sm, padding: SPACING.sm + 4 },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  iconBg: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  txArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
  txInfo: { flex: 1 },
  txCategory: { color: C.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  txBankLogo: { marginRight: 6 },
  txMeta: { flex: 1, color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  txOwner: { color: C.primaryLight, fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },
  txNote: { color: C.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 3 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10 },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
