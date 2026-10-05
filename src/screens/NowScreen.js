import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SCALES, bandFor, isStale, trendOf } from '../data/bands';
import { bandName, formatTime } from '../i18n';
import { colors, radius } from '../theme';
import BandScale from '../components/BandScale';
import Sparkline from '../components/Sparkline';
import Forecast from '../components/Forecast';
import HazeLayer, { HAZE_SKY } from '../components/HazeLayer';
import { Card, SampleBanner } from '../components/Common';

const TREND_CHIP = {
  rising: { bg: '#fdecec', fg: '#a11d22' },
  falling: { bg: '#e6f4ea', fg: '#1d6b35' },
  steady: { bg: '#eceff0', fg: '#4b565c' },
};

export default function NowScreen({
  current,
  data,
  t,
  settings,
  refreshing,
  onRefresh,
  onUseLocation,
  locStatus,
  error,
  overThreshold,
  onPick,
}) {
  const refresher = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />;

  if (!current) {
    return (
      <ScrollView contentContainerStyle={styles.center} refreshControl={refresher}>
        {error ? <Text style={styles.muted}>{t.loadError(error)}</Text> : <ActivityIndicator color={colors.accent} />}
        {!error && <Text style={styles.muted}>{t.loading}</Text>}
      </ScrollView>
    );
  }

  const { station, source, distanceKm } = current;
  const lang = settings.lang;
  const scale = data.scale ?? 'MY_API';
  const isSample = (data.source ?? 'sample') === 'sample';
  const updatedAt = station.updatedAt ?? data.updatedAt;
  const band = bandFor(station.api, scale);
  const stale = isStale(updatedAt);
  const fg = stale ? colors.ink : band.text;
  const advice = t.advice[band.key][settings.sensitive ? 'sensitive' : 'general'];
  const otherName = lang === 'bm' ? band.en : band.bm;
  const indexLabel = SCALES[scale].label[lang];
  const subtitle =
    source === 'gps' ? t.nearest(distanceKm.toFixed(1)) : source === 'pinned' ? t.chosen : t.defaultStation;

  return (
    <View style={[styles.fill, !stale && { backgroundColor: HAZE_SKY[band.key] }]}>
      {!stale && <HazeLayer level={band.key} variant="screen" />}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refresher}>
        <SampleBanner text={isSample ? t.sample : t.liveSource} />
        {error && <Text style={styles.error}>{t.loadError(error)}</Text>}

        {overThreshold.length > 0 && (
          <View style={styles.warn}>
            <Text style={styles.warnTitle}>{t.overTitle(indexLabel, settings.threshold)}</Text>
            {overThreshold.map((s) => {
              const b = bandFor(s.api, scale);
              return (
                <Pressable key={s.id} onPress={() => onPick(s.id)} style={styles.warnRow} accessibilityRole="button">
                  <Text style={[styles.warnNum, { backgroundColor: b.color, color: b.text }]}>{s.api}</Text>
                  <Text style={styles.warnName}>{s.name}</Text>
                  <Text style={styles.small}>{bandName(b, lang)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.locRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{station.name}</Text>
            <Text style={styles.muted}>
              {subtitle} · {station.state}
            </Text>
          </View>
          <Text style={styles.small}>{t.updated(formatTime(updatedAt))}</Text>
        </View>

        <View
          style={[styles.hero, { backgroundColor: stale ? colors.stale : band.color }]}
          accessible
          accessibilityLabel={`${indexLabel} ${station.api}, ${bandName(band, lang)}`}
        >
          {!stale && <HazeLayer level={band.key} />}
          <Text style={[styles.heroLabel, { color: fg }]}>
            {indexLabel}
            {station.pollutant ? ` · ${t.primary(station.pollutant)}` : ''}
          </Text>
          <Text style={[styles.big, { color: fg }]}>{station.api}</Text>
          <Text style={[styles.bandName, { color: fg }]}>{bandName(band, lang)}</Text>
          <Text style={[styles.otherName, { color: fg }]}>{otherName}</Text>
          <BandScale value={station.api} scale={scale} />
          {stale && <Text style={[styles.staleText, { color: fg }]}>{t.stale}</Text>}
        </View>

        <Card title={t.whatToDo}>
          {advice.map((line) => (
            <View key={line} style={styles.adviceRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.adviceText}>{line}</Text>
            </View>
          ))}
        </Card>

        {station.trend24h ? (
          <TrendCard station={station} band={band} t={t} />
        ) : station.forecast ? (
          <Card title={t.forecastTitle}>
            <Forecast days={station.forecast} scale={scale} t={t} />
          </Card>
        ) : null}

        {source !== 'gps' && (
          <Pressable onPress={onUseLocation} style={styles.linkBtn} accessibilityRole="button">
            <Text style={styles.link}>{t.useLocation}</Text>
          </Pressable>
        )}
        {locStatus === 'denied' && source !== 'pinned' && <Text style={styles.small}>{t.locDenied}</Text>}
      </ScrollView>
      {!stale && <HazeLayer level={band.key} variant="veil" />}
    </View>
  );
}

function TrendCard({ station, band, t }) {
  const trend = trendOf(station.trend24h);
  return (
    <Card
      title={t.last24}
      right={
        <Text style={[styles.chip, { backgroundColor: TREND_CHIP[trend].bg, color: TREND_CHIP[trend].fg }]}>
          {t.trend[trend]}
        </Text>
      }
    >
      <Sparkline values={station.trend24h} color={band.color} labels={{ start: t.ago24, end: t.now }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  locRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  muted: { fontSize: 13, color: colors.muted, textAlign: 'left' },
  small: { fontSize: 12, color: colors.muted },
  error: { fontSize: 13, color: '#a11d22' },
  fill: { flex: 1 },
  hero: { borderRadius: radius.hero, padding: 20, gap: 2, overflow: 'hidden' },
  heroLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 },
  big: { fontSize: 88, fontWeight: '800', letterSpacing: -3, lineHeight: 96, fontVariant: ['tabular-nums'] },
  bandName: { fontSize: 22, fontWeight: '700' },
  otherName: { fontSize: 13, opacity: 0.8 },
  staleText: { marginTop: 8, fontSize: 12, fontWeight: '600' },
  adviceRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  adviceText: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
  chip: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  warn: { backgroundColor: '#fff4e5', borderColor: '#f0c48a', borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  warnTitle: { fontSize: 13, fontWeight: '700', color: '#7a3d00' },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  warnNum: {
    width: 44,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  warnName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  linkBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  link: { fontSize: 15, color: colors.accent, fontWeight: '600' },
});
