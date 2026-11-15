import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';

/** A full-screen form on the brand background with a heading and optional subheading. */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.five },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Text style={styles.heading} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subheading}>{subtitle}</Text> : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type FormFieldProps = TextInputProps & {
  label: string;
  /** Adds a Show / Hide switch. Use it for password fields. */
  revealable?: boolean;
};

export function FormField({ label, revealable, style, onFocus, onBlur, ...rest }: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...rest}
          placeholderTextColor={Brand.textSecondary}
          secureTextEntry={revealable ? !revealed : rest.secureTextEntry}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            revealable && styles.inputWithToggle,
            focused && styles.inputFocused,
            style,
          ]}
        />
        {revealable ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            style={styles.showToggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
            <Text style={styles.showToggleText}>{revealed ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function FormMessage({ error, notice }: { error?: string | null; notice?: string | null }) {
  if (error) {
    return (
      <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {error}
      </Text>
    );
  }
  if (notice) {
    return (
      <Text style={styles.notice} accessibilityLiveRegion="polite">
        {notice}
      </Text>
    );
  }
  return null;
}

export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const inactive = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.primaryButton, (pressed || inactive) && styles.dimmed]}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: inactive }}>
      {busy ? (
        <ActivityIndicator color={Brand.onAccent} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function TextLink({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dimmed]}
      hitSlop={8}
      accessibilityRole="button">
      <Text style={[styles.linkText, danger && { color: Brand.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    color: Brand.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  subheading: {
    color: Brand.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  label: {
    color: Brand.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputRow: {
    justifyContent: 'center',
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    color: Brand.text,
    paddingHorizontal: Spacing.three,
    // 16px keeps iOS Safari from zooming into the field on web.
    fontSize: 16,
    ...Platform.select({ web: { outlineWidth: 0 }, default: {} }),
  },
  inputWithToggle: {
    paddingRight: 72,
  },
  inputFocused: {
    borderColor: Brand.info,
  },
  showToggle: {
    position: 'absolute',
    right: Spacing.three,
    paddingVertical: Spacing.two,
  },
  showToggleText: {
    color: Brand.info,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: Brand.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    color: Brand.info,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  primaryButtonText: {
    color: Brand.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  dimmed: {
    opacity: 0.6,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
  linkText: {
    color: Brand.info,
    fontSize: 14,
    fontWeight: '600',
  },
});
