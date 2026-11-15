import { friendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export type TotpEnrollment = {
  factorId: string;
  /** The secret to type into an authenticator app when scanning is not possible. */
  secret: string;
  /** An SVG image of the QR code, already encoded as a data URI. */
  qrCodeUri: string;
};

export type VerifiedFactor = {
  id: string;
  name: string;
};

const FACTOR_NAME = 'Authenticator app';

/** A code that fails to verify is almost always a typo or an old code. */
const CODE_REJECTED = 'That code was not accepted. Check the app and try the newest code.';

function codeError(error: Parameters<typeof friendlyAuthError>[0]): string {
  const friendly = friendlyAuthError(error);
  // The generic fallback is unhelpful here, where a wrong code is the likely cause.
  return friendly === 'Something went wrong. Please try again.' ? CODE_REJECTED : friendly;
}

/** The authenticator apps that are set up and confirmed for the signed-in account. */
export async function listVerifiedFactors(): Promise<{
  factors: VerifiedFactor[];
  error: string | null;
}> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) {
    return { factors: [], error: error ? friendlyAuthError(error) : 'Could not load your devices.' };
  }
  return {
    factors: data.totp.map((factor) => ({
      id: factor.id,
      name: factor.friendly_name ?? FACTOR_NAME,
    })),
    error: null,
  };
}

/**
 * Starts adding an authenticator app. The factor stays unconfirmed until a code from
 * the app is verified, so abandoning the screen leaves nothing active behind.
 */
export async function startTotpEnrollment(): Promise<{
  enrollment: TotpEnrollment | null;
  error: string | null;
}> {
  // An earlier attempt that was never confirmed would block a new one with the same name.
  const existing = await supabase.auth.mfa.listFactors();
  const stale = existing.data?.all.filter(
    (factor) => factor.factor_type === 'totp' && factor.status === 'unverified',
  );
  for (const factor of stale ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: FACTOR_NAME,
    issuer: 'Bible Connection',
  });
  if (error || !data) {
    return {
      enrollment: null,
      error: error ? friendlyAuthError(error) : 'We could not start the setup. Please try again.',
    };
  }

  return {
    enrollment: {
      factorId: data.id,
      secret: data.totp.secret,
      qrCodeUri: `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`,
    },
    error: null,
  };
}

/** Confirms a newly added authenticator with the first code it shows. */
export async function confirmTotpEnrollment(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return { error: error ? codeError(error) : null };
}

/** Checks the code from the person's authenticator after the password step. */
export async function verifyTotpCode(code: string): Promise<{ error: string | null }> {
  const { factors, error } = await listVerifiedFactors();
  if (error) return { error };
  const factor = factors[0];
  if (!factor) return { error: 'No authenticator app is set up for this account.' };

  const result = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  return { error: result.error ? codeError(result.error) : null };
}

/** Removes an authenticator app. Needs a session that has already passed the code step. */
export async function removeFactor(factorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return { error: error ? friendlyAuthError(error) : null };
}
