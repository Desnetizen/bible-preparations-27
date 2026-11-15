import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { LoadingScreen } from '@/components/loading-screen';
import { useAuth, type AccessState } from '@/hooks/use-auth';
import AuthProvider from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

/** The one screen that makes sense for each stage of signing in. */
function homeFor(access: AccessState): Href {
  switch (access) {
    case 'signed-out':
      return '/login';
    case 'mfa-required':
      return '/mfa-verify';
    case 'recovery':
      return '/reset-password';
    case 'mfa-setup-required':
      return '/mfa-setup';
    default:
      return '/';
  }
}

function RootNavigator() {
  const { access, isLoading } = useAuth();

  // Wait for the saved session before mounting any route, otherwise a signed-in
  // user opening /explore would be bounced to /login and then to the home tab.
  // 'checking' is the moment just after a login while its security level is read.
  if (isLoading || access === 'checking') return null;

  // Anyone who lands on a screen that is not meant for their stage is sent here.
  const home = homeFor(access);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={access === 'signed-out'} redirectTo={home}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={access === 'mfa-required'} redirectTo={home}>
        <Stack.Screen name="mfa-verify" />
      </Stack.Protected>
      <Stack.Protected guard={access === 'recovery'} redirectTo={home}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected
        guard={access === 'ready' || access === 'mfa-setup-required'}
        redirectTo={home}>
        <Stack.Screen name="mfa-setup" />
      </Stack.Protected>
      <Stack.Protected guard={access === 'ready'} redirectTo={home}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="security" />
      </Stack.Protected>
    </Stack>
  );
}

/** Keeps the animated loading screen up until the saved session has been read. */
function BootLoadingScreen() {
  const { isLoading } = useAuth();
  return <LoadingScreen ready={!isLoading} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
        <BootLoadingScreen />
      </AuthProvider>
    </ThemeProvider>
  );
}
