import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const TABS = ['now', 'stations', 'alerts'];

export default function TabBar({ tab, onChange, labels }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((key) => {
        const on = key === tab;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.mark, on && styles.markOn]} />
            <Text style={[styles.label, on && styles.labelOn]}>{labels[key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 4 },
  mark: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.line },
  markOn: { backgroundColor: colors.accent },
  label: { fontSize: 12, color: colors.muted },
  labelOn: { color: colors.ink, fontWeight: '600' },
});
