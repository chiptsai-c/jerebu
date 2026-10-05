import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'jerebu.settings';
const CACHE_KEY = 'jerebu.cache';

export const DEFAULT_SETTINGS = {
  lang: 'en',
  alertsOn: false,
  threshold: 151,
  sensitive: false,
  followCurrent: true,
  followed: [],
  pinnedId: null,
};

async function readJson(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(await readJson(SETTINGS_KEY)) };
}

export function saveSettings(settings) {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
}

export function loadCache() {
  return readJson(CACHE_KEY);
}

export function saveCache(data) {
  return AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
}
