import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
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
  type TextInputInstance,
} from 'react-native';

import { BrandHero, bootIntro } from '@/components/brand-hero';
import { Brand } from '@/constants/brand';
import { PasswordStrength } from '@/components/password-strength';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import {
  MIN_PASSWORD_LENGTH,
  checkPasswordBreached,
  evaluatePassword,
} from '@/lib/password-policy';
import { isSupabaseConfigured } from '@/lib/supabase';

type Mode = 'login' | 'signup';
type Field = 'name' | 'email' | 'password';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signIn, signUp, linkError, clearLinkError } = useAuth();

  // While the boot loading screen is still covering this screen, show the
  // finished logo. Later visits (after logging out) play the animation.
  const [heroMode] = useState<'play' | 'settled'>(() => (bootIntro.active ? 'settled' : 'play'));

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const isSignUp = mode === 'signup';
  const passwordReport = evaluatePassword(password, { email, name });

  function switchMode(next: Mode) {
    if (next === mode || submitting) return;
    setMode(next);
    setError(null);
    setNotice(null);
    setShowPassword(false);
  }

  async function onSubmit() {
    if (submitting) return;
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();

    if (!isSupabaseConfigured) {
      setError('This app is not connected to its server yet. Please try again later.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length === 0) {
      setError('Enter your password.');
      return;
    }
    // Sign-in accepts any existing password so older accounts are not locked out.
    // The strict rules apply only when a new password is chosen.
    if (isSignUp && !passwordReport.meetsPolicy) {
      setError(passwordReport.issues[0] ?? 'Choose a stronger password.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        const breach = await checkPasswordBreached(password);
        if (breach.status === 'breached') {
          setError(
            'This password has appeared in known data breaches. Please choose a different one.',
          );
          return;
        }

        const result = await signUp(trimmedEmail, password, name.trim());
        if (result.error) {
          setError(result.error);
        } else if (result.needsEmailConfirmation) {
          setMode('login');
          setPassword('');
          setShowPassword(false);
          setNotice(`We sent a confirmation link to ${trimmedEmail}. Open it, then log in here.`);
        }
        // Otherwise a session already exists and the route guard takes over.
      } else {
        const result = await signIn(trimmedEmail, password);
        if (result.error) setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <BrandHero mode={heroMode} />

          <View style={styles.form}>
            {!isSupabaseConfigured && (
              <View style={styles.banner} accessibilityRole="alert">
                <Text style={styles.bannerTitle}>Supabase is not connected</Text>
                <Text style={styles.bannerBody}>
                  Developer note: .env.local is missing or still holds the sample values from
                  .env.example. Put your real project URL and publishable key in it, then restart
                  with npx expo start --clear.
                </Text>
              </View>
            )}

            <Text style={styles.heading} accessibilityRole="header">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text style={styles.subheading}>
              {isSignUp
                ? 'Sign up to start preparing with Bible Connection.'
                : 'Log in to pick up where you left off.'}
            </Text>

            <View style={styles.segment} accessibilityRole="tablist">
              <SegmentButton
                label="Log in"
                selected={!isSignUp}
                onPress={() => switchMode('login')}
              />
              <SegmentButton
                label="Sign up"
                selected={isSignUp}
                onPress={() => switchMode('signup')}
              />
            </View>

            {isSignUp && (
              <LabeledInput label="Name (optional)">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  style={[styles.input, focused === 'name' && styles.inputFocused]}
                  placeholder="Your name"
                  placeholderTextColor={Brand.textSecondary}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  editable={!submitting}
                />
              </LabeledInput>
            )}

            <LabeledInput label="Email">
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={[styles.input, focused === 'email' && styles.inputFocused]}
                placeholder="you@example.com"
                placeholderTextColor={Brand.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                editable={!submitting}
              />
            </LabeledInput>

            <LabeledInput label="Password">
              <View style={styles.passwordRow}>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={onSubmit}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focused === 'password' && styles.inputFocused,
                  ]}
                  placeholder={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Password'}
                  placeholderTextColor={Brand.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  textContentType={isSignUp ? 'newPassword' : 'password'}
                  returnKeyType="go"
                  editable={!submitting}
                />
                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.showToggle}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                  <Text style={styles.showToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </LabeledInput>

            {isSignUp && password.length > 0 && <PasswordStrength report={passwordReport} />}

            {error && (
              <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}
            {notice && (
              <Text style={styles.notice} accessibilityLiveRegion="polite">
                {notice}
              </Text>
            )}

            {linkError && (
              <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
                {linkError}
              </Text>
            )}

            {!isSignUp && (
              <Pressable
                onPress={() => {
                  clearLinkError();
                  router.push('/forgot-password');
                }}
                style={styles.forgotLink}
                hitSlop={8}
                accessibilityRole="button">
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            )}

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || submitting) && styles.primaryButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ busy: submitting, disabled: submitting }}>
              {submitting ? (
                <ActivityIndicator color={Brand.onAccent} />
              ) : (
                <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Log in'}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => switchMode(isSignUp ? 'login' : 'signup')}
              style={styles.switchLink}
              accessibilityRole="button">
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account? ' : 'New here? '}
                <Text style={styles.switchTextStrong}>{isSignUp ? 'Log in' : 'Create an account'}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
      accessibilityRole="tab"
      accessibilityState={{ selected }}>
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
    paddingBottom: Spacing.six,
  },
  form: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
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
  segment: {
    flexDirection: 'row',
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonSelected: {
    backgroundColor: Brand.border,
  },
  segmentText: {
    color: Brand.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: Brand.text,
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
  inputFocused: {
    borderColor: Brand.info,
  },
  passwordRow: {
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 72,
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
  primaryButtonPressed: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: Brand.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  switchLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
  switchText: {
    color: Brand.textSecondary,
    fontSize: 14,
  },
  switchTextStrong: {
    color: Brand.text,
    fontWeight: '700',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.one,
  },
  forgotText: {
    color: Brand.info,
    fontSize: 14,
    fontWeight: '600',
  },
  banner: {
    backgroundColor: Brand.surface,
    borderColor: Brand.accent,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  bannerTitle: {
    color: Brand.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  bannerBody: {
    color: Brand.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
