import { StyleSheet, View } from 'react-native';
import { SCALES } from '../data/bands';

// The index scale drawn 0–500, with a marker at the current reading.
const SCALE_MAX = 500;

export default function BandScale({ value, scale }) {
  const pos = Math.min(value, SCALE_MAX) / SCALE_MAX;
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {SCALES[scale].bands.map((b) => {
          const span = Math.min(b.max, SCALE_MAX) - (b.min === 0 ? 0 : b.min - 1);
          return <View key={b.key} style={{ flex: span, backgroundColor: b.color }} />;
        })}
      </View>
      <View style={[styles.pin, { left: `${pos * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, height: 18, justifyContent: 'center' },
  track: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  pin: {
    position: 'absolute',
    width: 5,
    height: 18,
    marginLeft: -2.5,
    borderRadius: 3,
    backgroundColor: '#172026',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
});
