import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, TouchableOpacity } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Line,
  Circle,
  Rect,
  Text as SvgText,
  G,
  Polyline,
  Polygon,
} from 'react-native-svg';
import { Colors } from '@/constants/Theme';

const SCREEN_W = Dimensions.get('window').width;

// ─────────────────────────────────────────────────────────────
// 1. ANIMATED AREA FORECAST CHART  – real-time redrawing
// ─────────────────────────────────────────────────────────────
interface TimelinePoint { label: string; prob: number }

export const AreaForecastChart: React.FC<{
  data?: TimelinePoint[];
  height?: number;
  live?: boolean;
}> = ({
  data = [
    { label: 'H1', prob: 23 }, { label: 'H2', prob: 41 },
    { label: 'H3', prob: 62 }, { label: 'H4', prob: 79 }, { label: 'H5', prob: 94 },
  ],
  height = 145,
  live = false,
}) => {
  const [points, setPoints] = useState<TimelinePoint[]>(data);
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Scanning line sweep
  useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: false })
    ).start();
  }, []);

  // Live data injection
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setPoints(prev => {
        const newVal = Math.min(99, Math.max(8, prev[prev.length - 1].prob + (Math.random() * 16 - 5)));
        const next = [...prev.slice(1), { label: `H${Date.now() % 100}`, prob: Math.round(newVal) }];
        return next;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [live]);

  const w = Math.min(SCREEN_W - 48, 400);
  const pL = 34, pR = 12, pT = 20, pB = 26;
  const cW = w - pL - pR;
  const cH = height - pT - pB;

  const gx = (i: number) => pL + (i / (points.length - 1)) * cW;
  const gy = (v: number) => pT + cH - (v / 100) * cH;

  let pathD = `M ${gx(0)} ${gy(points[0].prob)}`;
  for (let i = 1; i < points.length; i++) {
    const cx1 = gx(i - 1) + (gx(i) - gx(i - 1)) * 0.5;
    pathD += ` C ${cx1} ${gy(points[i - 1].prob)}, ${cx1} ${gy(points[i].prob)}, ${gx(i)} ${gy(points[i].prob)}`;
  }
  const fillD = `${pathD} L ${gx(points.length - 1)} ${pT + cH} L ${gx(0)} ${pT + cH} Z`;
  const thresh50Y = gy(50);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="cyFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.65" />
            <Stop offset="70%" stopColor={Colors.primary} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="dangerZone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.danger} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={Colors.danger} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Danger zone above 50% */}
        <Rect x={pL} y={pT} width={cW} height={thresh50Y - pT} fill="url(#dangerZone)" />

        {/* Grid */}
        {[0, 25, 50, 75, 100].map(v => {
          const yp = gy(v);
          return (
            <G key={v}>
              <Line x1={pL} y1={yp} x2={w - pR} y2={yp}
                stroke={v === 50 ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.06)'}
                strokeDasharray={v === 50 ? '4,4' : undefined} strokeWidth={1} />
              <SvgText x={pL - 4} y={yp + 3} fill={Colors.textSecondary} fontSize="8" textAnchor="end">{v}%</SvgText>
            </G>
          );
        })}

        {/* Area fill */}
        <Path d={fillD} fill="url(#cyFill)" />
        {/* Main curve */}
        <Path d={pathD} stroke={Colors.primary} strokeWidth={2.5} fill="none" />

        {/* Data points */}
        {points.map((pt, i) => {
          const cx = gx(i); const cy = gy(pt.prob);
          const isHigh = pt.prob >= 75;
          return (
            <G key={i}>
              {isHigh && <Circle cx={cx} cy={cy} r={10} fill={Colors.danger} fillOpacity={0.15} />}
              <Circle cx={cx} cy={cy} r={4} fill={Colors.background} stroke={isHigh ? Colors.danger : Colors.primary} strokeWidth={2} />
              <SvgText x={cx} y={cy - 9} fill={isHigh ? Colors.danger : Colors.textWhite} fontSize="9" fontWeight="bold" textAnchor="middle">{pt.prob}%</SvgText>
              <SvgText x={cx} y={pT + cH + 15} fill={Colors.textSecondary} fontSize="8" textAnchor="middle">{pt.label}</SvgText>
            </G>
          );
        })}

        {/* Threshold label */}
        <SvgText x={w - pR - 2} y={thresh50Y - 3} fill={Colors.danger} fontSize="8" textAnchor="end">THRESHOLD</SvgText>
      </Svg>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. ANIMATED LIVE NETWORK ATTACK GRAPH
// ─────────────────────────────────────────────────────────────
interface NetworkNode {
  id: string; name: string; x: number; y: number;
  risk: 'critical' | 'high' | 'medium' | 'low';
  ip?: string;
}

export const LiveNetworkGraph: React.FC<{
  selectedHostId?: string;
  onSelectHost?: (id: string) => void;
  height?: number;
  showPacketFlow?: boolean;
}> = ({ selectedHostId, onSelectHost, height = 220, showPacketFlow = true }) => {
  const w = Math.min(SCREEN_W - 48, 400);

  // Pulsing animations per node
  const pulseAnims = useRef([0,1,2,3,4].map(() => new Animated.Value(0))).current;
  const dashOffset = useRef(new Animated.Value(0)).current;
  const packetAnims = useRef([0,1,2].map(() => new Animated.Value(0))).current;

  const targetX = w * 0.72, targetY = height * 0.50;

  const nodes: NetworkNode[] = [
    { id: 'h1', name: 'Host-A1', x: w * 0.17, y: height * 0.14, risk: 'critical', ip: '192.168.10.50' },
    { id: 'h2', name: 'Host-B4', x: w * 0.14, y: height * 0.40, risk: 'high',     ip: '192.168.10.54' },
    { id: 'h3', name: 'Host-C2', x: w * 0.18, y: height * 0.68, risk: 'medium',   ip: '192.168.10.62' },
    { id: 'h4', name: 'Host-D',  x: w * 0.38, y: height * 0.84, risk: 'low',      ip: '192.168.10.70' },
    { id: 'h5', name: 'Host-E1', x: w * 0.47, y: height * 0.20, risk: 'low',      ip: '192.168.10.81' },
  ];

  const riskColor: Record<string, string> = {
    critical: Colors.danger, high: '#ff6b35', medium: Colors.warning, low: Colors.primary,
  };

  // Start pulsing for high-risk nodes
  useEffect(() => {
    nodes.forEach((n, i) => {
      if (n.risk === 'critical' || n.risk === 'high') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[i], { toValue: 1, duration: 900 + i * 120, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.timing(pulseAnims[i], { toValue: 0, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: false }),
          ])
        ).start();
      }
    });

    // Dash marching animation
    Animated.loop(
      Animated.timing(dashOffset, { toValue: 20, duration: 600, easing: Easing.linear, useNativeDriver: false })
    ).start();

    // Packet travel on attack lines
    if (showPacketFlow) {
      packetAnims.forEach((anim, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 700),
            Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
          ])
        ).start();
      });
    }
  }, []);

  const getNodeColor = (n: NetworkNode) => riskColor[n.risk];

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={height}>
        <Defs>
          <RadialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={Colors.warning} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={Colors.warning} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="critGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={Colors.danger} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={Colors.danger} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="attackLine1" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={Colors.danger} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={Colors.danger} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>

        {/* Glow behind target */}
        <Circle cx={targetX} cy={targetY} r={40} fill="url(#targetGlow)" />

        {/* Attack lines from nodes to target */}
        {nodes.map((n, i) => {
          const isAttacker = n.risk === 'critical' || n.risk === 'high';
          const color = getNodeColor(n);
          return (
            <G key={`line-${n.id}`}>
              <Line
                x1={n.x} y1={n.y} x2={targetX} y2={targetY}
                stroke={color}
                strokeWidth={isAttacker ? 2 : 1}
                strokeDasharray={isAttacker ? '6,4' : '2,5'}
                opacity={isAttacker ? 0.75 : 0.3}
              />
              {/* Port badge on line midpoint */}
              <G>
                <Rect
                  x={(n.x + targetX) / 2 - 16} y={(n.y + targetY) / 2 - 7}
                  width={32} height={14} rx={3}
                  fill={Colors.backgroundDark || '#0c0f17'} stroke={color} strokeWidth={0.8}
                />
                <SvgText
                  x={(n.x + targetX) / 2} y={(n.y + targetY) / 2 + 4}
                  fill={color} fontSize="7" fontWeight="bold" textAnchor="middle"
                >
                  {isAttacker ? 'SMB/445' : 'TCP/443'}
                </SvgText>
              </G>
            </G>
          );
        })}

        {/* Target Database Node */}
        <Circle cx={targetX} cy={targetY} r={30} fill="rgba(245,158,11,0.08)" stroke={Colors.warning} strokeWidth={1.5} opacity={0.5} />
        <Circle cx={targetX} cy={targetY} r={20} fill="rgba(245,158,11,0.18)" />
        <Circle cx={targetX} cy={targetY} r={13} fill={Colors.warning} />
        <SvgText x={targetX} y={targetY + 3} fill="#000" fontSize="8" fontWeight="bold" textAnchor="middle">DB</SvgText>
        <SvgText x={targetX} y={targetY + 38} fill={Colors.warning} fontSize="9" fontWeight="bold" textAnchor="middle">DATABASE-TARGET</SvgText>
        <SvgText x={targetX} y={targetY + 49} fill={Colors.textSecondary} fontSize="7" textAnchor="middle">COMPROMISE IMMINENT</SvgText>

        {/* Host Nodes — onPress handled by TouchableOpacity overlay below */}
        {nodes.map((n) => {
          const color = getNodeColor(n);
          const isSelected = selectedHostId === n.id;
          return (
            <G key={n.id}>
              {isSelected && <Circle cx={n.x} cy={n.y} r={18} fill="none" stroke={Colors.primary} strokeWidth={1.5} />}
              <Circle cx={n.x} cy={n.y} r={11} fill={Colors.panelBackground || '#232938'} stroke={color} strokeWidth={2} />
              <SvgText x={n.x} y={n.y + 3} fill={color} fontSize="7" fontWeight="bold" textAnchor="middle">
                {n.risk === 'critical' ? '!!!' : n.risk === 'high' ? '!!' : '○'}
              </SvgText>
              <SvgText x={n.x} y={n.y + 21} fill={isSelected ? Colors.textWhite : color} fontSize="8" fontWeight={isSelected ? 'bold' : 'normal'} textAnchor="middle">{n.name}</SvgText>
              <SvgText x={n.x} y={n.y + 31} fill={Colors.textSecondary} fontSize="7" textAnchor="middle">{n.ip}</SvgText>
            </G>
          );
        })}
      </Svg>

      {/* TouchableOpacity hit areas for each node (cross-platform) */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: w, height }}>
        {nodes.map((n) => (
          <TouchableOpacity
            key={`tap-${n.id}`}
            onPress={() => onSelectHost && onSelectHost(n.id)}
            style={{
              position: 'absolute',
              left: n.x - 18,
              top: n.y - 18,
              width: 36,
              height: 36,
              borderRadius: 18,
            }}
            activeOpacity={0.7}
          />
        ))}
      </View>
      {/* Animated pulse rings — no-touch overlay */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: w, height, pointerEvents: 'none' } as any}>
        {nodes.filter(n => n.risk === 'critical').map((n) => {
          const idx = nodes.indexOf(n);
          const nScale = pulseAnims[idx];
          return (
            <Animated.View
              key={`pulse-${n.id}`}
              style={{
                position: 'absolute',
                left: n.x - 24,
                top: n.y - 24,
                width: 48, height: 48, borderRadius: 24,
                borderWidth: 2, borderColor: Colors.danger,
                opacity: nScale.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: nScale.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }],
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// 3. DUAL FORECAST CHART (What-If)
// ─────────────────────────────────────────────────────────────
export const DualForecastChart: React.FC<{
  data: { k: string; orig: number; cf: number }[];
  height?: number;
}> = ({ data, height = 160 }) => {
  const w = Math.min(SCREEN_W - 48, 400);
  const pL = 32, pR = 12, pT = 22, pB = 24;
  const cW = w - pL - pR, cH = height - pT - pB;
  const gx = (i: number) => pL + (i / (data.length - 1)) * cW;
  const gy = (v: number) => pT + cH - (v / 100) * cH;

  let origD = `M ${gx(0)} ${gy(data[0].orig)}`;
  let cfD   = `M ${gx(0)} ${gy(data[0].cf)}`;
  for (let i = 1; i < data.length; i++) {
    origD += ` L ${gx(i)} ${gy(data[i].orig)}`;
    cfD   += ` L ${gx(i)} ${gy(data[i].cf)}`;
  }
  const origFill = `${origD} L ${gx(data.length-1)} ${pT+cH} L ${gx(0)} ${pT+cH} Z`;
  const cfFill   = `${cfD} L ${gx(data.length-1)} ${pT+cH} L ${gx(0)} ${pT+cH} Z`;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="origG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.warning} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={Colors.warning} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="cfG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, 25, 50, 75, 100].map(v => (
          <Line key={v} x1={pL} y1={gy(v)} x2={w-pR} y2={gy(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        <Path d={origFill} fill="url(#origG)" />
        <Path d={cfFill}   fill="url(#cfG)" />
        <Path d={origD} stroke={Colors.warning} strokeWidth={2} strokeDasharray="5,3" fill="none" />
        <Path d={cfD}   stroke={Colors.primary} strokeWidth={2.5} fill="none" />
        {data.map((d, i) => (
          <G key={i}>
            <Circle cx={gx(i)} cy={gy(d.orig)} r={3.5} fill={Colors.warning} />
            <Circle cx={gx(i)} cy={gy(d.cf)}   r={3.5} fill={Colors.primary} />
            <SvgText x={gx(i)} y={pT+cH+14} fill={Colors.textSecondary} fontSize="8" textAnchor="middle">{d.k}</SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// 4. CAMPAIGN RISK GAUGE (SVG arc)
// ─────────────────────────────────────────────────────────────
export const CampaignRiskGauge: React.FC<{
  score?: number; label?: string; size?: number;
}> = ({ score = 0.85, label = 'CRITICAL', size = 110 }) => {
  const needleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(needleAnim, { toValue: score, useNativeDriver: false, tension: 30, friction: 8 }).start();
  }, [score]);

  const R = size * 0.38, S = size * 0.11, cx = size / 2, cy = size * 0.58;
  const arc = Math.PI * R;
  const prog = arc * score;

  const needleAngle = -180 + score * 180;
  const nRad = (needleAngle * Math.PI) / 180;
  const nLen = R * 0.82;
  const nx = cx + nLen * Math.cos(nRad);
  const ny = cy + nLen * Math.sin(nRad);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size * 0.72}>
        <Defs>
          <LinearGradient id="gaugeG" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%"   stopColor={Colors.primary} />
            <Stop offset="40%"  stopColor={Colors.warning} />
            <Stop offset="100%" stopColor={Colors.danger}  />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
          fill="none" stroke="#1c2230" strokeWidth={S} strokeLinecap="round" />
        {/* Progress */}
        <Path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
          fill="none" stroke="url(#gaugeG)" strokeWidth={S} strokeLinecap="round"
          strokeDasharray={`${prog} ${arc}`} />
        {/* Needle */}
        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke={Colors.textWhite} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={5} fill={Colors.textWhite} />
        {/* Labels */}
        <SvgText x={cx-R+2} y={cy+16} fill={Colors.primary}  fontSize="8">LOW</SvgText>
        <SvgText x={cx+R-2} y={cy+16} fill={Colors.danger}   fontSize="8" textAnchor="end">HIGH</SvgText>
        <SvgText x={cx} y={cy-R*0.3} fill={Colors.textWhite} fontSize="13" fontWeight="bold" textAnchor="middle">{Math.round(score * 100)}%</SvgText>
      </Svg>
      <Text style={{ color: Colors.danger, fontWeight: '900', fontSize: 12, letterSpacing: 2, marginTop: -4 }}>{label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// 5. CONFUSION MATRIX
// ─────────────────────────────────────────────────────────────
export const ConfusionMatrixGrid: React.FC = () => {
  const cells = [
    { label: 'TN', value: '150', color: Colors.success || '#10b981', opacity: 0.8 },
    { label: 'FP', value: '5',   color: Colors.warning, opacity: 0.45 },
    { label: 'FN', value: '12',  color: Colors.danger,  opacity: 0.5 },
    { label: 'TP', value: '120', color: Colors.primary,  opacity: 0.85 },
  ];
  return (
    <View style={cm.grid}>
      {cells.map((c, i) => (
        <View key={i} style={[cm.cell, { backgroundColor: c.color, opacity: c.opacity }]}>
          <Text style={cm.lbl}>{c.label}</Text>
          <Text style={cm.val}>{c.value}</Text>
        </View>
      ))}
    </View>
  );
};
const cm = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 144, gap: 4 },
  cell: { width: 68, height: 44, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  lbl:  { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  val:  { color: '#fff', fontSize: 14, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────
// 6. TRANSITION MATRIX HEATMAP
// ─────────────────────────────────────────────────────────────
export const TransitionMatrixHeatmap: React.FC = () => {
  const data = [
    [0.91, 0.07, 0.01, 0.00, 0.01, 0.00],
    [0.30, 0.48, 0.18, 0.03, 0.01, 0.00],
    [0.05, 0.12, 0.54, 0.24, 0.04, 0.01],
    [0.02, 0.03, 0.08, 0.52, 0.29, 0.05],
    [0.00, 0.01, 0.03, 0.09, 0.61, 0.26],
  ];
  const col = (v: number) => v >= 0.5 ? Colors.primary : v >= 0.2 ? Colors.warning : v >= 0.05 ? '#d97706' : '#1c2230';
  return (
    <View style={{ gap: 3, alignItems: 'center' }}>
      {data.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
          {row.map((v, c) => (
            <View key={c} style={{ width: 24, height: 14, borderRadius: 2, backgroundColor: col(v), opacity: Math.max(0.2, v) }} />
          ))}
        </View>
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// 7. CALIBRATION PLOT
// ─────────────────────────────────────────────────────────────
export const CalibrationPlot: React.FC = () => {
  const pts = [{ x:0,y:0 },{ x:.2,y:.15 },{ x:.4,y:.38 },{ x:.6,y:.62 },{ x:.8,y:.84 },{ x:1,y:1 }];
  const sz = 112, pad = 14, dw = sz - pad*2;
  let line = `M ${pad+pts[0].x*dw} ${sz-pad-pts[0].y*dw}`;
  for (let i=1;i<pts.length;i++) line += ` L ${pad+pts[i].x*dw} ${sz-pad-pts[i].y*dw}`;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={sz} height={sz}>
        <Line x1={pad} y1={sz-pad} x2={sz-pad} y2={pad} stroke={Colors.textSecondary} strokeDasharray="2,2" strokeWidth={1} />
        <Path d={line} stroke={Colors.primary} strokeWidth={2} fill="none" />
        {pts.map((p,i) => <Circle key={i} cx={pad+p.x*dw} cy={sz-pad-p.y*dw} r={2.5} fill={Colors.primary} />)}
      </Svg>
      <Text style={{ color: Colors.textSecondary, fontSize: 9, marginTop: 2 }}>ECE: 0.031 (Excellent)</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// 8. LEAD TIME HISTOGRAM
// ─────────────────────────────────────────────────────────────
export const LeadTimeHistogram: React.FC = () => {
  const bars = [15, 35, 65, 85, 45, 20, 8];
  const max = 85;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 6 }}>
        {bars.map((b, i) => (
          <View key={i} style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ width: 11, height: (b/max)*50, backgroundColor: b > 60 ? Colors.primary : 'rgba(76,215,246,0.45)', borderRadius: 2 }} />
            <Text style={{ color: Colors.textSecondary, fontSize: 7, marginTop: 2 }}>{`k+${i+1}`}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: Colors.textSecondary, fontSize: 9, marginTop: 4 }}>Detection Lead-Time Distribution</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Helper styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  panelBackground: { backgroundColor: Colors.panelBackground || '#232938' },
});

// Expose alias for AppContext panel colors
const panelBackground = '#232938';
const backgroundDark  = '#0c0f17';
