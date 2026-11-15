import { useState } from 'react';

import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { useAuth } from '@/hooks/use-auth';
import { verifyTotpCode } from '@/lib/mfa';

/** The second step after the password: the 6-digit code from the authenticator app. */
export default function MfaVerifyScreen() {
  const { signOut } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setError(null);
    setBusy(true);
    const result = await verifyTotpCode(code);
    if (result.error) {
      setError(result.error);
      setCode('');
    }
    setBusy(false);
    // On success the session is upgraded and the router moves on by itself.
  }

  return (
    <AuthScreen
      title="Enter your code"
      subtitle="Open your authenticator app and type the 6-digit code for Bible Connection.">
      <FormField
        label="Authentication code"
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
        onSubmitEditing={onSubmit}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="go"
        editable={!busy}
      />
      <FormMessage error={error} />
      <PrimaryButton label="Verify" onPress={onSubmit} busy={busy} />
      <TextLink label="Log out" onPress={() => void signOut()} disabled={busy} />
    </AuthScreen>
  );
}
