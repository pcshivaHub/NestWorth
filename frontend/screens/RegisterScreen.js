import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { register } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/Button';

export default function RegisterScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const inviteRef = useRef(null);

  const clearError = () => setError('');

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim()) return setError('Full name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    const code = inviteCode.trim().toUpperCase();
    try {
      if (code) await AsyncStorage.setItem('pendingInviteCode', code);
      await register(email.trim().toLowerCase(), password, fullName.trim());
      setError('');
      navigation.navigate('Login');
      // Show success inline after navigating back to login
    } catch (e) {
      if (code) await AsyncStorage.removeItem('pendingInviteCode');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backLink}>← Home</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.title}>NestWorth</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Get started</Text>

          {!!error && <Text style={styles.errorBanner}>{error}</Text>}

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={C.textMuted}
            value={fullName}
            onChangeText={(t) => { setFullName(t); clearError(); }}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(t) => { setEmail(t); clearError(); }}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, styles.passwordInput]}
              placeholder="Min. 6 characters"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.strengthBar, {
                  backgroundColor: password.length >= i * 3
                    ? (password.length >= 10 ? C.income : C.warning)
                    : C.border,
                }]} />
              ))}
              <Text style={styles.strengthLabel}>
                {password.length < 6 ? 'Too short' : password.length < 10 ? 'Good' : 'Strong'}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            ref={confirmRef}
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor={C.textMuted}
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
            returnKeyType="next"
            onSubmitEditing={() => inviteRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Join a Family? <Text style={styles.optionalLabel}>(optional)</Text></Text>
          <TextInput
            ref={inviteRef}
            style={styles.input}
            placeholder="e.g. NESTW-4A2Z"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={(t) => { setInviteCode(t); clearError(); }}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <Text style={styles.inviteHint}>Leave blank to start your own family after sign-in.</Text>

          <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.submitBtn} />

          <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <Text style={styles.switchLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 56, marginBottom: SPACING.sm },
  title: { color: C.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  subtitle: { color: C.textSecondary, fontSize: FONTS.sizes.md, marginTop: 4 },
  form: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: C.border },
  formTitle: { color: C.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', marginBottom: SPACING.md },
  errorBanner: { color: C.expense, fontSize: FONTS.sizes.sm, backgroundColor: C.expenseSubtle, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, fontWeight: '500' },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, marginTop: SPACING.sm, fontWeight: '500' },
  input: {
    backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: C.border, color: C.textPrimary, padding: SPACING.sm + 4, fontSize: FONTS.sizes.md,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  eyeIcon: { fontSize: 18 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginLeft: 4 },
  optionalLabel: { color: C.textMuted, fontWeight: '400' },
  inviteHint: { color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 4, marginBottom: SPACING.xs },
  backRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : SPACING.md,
    paddingBottom: SPACING.xs,
  },
  backLink: { color: C.primaryLight, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  submitBtn: { marginTop: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  switchText: { color: C.textSecondary, fontSize: FONTS.sizes.sm },
  switchLink: { color: C.primaryLight, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
