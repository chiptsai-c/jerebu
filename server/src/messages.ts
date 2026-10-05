// US AQI bands (same as SCALES.US_AQI in the app) and alert wording in English and BM.
const BANDS = [
  { max: 50, en: 'Good', bm: 'Baik' },
  { max: 100, en: 'Moderate', bm: 'Sederhana' },
  { max: 150, en: 'Unhealthy for Sensitive Groups', bm: 'Tidak Sihat bagi Kumpulan Sensitif' },
  { max: 200, en: 'Unhealthy', bm: 'Tidak Sihat' },
  { max: 300, en: 'Very Unhealthy', bm: 'Sangat Tidak Sihat' },
  { max: Infinity, en: 'Hazardous', bm: 'Berbahaya' },
];

export type Lang = 'en' | 'bm';

export function alertText(lang: Lang, kind: 'above' | 'cleared', name: string, api: number) {
  const band = BANDS.find((b) => api <= b.max)![lang];
  if (lang === 'bm') {
    return kind === 'above'
      ? { title: `Amaran jerebu: ${name}`, body: `AQI AS kini ${api} (${band}). Buka Jerebu untuk nasihat.` }
      : { title: `${name}: jerebu berkurangan`, body: `AQI AS turun ke ${api} (${band}).` };
  }
  return kind === 'above'
    ? { title: `Haze alert: ${name}`, body: `US AQI is ${api} (${band}). Open Jerebu for advice.` }
    : { title: `${name}: haze easing`, body: `US AQI is back down to ${api} (${band}).` };
}
