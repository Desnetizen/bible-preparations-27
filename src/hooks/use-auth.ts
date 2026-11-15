import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type SignUpResult = {
  error: string | null;
  /** True when Supabase created the account but is waiting for the email link to be tapped. */
  needsEmailConfirmation: boolean;
};

/**
 * Where the person stands in the sign-in journey. The router shows exactly one
 * area for each state, so a half-finished sign-in can never reach the app.
 *
 * - checking: a session exists but its assurance level has not been read yet
 * - signed-out: no session
 * - mfa-required: password accepted, authenticator code still to be entered
 * - recovery: arrived through a password reset link, new password still to be set
 * - mfa-setup-required: the app demands an authenticator and none is enrolled
 * - ready: fully signed in
 */
export type AccessState =
  | 'checking'
  | 'signed-out'
  | 'mfa-required'
  | 'recovery'
  | 'mfa-setup-required'
  | 'ready';

export type AuthData = {
  session: Session | null;
  user: User | null;
  /** True until the stored session (if any) and its assurance level have been read. */
  isLoading: boolean;
  isSignedIn: boolean;
  access: AccessState;
  /** True when the account has a verified authenticator app. */
  hasMfaFactor: boolean;
  /** Set when a link that opened the app (such as a reset link) could not be used. */
  linkError: string | null;
  clearLinkError: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>;
  signOut: () => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Sets a new password. Pass the current one when changing it from inside the app. */
  updatePassword: (
    newPassword: string,
    currentPassword?: string,
  ) => Promise<{ error: string | null }>;
  /** Re-reads the assurance level after an authenticator is added or removed. */
  refreshAssurance: () => Promise<void>;
};

export const AuthContext = createContext<AuthData | null>(null);

export function useAuth(): AuthData {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
}
