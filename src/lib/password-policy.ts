import * as Crypto from 'expo-crypto';

/** New passwords must be at least this long. Length matters more than symbol rules. */
export const MIN_PASSWORD_LENGTH = 12;

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export const STRENGTH_LABELS: Record<StrengthScore, string> = {
  0: 'Too weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

export type PasswordContext = {
  email?: string;
  name?: string;
};

export type PasswordReport = {
  score: StrengthScore;
  /** Problems that block the password from being used. Empty when it is acceptable. */
  issues: string[];
  meetsPolicy: boolean;
};

const COMMON_PASSWORDS = [
  'password',
  'passw0rd',
  'qwertyuiop',
  'qwerty123456',
  '123456789012',
  '1234567890',
  'iloveyou',
  'letmein',
  'welcome',
  'admin',
  'abc123',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'bible',
  'jesus',
  'godisgood',
  'blessed',
];

function characterClasses(password: string): number {
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^A-Za-z0-9]/.test(password)) classes += 1;
  return classes;
}

function isRepetitiveOrSequential(password: string): boolean {
  if (/^(.)\1+$/.test(password)) return true;
  const lower = password.toLowerCase();
  const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiopasdfghjklzxcvbnm'];
  return sequences.some((sequence) => {
    for (let start = 0; start + 6 <= sequence.length; start += 1) {
      if (lower.includes(sequence.slice(start, start + 6))) return password.length < 16;
    }
    return false;
  });
}

/** Checks a candidate password against the local rules. No network access. */
export function evaluatePassword(password: string, context: PasswordContext = {}): PasswordReport {
  const issues: string[] = [];
  const lower = password.toLowerCase();

  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const emailName = context.email?.split('@')[0]?.toLowerCase() ?? '';
  if (emailName.length >= 4 && lower.includes(emailName)) {
    issues.push('Do not include the first part of your email address.');
  }

  const name = context.name?.trim().toLowerCase() ?? '';
  if (name.length >= 4 && lower.includes(name.replace(/\s+/g, ''))) {
    issues.push('Do not include your name.');
  }

  if (COMMON_PASSWORDS.some((word) => lower.includes(word)) && password.length < 20) {
    issues.push('This contains a very common word or pattern.');
  }

  if (password.length > 0 && isRepetitiveOrSequential(password)) {
    issues.push('Avoid repeated characters and simple sequences.');
  }

  let points = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) points += 1;
  if (password.length >= 16) points += 1;
  if (password.length >= 20) points += 1;
  // A long passphrase earns the last point without symbols or digits.
  if (characterClasses(password) >= 3 || password.length >= 24) points += 1;

  let score = Math.min(points, 4) as StrengthScore;
  if (password.length < MIN_PASSWORD_LENGTH) {
    score = password.length >= 8 ? 1 : 0;
  } else if (issues.length > 0) {
    score = Math.min(score, 1) as StrengthScore;
  }

  return { score, issues, meetsPolicy: issues.length === 0 };
}

export type BreachResult =
  | { status: 'breached'; count: number }
  | { status: 'safe' }
  /** The lookup failed (offline, timeout, service down). Treated as allowed. */
  | { status: 'unknown' };

const BREACH_TIMEOUT_MS = 6000;

/**
 * Checks a password against the Have I Been Pwned list using k-anonymity. Only the
 * first five characters of the password's SHA-1 hash leave the device, never the
 * password itself or the full hash. The comparison happens on the phone.
 */
export async function checkPasswordBreached(password: string): Promise<BreachResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BREACH_TIMEOUT_MS);

  try {
    const digest = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, password))
      .toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      // Padding hides how many real matches a prefix has from anyone watching traffic.
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    });
    if (!response.ok) return { status: 'unknown' };

    const body = await response.text();
    for (const line of body.split('\n')) {
      const [hashSuffix, countText] = line.trim().split(':');
      if (hashSuffix === suffix) {
        const count = Number.parseInt(countText ?? '0', 10);
        // Padded entries have a count of zero and are not real matches.
        if (count > 0) return { status: 'breached', count };
      }
    }
    return { status: 'safe' };
  } catch {
    return { status: 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}
