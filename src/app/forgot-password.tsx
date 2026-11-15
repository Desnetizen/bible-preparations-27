import { router } from 'expo-router';
import { useState } from 'react';

import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { useAuth } from '@/hooks/use-auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    const result = await requestPasswordReset(trimmed);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    // The same wording whether or not the address has an account, so this screen
    // cannot be used to find out who is registered.
    setNotice(
      'If an account exists for that email, a reset link is on its way. Open the link on this phone.',
    );
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="Enter the email you signed up with and we will send you a link to choose a new password.">
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={onSubmit}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        editable={!busy}
      />
      <FormMessage error={error} notice={notice} />
      <PrimaryButton label="Send reset link" onPress={onSubmit} busy={busy} />
      <TextLink label="Back to log in" onPress={goBack} disabled={busy} />
    </AuthScreen>
  );
}
