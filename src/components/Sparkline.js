import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

const HEIGHT = 96;
const TOP = 8;
const BOTTOM = 78;

export default function Sparkline({ values, color, labels }) {
  const [width, setWidth] = useState(0);
  const yMax = Math.max(200, Math.ceil(Math.max(...values) / 100) * 100);
  const x = (i) => 4 + (i * (width - 12)) / (values.length - 1);
  const y = (v) => BOTTOM - (v / yMax) * (BOTTOM - TOP);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const gridLines = [100, 200, 300, 400].filter((g) => g < yMax);
  const last = values.length - 1;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {gridLines.map((g) => (
            <Line key={g} x1={0} x2={width} y1={y(g)} y2={y(g)} stroke={colors.line} strokeDasharray="3 3" />
          ))}
          {gridLines.map((g) => (
            <SvgText key={`l${g}`} x={width - 2} y={y(g) - 3} fontSize={9} fill={colors.muted} textAnchor="end">
              {g}
            </SvgText>
          ))}
          <Polygon points={`${x(0)},${BOTTOM} ${points} ${x(last)},${BOTTOM}`} fill={color} fillOpacity={0.22} />
          <Polyline points={points} fill="none" stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" />
          <Circle cx={x(last)} cy={y(values[last])} r={4} fill={colors.ink} />
          <SvgText x={4} y={HEIGHT - 4} fontSize={9} fill={colors.muted}>
            {labels.start}
          </SvgText>
          <SvgText x={width - 2} y={HEIGHT - 4} fontSize={9} fill={colors.muted} textAnchor="end">
            {labels.end}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
