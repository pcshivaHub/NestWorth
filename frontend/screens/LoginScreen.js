import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { login } from '../api/auth';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const passwordRef = useRef(null);

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) return setError('Email is required.');
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Password is required.');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Image
            source={require('../assets/nestworth-logo-banner.png')}
            style={styles.banner}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Manage your money, your way</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>

          {!!error && <Text style={styles.errorBanner}>{error}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.submitBtn} />

          <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <Text style={styles.switchLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  banner: { width: 300, height: 120, marginBottom: SPACING.sm, backgroundColor: C.bg },
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
  submitBtn: { marginTop: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  switchText: { color: C.textSecondary, fontSize: FONTS.sizes.sm },
  switchLink: { color: C.primaryLight, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
