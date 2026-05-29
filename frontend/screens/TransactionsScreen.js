import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTransactions } from '../api/transactions';
import { getCategories } from '../api/categories';
import { getAccounts } from '../api/accounts';
import { FONTS, SPACING, RADIUS, makeShadow } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate, getMemberName } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import BankLogo from '../components/BankLogo';
import { Receipt, MagnifyingGlass, ArrowCircleUp, ArrowCircleDown, ListBullets } from 'phosphor-react-native';

const startOfWeek = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d; };
const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; };
const isInPeriod = (txnDateStr, period) => {
  if (period === 'all') return true;
  const txnDate = new Date(txnDateStr);
  if (period === 'week') return txnDate >= startOfWeek();
  if (period === 'month') return txnDate >= startOfMonth();
  return true;
};

export default function TransactionsScreen({ navigation, route }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user, family } = useAuth();

  const memberMap = Object.fromEntries(
    (family?.members || []).map((m) => [m.user_id, getMemberName(m, user)])
  );

  const [allTransactions, setAllTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [accountFilter, setAccountFilter] = useState(null);
  const [memberFilter, setMemberFilter] = useState(null);
  const [lastAccountId, setLastAccountId] = useState(null);
  const [lastCategoryId, setLastCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const lastNavTs = useRef(0);
  useEffect(() => {
    const ts = route?.params?._nav_ts || 0;
    if (ts > lastNavTs.current) {
      lastNavTs.current = ts;
      setTypeFilter(route.params?.typeFilter || 'all');
      setCategoryFilter(route.params?.categoryId || null);
    }
  }, [route?.params?._nav_ts]);

  const load = async () => {
    try {
      setError(null);
      const [list, cats, accs, savedAccId, savedCatId] = await Promise.all([
        getTransactions(), getCategories(), getAccounts(),
        AsyncStorage.getItem('LAST_TXN_ACCOUNT_ID').catch(() => null),
        AsyncStorage.getItem('LAST_TXN_CATEGORY_ID').catch(() => null),
      ]);
      setAllTransactions(list || []);
      setCategories(cats || []);
      setAccounts(accs || []);
      if (savedAccId) setLastAccountId(savedAccId);
      if (savedCatId) setLastCategoryId(savedCatId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = () => { setRefreshing(true); load(); };

  const isFamily = (family?.members?.length || 0) > 1;

  const searchLower = searchQuery.trim().toLowerCase();
  const filtered = allTransactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (!isInPeriod(tx.txn_date, periodFilter)) return false;
    if (categoryFilter && tx.category_id !== categoryFilter) return false;
    if (accountFilter && tx.account_id !== accountFilter) return false;
    if (memberFilter && String(tx.user_id) !== memberFilter) return false;
    if (searchLower) {
      const inNote = tx.note?.toLowerCase().includes(searchLower);
      const inCategory = tx.category_name?.toLowerCase().includes(searchLower);
      const inAccount = tx.account_name?.toLowerCase().includes(searchLower);
      const inAmount = String(tx.amount).includes(searchLower);
      if (!inNote && !inCategory && !inAccount && !inAmount) return false;
    }
    return true;
  });

  const sbAccounts = useMemo(() => {
    const sb = accounts.filter((a) => ['savings', 'checking', 'credit'].includes(a.type));
    if (!lastAccountId) return sb;
    return [...sb.filter((a) => a.id === lastAccountId), ...sb.filter((a) => a.id !== lastAccountId)];
  }, [accounts, lastAccountId]);

  const visibleCategories = useMemo(() => {
    const cats = categories.filter((c) => typeFilter === 'all' || c.kind === typeFilter);
    if (!lastCategoryId) return cats;
    return [...cats.filter((c) => c.id === lastCategoryId), ...cats.filter((c) => c.id !== lastCategoryId)];
  }, [categories, typeFilter, lastCategoryId]);

  if (loading) return <LoadingSpinner />;

  const typeChipActiveBg = (f) => f === 'income' ? C.income : f === 'expense' ? C.expense : C.primary;
  const typeChipActive = (f) => ({ borderColor: typeChipActiveBg(f), backgroundColor: typeChipActiveBg(f) });
  const typeChipTextActive = () => ({ color: '#fff' });
  const typeChipIconColor = (f) => typeFilter === f ? '#fff' : C.textMuted;
  const TYPE_CHIPS = [
    { key: 'all',     label: 'All',     Icon: ListBullets },
    { key: 'income',  label: 'Income',  Icon: ArrowCircleUp },
    { key: 'expense', label: 'Expense', Icon: ArrowCircleDown },
  ];

  return (
    <View style={styles.screen}>
      {error && <ErrorBanner message={error} onRetry={load} />}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListEmptyComponent={<EmptyState icon={<Receipt size={48} color={C.textMuted} />} message="No transactions found." />}
        ListHeaderComponent={
          <>
            <View style={[styles.searchRow, searchQuery.length > 0 && { borderColor: C.primary }]}>
              <MagnifyingGlass size={18} color={searchQuery.length > 0 ? C.primary : C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search note, category, account, amount..."
                placeholderTextColor={C.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="never"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity style={styles.searchClear} onPress={() => setSearchQuery('')}>
                  <Text style={styles.searchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.typeRow}>
              {TYPE_CHIPS.map(({ key, label, Icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeChip, typeFilter === key && typeChipActive(key)]}
                  onPress={() => { setTypeFilter(key); setCategoryFilter(null); }}
                >
                  <Icon size={15} color={typeChipIconColor(key)} weight={typeFilter === key ? 'fill' : 'regular'} />
                  <Text style={[styles.typeChipText, typeFilter === key && typeChipTextActive(key)]}>
                    {' '}{label}
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

            {sbAccounts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                <TouchableOpacity
                  style={[styles.catChip, accountFilter === null && styles.catChipActive]}
                  onPress={() => setAccountFilter(null)}
                >
                  <Text style={[styles.catChipText, accountFilter === null && styles.catChipTextActive]}>All Accounts</Text>
                </TouchableOpacity>
                {sbAccounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.catChip, accountFilter === a.id && styles.catChipActive]}
                    onPress={() => setAccountFilter(accountFilter === a.id ? null : a.id)}
                  >
                    <View style={styles.acctChipInner}>
                      <BankLogo name={a.name} size={14} style={{ marginRight: 4 }} />
                      <Text style={[styles.catChipText, accountFilter === a.id && styles.catChipTextActive]}>{a.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

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

            {isFamily && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                <TouchableOpacity
                  style={[styles.catChip, memberFilter === null && styles.catChipActive]}
                  onPress={() => setMemberFilter(null)}
                >
                  <Text style={[styles.catChipText, memberFilter === null && styles.catChipTextActive]}>All Members</Text>
                </TouchableOpacity>
                {(family?.members || []).map((m) => {
                  const mid = String(m.user_id);
                  return (
                    <TouchableOpacity
                      key={mid}
                      style={[styles.catChip, memberFilter === mid && styles.catChipActive]}
                      onPress={() => setMemberFilter(memberFilter === mid ? null : mid)}
                    >
                      <Text style={[styles.catChipText, memberFilter === mid && styles.catChipTextActive]}>
                        {getMemberName(m, user)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.countLabel}>
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              {periodFilter !== 'all' ? ` · ${periodFilter === 'week' ? 'This Week' : 'This Month'}` : ''}
              {accountFilter ? ` · ${accounts.find(a => a.id === accountFilter)?.name}` : ''}
              {categoryFilter ? ` · ${categories.find(c => c.id === categoryFilter)?.name}` : ''}
              {memberFilter ? ` · ${memberMap[memberFilter] || 'Member'}` : ''}
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
                  {isFamily && item.user_id && (
                    <Text style={styles.txOwner}>by {memberMap[String(item.user_id)] || 'Member'}</Text>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: SPACING.md, paddingVertical: 8, marginBottom: SPACING.sm },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: FONTS.sizes.sm, padding: 0 },
  searchClear: { marginLeft: SPACING.sm, padding: 2 },
  searchClearText: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceHigh },
  typeChipText: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  periodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  periodChip: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  periodChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  periodChipText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  periodChipTextActive: { color: C.primaryLight, fontWeight: '700' },
  catScroll: { flexGrow: 0, marginBottom: SPACING.sm },
  catChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh, marginRight: SPACING.sm },
  acctChipInner: { flexDirection: 'row', alignItems: 'center' },
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
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...makeShadow(C.primary, { opacity: 0.5, elevation: 10 }) },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
