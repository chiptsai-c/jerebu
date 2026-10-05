import { runAlerts } from './alerts';

export interface Env {
  DB: D1Database;
  WAQI_TOKEN: string;
  EXPO_ACCESS_TOKEN?: string;
}

// PUT    /devices/:id   register or update a phone (Authorization: Bearer <secret>)
// DELETE /devices/:id   stop alerts for a phone
// GET    /health
const DEVICE_PATH = /^\/devices\/([A-Za-z0-9-]{16,64})$/;
const THRESHOLDS = [101, 151, 201, 301];
const MAX_STATIONS = 10;

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname === '/health') return json(200, { ok: true });

    const match = pathname.match(DEVICE_PATH);
    if (!match) return json(404, { error: 'Not found' });
    if (req.method === 'PUT') return putDevice(req, env, match[1]);
    if (req.method === 'DELETE') return deleteDevice(req, env, match[1]);
    return json(405, { error: 'Use PUT or DELETE' });
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runAlerts(env).then(
        (summary) => console.log('alerts run', JSON.stringify(summary)),
        (err) => console.error('alerts run failed', err),
      ),
    );
  },
} satisfies ExportedHandler<Env>;

interface DeviceInput {
  pushToken: string;
  lang: 'en' | 'bm';
  threshold: number;
  stations: string[];
}

async function putDevice(req: Request, env: Env, id: string): Promise<Response> {
  const secret = bearer(req);
  if (!secret) return json(401, { error: 'Send the device secret as "Authorization: Bearer <secret>" (32–128 characters)' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Body must be JSON' });
  }
  const input = validate(body);
  if (typeof input === 'string') return json(400, { error: input });

  const hash = await sha256(secret);
  const existing = await env.DB.prepare('SELECT secret_hash, threshold FROM devices WHERE id = ?')
    .bind(id)
    .first<{ secret_hash: string; threshold: number }>();
  if (existing && !(await sameHash(existing.secret_hash, hash))) return json(403, { error: 'Wrong secret for this device' });

  const db = env.DB;
  await db.batch([
    // The same phone re-registering under a new ID (e.g. after reinstalling) replaces its old row.
    db.prepare('DELETE FROM devices WHERE push_token = ? AND id <> ?').bind(input.pushToken, id),
    db
      .prepare(
        `INSERT INTO devices (id, secret_hash, push_token, lang, threshold, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET push_token = excluded.push_token, lang = excluded.lang,
           threshold = excluded.threshold, updated_at = excluded.updated_at`,
      )
      .bind(id, hash, input.pushToken, input.lang, input.threshold, new Date().toISOString()),
    db.prepare('DELETE FROM follows WHERE device_id = ?').bind(id),
    ...input.stations.map((s) => db.prepare('INSERT INTO follows (device_id, station_id) VALUES (?, ?)').bind(id, s)),
    // A new threshold changes what "above" means, so start fresh; otherwise drop state for unfollowed stations.
    existing && existing.threshold !== input.threshold
      ? db.prepare('DELETE FROM alert_state WHERE device_id = ?').bind(id)
      : db
          .prepare('DELETE FROM alert_state WHERE device_id = ? AND station_id NOT IN (SELECT station_id FROM follows WHERE device_id = ?)')
          .bind(id, id),
  ]);

  return json(200, { ok: true, stations: input.stations.length });
}

async function deleteDevice(req: Request, env: Env, id: string): Promise<Response> {
  const secret = bearer(req);
  if (!secret) return json(401, { error: 'Send the device secret as "Authorization: Bearer <secret>"' });
  const row = await env.DB.prepare('SELECT secret_hash FROM devices WHERE id = ?').bind(id).first<{ secret_hash: string }>();
  if (!row) return json(200, { ok: true });
  if (!(await sameHash(row.secret_hash, await sha256(secret)))) return json(403, { error: 'Wrong secret for this device' });
  await env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(id).run();
  return json(200, { ok: true });
}

function validate(body: unknown): DeviceInput | string {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object';
  const b = body as Record<string, unknown>;
  if (typeof b.pushToken !== 'string' || !/^Expo(nent)?PushToken\[[^\]]+\]$/.test(b.pushToken))
    return 'pushToken must be an Expo push token like ExponentPushToken[...]';
  if (b.lang !== 'en' && b.lang !== 'bm') return 'lang must be "en" or "bm"';
  if (typeof b.threshold !== 'number' || !THRESHOLDS.includes(b.threshold))
    return `threshold must be one of ${THRESHOLDS.join(', ')}`;
  if (!Array.isArray(b.stations) || b.stations.length > MAX_STATIONS)
    return `stations must be a list of up to ${MAX_STATIONS} station IDs`;
  if (!b.stations.every((s) => typeof s === 'string' && /^\d{1,9}$/.test(s)))
    return 'Each station must be a WAQI station ID (digits only)';
  return { pushToken: b.pushToken, lang: b.lang, threshold: b.threshold, stations: [...new Set(b.stations as string[])] };
}

function bearer(req: Request): string | null {
  const m = (req.headers.get('Authorization') ?? '').match(/^Bearer (.{32,128})$/);
  return m ? m[1] : null;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sameHash(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  return ab.byteLength === bb.byteLength && crypto.subtle.timingSafeEqual(ab, bb);
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
