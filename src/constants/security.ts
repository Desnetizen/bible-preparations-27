/**
 * When true, every account must set up an authenticator app before it can use the
 * app. Leave it false until you have confirmed in the Supabase dashboard that
 * multi-factor authentication is enabled for your project, otherwise a person who
 * cannot enrol would be locked out. Accounts that already have an authenticator are
 * always asked for the code, whatever this is set to.
 */
export const REQUIRE_MFA = false;
