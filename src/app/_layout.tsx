import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { LoadingScreen } from '@/components/loading-screen';
import { useAuth } from '@/hooks/use-auth';
import AuthProvider from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isSignedIn, isLoading } = useAuth();

  // Wait for the saved session before mounting any route, otherwise a signed-in
  // user opening /explore would be bounced to /login and then to the home tab.
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn} redirectTo="/">
        <Stack.Screen name="login" />
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
