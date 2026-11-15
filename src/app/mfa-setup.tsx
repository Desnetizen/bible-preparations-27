import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { confirmTotpEnrollment, startTotpEnrollment, type TotpEnrollment } from '@/lib/mfa';

/** Groups the secret in fours so it is easier to read out and type. */
function formatSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
}

export default function MfaSetupScreen() {
  const { access, signOut, refreshAssurance } = useAuth();
  // When the app demands an authenticator there is no way out except to log out.
  const forced = access === 'mfa-setup-required';

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Starting twice would create a second unconfirmed factor.
    if (started.current) return;
    started.current = true;
    void startTotpEnrollment().then((result) => {
      setEnrollment(result.enrollment);
      setLoadError(result.error);
    });
  }, []);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function onConfirm() {
    if (busy || !enrollment) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code shown in your authenticator app.');
      return;
    }

    setError(null);
    setBusy(true);
    const result = await confirmTotpEnrollment(enrollment.factorId, code);
    if (result.error) {
      setError(result.error);
      setCode('');
      setBusy(false);
      return;
    }

    await refreshAssurance();
    setBusy(false);
    if (!forced) leave();
  }

  return (
    <AuthScreen
      title="Set up your authenticator"
      subtitle="Scan the code with an app such as Google Authenticator, 1Password or Authy, then enter the 6-digit code it shows.">
      {loadError ? (
        <FormMessage error={loadError} />
      ) : !enrollment ? (
        <Text style={styles.hint}>Preparing your code…</Text>
      ) : (
        <>
          <View style={styles.qrFrame}>
            <Image
              source={{ uri: enrollment.qrCodeUri }}
              style={styles.qr}
              contentFit="contain"
              accessibilityLabel="QR code to scan with your authenticator app"
            />
          </View>

          <View style={styles.secretBox}>
            <Text style={styles.hint}>Cannot scan it? Enter this key in the app instead:</Text>
            <Text style={styles.secret} selectable>
              {formatSecret(enrollment.secret)}
            </Text>
          </View>

          <FormField
            label="Code from the app"
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
            onSubmitEditing={onConfirm}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="go"
            editable={!busy}
          />
          <FormMessage error={error} />
          <PrimaryButton label="Turn on two-step verification" onPress={onConfirm} busy={busy} />
        </>
      )}

      {forced ? (
        <TextLink label="Log out" onPress={() => void signOut()} disabled={busy} />
      ) : (
        <TextLink label="Cancel" onPress={leave} disabled={busy} />
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: Brand.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  qrFrame: {
    alignSelf: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  qr: {
    width: 192,
    height: 192,
  },
  secretBox: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  secret: {
    color: Brand.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
