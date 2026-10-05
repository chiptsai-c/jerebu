import { ADMIN_PAGE } from './adminPage';
import type { Env } from './index';
import { sendPush, type PushMessage } from './push';
import { json, sameHash, sha256 } from './util';
import { fetchReadings } from './waqi';

// GET  /admin              the announcements page (static HTML, no data in it)
// GET  /admin/api/summary  phones registered, per state           } Authorization: Bearer <ADMIN_PASSWORD>
// POST /admin/api/send     send (or with dryRun, count) an announcement }
const TITLE_MAX = 65;
const BODY_MAX = 240;
const PUSH_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Content-Security-Policy':
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; form-action 'none'",
  'Referrer-Policy': 'no-referrer',
};

export async function handleAdmin(req: Request, env: Env, pathname: string): Promise<Response> {
  if (pathname === '/admin' && req.method === 'GET') return new Response(ADMIN_PAGE, { headers: PAGE_HEADERS });

  if (!env.ADMIN_PASSWORD) {
    return json(503, { error: 'The admin page is switched off. Set a password with `npx wrangler secret put ADMIN_PASSWORD`.' });
  }
  if (!(await passwordMatches(req, env.ADMIN_PASSWORD))) return json(401, { error: 'Wrong password' });

  if (pathname === '/admin/api/summary' && req.method === 'GET') return summary(env);
  if (pathname === '/admin/api/send' && req.method === 'POST') return send(req, env);
  return json(404, { error: 'Not found' });
}

async function passwordMatches(req: Request, password: string): Promise<boolean> {
  const m = (req.headers.get('Authorization') ?? '').match(/^Bearer (.+)$/);
  if (!m) return false;
  return sameHash(await sha256(m[1]), await sha256(password));
}

// Phones per state, based on the stations each phone follows (including its nearest station).
async function audience(env: Env) {
  const readings = await fetchReadings(env.WAQI_TOKEN);
  const { results: follows } = await env.DB.prepare('SELECT device_id, station_id FROM follows').all<{
    device_id: string;
    station_id: string;
  }>();
  const byState = new Map<string, { stations: number; phones: Set<string> }>();
  for (const r of readings.values()) {
    if (!byState.has(r.state)) byState.set(r.state, { stations: 0, phones: new Set() });
    byState.get(r.state)!.stations++;
  }
  for (const f of follows) {
    const state = readings.get(f.station_id)?.state;
    if (state) byState.get(state)!.phones.add(f.device_id);
  }
  return byState;
}

async function summary(env: Env): Promise<Response> {
  const [byState, total] = await Promise.all([
    audience(env),
    env.DB.prepare('SELECT COUNT(*) AS n FROM devices').first<{ n: number }>(),
  ]);
  const states = [...byState.entries()]
    .map(([state, v]) => ({ state, stations: v.stations, phones: v.phones.size }))
    .sort((a, b) => a.state.localeCompare(b.state));
  return json(200, { phones: total?.n ?? 0, states });
}

interface Text {
  title: string;
  body: string;
}

interface SendInput {
  en: Text;
  bm: Text | null;
  target: { type: 'all' } | { type: 'states'; states: string[] } | { type: 'token'; token: string; lang: 'en' | 'bm' };
  dryRun: boolean;
}

async function send(req: Request, env: Env): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: 'Body must be JSON' });
  }
  const input = validate(raw);
  if (typeof input === 'string') return json(400, { error: input });

  let recipients: { id: string | null; push_token: string; lang: string }[];
  const { target } = input;
  if (target.type === 'token') {
    recipients = [{ id: null, push_token: target.token, lang: target.lang }];
  } else if (target.type === 'all') {
    recipients = (await env.DB.prepare('SELECT id, push_token, lang FROM devices').all<{ id: string; push_token: string; lang: string }>())
      .results;
  } else {
    const byState = await audience(env);
    const ids = new Set<string>();
    for (const s of target.states) byState.get(s)?.phones.forEach((id) => ids.add(id));
    recipients = (
      await env.DB.prepare('SELECT id, push_token, lang FROM devices WHERE id IN (SELECT value FROM json_each(?))')
        .bind(JSON.stringify([...ids]))
        .all<{ id: string; push_token: string; lang: string }>()
    ).results;
  }

  if (input.dryRun || recipients.length === 0) return json(200, { phones: recipients.length, sent: 0, failed: 0 });

  const messages: PushMessage[] = recipients.map((r) => {
    const text = r.lang === 'bm' && input.bm ? input.bm : input.en;
    return { to: r.push_token, title: text.title, body: text.body, data: { kind: 'announcement' }, sound: 'default', priority: 'high' };
  });
  const tickets = await sendPush(messages, env.EXPO_ACCESS_TOKEN);

  const now = new Date().toISOString();
  const writes: D1PreparedStatement[] = [];
  const errors = new Set<string>();
  tickets.forEach((t, i) => {
    const id = recipients[i].id;
    if (t.status === 'ok') {
      if (id) writes.push(env.DB.prepare('INSERT INTO push_tickets (id, device_id, created_at) VALUES (?, ?, ?)').bind(t.id, id, now));
    } else {
      errors.add(t.details?.error ?? t.message);
      if (id && t.details?.error === 'DeviceNotRegistered') writes.push(env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(id));
    }
  });
  for (let i = 0; i < writes.length; i += 100) await env.DB.batch(writes.slice(i, i + 100));

  return json(200, {
    phones: recipients.length,
    sent: tickets.filter((t) => t.status === 'ok').length,
    failed: tickets.filter((t) => t.status === 'error').length,
    errors: [...errors].slice(0, 3),
  });
}

function validate(raw: unknown): SendInput | string {
  if (!raw || typeof raw !== 'object') return 'Body must be a JSON object';
  const b = raw as Record<string, any>;

  const en = text(b.en);
  if (!en) return `English title and message are required (title up to ${TITLE_MAX} characters, message up to ${BODY_MAX})`;
  const hasBm = b.bm && (b.bm.title?.trim() || b.bm.body?.trim());
  const bm = hasBm ? text(b.bm) : null;
  if (hasBm && !bm) return `Fill in both the BM title and message, or leave both empty (title up to ${TITLE_MAX}, message up to ${BODY_MAX})`;

  const t = b.target ?? {};
  let target: SendInput['target'];
  if (t.type === 'all') target = { type: 'all' };
  else if (t.type === 'states') {
    if (!Array.isArray(t.states) || t.states.length === 0 || !t.states.every((s: unknown) => typeof s === 'string'))
      return 'Choose at least one state';
    target = { type: 'states', states: t.states };
  } else if (t.type === 'token') {
    if (typeof t.token !== 'string' || !PUSH_TOKEN.test(t.token.trim())) return 'Push token must look like ExponentPushToken[...]';
    target = { type: 'token', token: t.token.trim(), lang: t.lang === 'bm' ? 'bm' : 'en' };
  } else return 'Choose who to send to';

  return { en, bm, target, dryRun: b.dryRun === true };
}

function text(v: any): Text | null {
  const title = typeof v?.title === 'string' ? v.title.trim() : '';
  const body = typeof v?.body === 'string' ? v.body.trim() : '';
  if (!title || !body || title.length > TITLE_MAX || body.length > BODY_MAX) return null;
  return { title, body };
}
