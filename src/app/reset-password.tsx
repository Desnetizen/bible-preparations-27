import { useState } from 'react';

import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { PasswordStrength } from '@/components/password-strength';
import { useAuth } from '@/hooks/use-auth';
import { checkPasswordBreached, evaluatePassword } from '@/lib/password-policy';

/** Shown after the reset link is opened. Choosing a new password ends the recovery. */
export default function ResetPasswordScreen() {
  const { user, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = evaluatePassword(password, { email: user?.email });

  async function onSubmit() {
    if (busy) return;
    setError(null);

    if (!report.meetsPolicy) {
      setError(report.issues[0] ?? 'Choose a stronger password.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    const breach = await checkPasswordBreached(password);
    if (breach.status === 'breached') {
      setError('This password has appeared in known data breaches. Please choose a different one.');
      setBusy(false);
      return;
    }

    const result = await updatePassword(password);
    if (result.error) setError(result.error);
    setBusy(false);
    // On success the recovery ends and the router moves on by itself.
  }

  return (
    <AuthScreen title="Choose a new password" subtitle="Pick something you have not used anywhere else.">
      <FormField
        label="New password"
        value={password}
        onChangeText={setPassword}
        revealable
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        editable={!busy}
      />
      {password.length > 0 ? <PasswordStrength report={report} /> : null}
      <FormField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        onSubmitEditing={onSubmit}
        revealable
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        editable={!busy}
      />
      <FormMessage error={error} />
      <PrimaryButton label="Save new password" onPress={onSubmit} busy={busy} />
      <TextLink label="Cancel and log out" onPress={() => void signOut()} disabled={busy} />
    </AuthScreen>
  );
}
