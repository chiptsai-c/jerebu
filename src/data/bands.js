// Two index scales. The app shows whichever one its data source uses and never mixes them.
// MY_API: Malaysian Air Pollutant Index (API / IPU), official DOE colours.
// US_AQI: US EPA Air Quality Index, used by the World Air Quality Index Project.
export const SCALES = {
  MY_API: {
    label: { en: 'API', bm: 'IPU' },
    bands: [
      { key: 'good', min: 0, max: 50, color: '#1f6fd6', text: '#ffffff', en: 'Good', bm: 'Baik' },
      { key: 'moderate', min: 51, max: 100, color: '#2c9a4c', text: '#ffffff', en: 'Moderate', bm: 'Sederhana' },
      { key: 'unhealthy', min: 101, max: 200, color: '#efc100', text: '#2a2100', en: 'Unhealthy', bm: 'Tidak Sihat' },
      { key: 'veryUnhealthy', min: 201, max: 300, color: '#f0861a', text: '#2a1500', en: 'Very Unhealthy', bm: 'Sangat Tidak Sihat' },
      { key: 'hazardous', min: 301, max: Infinity, color: '#d1262b', text: '#ffffff', en: 'Hazardous', bm: 'Berbahaya' },
    ],
  },
  US_AQI: {
    label: { en: 'US AQI', bm: 'AQI AS' },
    bands: [
      { key: 'good', min: 0, max: 50, color: '#009966', text: '#ffffff', en: 'Good', bm: 'Baik' },
      { key: 'moderate', min: 51, max: 100, color: '#ffde33', text: '#2a2100', en: 'Moderate', bm: 'Sederhana' },
      { key: 'usg', min: 101, max: 150, color: '#ff9933', text: '#2a1500', en: 'Unhealthy for Sensitive Groups', bm: 'Tidak Sihat bagi Kumpulan Sensitif' },
      { key: 'unhealthy', min: 151, max: 200, color: '#cc0033', text: '#ffffff', en: 'Unhealthy', bm: 'Tidak Sihat' },
      { key: 'veryUnhealthy', min: 201, max: 300, color: '#660099', text: '#ffffff', en: 'Very Unhealthy', bm: 'Sangat Tidak Sihat' },
      { key: 'hazardous', min: 301, max: Infinity, color: '#7e0023', text: '#ffffff', en: 'Hazardous', bm: 'Berbahaya' },
    ],
  },
};

export function bandFor(value, scale = 'MY_API') {
  return SCALES[scale].bands.find((b) => value <= b.max);
}

export function trendOf(series) {
  if (!series || series.length < 4) return 'steady';
  const diff = series[series.length - 1] - series[series.length - 4];
  if (diff >= 10) return 'rising';
  if (diff <= -10) return 'falling';
  return 'steady';
}

const STALE_MS = 3 * 60 * 60 * 1000;

export function isStale(updatedAt) {
  return Date.now() - new Date(updatedAt).getTime() > STALE_MS;
}
