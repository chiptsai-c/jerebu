import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../theme';
import { Card, ScreenTitle } from '../components/Common';

const THRESHOLDS = [101, 151, 201, 301];

export default function AlertsScreen({ settings, updateSettings, stations, t, onToggleFollow, indexLabel }) {
  const followed = settings.followed.map((id) => stations.find((s) => s.id === id)).filter(Boolean);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenTitle title={t.alertsTitle} />

      <Card>
        <ToggleRow
          label={t.alertsOn}
          hint={t.alertsOnHint}
          value={settings.alertsOn}
          onChange={(v) => updateSettings({ alertsOn: v })}
        />
      </Card>

      <View style={[styles.group, !settings.alertsOn && styles.dimmed]} pointerEvents={settings.alertsOn ? 'auto' : 'none'}>
        <Card>
          <Text style={styles.label}>{t.notifyAt(indexLabel)}</Text>
          <View style={styles.thresholds}>
            {THRESHOLDS.map((n) => {
              const on = settings.threshold === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => updateSettings({ threshold: n })}
                  style={[styles.thr, on && styles.thrOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.thrText, on && styles.thrTextOn]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t.once}</Text>
        </Card>

        <Card title={t.places}>
          <ToggleRow
            label={t.currentLoc}
            value={settings.followCurrent}
            onChange={(v) => updateSettings({ followCurrent: v })}
          />
          {followed.map((s) => (
            <View key={s.id} style={styles.followRow}>
              <Text style={styles.label}>{s.name}</Text>
              <Pressable onPress={() => onToggleFollow(s.id)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.remove}>{t.remove}</Text>
              </Pressable>
            </View>
          ))}
          <Text style={styles.hint}>{t.followHint}</Text>
        </Card>
      </View>

      <Card>
        <ToggleRow
          label={t.sensitive}
          hint={t.sensitiveHint}
          value={settings.sensitive}
          onChange={(v) => updateSettings({ sensitive: v })}
        />
      </Card>

      <Card title={t.language}>
        <View style={styles.seg}>
          {[
            ['en', 'English'],
            ['bm', 'Bahasa Melayu'],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => updateSettings({ lang: key })}
              style={[styles.segItem, settings.lang === key && styles.segOn]}
            >
              <Text style={[styles.segText, settings.lang === key && styles.segTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function ToggleRow({ label, hint, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  group: { gap: 12 },
  dimmed: { opacity: 0.45 },
  label: { fontSize: 15, color: colors.ink, fontWeight: '500' },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  followRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  remove: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  thresholds: { flexDirection: 'row', gap: 8 },
  thr: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  thrOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  thrText: { fontSize: 15, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  thrTextOn: { color: '#ffffff' },
  seg: { flexDirection: 'row', backgroundColor: '#e6e9e8', borderRadius: 10, padding: 3 },
  segItem: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: colors.card },
  segText: { fontSize: 13, color: colors.muted },
  segTextOn: { color: colors.ink, fontWeight: '600' },
});
