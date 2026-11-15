/** The parts of a Supabase auth error this module looks at. */
export type RawAuthError = {
  message?: string;
  code?: string;
  name?: string;
  status?: number;
};

const NETWORK_PATTERN =
  /fetch failed|network request failed|failed to fetch|networkerror|unknownhost|unable to resolve host|no address associated|timed? ?out|econn|enotfound|offline|socket/i;

const BY_CODE: Record<string, string> = {
  invalid_credentials: 'That email and password do not match. Please check them and try again.',
  email_not_confirmed:
    'Please confirm your email first. Open the link we sent you, then log in again.',
  user_already_exists: 'An account with this email already exists. Try logging in instead.',
  email_exists: 'An account with this email already exists. Try logging in instead.',
  weak_password: 'That password is too easy to guess. Please choose a stronger one.',
  same_password: 'Your new password must be different from your current one.',
  email_address_invalid: 'That email address does not look right. Please check it.',
  validation_failed: 'Some of what you entered does not look right. Please check it.',
  signup_disabled: 'New accounts cannot be created right now. Please try again later.',
  user_banned: 'This account has been disabled. Please contact support.',
  user_not_found: 'That email and password do not match. Please check them and try again.',
  session_expired: 'Your session has ended. Please log in again.',
  session_not_found: 'Your session has ended. Please log in again.',
  refresh_token_not_found: 'Your session has ended. Please log in again.',
  refresh_token_already_used: 'Your session has ended. Please log in again.',
  reauthentication_needed: 'For your security, please log in again before making this change.',
  reauthentication_not_valid: 'For your security, please log in again before making this change.',
  otp_expired: 'That link or code has expired. Please request a new one.',
  flow_state_expired: 'That link has expired. Please request a new one.',
  flow_state_not_found: 'That link is no longer valid. Please request a new one.',
  bad_code_verifier: 'That link can only be opened on the phone that requested it.',
  mfa_verification_failed: 'That code was not accepted. Check the app and try the newest code.',
  mfa_challenge_expired: 'That code took too long. Enter the newest code from your app.',
  mfa_verification_rejected: 'That code was not accepted. Check the app and try the newest code.',
  mfa_factor_not_found: 'Two-step verification is not set up for this account.',
  mfa_factor_name_conflict: 'An authenticator is already being set up. Please try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  over_email_send_rate_limit:
    'We have sent a lot of emails recently. Please wait a little while and try again.',
  over_sms_send_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  request_timeout: 'The server took too long to answer. Please try again.',
  unexpected_failure: 'Something went wrong on our side. Please try again in a moment.',
};

export const NETWORK_MESSAGE =
  'We could not reach the server. Check your internet connection and try again.';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Turns an error from Supabase, or from the network layer underneath it, into a short
 * sentence a person can act on. The original is logged during development so it is
 * still available when something needs debugging.
 */
export function friendlyAuthError(error: RawAuthError | null | undefined): string {
  if (!error) return GENERIC_MESSAGE;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[auth]', error.code ?? error.name ?? 'error', error.message);
  }

  const message = error.message ?? '';

  // No answer at all: offline, wrong address, or a server that is down.
  if (
    error.name === 'AuthRetryableFetchError' ||
    error.status === 0 ||
    NETWORK_PATTERN.test(message)
  ) {
    return NETWORK_MESSAGE;
  }

  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];

  if (error.status === 429 || /rate limit|too many/i.test(message)) {
    return BY_CODE.over_request_rate_limit;
  }
  if (error.status !== undefined && error.status >= 500) {
    return BY_CODE.unexpected_failure;
  }

  // Older server versions send no code, so fall back to the wording of the message.
  if (/invalid login credentials/i.test(message)) return BY_CODE.invalid_credentials;
  if (/email not confirmed/i.test(message)) return BY_CODE.email_not_confirmed;
  if (/already (been )?registered/i.test(message)) return BY_CODE.user_already_exists;
  if (/expired|invalid.*(token|code|otp)/i.test(message)) return BY_CODE.otp_expired;

  return GENERIC_MESSAGE;
}
