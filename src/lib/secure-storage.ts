import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Session storage backed by the iOS Keychain and the Android Keystore.
 *
 * A Supabase session is a few kilobytes of JSON, more than some platforms accept in a
 * single SecureStore item, so each value is split into small chunks. A counter item
 * is written last, which means a write that is interrupted halfway leaves the old
 * value readable instead of a corrupt mixture.
 */

const CHUNK_SIZE = 1000;

// The item is never restored to a different device from a backup.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** SecureStore keys may only contain letters, digits, ".", "-" and "_". */
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

function countKey(key: string): string {
  return `${safeKey(key)}.count`;
}

function chunkKey(key: string, index: number): string {
  return `${safeKey(key)}.chunk${index}`;
}

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key), OPTIONS);
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function removeChunks(key: string): Promise<void> {
  const count = await readCount(key);
  await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
  for (let index = 0; index < count; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index), OPTIONS);
  }
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) return null;

    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, index), OPTIONS);
      if (part === null) {
        // A chunk is missing, so the stored value cannot be trusted. Start clean.
        await removeChunks(key);
        return null;
      }
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousCount = await readCount(key);
    const chunks: string[] = [];
    for (let start = 0; start < value.length; start += CHUNK_SIZE) {
      chunks.push(value.slice(start, start + CHUNK_SIZE));
    }

    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(chunkKey(key, index), chunks[index], OPTIONS);
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks.length), OPTIONS);

    // Drop leftover chunks when the new value is shorter than the old one.
    for (let index = chunks.length; index < previousCount; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index), OPTIONS);
    }
  },

  async removeItem(key: string): Promise<void> {
    await removeChunks(key);
  },
};

/**
 * Earlier versions of the app kept the session in plain AsyncStorage. Delete any
 * leftover copy so a readable token does not stay on the phone. People who were
 * signed in will simply be asked to log in again once.
 */
export async function clearLegacySession(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const legacy = keys.filter((key) => key.startsWith('sb-') && key.includes('-auth-token'));
    if (legacy.length > 0) await AsyncStorage.multiRemove(legacy);
  } catch {
    // Cleanup is best effort. Nothing depends on it.
  }
}
