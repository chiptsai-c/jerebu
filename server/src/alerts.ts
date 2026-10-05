import type { Env } from './index';
import { alertText, type Lang } from './messages';
import { getReceipts, sendPush, type PushMessage } from './push';
import { fetchReadings } from './waqi';

// A station counts as "back down" only once it drops this far below the threshold,
// and a station can't change state more often than the cooldown. Stops flip-flopping alerts.
const HYSTERESIS = 10;
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const INACTIVE_DEVICE_MS = 90 * 24 * 60 * 60 * 1000;
const D1_BATCH = 100;

interface FollowRow {
  device_id: string;
  station_id: string;
  push_token: string;
  lang: Lang;
  threshold: number;
  above: number | null;
  changed_at: string | null;
}

export async function runAlerts(env: Env, now = new Date()) {
  const removedByReceipts = await processReceipts(env, now);
  const readings = await fetchReadings(env.WAQI_TOKEN);

  const { results: rows } = await env.DB.prepare(
    `SELECT f.device_id, f.station_id, d.push_token, d.lang, d.threshold, s.above, s.changed_at
       FROM follows f
       JOIN devices d ON d.id = f.device_id
       LEFT JOIN alert_state s ON s.device_id = f.device_id AND s.station_id = f.station_id`,
  ).all<FollowRow>();

  const nowIso = now.toISOString();
  const stateWrites: D1PreparedStatement[] = [];
  const outgoing: { deviceId: string; message: PushMessage }[] = [];

  for (const r of rows) {
    const reading = readings.get(r.station_id);
    if (!reading) continue;

    const firstSeen = r.above === null;
    const wasAbove = r.above === 1;
    const isAbove = wasAbove ? reading.api >= r.threshold - HYSTERESIS : reading.api >= r.threshold;
    if (!firstSeen && isAbove === wasAbove) continue;
    if (!firstSeen && r.changed_at && now.getTime() - Date.parse(r.changed_at) < COOLDOWN_MS) continue;

    stateWrites.push(
      env.DB.prepare(
        `INSERT INTO alert_state (device_id, station_id, above, changed_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (device_id, station_id) DO UPDATE SET above = excluded.above, changed_at = excluded.changed_at`,
      ).bind(r.device_id, r.station_id, isAbove ? 1 : 0, nowIso),
    );
    // A station seen for the first time below the threshold is just recorded, not announced.
    if (firstSeen && !isAbove) continue;

    const text = alertText(r.lang, isAbove ? 'above' : 'cleared', reading.name, reading.api);
    outgoing.push({
      deviceId: r.device_id,
      message: { to: r.push_token, ...text, data: { stationId: r.station_id }, sound: 'default', priority: 'high' },
    });
  }

  // Send before saving state: if Expo is unreachable the run throws and the next run retries.
  const tickets = outgoing.length ? await sendPush(outgoing.map((o) => o.message), env.EXPO_ACCESS_TOKEN) : [];
  const writes = [...stateWrites];
  const deadDevices = new Set<string>();
  tickets.forEach((ticket, i) => {
    const deviceId = outgoing[i].deviceId;
    if (ticket.status === 'ok') {
      writes.push(
        env.DB.prepare('INSERT INTO push_tickets (id, device_id, created_at) VALUES (?, ?, ?)').bind(ticket.id, deviceId, nowIso),
      );
    } else if (ticket.details?.error === 'DeviceNotRegistered') {
      deadDevices.add(deviceId);
    } else {
      console.warn(`Push to ${deviceId} failed: ${ticket.message}`);
    }
  });

  for (const id of deadDevices) writes.push(env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(id));
  writes.push(
    env.DB.prepare('DELETE FROM devices WHERE updated_at < ?').bind(new Date(now.getTime() - INACTIVE_DEVICE_MS).toISOString()),
  );
  for (let i = 0; i < writes.length; i += D1_BATCH) await env.DB.batch(writes.slice(i, i + D1_BATCH));

  return {
    stations: readings.size,
    follows: rows.length,
    sent: tickets.filter((t) => t.status === 'ok').length,
    failed: tickets.filter((t) => t.status === 'error').length,
    removedDevices: deadDevices.size + removedByReceipts,
  };
}

// Expo confirms delivery a few minutes after sending. Remove phones that uninstalled the app.
async function processReceipts(env: Env, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - RECEIPT_DELAY_MS).toISOString();
  const { results } = await env.DB.prepare('SELECT id, device_id FROM push_tickets WHERE created_at < ? LIMIT 1000')
    .bind(cutoff)
    .all<{ id: string; device_id: string }>();
  if (results.length === 0) return 0;

  const receipts = await getReceipts(results.map((t) => t.id), env.EXPO_ACCESS_TOKEN);
  const dead = new Set<string>();
  for (const t of results) {
    const r = receipts[t.id];
    if (r?.status === 'error' && r.details?.error === 'DeviceNotRegistered') dead.add(t.device_id);
  }

  const writes = [
    ...[...dead].map((id) => env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(id)),
    ...results.map((t) => env.DB.prepare('DELETE FROM push_tickets WHERE id = ?').bind(t.id)),
  ];
  for (let i = 0; i < writes.length; i += D1_BATCH) await env.DB.batch(writes.slice(i, i + D1_BATCH));
  return dead.size;
}
