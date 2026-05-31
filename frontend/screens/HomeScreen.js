import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Platform, TextInput,
} from 'react-native';
import { login } from '../api/auth';
import { FONTS, SPACING, RADIUS, makeShadow } from '../utils/theme';
import {
  Receipt, Bank, ChartBar, UsersThree, Target, TrendUp,
  ArrowRight, CheckCircle, Envelope, Eye, EyeSlash, ShieldCheck,
} from 'phosphor-react-native';

const IS_WEB = Platform.OS === 'web';

const D = {
  bg:            '#050C18',
  surface:       '#0B1929',
  surfaceHigh:   '#0F2038',
  surfaceCard:   '#0D1F36',
  border:        '#1A3356',
  borderAccent:  '#2A4A7A',
  text:          '#F0F6FF',
  textSec:       '#7FA8D0',
  textMuted:     '#3E6080',
  primary:       '#5B4FE8',
  primaryLight:  '#9B8FFB',
  primaryGlow:   'rgba(91,79,232,0.35)',
  teal:          '#06EDB5',
  tealGlow:      'rgba(6,237,181,0.18)',
  expense:       '#FF6A85',
  gold:          '#FFB830',
};

const FEATURES = [
  {
    Icon: Receipt,       color: '#7C6FFF',
    title: 'Track Spending',
    desc: 'Log every income and expense across all your accounts in seconds. Categorise transactions, add notes, and attach them to family members. Stay on top of where your money goes every single day.',
  },
  {
    Icon: UsersThree,    color: '#06EDB5',
    title: 'Family Sharing',
    desc: 'Manage your household finances together with role-based access for every member. Admins control accounts and budgets while members log their own transactions. One family, one clear financial picture.',
  },
  {
    Icon: ChartBar,      color: '#FF6A85',
    title: 'Smart Reports',
    desc: 'Get visual breakdowns of spending trends, category-wise expenses, and budget performance. Monthly comparisons help you spot patterns and make smarter decisions. Reports update automatically as you log.',
  },
  {
    Icon: Bank,          color: '#5BB5FF',
    title: 'Net Worth',
    desc: 'See your complete financial picture across savings, current, and credit accounts. Include investments and fixed deposits for a true net worth view. Know exactly where you stand at any point in time.',
  },
  {
    Icon: Target,        color: '#FFB74D',
    title: 'Budgets',
    desc: 'Set monthly spending limits for each category and track your progress in real time. Visual indicators show how close you are to each budget so you can course-correct early. Never overspend unnoticed again.',
  },
  {
    Icon: TrendUp,       color: '#B39DFF',
    title: 'Investments',
    desc: 'Track all your investments — FD, RD, Mutual Funds, PPF, NPS, and more — in one unified view. Monitor maturity dates, returns, and portfolio value alongside your everyday accounts. Built for Indian households.',
  },
];

const STEPS = [
  { num: '1', title: 'Create an account',    desc: 'Sign up free and add your bank accounts, cards and investments in minutes.' },
  { num: '2', title: 'Record transactions',  desc: 'Log income and expenses with categories, notes and family member tags.' },
  { num: '3', title: 'Watch it grow',        desc: 'Track net worth, stay on budget and get monthly insights automatically.' },
];

