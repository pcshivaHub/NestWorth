import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { login } from '../api/auth';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return Alert.alert('Validation', 'Email is required.');
    if (!password) return Alert.alert('Validation', 'Password is required.');

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // AuthContext listener handles navigation automatically
    } catch (e) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Logo / Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.title}>Home Finance</Text>
          <Text style={styles.subtitle}>Manage your money, your way</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.switchText}>Don't have an account? </Text>
            <Text style={styles.switchLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },

  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 56, marginBottom: SPACING.sm },
  title: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, marginTop: 4 },

  form: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  formTitle: {
    color: COLORS.textPrimary, fontSize: FONTS.sizes.xl,
    fontWeight: '700', marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary, fontSize: FONTS.sizes.sm,
    marginBottom: 6, marginTop: SPACING.sm, fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.surfaceHigh, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, padding: SPACING.sm + 4,
    fontSize: FONTS.sizes.md,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  eyeIcon: { fontSize: 18 },

  submitBtn: { marginTop: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  switchText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  switchLink: { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
