import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { AreaForecastChart } from '@/components/SvgCharts';

const { width: SW } = Dimensions.get('window');

// ── Animated pulsing severity badge ──────────────────────────
function SeverityBadge({ level }: { level: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'NOMINAL' }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const bg = level === 'CRITICAL' ? Colors.danger
           : level === 'HIGH'     ? '#ff6b35'
           : level === 'ELEVATED' ? Colors.warning
           : Colors.primary;

  useEffect(() => {
    if (level === 'NOMINAL') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.92, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [level]);

  return (
    <Animated.View style={[styles.severityBadge, { backgroundColor: `${bg}22`, borderColor: bg, transform: [{ scale: pulse }] }]}>
      <View style={[styles.severityDot, { backgroundColor: bg }]} />
      <Text style={[styles.severityText, { color: bg }]}>{level}</Text>
    </Animated.View>
  );
}

// ── Scrolling ticker ──────────────────────────────────────────
const TICKER_ITEMS = [
  'ATT&CK TA0008 · Lateral Movement · Confidence 94%',
  'HOST-A1 · 48 Fan-out Ports · Anomalous Beacon Rhythm Detected',
  'CAMPAIGN ALPHA · 5 Member Hosts · Coordinated Ingress Confirmed',
  'PCAP PIPELINE · 24,900 Canonical Flows Processed · Stage 3/3',
  'SHAP FEATURE ALERT · Transmit Volume 300 KB/min Exceeds Baseline x4.2',
  'ATT&CK TA0011 · Command & Control · Sub-500ms Beacon Interval',
];

function LiveTicker() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const fullText = TICKER_ITEMS.join('   ///   ');
  const estimatedWidth = fullText.length * 6.5;

  useEffect(() => {
    scrollX.setValue(SW);
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -estimatedWidth,
        duration: estimatedWidth * 22,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={styles.tickerContainer}>
      <View style={styles.tickerLabel}>
        <View style={styles.tickerLabelDot} />
        <Text style={styles.tickerLabelText}>LIVE</Text>
      </View>
      <View style={styles.tickerOverflow}>
        <Animated.Text
          style={[styles.tickerText, { transform: [{ translateX: scrollX }] }]}
          numberOfLines={1}
        >
          {fullText}
        </Animated.Text>
      </View>
    </View>
  );
}

// ── Real-time Flow Feed ───────────────────────────────────────
interface FlowEvent {
  id: string; src: string; dst: string; dport: number;
  proto: string; bytes: number; rationale: string;
  severity: 'CRITICAL' | 'HIGH' | 'ELEVATED';
  ts: string;
}

const FLOW_POOL: Omit<FlowEvent, 'id' | 'ts'>[] = [
  { src: '192.168.10.50', dst: '172.16.0.4',  dport: 445,  proto: 'SMBv2', bytes: 84200,   rationale: 'SMBv2 TreeConnect to domain controller — lateral movement indicator. Fan-out exceeds 48 unique destination ports within 300-second window.', severity: 'CRITICAL' },
  { src: '192.168.10.50', dst: '172.16.0.12', dport: 3389, proto: 'RDP',   bytes: 14200,   rationale: 'RDP credential probe sequence — 12 failed auth attempts followed by persistent session establishment. Beacon rhythm sub-500ms confirms C2 staging.', severity: 'CRITICAL' },
  { src: '192.168.10.54', dst: '10.0.0.12',   dport: 443,  proto: 'TCP',   bytes: 1345980, rationale: 'Encrypted exfiltration pipeline to external host. Volume 1.3 MB/min exceeds baseline by 4.2σ. TLS fingerprint matches known Cobalt Strike listener.', severity: 'HIGH' },
  { src: '192.168.10.62', dst: '172.16.255.1',dport: 53,   proto: 'DNS',   bytes: 2100,    rationale: 'DNS tunneling signature detected — unusually long TXT record queries, average 312-byte payloads. Entropy analysis confirms binary exfiltration channel.', severity: 'ELEVATED' },
  { src: '192.168.10.50', dst: '10.0.0.45',   dport: 5985, proto: 'WinRM', bytes: 22000,   rationale: 'WinRM lateral execution attempt. PowerShell remoting session initiated from anomalous host context. LSASS memory access pattern observed on destination.', severity: 'HIGH' },
];

export default function LiveMonitorScreen() {
  const {
    alertDismissed, alertConfirmed, confirmAlert, dismissAlert,
    hosts, selectedHost, setSelectedHostId, shapFeatures, flaggedFlows,
    isPlaying, windowNum,
  } = useApp();

  const [liveFlows, setLiveFlows] = useState<FlowEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState([
    { label: 'H1', prob: 18 }, { label: 'H2', prob: 35 },
    { label: 'H3', prob: 52 }, { label: 'H4', prob: 74 }, { label: 'H5', prob: 91 },
  ]);
  const [alertPulse] = useState(new Animated.Value(1));
  const flowIdCounter = useRef(0);

  // Alert glow pulse
  useEffect(() => {
    if (alertConfirmed || alertDismissed) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(alertPulse, { toValue: 1.03, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(alertPulse, { toValue: 0.98, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [alertConfirmed, alertDismissed]);

  // Inject synthetic real-time flow events
  useEffect(() => {
    const addFlow = () => {
      const template = FLOW_POOL[Math.floor(Math.random() * FLOW_POOL.length)];
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const id = `flow-${flowIdCounter.current++}`;
      const event: FlowEvent = { ...template, id, ts };
      setLiveFlows(prev => [event, ...prev].slice(0, 8));
    };
    addFlow();
    const t = setInterval(addFlow, 3200);
    return () => clearInterval(t);
  }, []);

  // Update probability timeline live
  useEffect(() => {
    const t = setInterval(() => {
      setTimelineData(prev => {
        const last = prev[prev.length - 1].prob;
        const delta = Math.random() * 10 - 3;
        const newVal = Math.min(99, Math.max(10, last + delta));
        return prev.map((p, i) =>
          i === prev.length - 1 ? { ...p, prob: Math.round(newVal) }
          : { ...p, prob: Math.min(99, Math.max(5, p.prob + Math.round(Math.random() * 4 - 1))) }
        );
      });
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const severityColor = (s: string) =>
    s === 'CRITICAL' ? Colors.danger : s === 'HIGH' ? '#ff6b35' : Colors.warning;

  return (
    <View style={styles.container}>
      <Header title="Live Monitor" showReplayControls={true} />
      <LiveTicker />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── LIVE ALERT ─────────────────────────────────────── */}
        {!alertDismissed && (
          <Animated.View style={[styles.alertCard, alertConfirmed && styles.alertCardAck, { transform: [{ scale: alertPulse }] }]}>
            <View style={styles.alertTopBar} />
            <View style={styles.alertHeader}>
              <View style={styles.alertHeaderLeft}>
                <Ionicons name={alertConfirmed ? 'shield-checkmark' : 'warning'} size={18}
                  color={alertConfirmed ? Colors.success || '#10b981' : Colors.warning} />
                <Text style={[styles.alertTitle, { color: alertConfirmed ? Colors.success || '#10b981' : Colors.warning }]}>
                  {alertConfirmed ? 'INCIDENT RESPONSE ACTIVATED' : 'ACTIVE THREAT INTELLIGENCE ALERT'}
                </Text>
              </View>
              {!alertConfirmed && <SeverityBadge level="CRITICAL" />}
            </View>

            <Text style={styles.alertBody}>
              {alertConfirmed
                ? 'Threat acknowledged. Isolation workflows dispatched to SOAR platform. Host-A1 quarantine sequence initiated. Analyst escalation ticket #IR-2847 created.'
                : `AttackCast forecasts an 91% probability of MITRE ATT\u0026CK TA0008 (Lateral Movement) transition within the next 2 detection windows (~60 seconds). Host-A1 (192.168.10.50) exhibits coordinated fan-out behaviour across 48 destination ports — consistent with credential harvesting and pre-exfiltration staging.`
              }
            </Text>

            {!alertConfirmed && (
              <View style={styles.alertMeta}>
                <Text style={styles.alertMetaItem}>🔴 Tactics: TA0008, TA0011</Text>
                <Text style={styles.alertMetaItem}>⏱  Lead Time: 60s</Text>
                <Text style={styles.alertMetaItem}>📊 Confidence: 91%</Text>
              </View>
            )}

            {!alertConfirmed && (
              <View style={styles.alertActions}>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmAlert} activeOpacity={0.8}>
                  <Ionicons name="shield" size={14} color={Colors.primaryDark || '#003640'} />
                  <Text style={styles.confirmBtnText}>CONFIRM & DISPATCH</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={dismissAlert} activeOpacity={0.8}>
                  <Text style={styles.dismissBtnText}>DISMISS AS FALSE POSITIVE</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── PROBABILITY TIMELINE ──────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="chart-bell-curve" size={16} color={Colors.primary} />
              <View>
                <Text style={styles.cardTitle}>Multi-Horizon Threat Probability Forecast</Text>
                <Text style={styles.cardSub}>ATT&CK State Transition — K-Step Rollout · GRU/GNN Ensemble</Text>
              </View>
            </View>
            <View style={styles.liveIndicator}>
              <Animated.View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <AreaForecastChart data={timelineData} live={true} height={145} />
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: Colors.danger }]} />
              <Text style={styles.legendLbl}>Above Threshold (&gt;50%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendLbl}>Calibrated Forecast</Text>
            </View>
          </View>
        </View>

        {/* ── INVOLVED HOST STATUS ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="security" size={16} color={Colors.danger} />
              <View>
                <Text style={styles.cardTitle}>Threat-Actor Host Profile</Text>
                <Text style={styles.cardSub}>Network Segment · Campaign Epoch 14 Active</Text>
              </View>
            </View>
          </View>

          {/* Selected host profile */}
          <View style={styles.hostProfileCard}>
            <View style={styles.hostProfileLeft}>
              <Text style={styles.hostName}>{selectedHost.name}</Text>
              <Text style={styles.hostIp}>{selectedHost.ip}</Text>
              <Text style={styles.hostRole}>{selectedHost.role}</Text>
            </View>
            <View style={styles.hostProfileRight}>
              <SeverityBadge level={selectedHost.riskScore > 0.7 ? 'CRITICAL' : selectedHost.riskScore > 0.4 ? 'HIGH' : 'NOMINAL' as any} />
              <Text style={styles.hostRiskVal}>{Math.round(selectedHost.riskScore * 100)}%</Text>
              <Text style={styles.hostRiskLbl}>RISK INDEX</Text>
            </View>
          </View>

          {/* Host chips */}
          <Text style={styles.sectionLabel}>ACTIVE CAMPAIGN HOSTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {hosts.map(h => {
              const isS = selectedHost.id === h.id;
              const col = h.riskScore > 0.7 ? Colors.danger : h.riskScore > 0.4 ? Colors.warning : Colors.primary;
              return (
                <TouchableOpacity key={h.id} style={[styles.hostChip, isS && { borderColor: col, backgroundColor: `${col}18` }]}
                  onPress={() => setSelectedHostId(h.id)}>
                  <View style={[styles.hostChipDot, { backgroundColor: col }]} />
                  <Text style={[styles.hostChipName, isS && { color: Colors.textWhite }]}>{h.name}</Text>
                  <Text style={[styles.hostChipRisk, { color: col }]}>{Math.round(h.riskScore * 100)}%</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── SHAP FEATURE ATTRIBUTION ─────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="insights" size={16} color={Colors.warning} />
              <View>
                <Text style={styles.cardTitle}>SHAP Feature Attribution Analysis</Text>
                <Text style={styles.cardSub}>Ranked Model Drivers — Positive Contribution Threshold ≥ 0.30</Text>
              </View>
            </View>
          </View>

          {shapFeatures.map((f, i) => (
            <View key={f.name} style={styles.shapRow}>
              <View style={styles.shapLabelRow}>
                <Text style={styles.shapRank}>#{i + 1}</Text>
                <Text style={styles.shapName}>{f.name}</Text>
                <Text style={styles.shapVal}>{f.value}</Text>
                <Text style={[styles.shapScore, { color: f.direction === 'positive' ? Colors.warning : Colors.primary }]}>
                  {f.direction === 'positive' ? '+' : '−'}{(f.shap).toFixed(2)}
                </Text>
              </View>
              <View style={styles.shapTrack}>
                <Animated.View style={[
                  styles.shapFill,
                  {
                    width: `${Math.round(f.shap * 100)}%`,
                    backgroundColor: f.direction === 'positive' ? Colors.warning : Colors.primary,
                  }
                ]} />
              </View>
            </View>
          ))}

          {/* Attention heatmap */}
          <View style={styles.heatmapSection}>
            <Text style={styles.sectionLabel}>TEMPORAL ATTENTION HEATMAP — LAST 10 WINDOWS</Text>
            <View style={styles.heatGrid}>
              {[0.08,0.14,0.31,0.65,0.88,0.92,0.75,0.48,0.22,0.11].map((v, i) => (
                <View key={i} style={{ flex: 1, borderRadius: 2, height: 14,
                  backgroundColor: v > 0.7 ? Colors.danger : v > 0.4 ? Colors.warning : Colors.primary,
                  opacity: Math.max(0.15, v) }} />
              ))}
            </View>
            <View style={styles.heatLegend}>
              <Text style={styles.heatLegendText}>Window T−10 (oldest)</Text>
              <Text style={styles.heatLegendText}>Window T−0 (current)</Text>
            </View>
          </View>
        </View>

        {/* ── REAL-TIME FLAGGED FLOW STREAM ───────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="flag-triangle" size={16} color={Colors.danger} />
              <View>
                <Text style={styles.cardTitle}>Real-Time Suspicious Flow Stream</Text>
                <Text style={styles.cardSub}>Adversarial Network Activity · Auto-refreshing every 3.2s</Text>
              </View>
            </View>
            <View style={styles.flowCountBadge}>
              <Text style={styles.flowCountText}>{liveFlows.length} FLAGGED</Text>
            </View>
          </View>

          {liveFlows.map((flow, idx) => {
            const isExp = expandedId === flow.id;
            const col = severityColor(flow.severity);
            return (
              <TouchableOpacity key={flow.id} style={[styles.flowItem, idx === 0 && styles.flowItemNew]}
                onPress={() => setExpandedId(isExp ? null : flow.id)} activeOpacity={0.8}>
                <View style={[styles.flowBar, { backgroundColor: col }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.flowTop}>
                    <Text style={styles.flowSrc}>{flow.src}</Text>
                    <Ionicons name="arrow-forward" size={10} color={col} />
                    <Text style={[styles.flowDst, { color: col }]}>{flow.dst}:{flow.dport}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.flowProto, { backgroundColor: `${col}20`, color: col }]}>{flow.proto}</Text>
                  </View>
                  <View style={styles.flowMeta}>
                    <Text style={styles.flowBytes}>{(flow.bytes / 1024).toFixed(1)} KB</Text>
                    <Text style={styles.flowSep}>·</Text>
                    <Text style={styles.flowTime}>{flow.ts}</Text>
                    <Text style={styles.flowSep}>·</Text>
                    <Text style={[styles.flowSev, { color: col }]}>{flow.severity}</Text>
                  </View>
                  {isExp && (
                    <View style={styles.flowExpanded}>
                      <Text style={styles.flowExpandedTitle}>FORENSIC RATIONALE</Text>
                      <Text style={styles.flowRationale}>{flow.rationale}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  scroll:      { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 32 },

  // Severity badge
  severityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1,
  },
  severityDot:  { width: 6, height: 6, borderRadius: 3 },
  severityText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

  // Ticker
  tickerContainer: {
    flexDirection: 'row', alignItems: 'center', height: 28,
    backgroundColor: '#0a0e18', borderBottomWidth: 1, borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  tickerLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, backgroundColor: Colors.danger, height: '100%',
  },
  tickerLabelDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  tickerLabelText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  tickerOverflow: { flex: 1, overflow: 'hidden' },
  tickerText: { color: Colors.textSecondary, fontSize: 10, paddingLeft: 8, lineHeight: 28 },

  // Alert card
  alertCard: {
    backgroundColor: Colors.warningBg, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.warningBorder,
    overflow: 'hidden', gap: Spacing.sm, padding: Spacing.md,
  },
  alertCardAck: {
    backgroundColor: '#0a1f15', borderColor: '#10b981',
  },
  alertTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: Colors.danger,
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  alertHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  alertTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  alertBody: { color: Colors.textPrimary, fontSize: 11, lineHeight: 17 },
  alertMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alertMetaItem: { color: Colors.textSecondary, fontSize: 10 },
  alertActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 7, paddingVertical: 10,
  },
  confirmBtnText: { color: Colors.primaryDark || '#003640', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  dismissBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.borderLight || '#3d494c',
    borderRadius: 7, paddingVertical: 10, alignItems: 'center',
  },
  dismissBtnText: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },

  // Live indicator
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.danger },
  liveText: { color: Colors.danger, fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // Card
  card: {
    backgroundColor: Colors.panelBackground, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  cardTitle: { color: Colors.textWhite, fontSize: 12, fontWeight: 'bold' },
  cardSub:   { color: Colors.textSecondary, fontSize: 9, marginTop: 2 },

  // Chart legend
  chartLegend: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendLbl:   { color: Colors.textSecondary, fontSize: 9 },

  // Host profile
  hostProfileCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 10,
  },
  hostProfileLeft:  { gap: 2 },
  hostProfileRight: { alignItems: 'center', gap: 2 },
  hostName: { color: Colors.textWhite, fontSize: 14, fontWeight: '900' },
  hostIp:   { color: Colors.primary, fontSize: 10 },
  hostRole: { color: Colors.textSecondary, fontSize: 9 },
  hostRiskVal: { color: Colors.danger, fontSize: 18, fontWeight: '900', marginTop: 4 },
  hostRiskLbl: { color: Colors.textSecondary, fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },

  sectionLabel: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },

  // Host chips
  hostChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.cardBackground, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
  },
  hostChipDot:  { width: 5, height: 5, borderRadius: 3 },
  hostChipName: { color: Colors.textSecondary, fontSize: 10 },
  hostChipRisk: { fontSize: 10, fontWeight: 'bold' },

  // SHAP
  shapRow: { gap: 4 },
  shapLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shapRank: { color: Colors.textMuted || '#5d6870', fontSize: 9, fontWeight: 'bold', width: 18 },
  shapName: { color: Colors.textPrimary, fontSize: 10, fontWeight: '600', flex: 1 },
  shapVal:  { color: Colors.textSecondary, fontSize: 9 },
  shapScore: { fontSize: 10, fontWeight: '900', minWidth: 36, textAlign: 'right' },
  shapTrack: { height: 6, backgroundColor: Colors.cardBackground, borderRadius: 3, overflow: 'hidden' },
  shapFill:  { height: '100%', borderRadius: 3 },

  // Heatmap
  heatmapSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 6 },
  heatGrid: { flexDirection: 'row', gap: 4, height: 14 },
  heatLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  heatLegendText: { color: Colors.textMuted || '#5d6870', fontSize: 8 },

  // Flow stream
  flowCountBadge: {
    backgroundColor: Colors.dangerBg, borderRadius: 6, borderWidth: 1,
    borderColor: Colors.dangerBorder || 'rgba(239,68,68,0.4)',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  flowCountText: { color: Colors.danger, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },

  flowItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.cardBackground, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.border, padding: 8,
  },
  flowItemNew: { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: '#1a0e0e' },
  flowBar: { width: 3, borderRadius: 2, alignSelf: 'stretch', minHeight: 28 },
  flowTop: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  flowSrc:   { color: Colors.textWhite, fontSize: 10, fontWeight: '600' },
  flowDst:   { fontSize: 10, fontWeight: 'bold' },
  flowProto: { fontSize: 8, fontWeight: 'bold', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  flowMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  flowBytes: { color: Colors.textSecondary, fontSize: 9 },
  flowSep:   { color: Colors.textMuted || '#5d6870', fontSize: 9 },
  flowTime:  { color: Colors.textSecondary, fontSize: 9 },
  flowSev:   { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  flowExpanded: {
    marginTop: 8, backgroundColor: '#0a0e18', borderRadius: 4,
    padding: 8, borderLeftWidth: 2, borderLeftColor: Colors.danger,
  },
  flowExpandedTitle: { color: Colors.danger, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  flowRationale: { color: Colors.textPrimary, fontSize: 10, lineHeight: 15 },
});