// ─── Inline login form ─────────────────────────────────────────────────────────
function InlineLoginForm({ navigation, styles }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    setError('');
    if (!email.trim())                       return setError('Email is required.');
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setError('Enter a valid email address.');
    if (!password)                           return setError('Password is required.');
    setLoading(true);
    try { await login(email.trim().toLowerCase(), password); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Welcome back</Text>
      <Text style={styles.formSub}>Sign in to your NestWorth account</Text>

      {!!error && <Text style={styles.formError}>{error}</Text>}

      <Text style={styles.formLabel}>Email</Text>
      <TextInput
        style={styles.formInput}
        placeholder="you@example.com"
        placeholderTextColor={D.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(t) => { setEmail(t); setError(''); }}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        blurOnSubmit={false}
      />

      <Text style={styles.formLabel}>Password</Text>
      <View style={styles.formPasswordRow}>
        <TextInput
          ref={passwordRef}
          style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
          placeholder="••••••••"
          placeholderTextColor={D.textMuted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.formEye}>
          {showPassword ? <EyeSlash size={20} color={D.textMuted} /> : <Eye size={20} color={D.textMuted} />}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.formSignInBtn, loading && { opacity: 0.7 }]}
        onPress={handleLogin} disabled={loading}
      >
        <Text style={styles.formSignInText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </TouchableOpacity>

      <View style={styles.formDivider}>
        <View style={styles.formDividerLine} />
        <Text style={styles.formDividerText}>or</Text>
        <View style={styles.formDividerLine} />
      </View>

      <TouchableOpacity style={styles.formRegisterBtn} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.formRegisterText}>Create a free account</Text>
        <ArrowRight size={16} color={D.primaryLight} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Feature card — icon + title on same row ───────────────────────────────────
function FeatureCard({ feature, styles }) {
  const { Icon, color, title, desc } = feature;
  return (
    <View style={[
      styles.featureCard,
      IS_WEB && styles.featureCardWeb,
      { borderTopColor: color, borderTopWidth: 3 },
    ]}>
      <View style={styles.featureHeader}>
        <View style={[styles.featureIconWrap, { backgroundColor: color + '25' }]}>
          <Icon size={IS_WEB ? 22 : 19} color={color} weight="fill" />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
      </View>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  );
}

// ─── Step row ──────────────────────────────────────────────────────────────────
function StepRow({ step, styles, isLast }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepLeft}>
        <View style={styles.stepNumWrap}>
          <Text style={styles.stepNum}>{step.num}</Text>
        </View>
        {!isLast && <View style={styles.stepLine} />}
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDesc}>{step.desc}</Text>
      </View>
    </View>
  );
}

