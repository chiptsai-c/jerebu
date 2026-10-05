import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { bandFor } from '../data/bands';
import { bandName } from '../i18n';
import { colors, radius } from '../theme';
import { SampleBanner, ScreenTitle } from '../components/Common';

export default function StationsScreen({
  stations,
  t,
  settings,
  onPick,
  onToggleFollow,
  refreshing,
  onRefresh,
  isSample,
  scale,
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('worst');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = stations.filter((s) => !q || s.name.toLowerCase().includes(q) || s.state.toLowerCase().includes(q));
    if (mode === 'worst') return [...list].sort((a, b) => b.api - a.api).map((s) => ({ type: 'station', s }));

    const sorted = [...list].sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
    const out = [];
    let lastState = null;
    for (const s of sorted) {
      if (s.state !== lastState) out.push({ type: 'header', state: s.state });
      out.push({ type: 'station', s });
      lastState = s.state;
    }
    return out;
  }, [stations, query, mode]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenTitle title={t.tabs.stations} aside={t.stationCount(stations.length)} />
      <SampleBanner text={isSample ? t.sample : t.liveSource} />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.search}
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <View style={styles.seg}>
        {[
          ['worst', t.worst],
          ['state', t.byState],
        ].map(([key, label]) => (
          <Pressable key={key} onPress={() => setMode(key)} style={[styles.segItem, mode === key && styles.segOn]}>
            <Text style={[styles.segText, mode === key && styles.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {rows.length === 0 && <Text style={[styles.small, { padding: 14 }]}>{t.noMatch}</Text>}
        {rows.map((row, i) =>
          row.type === 'header' ? (
            <Text key={`h-${row.state}`} style={[styles.header, i === 0 && { borderTopWidth: 0 }]}>
              {row.state}
            </Text>
          ) : (
            <StationRow
              key={row.s.id}
              s={row.s}
              lang={settings.lang}
              scale={scale}
              followed={settings.followed.includes(row.s.id)}
              onPick={onPick}
              onToggleFollow={onToggleFollow}
              t={t}
              first={i === 0}
            />
          ),
        )}
      </View>

      <Text style={styles.small}>{isSample ? t.sourceSample : t.sourceLive}</Text>
    </ScrollView>
  );
}

function StationRow({ s, lang, scale, followed, onPick, onToggleFollow, t, first }) {
  const band = bandFor(s.api, scale);
  return (
    <View style={[styles.row, first && { borderTopWidth: 0 }]}>
      <Pressable onPress={() => onPick(s.id)} style={styles.rowMain} accessibilityRole="button">
        <Text style={[styles.num, { backgroundColor: band.color, color: band.text }]}>{s.api}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{s.name}</Text>
          <Text style={styles.small}>
            {s.state} · {bandName(band, lang)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onToggleFollow(s.id)}
        hitSlop={10}
        style={styles.star}
        accessibilityRole="button"
        accessibilityLabel={`${followed ? t.unfollow : t.follow} ${s.name}`}
      >
        <Text style={[styles.starText, followed && { color: colors.accent }]}>{followed ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  search: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.ink,
  },
  seg: { flexDirection: 'row', backgroundColor: '#e6e9e8', borderRadius: 10, padding: 3 },
  segItem: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: colors.card },
  segText: { fontSize: 13, color: colors.muted },
  segTextOn: { color: colors.ink, fontWeight: '600' },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  header: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
    backgroundColor: '#f7f8f8',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 14 },
  num: {
    width: 50,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    paddingVertical: 7,
    borderRadius: 10,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  small: { fontSize: 12, color: colors.muted },
  star: { paddingHorizontal: 16, paddingVertical: 10 },
  starText: { fontSize: 22, color: colors.muted },
});
