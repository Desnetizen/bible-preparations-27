import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { PasswordStrength } from '@/components/password-strength';
import { Brand } from '@/constants/brand';
import { REQUIRE_MFA } from '@/constants/security';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { listVerifiedFactors, removeFactor, type VerifiedFactor } from '@/lib/mfa';
import { checkPasswordBreached, evaluatePassword } from '@/lib/password-policy';
import { verifyCurrentPassword } from '@/lib/supabase';

export default function SecurityScreen() {
  const { user, hasMfaFactor, refreshAssurance, updatePassword } = useAuth();

  const [factors, setFactors] = useState<VerifiedFactor[]>([]);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const email = user?.email ?? '';
  const report = evaluatePassword(next, { email });

  useEffect(() => {
    let active = true;
    void listVerifiedFactors().then((result) => {
      if (!active) return;
      setFactors(result.factors);
      setMfaError(result.error);
    });
    return () => {
      active = false;
    };
  }, [hasMfaFactor]);

  function onRemoveFactor(factor: VerifiedFactor) {
    Alert.alert(
      'Turn off two-step verification?',
      'Your account will be protected by your password alone.',
      [
        { text: 'Keep it on', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: async () => {
            setMfaBusy(true);
            setMfaError(null);
            const result = await removeFactor(factor.id);
            if (result.error) setMfaError(result.error);
            else await refreshAssurance();
            setMfaBusy(false);
          },
        },
      ],
    );
  }

  async function onChangePassword() {
    if (passwordBusy) return;
    setPasswordError(null);
    setPasswordNotice(null);

    if (!email) {
      setPasswordError('This account has no email address to confirm the password with.');
      return;
    }
    if (current.length === 0) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!report.meetsPolicy) {
      setPasswordError(report.issues[0] ?? 'Choose a stronger password.');
      return;
    }
    if (next !== confirm) {
      setPasswordError('The two new passwords do not match.');
      return;
    }
    if (next === current) {
      setPasswordError('Your new password must be different from the current one.');
      return;
    }

    setPasswordBusy(true);
    try {
      const verified = await verifyCurrentPassword(email, current);
      if (!verified.ok) {
        setPasswordError(verified.error);
        return;
      }

      const breach = await checkPasswordBreached(next);
      if (breach.status === 'breached') {
        setPasswordError(
          'This password has appeared in known data breaches. Please choose a different one.',
        );
        return;
      }

      const result = await updatePassword(next, current);
      if (result.error) {
        setPasswordError(result.error);
        return;
      }

      setCurrent('');
      setNext('');
      setConfirm('');
      setPasswordNotice('Password updated. Your other devices have been logged out.');
    } finally {
      setPasswordBusy(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <AuthScreen title="Security" subtitle={email || undefined}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Two-step verification</Text>
        <Text style={styles.cardBody}>
          {hasMfaFactor
            ? 'On. A code from your authenticator app is needed every time you log in.'
            : 'Off. Add an authenticator app so a stolen password alone is not enough to get in.'}
        </Text>
        <FormMessage error={mfaError} />
        {hasMfaFactor ? (
          REQUIRE_MFA ? null : (
            <TextLink
              label={factors[0] ? `Turn off (${factors[0].name})` : 'Turn off'}
              onPress={() => factors[0] && onRemoveFactor(factors[0])}
              danger
              disabled={mfaBusy || factors.length === 0}
            />
          )
        ) : (
          <PrimaryButton label="Set up authenticator app" onPress={() => router.push('/mfa-setup')} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change password</Text>
        <FormField
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          revealable
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          editable={!passwordBusy}
        />
        <FormField
          label="New password"
          value={next}
          onChangeText={setNext}
          revealable
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!passwordBusy}
        />
        {next.length > 0 ? <PasswordStrength report={report} /> : null}
        <FormField
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={onChangePassword}
          revealable
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          editable={!passwordBusy}
        />
        <FormMessage error={passwordError} notice={passwordNotice} />
        <PrimaryButton label="Update password" onPress={onChangePassword} busy={passwordBusy} />
      </View>

      <TextLink label="Done" onPress={goBack} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  cardTitle: {
    color: Brand.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    color: Brand.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