// ─── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const styles = useMemo(() => makeStyles(), []);

  if (IS_WEB) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.webContent}>

        {/* ── Nav ── */}
        <View style={styles.webNav}>
          <Image
            source={require('../assets/nestworth-logo-banner.png')}
            style={styles.webNavLogo}
            resizeMode="contain"
          />
          <View style={styles.webNavActions}>
            <TouchableOpacity style={styles.webNavLoginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.webNavLoginText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.webNavRegisterBtn} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.webNavRegisterText}>Get Started Free</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero 3-col ── */}
        <View style={styles.webHero}>

          {/* Col 1 — Intro */}
          <View style={styles.webHeroLeft}>
            <View style={styles.heroBadge}>
              <ShieldCheck size={15} color={D.teal} weight="fill" />
              <Text style={styles.heroBadgeText}>Free for families · No bank sync needed</Text>
            </View>

            <Text style={styles.heroHeadline}>
              {'Your family\'s\n'}
              <Text style={styles.heroHeadlineAccent}>financial hub</Text>
            </Text>

            <Text style={styles.heroSub}>
              Track income, expenses, investments and net worth — together.
              Built for Indian households with FD, RD, PPF and NPS support.
            </Text>

            <View style={styles.heroPoints}>
              {[
                'No bank sync required',
                'Works for the whole family',
                'Private & secure',
              ].map((pt) => (
                <View key={pt} style={styles.heroPoint}>
                  <CheckCircle size={18} color={D.teal} weight="fill" />
                  <Text style={styles.heroPointText}>{pt}</Text>
                </View>
              ))}
            </View>

            <View style={styles.heroCta}>
              <TouchableOpacity style={styles.heroCtaPrimary} onPress={() => navigation.navigate('Register')}>
                <Text style={styles.heroCtaPrimaryText}>Get Started Free</Text>
                <ArrowRight size={19} color="#fff" weight="bold" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Col 2 — Illustration */}
          <View style={styles.webHeroCentre}>
            <Image
              source={require('../assets/NestWorth-Heropage_nopeople.png')}
              style={styles.heroIllustration}
              resizeMode="contain"
            />
          </View>

          {/* Col 3 — Login */}
          <View style={styles.webHeroRight}>
            <InlineLoginForm navigation={navigation} styles={styles} />
          </View>
        </View>

        {/* ── Features ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEATURES</Text>
          <View style={styles.sectionLabelBar} />
          <View style={styles.webFeatureGrid}>
            {FEATURES.map((f) => <FeatureCard key={f.title} feature={f} styles={styles} />)}
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={[styles.section, styles.stepsSection]}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <View style={styles.sectionLabelBar} />
          <Text style={styles.sectionTitle}>Up and running in minutes</Text>
          <View style={styles.stepsWrap}>
            {STEPS.map((s, i) => (
              <StepRow key={s.num} step={s} styles={styles} isLast={i === STEPS.length - 1} />
            ))}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Image source={require('../assets/nestworth-logo-banner.png')} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.footerTagline}>Manage your money, your way.</Text>
          <View style={styles.footerContact}>
            <Envelope size={15} color={D.textMuted} />
            <Text style={styles.footerContactText}>support@nestworth.app</Text>
          </View>
          <Text style={styles.footerCopy}>© 2026 NestWorth · All rights reserved</Text>
        </View>

      </ScrollView>
    );
  }

  // ── Mobile ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.mobileContent} bounces={false}>

      <View style={styles.mobileNav}>
        <Image source={require('../assets/nestworth-logo-banner.png')} style={styles.mobileNavLogo} resizeMode="contain" />
      </View>

      <Image source={require('../assets/NestWorth-Heropage_nopeople.png')} style={styles.mobileIllustration} resizeMode="cover" />

      <View style={styles.mobileHeroText}>
        <View style={[styles.heroBadge, { alignSelf: 'center' }]}>
          <ShieldCheck size={14} color={D.teal} weight="fill" />
          <Text style={styles.heroBadgeText}>Free for families</Text>
        </View>
        <Text style={styles.heroHeadline}>
          {'Your family\'s\n'}
          <Text style={styles.heroHeadlineAccent}>financial hub</Text>
        </Text>
        <Text style={styles.heroSub}>
          Track income, expenses and investments — together. Built for Indian households.
        </Text>
      </View>

      <View style={styles.mobileCta}>
        <TouchableOpacity style={styles.mobileCtaPrimary} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.mobileCtaPrimaryText}>Get Started Free</Text>
          <ArrowRight size={17} color="#fff" weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mobileCtaSecondary} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.mobileCtaSecondaryText}>I already have an account</Text>
          <ArrowRight size={15} color={D.primaryLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FEATURES</Text>
        <View style={styles.sectionLabelBar} />
        <View style={styles.mobileFeatureGrid}>
          {FEATURES.map((f) => <FeatureCard key={f.title} feature={f} styles={styles} />)}
        </View>
      </View>

      <View style={[styles.section, styles.stepsSection]}>
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <View style={styles.sectionLabelBar} />
        <Text style={styles.sectionTitle}>Up and running in minutes</Text>
        {STEPS.map((s, i) => (
          <StepRow key={s.num} step={s} styles={styles} isLast={i === STEPS.length - 1} />
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerContact}>
          <Envelope size={14} color={D.textMuted} />
          <Text style={styles.footerContactText}>support@nestworth.app</Text>
        </View>
        <Text style={styles.footerCopy}>© 2026 NestWorth · All rights reserved</Text>
      </View>

    </ScrollView>
  );
}

const makeStyles = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },
  webContent: { minHeight: '100%' },

  // ── Nav ───────────────────────────────────────────────────────────────────────
  webNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 56, paddingVertical: 16,
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.border,
    // subtle accent line at very bottom
    borderBottomColor: D.primary + '60',
  },
  webNavLogo:         { height: 68, width: 300 },
  webNavActions:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  webNavLoginBtn: {
    paddingHorizontal: 24, paddingVertical: 11,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: D.primaryLight + '80',
  },
  webNavLoginText:    { color: D.primaryLight, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  webNavRegisterBtn: {
    paddingHorizontal: 24, paddingVertical: 11,
    borderRadius: RADIUS.full, backgroundColor: D.primary,
    ...makeShadow(D.primary, { opacity: 0.5, height: 4, radius: 14, elevation: 8 }),
  },
  webNavRegisterText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // ── Hero ──────────────────────────────────────────────────────────────────────
  webHero: {
    flexDirection: 'row', alignItems: 'stretch',
    paddingHorizontal: 48, paddingVertical: 28,
    gap: 32, width: '100%',
  },
  webHeroLeft:   { flex: 1.05, justifyContent: 'center' },
  webHeroCentre: { flex: 1.3, justifyContent: 'center' },
  webHeroRight:  { width: 360, justifyContent: 'center' },

  heroIllustration: { flex: 1, width: '100%', borderRadius: RADIUS.lg },

  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.tealGlow,
    borderWidth: 1, borderColor: D.teal + '50',
    borderRadius: RADIUS.full,
    paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: SPACING.lg,
  },
  heroBadgeText: { color: D.teal, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  heroHeadline: {
    color: D.text, fontWeight: '900',
    fontSize: IS_WEB ? 54 : 30,
    lineHeight: IS_WEB ? 68 : 40,
    marginBottom: SPACING.md,
    textAlign: IS_WEB ? 'left' : 'center',
    letterSpacing: IS_WEB ? -0.5 : 0,
  },
  heroHeadlineAccent: {
    color: D.primaryLight,
    fontWeight: '900',
  },
  heroSub: {
    color: D.textSec,
    fontSize: IS_WEB ? 17 : 14,
    lineHeight: IS_WEB ? 30 : 23,
    marginBottom: SPACING.xl,
    textAlign: IS_WEB ? 'left' : 'center',
  },
  heroPoints:    { gap: 12, marginBottom: SPACING.xl },
  heroPoint:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroPointText: { color: D.text, fontSize: 15, fontWeight: '500' },

  heroCta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  heroCtaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.primary,
    paddingHorizontal: 28, paddingVertical: 15,
    borderRadius: RADIUS.full,
    ...makeShadow(D.primary, { opacity: 0.55, height: 6, radius: 18, elevation: 10 }),
  },
  heroCtaPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // ── Login form ────────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: D.surface,
    borderRadius: RADIUS.xl + 4,
    padding: SPACING.lg + 4,
    borderWidth: 1, borderColor: D.borderAccent,
    ...makeShadow('#000', { opacity: 0.6, height: 12, radius: 28, elevation: 20 }),
  },
  formTitle:    { color: D.text,    fontSize: 22, fontWeight: '800', marginBottom: 4 },
  formSub:      { color: D.textSec, fontSize: 14, marginBottom: SPACING.md, lineHeight: 21 },
  formError: {
    color: D.expense, backgroundColor: 'rgba(255,106,133,0.15)',
    borderRadius: RADIUS.md, padding: SPACING.sm,
    fontSize: 13, fontWeight: '600', marginBottom: SPACING.sm,
  },
  formLabel: {
    color: D.textSec, fontSize: 13, fontWeight: '700',
    marginBottom: 6, marginTop: SPACING.sm, letterSpacing: 0.3,
  },
  formInput: {
    backgroundColor: D.surfaceHigh, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: D.border,
    color: D.text, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  formPasswordRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  formEye:         { padding: 6 },
  formSignInBtn: {
    backgroundColor: D.primary, borderRadius: RADIUS.full,
    paddingVertical: 14, alignItems: 'center', marginTop: SPACING.md,
    ...makeShadow(D.primary, { opacity: 0.45, height: 5, radius: 14, elevation: 8 }),
  },
  formSignInText:   { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  formDivider:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.md },
  formDividerLine:  { flex: 1, height: 1, backgroundColor: D.border },
  formDividerText:  { color: D.textMuted, fontSize: 12 },
  formRegisterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: D.primaryLight + '70',
  },
  formRegisterText: { color: D.primaryLight, fontSize: 14, fontWeight: '700' },

  // ── Mobile nav + hero ─────────────────────────────────────────────────────────
  mobileContent:    { paddingBottom: SPACING.xl },
  mobileNav: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.primary + '60',
  },
  mobileNavLogo:     { height: 44, width: 200 },
  mobileIllustration:{ width: '100%', height: 260, borderRadius: RADIUS.lg },
  mobileHeroText:    { alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  mobileCta:         { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.lg },
  mobileCtaPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: D.primary,
    paddingVertical: 15, borderRadius: RADIUS.full,
    ...makeShadow(D.primary, { opacity: 0.5, height: 4, radius: 12, elevation: 8 }),
  },
  mobileCtaPrimaryText:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  mobileCtaSecondary:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  mobileCtaSecondaryText:{ color: D.primaryLight, fontSize: 14, fontWeight: '600' },
  mobileFeatureGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },

  // ── Sections ──────────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: IS_WEB ? 56 : SPACING.lg,
    paddingTop: IS_WEB ? 40 : SPACING.lg,
    paddingBottom: IS_WEB ? 40 : SPACING.lg,
    width: '100%',
  },
  stepsSection:  { backgroundColor: D.surface },
  sectionLabel: {
    color: D.primaryLight, fontSize: IS_WEB ? 13 : 11,
    fontWeight: '800', letterSpacing: 3, marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionLabelBar: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: D.primary, marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: D.text,
    fontSize: IS_WEB ? 38 : 24,
    fontWeight: '800', marginBottom: SPACING.lg,
    letterSpacing: IS_WEB ? -0.3 : 0,
  },
  webFeatureGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: SPACING.sm,
  },

  // ── Feature cards — icon + title inline ───────────────────────────────────────
  featureCard: {
    backgroundColor: D.surfaceCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: D.border,
    padding: SPACING.lg,
    width: '47%', minHeight: 160,
    borderTopWidth: 3,
  },
  featureCardWeb: { width: '30%', minWidth: 220, flexGrow: 1, minHeight: 200 },
  featureHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: SPACING.sm,
  },
  featureIconWrap: {
    width: 42, height: 42, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: {
    flex: 1, color: D.text,
    fontSize: IS_WEB ? 17 : 14,
    fontWeight: '800',
    lineHeight: IS_WEB ? 24 : 20,
  },
  featureDesc: {
    color: D.textSec,
    fontSize: IS_WEB ? 14 : 12,
    lineHeight: IS_WEB ? 23 : 19,
  },

  // ── Steps ─────────────────────────────────────────────────────────────────────
  stepsWrap:   { maxWidth: IS_WEB ? 600 : undefined },
  stepRow:     { flexDirection: 'row', gap: SPACING.md },
  stepLeft:    { alignItems: 'center', width: 44 },
  stepNumWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center',
    ...makeShadow(D.primary, { opacity: 0.55, height: 4, radius: 12, elevation: 8 }),
  },
  stepNum:     { color: '#fff', fontSize: 18, fontWeight: '900' },
  stepLine:    { flex: 1, width: 2, backgroundColor: D.border, marginVertical: 4 },
  stepContent: { flex: 1, paddingBottom: IS_WEB ? SPACING.xl + 4 : SPACING.lg },
  stepTitle:   { color: D.text,    fontSize: IS_WEB ? 18 : 15, fontWeight: '800', marginBottom: 6 },
  stepDesc:    { color: D.textSec, fontSize: IS_WEB ? 15 : 13, lineHeight: IS_WEB ? 25 : 21 },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center', paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 1, borderTopColor: D.border,
    backgroundColor: D.surface, gap: SPACING.sm,
  },
  footerLogo:        { height: 44, width: 200, marginBottom: SPACING.xs },
  footerTagline:     { color: D.textSec, fontSize: 14 },
  footerContact:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerContactText: { color: D.textMuted, fontSize: 14 },
  footerCopy:        { color: D.textMuted, fontSize: 12, marginTop: SPACING.xs },
});
