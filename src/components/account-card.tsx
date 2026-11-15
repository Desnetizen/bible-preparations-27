import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

/** Shows who is signed in and lets them log out. */
export function AccountCard() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const fullName =
    typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

  async function onLogOut() {
    if (busy) return;
    setBusy(true);
    await signOut();
    // The auth listener clears the session and the route guard returns to /login.
    setBusy(false);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.identity}>
        <ThemedText type="small" themeColor="textSecondary">
          Signed in as
        </ThemedText>
        <ThemedText numberOfLines={1}>{fullName || user?.email}</ThemedText>
        {fullName ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {user?.email}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/security')}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="linkPrimary">Security</ThemedText>
        </Pressable>
        <Pressable
          onPress={onLogOut}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => (pressed || busy) && styles.pressed}>
          <ThemedText type="linkPrimary">Log out</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  identity: {
    flex: 1,
  },
  actions: {
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
