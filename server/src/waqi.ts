// Latest readings for Malaysian DOE stations from the World Air Quality Index Project (US AQI scale).
// Keep the station filter in sync with src/data/api.js in the app.
const WAQI = 'https://api.waqi.info';
const BOUNDS = ['1.2,99.5,6.8,104.7', '0.8,109.5,7.4,119.4'];
const OTHER_COUNTRIES = /singapore|thailand|indonesia|brunei/i;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface Reading {
  id: string;
  name: string;
  api: number;
}

interface WaqiStation {
  uid: number;
  aqi: string;
  station?: { name?: string; time?: string };
}

export async function fetchReadings(token: string): Promise<Map<string, Reading>> {
  const lists = await Promise.all(BOUNDS.map((b) => fetchBounds(b, token)));
  const readings = new Map<string, Reading>();

  for (const s of lists.flat()) {
    const fullName = s.station?.name ?? '';
    const isDoe = /malaysia/i.test(fullName) || (s.uid > 0 && !OTHER_COUNTRIES.test(fullName));
    const api = Number(s.aqi);
    const age = Date.now() - new Date(s.station?.time ?? '').getTime();
    if (!isDoe || !Number.isFinite(api) || age > MAX_AGE_MS) continue;
    readings.set(String(s.uid), { id: String(s.uid), name: fullName.split(',')[0].trim() || 'Station', api });
  }
  return readings;
}

async function fetchBounds(latlng: string, token: string): Promise<WaqiStation[]> {
  const res = await fetch(`${WAQI}/map/bounds?latlng=${latlng}&networks=all&token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`WAQI returned ${res.status}`);
  const body = (await res.json()) as { status: string; data: unknown };
  if (body.status !== 'ok') throw new Error(`WAQI error: ${typeof body.data === 'string' ? body.data : 'unknown'}`);
  return body.data as WaqiStation[];
}
