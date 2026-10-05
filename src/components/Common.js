import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export function Card({ title, right, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {(title || right) && (
        <View style={styles.cardHead}>
          {title ? <Text style={styles.cardTitle}>{title}</Text> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function SampleBanner({ text }) {
  return (
    <View style={styles.sample}>
      <Text style={styles.sampleText}>{text}</Text>
    </View>
  );
}

export function ScreenTitle({ title, aside }) {
  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>{title}</Text>
      {aside ? <Text style={styles.aside}>{aside}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  sample: { backgroundColor: colors.sampleBg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  sampleText: { fontSize: 12, color: colors.accent, fontWeight: '500' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  aside: { fontSize: 12, color: colors.muted },
});
