import { StyleSheet, Text, View } from 'react-native';
import { bandFor } from '../data/bands';
import { colors } from '../theme';

// WAQI daily PM2.5 forecast (values already on the US AQI scale). Shows today onward, up to 5 days.
export default function Forecast({ days, scale, t }) {
  const today = localDay(new Date());
  const upcoming = days.filter((d) => d.day >= today).slice(0, 5);
  if (upcoming.length === 0) return <Text style={styles.empty}>{t.noForecast}</Text>;

  return (
    <View style={styles.row}>
      {upcoming.map((d) => {
        const b = bandFor(d.max, scale);
        const weekday = d.day === today ? t.today : t.weekdays[new Date(`${d.day}T12:00:00`).getDay()];
        return (
          <View key={d.day} style={styles.day}>
            <Text style={styles.label}>{weekday}</Text>
            <Text style={[styles.num, { backgroundColor: b.color, color: b.text }]}>{d.max}</Text>
            <Text style={styles.range}>
              {d.min}–{d.max}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function localDay(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  num: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 6,
    borderRadius: 9,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  range: { fontSize: 10, color: colors.muted, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: colors.muted },
});
