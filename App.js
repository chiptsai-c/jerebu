import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { fetchReadings, fetchStationDetail } from './src/data/api';
import { SCALES, bandFor, isStale } from './src/data/bands';
import { HAZE_SKY } from './src/components/HazeLayer';
import { nearestStation } from './src/data/geo';
import { loadCache, loadSettings, saveCache, saveSettings } from './src/storage';
import { placesOverThreshold } from './src/alerts';
import { syncPushAlerts } from './src/push';
import { strings } from './src/i18n';
import { colors } from './src/theme';
import TabBar from './src/components/TabBar';
import NowScreen from './src/screens/NowScreen';
import StationsScreen from './src/screens/StationsScreen';
import AlertsScreen from './src/screens/AlertsScreen';

// Used when location is off and no station is picked.
const KUALA_LUMPUR = { lat: 3.139, lng: 101.687 };

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [tab, setTab] = useState('now');
  const [settings, setSettings] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locStatus, setLocStatus] = useState('pending');

  // Show saved settings and the last cached reading straight away, then refresh.
  useEffect(() => {
    Promise.all([loadSettings(), loadCache()]).then(([s, cached]) => {
      setSettings(s);
      if (cached) setData((d) => d ?? cached);
    });
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchReadings();
      setData(fresh);
      setError(null);
      saveCache(fresh);
    } catch (e) {
      setError(e.message || 'network error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const locate = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocStatus('denied');
        return;
      }
      setLocStatus('granted');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocStatus('denied');
    }
  }, []);

  useEffect(() => {
    refresh();
    locate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh, locate]);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleFollow = useCallback((id) => {
    setSettings((prev) => {
      const followed = prev.followed.includes(id) ? prev.followed.filter((x) => x !== id) : [...prev.followed, id];
      const next = { ...prev, followed };
      saveSettings(next);
      return next;
    });
  }, []);

  const stations = data?.stations ?? [];
  const nearest = useMemo(
    () => (coords && stations.length ? nearestStation(stations, coords) : null),
    [coords, stations],
  );

  const chosen = useMemo(() => {
    if (!settings) return null;
    if (settings.pinnedId) {
      const pinned = stations.find((s) => s.id === settings.pinnedId);
      if (pinned) return { station: pinned, source: 'pinned' };
    }
    if (nearest) return { station: nearest.station, distanceKm: nearest.km, source: 'gps' };
    const fallback = stations.length ? nearestStation(stations, KUALA_LUMPUR).station : null;
    return fallback ? { station: fallback, source: 'default' } : null;
  }, [settings, stations, nearest]);

  // Live data: fetch pollutant and forecast for the station on the Now tab.
  const [detail, setDetail] = useState(null);
  const chosenId = chosen?.station.id;
  useEffect(() => {
    if (!chosenId || data?.source !== 'waqi') return;
    let cancelled = false;
    fetchStationDetail(chosenId)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chosenId, data?.source, data?.updatedAt]);

  const current = useMemo(() => {
    if (!chosen) return null;
    if (detail?.id !== chosen.station.id) return chosen;
    // Keep the list's name and state; take the fresher reading, pollutant and forecast from the detail.
    const { name, state, ...fresh } = detail;
    return { ...chosen, station: { ...chosen.station, ...fresh } };
  }, [chosen, detail]);

  const t = strings[settings?.lang ?? 'en'];
  const scale = data?.scale ?? 'MY_API';

  const overThreshold = useMemo(
    () => (settings ? placesOverThreshold({ stations, settings, nearestId: nearest?.station.id }) : []),
    [stations, settings, nearest],
  );

  // Keep the alerts server in step with the Alerts settings and the nearest station.
  const [pushStatus, setPushStatus] = useState({ state: 'idle' });
  const isLive = data?.source === 'waqi';
  const nearestId = nearest?.station.id;
  useEffect(() => {
    if (!settings) return;
    let cancelled = false;
    syncPushAlerts({ settings, nearestId, isLive })
      .then((state) => !cancelled && setPushStatus({ state }))
      .catch((e) => !cancelled && setPushStatus({ state: 'error', message: e.message }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings?.alertsOn,
    settings?.threshold,
    settings?.lang,
    settings?.followCurrent,
    settings?.followed.join(','),
    nearestId,
    isLive,
  ]);

  // Tapping a haze alert opens that station on the Now tab.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef(null);
  useEffect(() => {
    const request = lastResponse?.notification.request;
    const stationId = request?.content.data?.stationId;
    if (!settings || !stationId || handledResponse.current === request.identifier) return;
    handledResponse.current = request.identifier;
    updateSettings({ pinnedId: String(stationId) });
    setTab('now');
  }, [lastResponse, settings, updateSettings]);

  if (!settings) return <View style={styles.root} />;

  const pickStation = (id) => {
    updateSettings({ pinnedId: id });
    setTab('now');
  };

  const backToLocation = () => {
    updateSettings({ pinnedId: null });
    locate();
  };

  return (
    <View
      style={[
        styles.root,
        tab === 'now' &&
          current &&
          !isStale(current.station.updatedAt ?? data.updatedAt) && {
            // Match the Now tab's hazy sky behind the status bar.
            backgroundColor: HAZE_SKY[bandFor(current.station.api, scale).key],
          },
      ]}
    >
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        {tab === 'now' && (
          <NowScreen
            current={current}
            data={data}
            t={t}
            settings={settings}
            refreshing={refreshing}
            onRefresh={refresh}
            onUseLocation={backToLocation}
            overThreshold={overThreshold}
            onPick={pickStation}
            locStatus={locStatus}
            error={error}
          />
        )}
        {tab === 'stations' && (
          <StationsScreen
            stations={stations}
            t={t}
            settings={settings}
            onPick={pickStation}
            onToggleFollow={toggleFollow}
            refreshing={refreshing}
            onRefresh={refresh}
            isSample={(data?.source ?? 'sample') === 'sample'}
            scale={scale}
          />
        )}
        {tab === 'alerts' && (
          <AlertsScreen
            settings={settings}
            updateSettings={updateSettings}
            stations={stations}
            t={t}
            onToggleFollow={toggleFollow}
            indexLabel={SCALES[scale].label[settings.lang]}
            pushStatus={pushStatus}
          />
        )}
      </SafeAreaView>
      <TabBar tab={tab} onChange={setTab} labels={t.tabs} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
});
