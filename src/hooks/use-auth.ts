import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type SignUpResult = {
  error: string | null;
  /** True when Supabase created the account but is waiting for the email link to be tapped. */
  needsEmailConfirmation: boolean;
};

export type AuthData = {
  session: Session | null;
  user: User | null;
  /** True until the stored session (if any) has been read. */
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>;
  signOut: () => Promise<{ error: string | null }>;
};

export const AuthContext = createContext<AuthData | null>(null);

export function useAuth(): AuthData {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
}
