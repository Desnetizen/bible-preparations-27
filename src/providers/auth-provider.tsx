import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { AuthContext, type AuthData } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch((error) => console.warn('Could not read the saved session:', error))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    // Fires on sign in, sign out, token refresh and user updates. Keep this
    // callback synchronous: awaiting other supabase calls inside it can deadlock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthData['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback<AuthData['signUp']>(async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });

    if (error) return { error: error.message, needsEmailConfirmation: false };

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
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthData>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isSignedIn: session !== null,
      signIn,
      signUp,
      signOut,
    }),
    [session, isLoading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
