import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { FONTS, SPACING, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createFamily, joinFamily } from '../api/family';
import Button from '../components/Button';

export default function FamilySetupScreen({ route, navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { refreshFamily } = useAuth();

  const mode = route.params?.mode ?? 'create';
  const isCreate = mode === 'create';

  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) return setError(isCreate ? 'Family name is required.' : 'Invite code is required.');

    setSaving(true);
    try {
      if (isCreate) {
        await createFamily(trimmed);
      } else {
        await joinFamily(trimmed.toUpperCase());
      }
      await refreshFamily();
      navigation.goBack();
    } catch (e) {
      setError(
        isCreate
          ? e.message
          : e.message.includes('404') || e.message.toLowerCase().includes('invalid')
            ? 'Invalid invite code. Check with your family admin.'
            : e.message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{isCreate ? 'Create a Family' : 'Join a Family'}</Text>
      <Text style={styles.subtitle}>
        {isCreate
          ? 'Give your household a name. You can invite others with a code after creating.'
          : 'Enter the invite code shared by your family admin.'}
      </Text>

      <Text style={styles.label}>{isCreate ? 'Family Name' : 'Invite Code'}</Text>
      <TextInput
        style={styles.input}
        placeholder={isCreate ? 'e.g. The Smiths' : 'e.g. NESTW-4A2Z'}
        placeholderTextColor={C.textMuted}
        value={value}
        onChangeText={setValue}
        autoCapitalize={isCreate ? 'words' : 'characters'}
        autoFocus
      />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <Button
        title={isCreate ? 'Create Family' : 'Join Family'}
        onPress={handleSubmit}
        loading={saving}
        style={styles.submitBtn}
      />
      <Button
        title="Cancel"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.cancelBtn}
      />
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.lg, paddingTop: SPACING.xl },
  title: { color: C.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '800', marginBottom: SPACING.sm },
  subtitle: { color: C.textSecondary, fontSize: FONTS.sizes.md, marginBottom: SPACING.lg, lineHeight: 22 },
  label: { color: C.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: C.surfaceHigh,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    color: C.textPrimary,
    padding: SPACING.sm + 4,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.md,
  },
  errorBox: {
    backgroundColor: C.expenseBg,
    borderWidth: 1,
    borderColor: C.expense,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.md,
  },
  errorText: { color: C.expense, fontSize: FONTS.sizes.sm },
  submitBtn: { marginBottom: SPACING.sm },
  cancelBtn: {},
});
