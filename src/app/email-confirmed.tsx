import { Redirect } from 'expo-router';

/**
 * The email confirmation link opens the app at this address. The code in the link is
 * exchanged in the auth provider; this screen only keeps the router from showing an
 * unmatched-route page and passes the person on to wherever their state belongs.
 */
export default function EmailConfirmedScreen() {
  return <Redirect href="/" />;
}
