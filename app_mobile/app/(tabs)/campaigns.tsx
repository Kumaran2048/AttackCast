import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { CampaignRiskGauge, LiveNetworkGraph, AreaForecastChart } from '@/components/SvgCharts';

export default function CampaignsScreen() {
  const { hosts, selectedHost, setSelectedHostId, showToast } = useApp();
  const [riskScore, setRiskScore] = useState(0.85);
  const [campaignProb, setCampaignProb] = useState([
    { label: 'H1', prob: 22 }, { label: 'H2', prob: 47 },
    { label: 'H3', prob: 69 }, { label: 'H4', prob: 84 }, { label: 'H5', prob: 96 },
  ]);

  // Animate risk score drift
  useEffect(() => {
    const t = setInterval(() => {
      setRiskScore(prev => Math.min(0.98, Math.max(0.72, prev + (Math.random() * 0.04 - 0.01))));
      setCampaignProb(prev =>
        prev.map(p => ({ ...p, prob: Math.min(99, Math.max(15, p.prob + Math.round(Math.random() * 4 - 1))) }))
      );
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const bannerPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulse, { toValue: 1.015, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(bannerPulse, { toValue: 0.985, duration: 1000, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Coordinated Campaigns" showReplayControls={true} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── CRITICAL COORDINATION BANNER ───────────────── */}
        <Animated.View style={[styles.banner, { transform: [{ scale: bannerPulse }] }]}>
          <View style={styles.bannerAccent} />
          <View style={styles.bannerContent}>
            <View style={styles.bannerRow}>
              <Ionicons name="nuclear-sharp" size={18} color={Colors.danger} />
              <Text style={styles.bannerTitle}>COORDINATED MULTI-HOST ATTACK DETECTED</Text>
            </View>
            <Text style={styles.bannerBody}>
              Five adversary-controlled hosts are executing a synchronised lateral movement and
              data staging operation targeting the internal database cluster. Collective campaign
              risk has breached the 85% critical threshold — automated isolation advisory generated.
            </Text>
            <View style={styles.bannerMeta}>
              <View style={styles.metaChip}><Text style={styles.metaChipText}>TA0008 · TA0011</Text></View>
              <View style={styles.metaChip}><Text style={styles.metaChipText}>5 HOSTS IMPLICATED</Text></View>
              <View style={[styles.metaChip, { borderColor: Colors.danger }]}>
                <Text style={[styles.metaChipText, { color: Colors.danger }]}>CAMPAIGN ALPHA ACTIVE</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── RISK GAUGE + TARGET INFO ────────────────────── */}
        <View style={styles.dualRow}>
          <View style={[styles.card, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.miniCardLabel}>CAMPAIGN RISK GAUGE</Text>
            <CampaignRiskGauge score={riskScore} label="CRITICAL" size={120} />
            <Text style={styles.riskUpdateText}>Live • updates every 2.8s</Text>
          </View>

          <View style={[styles.card, { flex: 1, gap: 8 }]}>
            <Text style={styles.miniCardLabel}>SHARED ATTACK TARGET</Text>
            <View style={styles.targetBox}>
              <MaterialCommunityIcons name="database-alert" size={28} color={Colors.warning} />
              <Text style={styles.targetName}>DATABASE-TARGET</Text>
              <View style={styles.targetPort}>
                <Text style={styles.targetPortText}>Primary: tcp/443</Text>
              </View>
              <View style={[styles.targetPort, { borderColor: Colors.danger }]}>
                <Text style={[styles.targetPortText, { color: Colors.danger }]}>Secondary: smb/445</Text>
              </View>
            </View>
            <View style={styles.targetStatRow}>
              <View style={styles.targetStat}>
                <Text style={styles.targetStatVal}>5</Text>
                <Text style={styles.targetStatLbl}>Source Hosts</Text>
              </View>
              <View style={styles.targetStat}>
                <Text style={[styles.targetStatVal, { color: Colors.danger }]}>1.3 MB/s</Text>
                <Text style={styles.targetStatLbl}>Ingress Rate</Text>
              </View>
              <View style={styles.targetStat}>
                <Text style={[styles.targetStatVal, { color: Colors.warning }]}>412ms</Text>
                <Text style={styles.targetStatLbl}>Beacon Interval</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── ANIMATED NETWORK ATTACK GRAPH ──────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="graph-outline" size={16} color={Colors.primary} />
              <View>
                <Text style={styles.cardTitle}>Multi-Host Campaign Attack Topology</Text>
                <Text style={styles.cardSub}>Real-time network graph · Tap node for forensic host profile</Text>
              </View>
            </View>
            <View style={styles.compromisedBadge}>
              <View style={styles.compromisedDot} />
              <Text style={styles.compromisedText}>COMPROMISED PATH</Text>
            </View>
          </View>

          <LiveNetworkGraph
            selectedHostId={selectedHost.id}
            onSelectHost={id => {
              setSelectedHostId(id);
              const h = hosts.find(x => x.id === id);
              if (h) showToast(`Inspecting ${h.name} — Risk ${Math.round(h.riskScore * 100)}% — ${h.ip}`);
            }}
            height={230}
            showPacketFlow={true}
          />

          {/* Selected host callout */}
          <View style={styles.selectedHostCallout}>
            <View style={[styles.selectedHostAccent, {
              backgroundColor: selectedHost.riskScore > 0.7 ? Colors.danger : Colors.warning,
            }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.selHostName}>{selectedHost.name} — {selectedHost.role}</Text>
              <Text style={styles.selHostDetail}>
                IP: {selectedHost.ip} · Fan-out Ports: {selectedHost.portsCount} · Flows: {selectedHost.flowsCount}
              </Text>
            </View>
            <View style={[styles.selHostRiskBadge, { backgroundColor: selectedHost.riskScore > 0.7 ? Colors.dangerBg : 'rgba(245,158,11,0.12)' }]}>
              <Text style={[styles.selHostRiskText, { color: selectedHost.riskScore > 0.7 ? Colors.danger : Colors.warning }]}>
                {Math.round(selectedHost.riskScore * 100)}% RISK
              </Text>
            </View>
          </View>
        </View>

        {/* ── MEMBER HOST RISK TABLE ──────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="dns" size={16} color={Colors.primary} />
              <View>
                <Text style={styles.cardTitle}>Member Host Risk Comparison Matrix</Text>
                <Text style={styles.cardSub}>Individual Score vs Collective Campaign Score · Δ Attribution</Text>
              </View>
            </View>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.5 }]}>HOST</Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: 'center' }]}>INDIV</Text>
            <Text style={[styles.th, { flex: 0.9, textAlign: 'center' }]}>CAMPAIGN</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>STATUS</Text>
          </View>

          {hosts.map(h => {
            const isS = selectedHost.id === h.id;
            const col = h.riskScore > 0.7 ? Colors.danger : h.riskScore > 0.4 ? Colors.warning : Colors.primary;
            return (
              <TouchableOpacity key={h.id} style={[styles.tableRow, isS && styles.tableRowSelected]}
                onPress={() => setSelectedHostId(h.id)}>
                <View style={{ flex: 1.5 }}>
                  <Text style={[styles.hostCell, { color: col }]}>{h.name}</Text>
                  <Text style={styles.hostCellSub}>{h.ip}</Text>
                </View>
                <Text style={[styles.td, { flex: 0.8, textAlign: 'center', color: col, fontWeight: 'bold' }]}>{h.riskScore.toFixed(2)}</Text>
                <Text style={[styles.td, { flex: 0.9, textAlign: 'center', color: Colors.warning, fontWeight: 'bold' }]}>{h.campaignScore.toFixed(2)}</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={[styles.statusBadge, { backgroundColor: `${col}18` }]}>
                    <Text style={[styles.statusBadgeText, { color: col }]}>{h.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CAMPAIGN PROBABILITY TIMELINE ──────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="trending-up" size={16} color={Colors.primary} />
              <View>
                <Text style={styles.cardTitle}>Campaign Escalation Probability Forecast</Text>
                <Text style={styles.cardSub}>K-Step Multi-Host Coordination Score · Live Recalculation</Text>
              </View>
            </View>
          </View>
          <AreaForecastChart data={campaignProb} live={true} height={140} />
        </View>

        {/* ── PLAIN-LANGUAGE EXPLANATION ─────────────────── */}
        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <MaterialIcons name="psychology" size={16} color={Colors.primary} />
            <Text style={styles.explanationTitle}>AttackCast Plain-Language Threat Explanation</Text>
          </View>
          <Text style={styles.explanationBody}>
            The AttackCast GNN-GRU ensemble model has identified a statistically anomalous pattern of
            coordinated host behaviour. Each host — individually — exhibits borderline-suspicious
            telemetry consistent with routine administrative access. However, when analysed collectively
            through the Host Interaction Graph topology, they exhibit a synchronised fan-out pattern,
            shared beacon intervals (412ms ± 8ms), and a common destination database cluster, forming
            a textbook lateral-movement and data-staging operation.
          </Text>
          <Text style={[styles.explanationBody, { marginTop: 8 }]}>
            The model assigns a <Text style={{ color: Colors.danger, fontWeight: 'bold' }}>96%</Text> probability
            that without intervention, exfiltration will commence within the next 2 detection windows
            (approximately 60 seconds). Isolating Host-A1 and blocking SMB/445 egress is projected to
            reduce campaign risk from 0.85 → 0.25 (counterfactual confidence: 89%).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 32 },

  banner: {
    backgroundColor: '#1a0c0c', borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)', overflow: 'hidden',
  },
  bannerAccent: { height: 3, backgroundColor: Colors.danger },
  bannerContent: { padding: Spacing.md, gap: 8 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle: { color: Colors.danger, fontSize: 12, fontWeight: '900', letterSpacing: 0.5, flex: 1 },
  bannerBody: { color: Colors.textPrimary, fontSize: 11, lineHeight: 16 },
  bannerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    borderWidth: 1, borderColor: Colors.warningBorder, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  metaChipText: { color: Colors.warning, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },

  dualRow: { flexDirection: 'row', gap: Spacing.md },

  card: {
    backgroundColor: Colors.panelBackground, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  cardTitle: { color: Colors.textWhite, fontSize: 12, fontWeight: 'bold' },
  cardSub:   { color: Colors.textSecondary, fontSize: 9, marginTop: 1 },
  miniCardLabel: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },
  riskUpdateText: { color: Colors.textMuted || '#5d6870', fontSize: 8, textAlign: 'center', marginTop: 2 },

  targetBox: { alignItems: 'center', gap: 4 },
  targetName: { color: Colors.textWhite, fontSize: 13, fontWeight: '900', marginTop: 2 },
  targetPort: {
    borderWidth: 1, borderColor: Colors.borderHighlight, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  targetPortText: { color: Colors.primary, fontSize: 10, fontWeight: 'bold' },
  targetStatRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  targetStat: { alignItems: 'center' },
  targetStatVal: { color: Colors.textWhite, fontSize: 13, fontWeight: '900' },
  targetStatLbl: { color: Colors.textSecondary, fontSize: 8, textAlign: 'center' },

  compromisedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.dangerBorder || 'rgba(239,68,68,0.4)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  compromisedDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.danger },
  compromisedText: { color: Colors.danger, fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },

  selectedHostCallout: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.cardBackground, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.border, padding: 8,
  },
  selectedHostAccent: { width: 3, borderRadius: 2, alignSelf: 'stretch', minHeight: 24 },
  selHostName: { color: Colors.textWhite, fontSize: 11, fontWeight: 'bold' },
  selHostDetail: { color: Colors.textSecondary, fontSize: 9, marginTop: 1 },
  selHostRiskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  selHostRiskText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 6 },
  th: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableRowSelected: { backgroundColor: 'rgba(76,215,246,0.07)', borderRadius: 4 },
  hostCell: { fontSize: 11, fontWeight: '700' },
  hostCellSub: { color: Colors.textSecondary, fontSize: 8, marginTop: 1 },
  td: { color: Colors.textSecondary, fontSize: 10 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },

  explanationCard: {
    backgroundColor: 'rgba(76,215,246,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderHighlight, padding: Spacing.md, gap: 6,
  },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  explanationTitle: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },
  explanationBody: { color: Colors.textPrimary, fontSize: 11, lineHeight: 17 },
});
