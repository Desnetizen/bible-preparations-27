import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { REQUIRE_MFA } from '@/constants/security';
import { AuthContext, type AccessState, type AuthData } from '@/hooks/use-auth';
import { friendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

type Assurance = {
  userId: string;
  /** What the current session has proven: aal1 is a password, aal2 adds an authenticator code. */
  current: string | null;
  /** What the account could reach: aal2 means it has a verified authenticator app. */
  next: string | null;
};

async function readAssurance(userId: string): Promise<Assurance> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) {
    // Fail closed: ask for a code rather than assume the session is fully verified.
    return { userId, current: 'aal1', next: 'aal2' };
  }
  return { userId, current: data.currentLevel, next: data.nextLevel };
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assurance, setAssurance] = useState<Assurance | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const handledCode = useRef<string | null>(null);

  const userId = session?.user.id ?? null;
  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session) {
          const level = await readAssurance(data.session.user.id);
          if (active) setAssurance(level);
        }
      } catch (error) {
        console.warn('Could not read the saved session:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void boot();

    // Fires on sign in, sign out, token refresh and user updates. Keep this
    // callback synchronous: awaiting other supabase calls inside it can deadlock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      if (event === 'SIGNED_OUT' || !nextSession) {
        // Forget everything about the last session so a new sign-in is judged afresh.
        setIsRecovery(false);
        setAssurance(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Read the assurance level whenever the session changes, for example after an
  // authenticator code is accepted and the session is upgraded.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void readAssurance(userId).then((level) => {
      if (active) setAssurance(level);
    });
    return () => {
      active = false;
    };
  }, [userId, accessToken]);

  // Password reset emails link back into the app. The link carries a one-time code
  // that is exchanged for a session; the auth client then reports a recovery event.
  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.path !== 'reset-password') return;

      const params = parsed.queryParams ?? {};
      const code = typeof params.code === 'string' ? params.code : null;
      if (!code) {
        // The link itself reported a problem, usually that it has expired.
        if (typeof params.error_description === 'string' || typeof params.error === 'string') {
          setLinkError('This reset link has expired or was already used. Please request a new one.');
        }
        return;
      }
      if (handledCode.current === code) return;
      handledCode.current = code;

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setLinkError('This reset link has expired or was already used. Please request a new one.');
      }
    }

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => void handleUrl(url));
    return () => subscription.remove();
  }, []);

  const signIn = useCallback<AuthData['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? friendlyAuthError(error) : null };
  }, []);

  const signUp = useCallback<AuthData['signUp']>(async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });

    if (error) return { error: friendlyAuthError(error), needsEmailConfirmation: false };

    // With email confirmation on, Supabase answers an already-registered address
    // with a user that has no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      return {
        error: 'An account with this email already exists. Try logging in instead.',
        needsEmailConfirmation: false,
      };
    }

    return { error: null, needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback<AuthData['signOut']>(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error ? friendlyAuthError(error) : null };
  }, []);

  const requestPasswordReset = useCallback<AuthData['requestPasswordReset']>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('reset-password'),
    });
    return { error: error ? friendlyAuthError(error) : null };
  }, []);

  const updatePassword = useCallback<AuthData['updatePassword']>(
    async (newPassword, currentPassword) => {
      const { error } = await supabase.auth.updateUser(
        currentPassword
          ? { password: newPassword, current_password: currentPassword }
          : { password: newPassword },
      );
      if (error) return { error: friendlyAuthError(error) };

      // A changed password should end every other login, in case the old one leaked.
      // This session stays signed in. Failure here must not undo the change.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => undefined);

      setIsRecovery(false);
      return { error: null };
    },
    [],
  );

  const refreshAssurance = useCallback<AuthData['refreshAssurance']>(async () => {
    if (!userId) return;
    setAssurance(await readAssurance(userId));
  }, [userId]);

  const clearLinkError = useCallback(() => setLinkError(null), []);

  const value = useMemo<AuthData>(() => {
    // An assurance reading belongs to one person. Ignore a stale one.
    const level = assurance && assurance.userId === userId ? assurance : null;
    const hasMfaFactor = level?.next === 'aal2';

    let access: AccessState;
    if (!session) access = 'signed-out';
    else if (!level) access = 'checking';
    else if (level.next === 'aal2' && level.current !== 'aal2') access = 'mfa-required';
    else if (isRecovery) access = 'recovery';
    else if (REQUIRE_MFA && !hasMfaFactor) access = 'mfa-setup-required';
    else access = 'ready';

    return {
      session,
      user: session?.user ?? null,
      isLoading,
      isSignedIn: session !== null,
      access,
      hasMfaFactor,
      linkError,
      clearLinkError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshAssurance,
    };
  }, [
    session,
    assurance,
    userId,
    isRecovery,
    isLoading,
    linkError,
    clearLinkError,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshAssurance,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
