import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { register } from '../api/auth';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import Button from '../components/Button';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) return Alert.alert('Validation', 'Full name is required.');
    if (!email.trim()) return Alert.alert('Validation', 'Email is required.');
    if (password.length < 6) return Alert.alert('Validation', 'Password must be at least 6 characters.');
    if (password !== confirmPassword) return Alert.alert('Validation', 'Passwords do not match.');

    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, fullName.trim());
      Alert.alert(
        'Account Created! ✅',
        'Please check your email to verify your account, then log in.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (e) {
      Alert.alert('Registration Failed', e.message);
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

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.title}>Home Finance</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Get started</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

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
              placeholder="Min. 6 characters"
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

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Password strength indicator */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[styles.strengthBar, {
                    backgroundColor:
                      password.length >= i * 3
                        ? password.length >= 10 ? COLORS.income : COLORS.warning
                        : COLORS.border,
                  }]}
                />
              ))}
              <Text style={styles.strengthLabel}>
                {password.length < 6 ? 'Too short' : password.length < 10 ? 'Good' : 'Strong'}
              </Text>
            </View>
          )}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.switchText}>Already have an account? </Text>
            <Text style={styles.switchLink}>Sign In</Text>
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

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginLeft: 4 },

  submitBtn: { marginTop: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  switchText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  switchLink: { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
