import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

// Drifting fog that gets denser and browner as the air gets worse. Purely decorative.
// "card"   sits inside the coloured reading card (light fog over a strong colour).
// "screen" sits behind everything on the Now tab (darker fog over the pale background).
// "veil"   drifts over everything, cards included; kept faint so text stays readable.
// Keys match band keys in both scales (US AQI and Malaysian API).
const LEVELS = {
  card: {
    good: null,
    moderate: { puffs: 3, opacity: 0.35, color: '#ffffff' },
    usg: { puffs: 5, opacity: 0.45, color: '#f3eee4' },
    unhealthy: { puffs: 7, opacity: 0.55, color: '#e6dccb' },
    veryUnhealthy: { puffs: 9, opacity: 0.6, color: '#d3c6b0' },
    hazardous: { puffs: 12, opacity: 0.7, color: '#b8a990' },
  },
  screen: {
    good: null,
    moderate: { puffs: 4, opacity: 0.18, color: '#cbc2b0' },
    usg: { puffs: 6, opacity: 0.26, color: '#c4b79f' },
    unhealthy: { puffs: 8, opacity: 0.34, color: '#b3a284' },
    veryUnhealthy: { puffs: 10, opacity: 0.4, color: '#9f8c70' },
    hazardous: { puffs: 12, opacity: 0.48, color: '#857259' },
  },
  veil: {
    good: null,
    moderate: null,
    usg: { puffs: 3, opacity: 0.12, color: '#bfb196' },
    unhealthy: { puffs: 4, opacity: 0.16, color: '#ad9c7e' },
    veryUnhealthy: { puffs: 5, opacity: 0.2, color: '#988569' },
    hazardous: { puffs: 6, opacity: 0.25, color: '#7d6a52' },
  },
};

// Background colour of the Now tab: clear sky when the air is good, hazy beige when it's bad.
export const HAZE_SKY = {
  good: '#eef5f8',
  moderate: '#f1f1ec',
  usg: '#eeeae1',
  unhealthy: '#e8e1d4',
  veryUnhealthy: '#e0d6c4',
  hazardous: '#d6c9b2',
};

// Deterministic pseudo-random in [0, 1), so the fog looks the same each time.
function rand(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function HazeLayer({ level, variant = 'card' }) {
  const config = LEVELS[variant][level] ?? null;
  const [box, setBox] = useState(null);
  const reduceMotion = useReduceMotion();

  const puffs = useMemo(() => {
    if (!config) return [];
    return Array.from({ length: config.puffs }, (_, i) => ({
      id: `haze-${variant}-${i}`,
      offset: (i / config.puffs + rand(i + 1) * 0.15) % 1, // spread puffs across the width
      scale: 0.9 + rand(i + 7) * 0.8,
      top: rand(i + 13),
      duration: 24000 + rand(i + 21) * 18000, // 24–42 s to cross
      value: new Animated.Value(0),
    }));
  }, [config, variant]);

  useEffect(() => {
    if (!box || reduceMotion) return;
    const loops = puffs.map((p) =>
      Animated.loop(
        Animated.timing(p.value, { toValue: 1, duration: p.duration, easing: Easing.linear, useNativeDriver: true }),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [puffs, box, reduceMotion]);

  if (!config) return null;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox(e.nativeEvent.layout)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {box &&
        puffs.map((p) => {
          const width = (variant === 'card' ? box.height * 1.6 : box.width) * p.scale;
          const height = width * 0.5;
          return (
            <Puff
              key={p.id}
              puff={p}
              width={width}
              height={height}
              top={p.top * box.height - height / 2}
              travel={box.width}
              color={config.color}
              opacity={config.opacity}
            />
          );
        })}
    </View>
  );
}

function Puff({ puff, width, height, top, travel, color, opacity }) {
  // Position = (time + offset) mod 1, so each puff starts somewhere different and wraps off-screen.
  const progress = useMemo(() => Animated.modulo(Animated.add(puff.value, puff.offset), 1), [puff]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-width, travel] });
  const translateY = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -height * 0.12, 0] });

  return (
    <Animated.View style={[styles.puff, { top, width, height, transform: [{ translateX }, { translateY }] }]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={puff.id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.5} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${puff.id})`} />
      </Svg>
    </Animated.View>
  );
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub?.remove();
  }, []);
  return reduce;
}

const styles = StyleSheet.create({
  puff: { position: 'absolute', left: 0 },
});
