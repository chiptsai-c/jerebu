import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';

// The alerts server in server/. Set EXPO_PUBLIC_ALERTS_URL in .env after deploying it.
// Without it, alerts stay in-app only (the warning card on the Now tab).
export const ALERTS_URL = (process.env.EXPO_PUBLIC_ALERTS_URL || '').replace(/\/+$/, '');

const IDENTITY_KEY = 'jerebu.device';
const SYNCED_KEY = 'jerebu.pushSynced';
const RESYNC_MS = 7 * 24 * 60 * 60 * 1000; // the server forgets phones silent for 90 days

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Asks for notification permission. Returns true if granted.
export async function requestPushPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Haze alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Tells the server what this phone should be alerted about, or that alerts are off.
// Skips the call when nothing changed since the last successful sync.
export async function syncPushAlerts({ settings, nearestId, isLive }) {
  if (!ALERTS_URL) return 'local';

  const identity = await loadIdentity();
  const last = await readJson(SYNCED_KEY);

  if (!settings.alertsOn || !isLive) {
    if (last?.registered) {
      await call('DELETE', identity);
      await AsyncStorage.setItem(SYNCED_KEY, JSON.stringify({ registered: false }));
    }
    return isLive ? 'off' : 'needsLive';
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
  const ids = new Set(settings.followed);
  if (settings.followCurrent && nearestId) ids.add(nearestId);
  const payload = {
    pushToken,
    lang: settings.lang,
    threshold: settings.threshold,
    // Live station IDs are WAQI numbers; anything else is left over from sample data.
    stations: [...ids].filter((id) => /^\d+$/.test(id)).slice(0, 10),
  };

  const body = JSON.stringify(payload);
  const fresh = last?.registered && last.body === body && Date.now() - last.at < RESYNC_MS;
  if (!fresh) {
    await call('PUT', identity, body);
    await AsyncStorage.setItem(SYNCED_KEY, JSON.stringify({ registered: true, body, at: Date.now() }));
  }
  return 'on';
}

async function call(method, { id, secret }, body) {
  const res = await fetch(`${ALERTS_URL}/devices/${id}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error || `Server returned ${res.status}`);
  }
}

// A random ID and secret created once per install. Only this phone can change its server record.
async function loadIdentity() {
  const saved = await readJson(IDENTITY_KEY);
  if (saved?.id && saved?.secret) return saved;
  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const identity = { id: Crypto.randomUUID(), secret: hex(Crypto.getRandomBytes(32)) };
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

async function readJson(key) {
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) || 'null');
  } catch {
    return null;
  }
}
