import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput,
} from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import {
  getTrend, getCategoryBreakdown, getBudgetVsActual,
  getNetWorthTrend, getNetWorthSnapshot, getFamilyBreakdown,
  getAssetPortfolio, getExpenseCategoryTrends, getCCReport,
} from '../api/reports';
import { getMonthlyBalances, upsertMonthlyBalance, getReconciliationReport } from '../api/accounts';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getMemberName } from '../utils/helpers';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import TypeIcon from '../components/TypeIcon';
import {
  ChartBar, ChartPieSlice, ClipboardText, Briefcase, TrendUp, TrendDown,
  UsersThree, ArrowUpRight, ArrowDownLeft, CreditCard, Scales, ArrowsDownUp,
} from 'phosphor-react-native';
import BankLogo from '../components/BankLogo';
import { formatDate } from '../utils/helpers';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 2 - 32;

const PALETTE = ['#6C63FF', '#00D9A3', '#FF5C7A', '#FFB74D', '#4DA3FF', '#FF8A65', '#A5D6A7'];

// Sub-tabs with isHeader sentinels for section labels
const SUB_TABS = [
  { key: '__cf',           label: 'CASH FLOW',      isHeader: true },
  { key: 'trend',          label: 'Trend',          Icon: ChartBar },
  { key: 'categories',     label: 'Categories',     Icon: ChartPieSlice },
  { key: 'expense_trends', label: 'Exp. Trends',    Icon: TrendDown },
  { key: 'budget',         label: 'Budget',         Icon: ClipboardText },
  { key: 'cc',             label: 'Credit Cards',   Icon: CreditCard },
  { key: '__w',            label: 'WEALTH',         isHeader: true },
  { key: 'assets',         label: 'Assets',         Icon: Briefcase },
  { key: 'networth',       label: 'Net Worth',      Icon: Scales },
  { key: 'family',         label: 'Family',         Icon: UsersThree },
  { key: '__sb',           label: 'SB ACCOUNTS',    isHeader: true },
  { key: 'reconciliation', label: 'Reconciliation', Icon: ArrowsDownUp },
];

const PERIOD_OPTIONS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

const MONTHS_OPTIONS = [
  { key: 6,  label: '6 Months' },
  { key: 12, label: '12 Months' },
];

const RECON_MONTHS_OPTIONS = [
  { key: 3,  label: '3M' },
  { key: 6,  label: '6M' },
  { key: 12, label: '1Y' },
];

// ─── Shared small components ───────────────────────────

function StatItem({ label, value, color, styles }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label, styles }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── TrendReport ───────────────────────────────────────

function TrendReport({ months, C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getTrend(months)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [months]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;

  const barData = [];
  (data.months || []).forEach((m, i) => {
    barData.push({ value: m.income, frontColor: C.income, label: m.label, spacing: 2, labelTextStyle: { color: C.textMuted, fontSize: 9 } });
    barData.push({ value: m.expense, frontColor: C.expense, spacing: i < (data.months.length - 1) ? 14 : 2 });
  });

  const hasData = barData.some((d) => d.value > 0);

  return (
    <View>
      <View style={styles.statsRow}>
        <StatItem label="Avg Net" value={formatCurrency(data.avg_net)} color={data.avg_net >= 0 ? C.income : C.expense} styles={styles} />
        {data.best_month && <StatItem label="Best Month" value={`${data.best_month.label} (${formatCurrency(data.best_month.net)})`} color={C.income} styles={styles} />}
        {data.worst_month && <StatItem label="Worst Month" value={`${data.worst_month.label} (${formatCurrency(data.worst_month.net)})`} color={C.expense} styles={styles} />}
      </View>
      {hasData
        ? <BarChart data={barData} barWidth={16} noOfSections={4} isAnimated width={CHART_WIDTH} yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }} xAxisColor={C.border} yAxisColor={C.border} rulesColor={C.border} />
        : <EmptyState icon={<ChartBar size={48} color={C.textMuted} />} message="No transaction data yet." />}
      {hasData && (
        <View style={styles.legendWrap}>
          <LegendDot color={C.income} label="Income" styles={styles} />
          <LegendDot color={C.expense} label="Expense" styles={styles} />
        </View>
      )}
    </View>
  );
}

// ─── CategoryReport ────────────────────────────────────

