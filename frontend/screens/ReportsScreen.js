import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import {
  getTrend, getCategoryBreakdown, getBudgetVsActual,
  getNetWorthTrend, getFamilyBreakdown, getAssetPortfolio,
} from '../api/reports';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 2 - 32;

const PALETTE = ['#6C63FF', '#00D9A3', '#FF5C7A', '#FFB74D', '#4DA3FF', '#FF8A65', '#A5D6A7'];

const ASSET_TYPE_ICONS = {
  real_estate: '🏠', gold: '🪙', jewelry: '💍', vehicle: '🚗',
  stocks: '📈', mutual_fund: '📊', fixed_deposit: '🏦', other: '💼',
};

// Sub-tabs with isHeader sentinels for section labels
const SUB_TABS = [
  { key: '__cf',       label: 'CASH FLOW',  isHeader: true },
  { key: 'trend',      label: 'Trend' },
  { key: 'categories', label: 'Categories' },
  { key: 'budget',     label: 'Budget' },
  { key: '__w',        label: 'WEALTH',     isHeader: true },
  { key: 'assets',     label: 'Assets' },
  { key: 'networth',   label: 'Net Worth' },
  { key: 'family',     label: 'Family' },
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

  return (
    <View>
      <View style={styles.statsRow}>
        <StatItem label="Avg Net" value={formatCurrency(data.avg_net)} color={data.avg_net >= 0 ? C.income : C.expense} styles={styles} />
        {data.best_month && <StatItem label="Best Month" value={`${data.best_month.label} (${formatCurrency(data.best_month.net)})`} color={C.income} styles={styles} />}
        {data.worst_month && <StatItem label="Worst Month" value={`${data.worst_month.label} (${formatCurrency(data.worst_month.net)})`} color={C.expense} styles={styles} />}
      </View>
      {barData.length > 0
        ? <BarChart data={barData} barWidth={16} noOfSections={4} isAnimated width={CHART_WIDTH} yAxisTextStyle={{ color: C.textMuted, fontSize: 9 }} xAxisColor={C.border} yAxisColor={C.border} rulesColor={C.border} />
        : <EmptyState icon="📊" message="No transaction data yet." />}
      <View style={styles.legendWrap}>
        <LegendDot color={C.income} label="Income" styles={styles} />
        <LegendDot color={C.expense} label="Expense" styles={styles} />
      </View>
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
        : <EmptyState icon="🥧" message="No expense data for this period." />}
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
  if (data.categories.length === 0) return <EmptyState icon="📋" message="No budget data. Add budgets to your expense categories." />;

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
      {data.categories.map((cat) => {
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
                  {cat.variance > 0 && <Text style={[styles.budgetVariance, { color: C.expense }]}>+{formatCurrency(cat.variance)} over</Text>}
                </View>
              </>
            ) : <Text style={styles.budgetNoBudget}>No budget set</Text>}
          </View>
        );
      })}
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
    return <EmptyState icon="💼" message="No assets yet. Add assets from the Accounts tab." />;
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
              label={`${ASSET_TYPE_ICONS[t.asset_type] || '💼'} ${t.asset_type.replace('_', ' ')} (${t.count})`}
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
            <Text style={styles.assetRowIcon}>{ASSET_TYPE_ICONS[a.asset_type] || '💼'}</Text>
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
        : <EmptyState icon="📈" message="No data for this period." />}
    </View>
  );
}

// ─── FamilyReport ──────────────────────────────────────

function FamilyReport({ period, C, styles }) {
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
  if (members.length === 0) return <EmptyState icon="👨‍👩‍👧" message="No family data available." />;

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
        : <EmptyState icon="👨‍👩‍👧" message="No transaction data for this period." />}
      <View style={styles.legendWrap}>
        <LegendDot color={C.income} label="Income" styles={styles} />
        <LegendDot color={C.expense} label="Expense" styles={styles} />
      </View>
      {members.map((m, i) => (
        <View key={m.user_id} style={styles.memberCard}>
          <View style={styles.memberHeader}>
            <Text style={styles.memberName}>{m.is_self ? '👤 You' : `👤 Member ${i + 1}`}</Text>
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

// ─── ReportsScreen ─────────────────────────────────────

export default function ReportsScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [activeTab, setActiveTab] = useState('trend');
  const [period, setPeriod] = useState('month');
  const [months, setMonths] = useState(6);

  const showPeriod = ['categories', 'budget', 'family'].includes(activeTab);
  const showMonths = ['trend', 'networth'].includes(activeTab);

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
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTabChip, activeTab === tab.key && styles.subTabChipActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.subTabText, activeTab === tab.key && styles.subTabTextActive]}>
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

      <Card style={styles.reportCard}>
        {activeTab === 'trend'      && <TrendReport months={months} C={C} styles={styles} />}
        {activeTab === 'categories' && <CategoryReport period={period} C={C} styles={styles} />}
        {activeTab === 'budget'     && <BudgetReport period={period} C={C} styles={styles} />}
        {activeTab === 'assets'     && <AssetPortfolioReport C={C} styles={styles} />}
        {activeTab === 'networth'   && <NetWorthReport months={months} C={C} styles={styles} />}
        {activeTab === 'family'     && <FamilyReport period={period} C={C} styles={styles} />}
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
    paddingVertical: 8, marginRight: 4,
  },
  sectionLabelText: {
    color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1,
  },
  subTabChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh, marginRight: SPACING.sm,
  },
  subTabChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  subTabText: { color: C.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  subTabTextActive: { color: C.primaryLight, fontWeight: '700' },

  selectorRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  selectorChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh,
  },
  selectorChipActive: { borderColor: C.primary, backgroundColor: C.primary + '22' },
  selectorText: { color: C.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  selectorTextActive: { color: C.primaryLight, fontWeight: '700' },

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

  budgetRow: {
    marginBottom: SPACING.sm, backgroundColor: C.surfaceHigh,
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
  assetRowIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  assetRowInfo: { flex: 1 },
  assetRowName: { color: C.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  assetRowType: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  assetRowRight: { alignItems: 'flex-end' },
  assetRowValue: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  assetRowGain: { fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 2 },

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
});
