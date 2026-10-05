import { STATIONS } from './stations';

// Live data comes from the World Air Quality Index Project (https://aqicn.org/api/),
// which republishes Malaysian DOE station readings on the US AQI scale.
// Put your free token in .env as EXPO_PUBLIC_WAQI_TOKEN. Without it the app uses sample data.
// WAQI terms: free apps only, credit WAQI and DOE, don't redistribute the data.
const WAQI_TOKEN = process.env.EXPO_PUBLIC_WAQI_TOKEN || '';
const WAQI = 'https://api.waqi.info';

// Rough boxes around Peninsular Malaysia and Malaysian Borneo.
const BOUNDS = ['1.2,99.5,6.8,104.7', '0.8,109.5,7.4,119.4'];
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const OTHER_COUNTRIES = /singapore|thailand|indonesia|brunei/i;
// States for DOE stations that WAQI names without one.
const BARE_NAME_STATES = { Ipoh: 'Perak', Perai: 'Pulau Pinang', Miri: 'Sarawak' };

export const IS_LIVE = Boolean(WAQI_TOKEN);

export async function fetchReadings() {
  const data = IS_LIVE ? await waqiReadings() : await sampleReadings();
  // Development builds only: a fake station that is always Hazardous, for testing the haze and alerts screens.
  if (__DEV__) data.stations.push(testStation());
  return data;
}

export const TEST_STATION_ID = 'TEST-HAZARDOUS';

function testStation() {
  return {
    id: TEST_STATION_ID,
    name: 'Test station (always Hazardous)',
    state: 'Test',
    // Far south of Malaysia, so it is never picked as the nearest station.
    lat: -60,
    lng: 105,
    api: 350,
    pollutant: 'PM2.5',
    updatedAt: new Date().toISOString(),
    // A wavy 24 hours in the Hazardous range, ending on the current 350.
    trend24h: [...Array.from({ length: 23 }, (_, i) => 330 + Math.round(20 * Math.sin(i / 3))), 350],
  };
}

// Extra detail for one station (pollutant, forecast). Sample stations already carry theirs.
export async function fetchStationDetail(id) {
  if (!IS_LIVE || id === TEST_STATION_ID) return null;
  const d = await waqiGet(`/feed/@${id}/`);
  const [name, state] = splitName(d.city?.name);
  return {
    id: String(d.idx ?? id),
    name,
    state,
    api: Number(d.aqi),
    pollutant: pollutantName(d.dominentpol),
    updatedAt: d.time?.iso,
    forecast: d.forecast?.daily?.pm25 ?? [],
  };
}

async function waqiGet(path, params = '') {
  const res = await fetch(`${WAQI}${path}?token=${encodeURIComponent(WAQI_TOKEN)}${params}`);
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const body = await res.json();
  if (body.status !== 'ok') throw new Error(typeof body.data === 'string' ? body.data : 'WAQI error');
  return body.data;
}

async function waqiReadings() {
  const lists = await Promise.all(BOUNDS.map((b) => waqiGet('/map/bounds', `&latlng=${b}&networks=all`)));
  const all = lists.flat();

  // Keep DOE stations: names ending in ", Malaysia", plus a few older DOE stations WAQI lists
  // by bare town name ("Ipoh", "Miri"). Negative uids are third-party sensors, not DOE.
  const pool = all.filter((s) => {
    const name = s.station?.name ?? '';
    return /malaysia/i.test(name) || (s.uid > 0 && !OTHER_COUNTRIES.test(name));
  });

  const seen = new Set();
  const stations = [];
  for (const s of pool) {
    const api = Number(s.aqi);
    const ms = new Date(s.station?.time).getTime();
    const time = Number.isFinite(ms) ? s.station.time : undefined;
    if (!Number.isFinite(api) || seen.has(s.uid)) continue;
    if (time && Date.now() - ms > MAX_AGE_MS) continue;
    seen.add(s.uid);
    const [name, state] = splitName(s.station?.name);
    stations.push({ id: String(s.uid), name, state, lat: s.lat, lng: s.lon, api, updatedAt: time });
  }

  const latest = stations.map((s) => new Date(s.updatedAt).getTime()).filter(Number.isFinite);
  const updatedAt = latest.length ? new Date(Math.max(...latest)).toISOString() : new Date().toISOString();
  return { updatedAt, stations, source: 'waqi', scale: 'US_AQI' };
}

// "Petaling Jaya, Selangor, Malaysia" -> ["Petaling Jaya", "Selangor"]
function splitName(full = '') {
  const parts = full
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !/^malaysia$/i.test(p));
  if (parts.length === 0) return ['Unknown station', 'Malaysia'];
  if (parts.length === 1) return [parts[0], BARE_NAME_STATES[parts[0]] ?? 'Malaysia'];
  const state = parts[parts.length - 1].replace(/^w\.?\s*p\.?\s+/i, ''); // "W.p. Putrajaya" -> "Putrajaya"
  return [parts.slice(0, -1).join(', '), state];
}

function pollutantName(code) {
  return { pm25: 'PM2.5', pm10: 'PM10', o3: 'O3', no2: 'NO2', so2: 'SO2', co: 'CO' }[code] ?? code ?? '—';
}

// Deterministic pseudo-random in [0, 1) so the same hour gives the same numbers.
function noise(n) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

async function sampleReadings() {
  await new Promise((r) => setTimeout(r, 400));
  const hour = new Date();
  hour.setMinutes(0, 0, 0);
  const hourIdx = Math.floor(hour.getTime() / 3600000);

  const stations = STATIONS.map((s, si) => {
    const trend24h = [];
    for (let k = 23; k >= 0; k--) {
      const h = hourIdx - k;
      const v = s.base + s.swing * Math.sin((h + si * 3) / 6) + (noise(h * 31 + si * 7) - 0.5) * 14;
      trend24h.push(Math.max(8, Math.round(v)));
    }
    const api = trend24h[trend24h.length - 1];
    const pollutant = api > 60 ? 'PM2.5' : noise(si + 1) > 0.5 ? 'PM10' : 'O3';
    return { id: s.id, name: s.name, state: s.state, lat: s.lat, lng: s.lng, api, pollutant, trend24h };
  });

  return { updatedAt: hour.toISOString(), stations, source: 'sample', scale: 'MY_API' };
}