function CategoryReport({ period, C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getCategoryBreakdown(period)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;

  const pieData = (data.breakdown || []).map((item, i) => ({
    value: item.amount,
    color: PALETTE[i % PALETTE.length],
    text: item.percentage > 5 ? `${item.percentage}%` : '',
  }));

  return (
    <View>
      <Text style={styles.heroSubLabel}>TOTAL EXPENSE</Text>
      <Text style={[styles.heroAmount, { color: C.expense }]}>{formatCurrency(data.total_expense)}</Text>
      {pieData.length > 0
        ? (
          <View style={styles.pieWrap}>
            <PieChart
              data={pieData} donut radius={110} innerRadius={70}
              centerLabelComponent={() => <Text style={[styles.pieCenter, { color: C.textPrimary }]}>{formatCurrency(data.total_expense)}</Text>}
              textColor={C.textPrimary} textSize={11}
            />
          </View>
        )
        : <EmptyState icon={<ChartPieSlice size={48} color={C.textMuted} />} message="No expense data for this period." />}
      <View style={styles.legendGrid}>
        {(data.breakdown || []).map((item, i) => (
          <View key={item.category_id || item.category_name} style={styles.legendGridItem}>
            <LegendDot color={PALETTE[i % PALETTE.length]} label={`${item.category_name} (${item.percentage}%)`} styles={styles} />
            <Text style={[styles.legendAmt, { color: C.expense }]}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── BudgetReport ──────────────────────────────────────

function BudgetReport({ period, C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getBudgetVsActual(period)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;
  if (data.categories.length === 0) return <EmptyState icon={<ClipboardText size={48} color={C.textMuted} />} message="No budget data. Add budgets to your expense categories." />;

  return (
    <View>
      <View style={styles.statsRow}>
        <StatItem label="Budget" value={formatCurrency(data.total_budget)} color={C.textPrimary} styles={styles} />
        <StatItem label="Actual" value={formatCurrency(data.total_actual)} color={C.expense} styles={styles} />
        <StatItem label="Variance" value={formatCurrency(data.total_variance)} color={data.total_variance > 0 ? C.expense : C.income} styles={styles} />
      </View>
      {data.over_budget_count > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: C.expenseSubtle, borderColor: C.expense }]}>
          <Text style={[styles.alertText, { color: C.expense }]}>
            ⚠️ {data.over_budget_count} categor{data.over_budget_count === 1 ? 'y' : 'ies'} over budget
          </Text>
        </View>
      )}
      {data.categories.reduce((rows, cat, i) => {
        if (i % 2 === 0) rows.push([]);
        rows[rows.length - 1].push(cat);
        return rows;
      }, []).map((pair, ri) => (
        <View key={ri} style={styles.budgetPairRow}>
          {pair.map((cat) => {
            const hasBudget = cat.budget != null;
            const pct = hasBudget ? Math.min((cat.percentage || 0) / 100, 1) : 0;
            const barColor = pct < 0.6 ? C.income : pct < 0.85 ? C.warning : C.expense;
            return (
              <View key={cat.category_id || cat.category_name} style={styles.budgetRow}>
                <View style={styles.budgetRowTop}>
                  <Text style={styles.budgetCatName} numberOfLines={1}>{cat.category_name}</Text>
                  <Text style={[styles.budgetAmt, { color: C.expense }]}>{formatCurrency(cat.actual)}</Text>
                </View>
                {hasBudget ? (
                  <>
                    <View style={styles.budgetTrack}>
                      <View style={[styles.budgetFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                    </View>
                    <View style={styles.budgetRowBottom}>
                      <Text style={[styles.budgetPct, { color: barColor }]}>{Math.round(pct * 100)}%</Text>
                      <Text style={styles.budgetOf}>of {formatCurrency(cat.budget)}</Text>
                      {cat.variance > 0 && <Text style={[styles.budgetVariance, { color: C.expense }]}>over</Text>}
                    </View>
                  </>
                ) : <Text style={styles.budgetNoBudget}>No budget set</Text>}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── AssetPortfolioReport ──────────────────────────────

function AssetPortfolioReport({ C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getAssetPortfolio()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;

  if (data.assets.length === 0) {
    return <EmptyState icon={<Briefcase size={48} color={C.textMuted} />} message="No assets yet. Add assets from the Accounts tab." />;
  }

  const pieData = (data.by_type || []).map((t, i) => ({
    value: t.total_value,
    color: PALETTE[i % PALETTE.length],
    text: data.total_value > 0 ? `${Math.round(t.total_value / data.total_value * 100)}%` : '',
  }));

  return (
    <View>
      <View style={styles.statsRow}>
        <StatItem label="Total Value" value={formatCurrency(data.total_value)} color={C.netBalance} styles={styles} />
        <StatItem label="Total Cost" value={formatCurrency(data.total_cost)} color={C.textPrimary} styles={styles} />
        <StatItem label="Total Gain" value={formatCurrency(data.total_gain_loss)} color={data.total_gain_loss >= 0 ? C.income : C.expense} styles={styles} />
      </View>

      {pieData.length > 0 && (
        <View style={styles.pieWrap}>
          <PieChart
            data={pieData} donut radius={110} innerRadius={70}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.pieCenter, { color: C.textPrimary }]}>{formatCurrency(data.total_value)}</Text>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>Portfolio</Text>
              </View>
            )}
            textColor={C.textPrimary} textSize={11}
          />
        </View>
      )}

      <View style={styles.legendGrid}>
        {(data.by_type || []).map((t, i) => (
          <View key={t.asset_type} style={styles.legendGridItem}>
            <LegendDot
              color={PALETTE[i % PALETTE.length]}
              label={`${t.asset_type.replace('_', ' ')} (${t.count})`}
              styles={styles}
            />
            <Text style={[styles.legendAmt, { color: C.netBalance }]}>{formatCurrency(t.total_value)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.assetListDivider} />
      {(data.assets || []).map((a) => {
        const hasGain = a.gain_loss != null;
        return (
          <View key={a.id} style={styles.assetRow}>
            <View style={styles.assetRowIconWrap}>
              <TypeIcon type={a.asset_type} size={22} color={C.primaryLight} />
            </View>
            <View style={styles.assetRowInfo}>
              <Text style={styles.assetRowName} numberOfLines={1}>{a.name}</Text>
              <Text style={styles.assetRowType}>{a.asset_type.replace('_', ' ')}</Text>
            </View>
            <View style={styles.assetRowRight}>
              <Text style={[styles.assetRowValue, { color: C.netBalance }]}>{formatCurrency(a.current_value)}</Text>
              {hasGain && (
                <Text style={[styles.assetRowGain, { color: a.gain_loss >= 0 ? C.income : C.expense }]}>
                  {a.gain_loss >= 0 ? '+' : ''}{a.gain_loss_pct}%
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── NetWorthReport ────────────────────────────────────

function NetWorthReport({ months, C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getNetWorthTrend(months)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [months]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;

  const lineData = (data.months || []).map((m) => ({
    value: m.net_worth,
    label: m.label,
    dataPointColor: C.netBalance,
    labelTextStyle: { color: C.textMuted, fontSize: 9 },
  }));

  return (
    <View>
      <View style={styles.statsRow}>
        <StatItem label="Current Net Worth" value={formatCurrency(data.current_net_worth)} color={C.netBalance} styles={styles} />
        <StatItem label="Change" value={formatCurrency(data.change)} color={data.change >= 0 ? C.income : C.expense} styles={styles} />
      </View>
      {lineData.length > 0
        ? (
          <LineChart
            data={lineData} areaChart color={C.netBalance} startFillColor={C.netBalance}
            startOpacity={0.3} endOpacity={0.05} curved isAnimated width={CHART_WIDTH}
            yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }} xAxisColor={C.border}
            yAxisColor={C.border} rulesColor={C.border} dataPointsColor={C.netBalance} thickness={2}
          />
        )
        : <EmptyState icon={<TrendUp size={48} color={C.textMuted} />} message="No data for this period." />}
    </View>
  );
}

// ─── FamilyReport ──────────────────────────────────────

function FamilyReport({ period, C, styles }) {
  const { user, family } = useAuth();
  const memberNameMap = Object.fromEntries(
    (family?.members || []).map((m) => [m.user_id, getMemberName(m, user)])
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getFamilyBreakdown(period)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;

  const members = data.members || [];
  if (members.length === 0) return <EmptyState icon={<UsersThree size={48} color={C.textMuted} />} message="No family data available." />;

  const barData = [];
  members.forEach((m, i) => {
    const label = m.is_self ? 'You' : `M${i + 1}`;
    barData.push({ value: m.income, frontColor: C.income, label, spacing: 2, labelTextStyle: { color: C.textMuted, fontSize: 9 } });
    barData.push({ value: m.expense, frontColor: C.expense, spacing: i < members.length - 1 ? 14 : 2 });
  });

  return (
    <View>
      {barData.length > 0
        ? <BarChart data={barData} barWidth={16} noOfSections={4} isAnimated width={CHART_WIDTH} yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }} xAxisColor={C.border} yAxisColor={C.border} rulesColor={C.border} />
        : <EmptyState icon={<UsersThree size={48} color={C.textMuted} />} message="No transaction data for this period." />}
      <View style={styles.legendWrap}>
        <LegendDot color={C.income} label="Income" styles={styles} />
        <LegendDot color={C.expense} label="Expense" styles={styles} />
      </View>
      {members.map((m, i) => (
        <View key={m.user_id} style={styles.memberCard}>
          <View style={styles.memberHeader}>
            <Text style={styles.memberName}>👤 {memberNameMap[m.user_id] || 'Family Member'}</Text>
            <Text style={[styles.memberNet, { color: m.net >= 0 ? C.income : C.expense }]}>Net: {formatCurrency(m.net)}</Text>
          </View>
          <View style={styles.memberStats}>
            <View style={styles.memberStat}>
              <Text style={styles.memberStatLabel}>Income</Text>
              <Text style={[styles.memberStatValue, { color: C.income }]}>{formatCurrency(m.income)}</Text>
            </View>
            <View style={styles.memberStat}>
              <Text style={styles.memberStatLabel}>Expense</Text>
              <Text style={[styles.memberStatValue, { color: C.expense }]}>{formatCurrency(m.expense)}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── ExpenseTrendsReport ───────────────────────────────

function ExpenseTrendsReport({ months, C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getExpenseCategoryTrends(months)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [months]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  const hasExpData = data && data.categories.length > 0 && data.categories.some((c) => c.total > 0);
  if (!hasExpData) return <EmptyState icon={<TrendDown size={48} color={C.textMuted} />} message="No expense data yet." />;

  // Top 5 categories only — keeps chart readable
  const topCats = data.categories.slice(0, 5);
  const labels = data.month_labels || [];

  // Build grouped bar data: for each month, one bar per category
  const barData = [];
  labels.forEach((lbl, mi) => {
    topCats.forEach((cat, ci) => {
      const isLast = ci === topCats.length - 1;
      barData.push({
        value: cat.monthly_amounts[mi] || 0,
        frontColor: PALETTE[ci % PALETTE.length],
        label: ci === 0 ? lbl : '',
        spacing: isLast ? (mi < labels.length - 1 ? 12 : 2) : 2,
        labelTextStyle: { color: C.textMuted, fontSize: 9 },
      });
    });
  });

  return (
    <View>
      <Text style={styles.heroSubLabel}>TOP {topCats.length} EXPENSE CATEGORIES · {months}M</Text>
      {barData.length > 0 ? (
        <BarChart
          data={barData} barWidth={10} noOfSections={4} isAnimated width={CHART_WIDTH}
          yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }}
          xAxisColor={C.border} yAxisColor={C.border} rulesColor={C.border}
        />
      ) : <EmptyState icon={<TrendDown size={48} color={C.textMuted} />} message="No data for this period." />}

      <View style={[styles.legendGrid, { marginTop: SPACING.md }]}>
        {topCats.map((cat, i) => (
          <View key={cat.category_id || cat.category_name} style={styles.legendGridItem}>
            <LegendDot color={PALETTE[i % PALETTE.length]} label={cat.category_name} styles={styles} />
            <Text style={[styles.legendAmt, { color: C.expense }]}>{formatCurrency(cat.total)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── NetWorthSnapshotReport ────────────────────────────

const NW_TYPE_LABELS = { savings: 'Savings', checking: 'Checking', cash: 'Cash', credit: 'Credit Card', fd: 'Fixed Deposit', rd: 'Recurring Deposit', mutual_fund: 'Mutual Fund', equity: 'Equity / Stocks', lic: 'LIC Policy', ppf: 'PPF', nps: 'NPS' };

function TierRow({ label, value, color, bold = false, styles, indent = false, icon }) {
  return (
    <View style={[styles.snapshotRow, indent && { paddingLeft: 16 }]}>
      <View style={styles.tierRowLabel}>
        {icon && <View style={styles.tierRowIcon}>{icon}</View>}
        <Text style={bold ? styles.snapshotLabel : styles.snapshotSubLabel}>{label}</Text>
      </View>
      <Text style={[bold ? styles.snapshotValue : styles.snapshotSubValue, { color }]}>{value}</Text>
    </View>
  );
}

function NetWorthSnapshotCard({ C, styles }) {
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setSnap(await getNetWorthSnapshot()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!snap) return null;

  return (
    <View style={styles.snapshotCard}>
      <Text style={styles.heroSubLabel}>NET WORTH</Text>
      <Text style={[styles.heroAmount, { color: snap.grand2_with_investments >= 0 ? C.netBalance : C.expense }]}>
        {formatCurrency(snap.grand2_with_investments)}
      </Text>

      {/* ── Tier 1: In Hand ─────────────────────── */}
      <View style={styles.snapshotDivider} />
      <View style={[styles.snapshotTierHeader, { backgroundColor: C.primary + '18' }]}>
        <Text style={[styles.snapshotTierLabel, { color: C.primaryLight }]}>ACTUAL IN HAND</Text>
        <Text style={[styles.snapshotTierValue, { color: C.primaryLight }]}>{formatCurrency(snap.actual_in_hand)}</Text>
      </View>
      {(snap.bank_breakdown || []).map((item) => (
        <TierRow
          key={item.account_type}
          icon={<TypeIcon type={item.account_type} size={13} color={item.balance >= 0 ? C.textSecondary : C.expense} />}
          label={`${NW_TYPE_LABELS[item.account_type] || item.account_type}${item.count > 1 ? ` (${item.count})` : ''}`}
          value={formatCurrency(item.balance)}
          color={item.balance >= 0 ? C.textSecondary : C.expense}
          styles={styles}
          indent
        />
      ))}

      {/* ── Tier 2: + Outstandings ──────────────── */}
      <View style={styles.snapshotDivider} />
      <View style={[styles.snapshotTierHeader, { backgroundColor: C.income + '18' }]}>
        <Text style={[styles.snapshotTierLabel, { color: C.income }]}>WITH OUTSTANDINGS</Text>
        <Text style={[styles.snapshotTierValue, { color: C.income }]}>{formatCurrency(snap.grand1_with_outstandings)}</Text>
      </View>
      <TierRow icon={<ArrowUpRight size={13} color={C.income} />} label="Lent Out" value={formatCurrency(snap.total_lent)} color={C.income} styles={styles} indent />
      <TierRow icon={<ArrowDownLeft size={13} color={C.expense} />} label="Borrowed" value={`-${formatCurrency(snap.total_borrowed)}`} color={C.expense} styles={styles} indent />

      {/* ── Tier 3: + Investments + Assets ─────── */}
      <View style={styles.snapshotDivider} />
      <View style={[styles.snapshotTierHeader, { backgroundColor: C.netBalance + '18' }]}>
        <Text style={[styles.snapshotTierLabel, { color: C.netBalance }]}>WITH INVESTMENTS</Text>
        <Text style={[styles.snapshotTierValue, { color: C.netBalance }]}>{formatCurrency(snap.grand2_with_investments)}</Text>
      </View>
      {(snap.investment_breakdown || []).length > 0 && (
        <>
          <TierRow icon={<ChartPieSlice size={13} color={C.textSecondary} />} label="Investments" value={formatCurrency(snap.investment_value)} color={C.textSecondary} styles={styles} indent />
          {snap.investment_breakdown.map((item) => (
            <TierRow
              key={item.account_type}
              icon={<TypeIcon type={item.account_type} size={13} color={C.textMuted} />}
              label={`${NW_TYPE_LABELS[item.account_type] || item.account_type}${item.count > 1 ? ` (${item.count})` : ''}`}
              value={formatCurrency(item.balance)}
              color={C.textMuted}
              styles={styles}
            />
          ))}
        </>
      )}
      <TierRow icon={<Briefcase size={13} color={C.textSecondary} />} label="Asset Portfolio" value={formatCurrency(snap.asset_value)} color={C.textSecondary} styles={styles} indent />
    </View>
  );
}

// ─── CreditCardReport ──────────────────────────────────

function CreditCardReport({ period, C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getCCReport(period)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;

  if (data.cards.length === 0) {
    return <EmptyState icon={<CreditCard size={48} color={C.textMuted} />} message="No credit card accounts found. Add a credit account to get started." />;
  }

  const hasTransactions = data.transactions.length > 0;

  const pieData = (data.by_category || []).map((item, i) => ({
    value: item.amount,
    color: PALETTE[i % PALETTE.length],
    text: item.percentage > 5 ? `${item.percentage}%` : '',
  }));

  return (
    <View>
      {/* Summary stats */}
      <View style={styles.statsRow}>
        <StatItem label="Total Spend" value={formatCurrency(data.total_spend)} color={C.expense} styles={styles} />
        {data.total_refund > 0 && (
          <StatItem label="Refunds" value={formatCurrency(data.total_refund)} color={C.income} styles={styles} />
        )}
        <StatItem label="Net Spend" value={formatCurrency(data.net_spend)} color={data.net_spend > 0 ? C.expense : C.income} styles={styles} />
      </View>

      {/* Per-card breakdown */}
      {data.cards.length > 1 && (
        <>
          <Text style={styles.heroSubLabel}>BY CARD</Text>
          {data.cards.map((card) => {
            const pct = data.total_spend > 0 ? card.spend / data.total_spend : 0;
            return (
              <View key={card.account_id} style={styles.ccCardRow}>
                <BankLogo name={card.account_name} size={28} />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <View style={styles.ccCardTop}>
                    <Text style={styles.ccCardName} numberOfLines={1}>{card.account_name}</Text>
                    <Text style={[styles.ccCardAmt, { color: C.expense }]}>{formatCurrency(card.spend)}</Text>
                  </View>
                  <View style={styles.ccBarTrack}>
                    <View style={[styles.ccBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: C.expense }]} />
                  </View>
                  {card.refund > 0 && (
                    <Text style={[styles.ccRefundLabel, { color: C.income }]}>Refund: {formatCurrency(card.refund)}</Text>
                  )}
                </View>
              </View>
            );
          })}
          <View style={styles.snapshotDivider} />
        </>
      )}

      {/* Category breakdown — pie chart */}
      {!hasTransactions ? (
        <EmptyState icon={<CreditCard size={48} color={C.textMuted} />} message="No CC transactions for this period." />
      ) : (
        <>
          <Text style={styles.heroSubLabel}>BY CATEGORY</Text>
          {pieData.length > 0 && (
            <View style={styles.pieWrap}>
              <PieChart
                data={pieData} donut radius={110} innerRadius={70}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.pieCenter, { color: C.textPrimary }]}>{formatCurrency(data.net_spend)}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 10 }}>Net Spend</Text>
                  </View>
                )}
                textColor={C.textPrimary} textSize={11}
              />
            </View>
          )}
          <View style={styles.legendGrid}>
            {(data.by_category || []).map((item, i) => (
              <View key={item.category_id || item.category_name} style={styles.legendGridItem}>
                <LegendDot color={PALETTE[i % PALETTE.length]} label={`${item.category_name} (${item.percentage}%)`} styles={styles} />
                <Text style={[styles.legendAmt, { color: C.expense }]}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>

          {/* Transaction list */}
          <View style={styles.snapshotDivider} />
          <Text style={styles.heroSubLabel}>TRANSACTIONS</Text>
          {data.transactions.map((tx) => (
            <View key={tx.id} style={styles.ccTxRow}>
              <View style={[styles.ccTxIcon, { backgroundColor: tx.type === 'income' ? C.incomeSubtle : C.expenseSubtle }]}>
                <CreditCard size={14} color={tx.type === 'income' ? C.income : C.expense} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ccTxCategory} numberOfLines={1}>{tx.category_name || '—'}</Text>
                <Text style={styles.ccTxMeta} numberOfLines={1}>{tx.account_name} · {formatDate(tx.txn_date)}</Text>
              </View>
              <Text style={[styles.ccTxAmt, { color: tx.type === 'income' ? C.income : C.expense }]}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ─── ReconciliationReport ──────────────────────────────

function AccountReconCard({ entry, C, styles, onRowPress }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={styles.reconCard}>
      <TouchableOpacity style={styles.reconCardHeader} onPress={() => setExpanded(!expanded)}>
        <BankLogo name={entry.account_name} size={22} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.reconAccountName}>{entry.account_name}</Text>
          {!entry.is_mine && entry.owner_name ? (
            <Text style={styles.reconOwnerName}>{entry.owner_name}</Text>
          ) : null}
        </View>
        <Text style={styles.monthlyChevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.xs }}>
          <View>
            <View style={styles.reconTableRow}>
              {['Month', 'OB', 'Income', 'Expenses', 'Comp.Closing', 'Adj', 'Actual'].map((h) => (
                <Text key={h} style={[styles.reconCell, styles.reconHeaderCell]}>{h}</Text>
              ))}
            </View>
            {entry.rows.map((row) => {
              const today = new Date();
              const isCurrent = row.year === today.getFullYear() && row.month === (today.getMonth() + 1);
              return (
                <TouchableOpacity
                  key={`${row.year}-${row.month}`}
                  style={[styles.reconTableRow, row.is_draft && { opacity: 0.55 }]}
                  onPress={() => onRowPress(entry.account_id, row)}
                >
                  <View style={[styles.reconCell, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <Text style={[styles.reconCellText, isCurrent && { color: C.primaryLight }]}>{row.label}</Text>
                    {isCurrent && <View style={styles.inProgressBadge}><Text style={styles.inProgressText}>•</Text></View>}
                  </View>
                  <Text style={styles.reconCell}>{row.opening_balance != null ? formatCurrency(row.opening_balance) : '—'}</Text>
                  <Text style={[styles.reconCell, { color: C.income }]}>{formatCurrency(row.income)}</Text>
                  <Text style={[styles.reconCell, { color: C.expense }]}>{formatCurrency(row.expenses)}</Text>
                  <Text style={styles.reconCell}>{row.computed_closing != null ? formatCurrency(row.computed_closing) : '—'}</Text>
                  <Text style={[styles.reconCell, row.manual_adj !== 0 && { color: C.primaryLight, fontWeight: '700' }]}>
                    {row.manual_adj !== 0 ? `${row.manual_adj > 0 ? '+' : ''}${formatCurrency(row.manual_adj)}` : '—'}
                  </Text>
                  <Text style={[styles.reconCell, row.actual_closing != null && { fontWeight: '700' }]}>
                    {row.actual_closing != null ? formatCurrency(row.actual_closing) : '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ReconciliationReport({ months, C, styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editAccountId, setEditAccountId] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [entryForm, setEntryForm] = useState({ opening_balance: '', manual_adj: '', note: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setLoading(true); setData(await getReconciliationReport(months)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [months]);
  useEffect(() => { load(); }, [load]);

  const openEdit = (accountId, row) => {
    setEditAccountId(accountId);
    setSelectedRow(row);
    setEntryForm({
      opening_balance: row.opening_balance != null ? String(row.opening_balance) : '',
      manual_adj: row.manual_adj !== 0 ? String(row.manual_adj) : '',
      note: row.note || '',
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!selectedRow || !editAccountId) return;
    setSaving(true);
    try {
      await upsertMonthlyBalance(editAccountId, {
        year: selectedRow.year,
        month: selectedRow.month,
        opening_balance: entryForm.opening_balance !== '' ? parseFloat(entryForm.opening_balance) : null,
        manual_adj: parseFloat(entryForm.manual_adj) || 0,
        note: entryForm.note.trim() || null,
      });
      setEditModal(false);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return null;

  const hasData = data.mine.length > 0 || data.family.length > 0;
  if (!hasData) return (
    <EmptyState message="No savings accounts found in your family." />
  );

  const ob = entryForm.opening_balance !== '' ? parseFloat(entryForm.opening_balance) || 0 : null;
  const adj = parseFloat(entryForm.manual_adj) || 0;
  const computed = ob != null ? ob + (selectedRow?.income || 0) - (selectedRow?.expenses || 0) : null;
  const actual = computed != null ? computed + adj : null;

  return (
    <View>
      {data.mine.length > 0 && (
        <>
          <Text style={styles.reconSectionHeader}>MY ACCOUNTS</Text>
          {data.mine.map((e) => (
            <AccountReconCard key={e.account_id} entry={e} C={C} styles={styles} onRowPress={openEdit} />
          ))}
        </>
      )}
      {data.family.length > 0 && (
        <>
          <Text style={styles.reconSectionHeader}>FAMILY ACCOUNTS</Text>
          {data.family.map((e) => (
            <AccountReconCard key={e.account_id} entry={e} C={C} styles={styles} onRowPress={openEdit} />
          ))}
        </>
      )}

      {/* Inline edit modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.reconOverlay}>
          <ScrollView contentContainerStyle={styles.reconModal} keyboardShouldPersistTaps="handled">
            <Text style={styles.reconModalTitle}>{selectedRow?.label} — Statement</Text>

            <Text style={styles.reconModalLabel}>Opening Balance ₹</Text>
            <TextInput
              style={styles.reconModalInput} keyboardType="numeric" placeholderTextColor={C.textMuted}
              placeholder="e.g. 48600" value={entryForm.opening_balance}
              onChangeText={(v) => setEntryForm({ ...entryForm, opening_balance: v })}
            />

            <View style={styles.reconRoRow}>
              <Text style={styles.reconRoLabel}>Income</Text>
              <Text style={[styles.reconRoValue, { color: C.income }]}>{formatCurrency(selectedRow?.income || 0)}</Text>
            </View>
            <View style={styles.reconRoRow}>
              <Text style={styles.reconRoLabel}>Expenses</Text>
              <Text style={[styles.reconRoValue, { color: C.expense }]}>{formatCurrency(selectedRow?.expenses || 0)}</Text>
            </View>
            <View style={styles.reconRoRow}>
              <Text style={styles.reconRoLabel}>Computed Closing</Text>
              <Text style={styles.reconRoValue}>{computed != null ? formatCurrency(computed) : '—'}</Text>
            </View>

            <Text style={styles.reconModalLabel}>Manual Adjustment ₹</Text>
            <TextInput
              style={styles.reconModalInput} keyboardType="numeric" placeholderTextColor={C.textMuted}
              placeholder="0" value={entryForm.manual_adj}
              onChangeText={(v) => setEntryForm({ ...entryForm, manual_adj: v })}
            />

            {actual != null && (
              <View style={[styles.reconRoRow, { borderBottomWidth: 0, marginTop: SPACING.xs }]}>
                <Text style={[styles.reconRoLabel, { fontWeight: '700' }]}>Actual Closing</Text>
                <Text style={[styles.reconRoValue, { fontWeight: '800', color: actual >= 0 ? C.income : C.expense }]}>{formatCurrency(actual)}</Text>
              </View>
            )}

            <Text style={styles.reconModalLabel}>Note</Text>
            <TextInput
              style={[styles.reconModalInput, { minHeight: 56 }]} multiline placeholderTextColor={C.textMuted}
              placeholder="Optional" value={entryForm.note}
              onChangeText={(v) => setEntryForm({ ...entryForm, note: v })}
            />

            <View style={styles.reconModalBtns}>
              <Button title="Cancel" variant="outline" onPress={() => setEditModal(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── ReportsScreen ─────────────────────────────────────

export default function ReportsScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [activeTab, setActiveTab] = useState('trend');
  const [period, setPeriod] = useState('month');
  const [months, setMonths] = useState(6);
  const [reconMonths, setReconMonths] = useState(6);

  const showPeriod = ['categories', 'budget', 'family', 'cc'].includes(activeTab);
  const showMonths = ['trend', 'networth', 'expense_trends'].includes(activeTab);
  const showReconMonths = activeTab === 'reconciliation';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Sub-tab chips with section headers */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabScroll}>
        {SUB_TABS.map((tab) => {
          if (tab.isHeader) {
            return (
              <View key={tab.key} style={styles.sectionLabel}>
                <Text style={styles.sectionLabelText}>{tab.label}</Text>
              </View>
            );
          }
          const isActive = activeTab === tab.key;
          const { Icon } = tab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTabChip, isActive && styles.subTabChipActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              {Icon && <Icon size={13} color={isActive ? '#fff' : C.textMuted} weight={isActive ? 'fill' : 'regular'} />}
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showPeriod && (
        <View style={styles.selectorRow}>
          {PERIOD_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.selectorChip, period === p.key && styles.selectorChipActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.selectorText, period === p.key && styles.selectorTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showMonths && (
        <View style={styles.selectorRow}>
          {MONTHS_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.selectorChip, months === m.key && styles.selectorChipActive]}
              onPress={() => setMonths(m.key)}
            >
              <Text style={[styles.selectorText, months === m.key && styles.selectorTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showReconMonths && (
        <View style={styles.selectorRow}>
          {RECON_MONTHS_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.selectorChip, reconMonths === m.key && styles.selectorChipActive]}
              onPress={() => setReconMonths(m.key)}
            >
              <Text style={[styles.selectorText, reconMonths === m.key && styles.selectorTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Card style={styles.reportCard}>
        {activeTab === 'trend'           && <TrendReport months={months} C={C} styles={styles} />}
        {activeTab === 'categories'      && <CategoryReport period={period} C={C} styles={styles} />}
        {activeTab === 'expense_trends'  && <ExpenseTrendsReport months={months} C={C} styles={styles} />}
        {activeTab === 'budget'          && <BudgetReport period={period} C={C} styles={styles} />}
        {activeTab === 'assets'          && <AssetPortfolioReport C={C} styles={styles} />}
        {activeTab === 'networth'        && (
          <>
            <NetWorthSnapshotCard C={C} styles={styles} />
            <View style={styles.snapshotDivider} />
            <NetWorthReport months={months} C={C} styles={styles} />
          </>
        )}
        {activeTab === 'family'          && <FamilyReport period={period} C={C} styles={styles} />}
        {activeTab === 'cc'              && <CreditCardReport period={period} C={C} styles={styles} />}
        {activeTab === 'reconciliation'  && <ReconciliationReport months={reconMonths} C={C} styles={styles} />}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  subTabScroll: { flexGrow: 0, marginBottom: SPACING.sm },
  sectionLabel: {
    justifyContent: 'center', paddingHorizontal: SPACING.sm,
    paddingVertical: 8, marginRight: 2,
    borderRightWidth: 1, borderRightColor: C.border,
  },
  sectionLabelText: {
    color: C.primaryLight, fontSize: 10, fontWeight: '800', letterSpacing: 1.2,
  },
  subTabChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: C.primaryLight + '44',
    backgroundColor: C.surfaceHigh, marginRight: SPACING.sm, gap: 5,
  },
  subTabChipActive: { borderColor: C.primary, backgroundColor: C.primary },
  subTabText: { color: C.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  subTabTextActive: { color: '#fff', fontWeight: '700' },

  selectorRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  selectorChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: C.primaryLight + '44', backgroundColor: C.surfaceHigh,
  },
  selectorChipActive: { borderColor: C.primary, backgroundColor: C.primary },
  selectorText: { color: C.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  selectorTextActive: { color: '#fff', fontWeight: '700' },

  reportCard: { padding: SPACING.lg },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statItem: { flex: 1, minWidth: 90 },
  statLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginBottom: 2 },
  statValue: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

  legendWrap: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: C.textSecondary, fontSize: FONTS.sizes.xs, flex: 1 },
  legendGrid: { marginTop: SPACING.md, gap: SPACING.sm },
  legendGridItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendAmt: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

  heroSubLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 1, marginBottom: 4 },
  heroAmount: { fontSize: FONTS.sizes.xxl, fontWeight: '800', marginBottom: SPACING.md },
  pieWrap: { alignItems: 'center', marginVertical: SPACING.md },
  pieCenter: { fontSize: FONTS.sizes.sm, fontWeight: '700', textAlign: 'center' },

  budgetPairRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  budgetRow: {
    flex: 1, backgroundColor: C.surfaceHigh,
    borderRadius: RADIUS.md, padding: SPACING.sm + 4, borderWidth: 1, borderColor: C.border,
  },
  budgetRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetCatName: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600', flex: 1 },
  budgetAmt: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  budgetTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden', marginBottom: 4 },
  budgetFill: { height: '100%', borderRadius: 3 },
  budgetRowBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  budgetPct: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  budgetOf: { color: C.textMuted, fontSize: FONTS.sizes.xs, flex: 1 },
  budgetVariance: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  budgetNoBudget: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  alertBanner: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.sm, marginBottom: SPACING.md },
  alertText: { fontSize: FONTS.sizes.sm, fontWeight: '600' },

  assetListDivider: { height: 1, backgroundColor: C.border, marginVertical: SPACING.md },
  assetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.sm },
  assetRowIconWrap: { width: 32, alignItems: 'center', justifyContent: 'center' },
  assetRowInfo: { flex: 1 },
  assetRowName: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  assetRowType: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  assetRowRight: { alignItems: 'flex-end' },
  assetRowValue: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  assetRowGain: { fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },

  snapshotCard: { marginBottom: SPACING.md },
  snapshotDivider: { height: 1, backgroundColor: C.border, marginVertical: SPACING.md },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: SPACING.sm },
  tierRowLabel: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  tierRowIcon: { width: 16, alignItems: 'center' },
  snapshotLabel: { color: C.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  snapshotValue: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  snapshotSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingLeft: SPACING.lg },
  snapshotSubLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  snapshotSubValue: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  snapshotTierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, marginVertical: 4 },
  snapshotTierLabel: { fontSize: FONTS.sizes.xs, fontWeight: '800', letterSpacing: 1 },
  snapshotTierValue: { fontSize: FONTS.sizes.md, fontWeight: '800' },

  memberCard: {
    backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: C.border, padding: SPACING.sm + 4, marginTop: SPACING.sm,
  },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  memberName: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  memberNet: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  memberStats: { flexDirection: 'row', gap: SPACING.md },
  memberStat: {},
  memberStatLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs },
  memberStatValue: { fontSize: FONTS.sizes.md, fontWeight: '700' },

  ccCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  ccCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  ccCardName: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600', flex: 1 },
  ccCardAmt: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  ccBarTrack: { height: 5, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  ccBarFill: { height: '100%', borderRadius: 3 },
  ccRefundLabel: { fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 3 },
  ccTxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: SPACING.sm },
  ccTxIcon: { width: 30, height: 30, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  ccTxCategory: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  ccTxMeta: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  ccTxAmt: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

  // Reconciliation
  reconSectionHeader: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1, marginTop: SPACING.md, marginBottom: SPACING.xs },
  reconCard: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, marginBottom: SPACING.sm },
  reconCardHeader: { flexDirection: 'row', alignItems: 'center' },
  reconAccountName: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  reconOwnerName: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  monthlyChevron: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  reconTableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  reconCell: { width: 90, paddingVertical: 6, paddingHorizontal: 4, color: C.textPrimary, fontSize: FONTS.sizes.xs },
  reconCellText: { color: C.textPrimary, fontSize: FONTS.sizes.xs },
  reconHeaderCell: { color: C.textMuted, fontWeight: '700', fontSize: 10 },
  inProgressBadge: { backgroundColor: C.primary + '33', borderRadius: RADIUS.full, paddingHorizontal: 4, paddingVertical: 1 },
  inProgressText: { color: C.primaryLight, fontSize: 9, fontWeight: '700' },

  // Reconciliation edit modal
  reconOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  reconModal: { backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: 1, borderColor: C.border },
  reconModalTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  reconModalLabel: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm },
  reconModalInput: { backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, color: C.textPrimary, padding: SPACING.sm + 4, fontSize: FONTS.sizes.md },
  reconModalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  reconRoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  reconRoLabel: { color: C.textMuted, fontSize: FONTS.sizes.sm },
  reconRoValue: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
