import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { friendlyAuthError } from '@/lib/auth-errors';
import { clearLegacySession, secureStorage } from '@/lib/secure-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
// Supports the newer "publishable" key and the legacy "anon" key.
const supabaseKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

/** The sample values in .env.example. Copying that file without editing it leaves these. */
const SAMPLE_VALUE = /YOUR-PROJECT-REF|YOUR-PUBLISHABLE-KEY|YOUR-ANON-KEY/i;

function isRealUrl(value: string | undefined): value is string {
  if (!value || SAMPLE_VALUE.test(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured =
  isRealUrl(supabaseUrl) && Boolean(supabaseKey) && !SAMPLE_VALUE.test(supabaseKey ?? '');

const clientUrl = isSupabaseConfigured && supabaseUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured && supabaseKey ? supabaseKey : 'placeholder-key';

// createClient throws on empty values, which would crash the whole app at import
// time. Placeholders keep the app running so the login screen can explain what
// is missing instead.
export const supabase = createClient(
  clientUrl,
  clientKey,
  {
    auth: {
      // Native keeps the session in the Keychain / Keystore. On web supabase-js uses
      // localStorage, and falls back to memory during server rendering.
      ...(Platform.OS !== 'web' ? { storage: secureStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Links that open the app (password reset) carry a one-time code that only this
      // device can redeem, so an intercepted link is useless to anyone else.
      flowType: 'pkce',
    },
  },
);

if (Platform.OS !== 'web') {
  void clearLegacySession();
}

/**
 * Checks a password against the account without touching the saved session. A
 * second client that stores nothing does the sign-in, so the real session keeps
 * its authenticator-verified level.
 */
export async function verifyCurrentPassword(
  email: string,
  password: string,
): Promise<{ ok: boolean; error: string | null }> {
  const probe = createClient(
    clientUrl,
    clientKey,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true, error: null };
  if (error.code === 'invalid_credentials') {
    return { ok: false, error: 'Your current password is not correct.' };
  }
  return { ok: false, error: friendlyAuthError(error) };
}

// Only refresh tokens while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
