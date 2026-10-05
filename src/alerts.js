// Followed places at or above the user's alert level, worst first.
// Shown as a warning card on the Now tab (no push notifications).
export function placesOverThreshold({ stations, settings, nearestId }) {
  if (!settings.alertsOn) return [];
  const ids = new Set(settings.followed);
  if (settings.followCurrent && nearestId) ids.add(nearestId);
  return stations.filter((s) => ids.has(s.id) && s.api >= settings.threshold).sort((a, b) => b.api - a.api);
}
