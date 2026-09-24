import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { DualForecastChart, CampaignRiskGauge } from '@/components/SvgCharts';

export default function WhatIfScreen() {
  const {
    whatIfAction, setWhatIfAction, whatIfTarget, setWhatIfTarget,
    isSimulating, runSimulation, simResults, hosts,
  } = useApp();

  const actions = ['Isolate host', 'Block port', 'Isolate campaign'];
  const targets = hosts.map(h => h.name).concat(['Campaign Alpha']);

  return (
    <View style={styles.container}>
      <Header title="What-If Analysis" showOfflineBadge={true} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Context banner */}
        <View style={styles.contextCard}>
          <MaterialCommunityIcons name="brain" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contextTitle}>Counterfactual Simulation Engine</Text>
            <Text style={styles.contextBody}>
              Select a mitigation action and target node to generate a GNN-backed counterfactual
              forecast. The engine recalculates the K-step ATT&CK state transition trajectory as if
              the specified action had been applied at the current decision epoch.
            </Text>
          </View>
        </View>

        {/* ── ACTION SELECTOR ─────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="tune" size={16} color={Colors.primary} />
            <View>
              <Text style={styles.cardTitle}>Mitigation Action Selector</Text>
              <Text style={styles.cardSub}>Select enforcement action type · No automatic deployment</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>ENFORCEMENT ACTION</Text>
          <View style={styles.chipRow}>
            {actions.map(act => (
              <TouchableOpacity key={act}
                style={[styles.actionChip, whatIfAction === act && styles.actionChipActive]}
                onPress={() => setWhatIfAction(act)}>
                <Text style={[styles.actionChipText, whatIfAction === act && styles.actionChipTextActive]}>{act}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>TARGET NODE / SEGMENT</Text>
          <View style={styles.chipRow}>
            {targets.map(t => (
              <TouchableOpacity key={t}
                style={[styles.targetChip, whatIfTarget === t && styles.targetChipActive]}
                onPress={() => setWhatIfTarget(t)}>
                <Text style={[styles.targetChipText, whatIfTarget === t && styles.targetChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.simBtn, isSimulating && { opacity: 0.7 }]}
            onPress={runSimulation} disabled={isSimulating} activeOpacity={0.8}>
            {isSimulating ? (
              <View style={styles.simRow}>
                <ActivityIndicator size="small" color={Colors.primaryDark || '#003640'} />
                <Text style={styles.simBtnText}>COMPUTING COUNTERFACTUAL TRAJECTORY…</Text>
              </View>
            ) : (
              <View style={styles.simRow}>
                <Ionicons name="play-forward" size={16} color={Colors.primaryDark || '#003640'} />
                <Text style={styles.simBtnText}>RUN COUNTERFACTUAL SIMULATION</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.simNote}>
            Advisory only · No network enforcement controls active
          </Text>
        </View>

        {/* ── FORECAST COMPARISON ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="compare" size={16} color={Colors.primary} />
            <View>
              <Text style={styles.cardTitle}>K-Step Threat Probability Forecast Comparison</Text>
              <Text style={styles.cardSub}>Baseline trajectory vs Counterfactual intervention projection</Text>
            </View>
          </View>
          <View style={styles.dualLegend}>
            <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.warning }]} /><Text style={styles.legendText}>Original (No Action)</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.primary }]} /><Text style={styles.legendText}>Counterfactual ({whatIfAction})</Text></View>
          </View>
          <DualForecastChart data={simResults.cfData} height={165} />
        </View>

        {/* ── RISK IMPACT GAUGES ──────────────────────────── */}
        <View style={styles.dualRow}>
          <View style={[styles.card, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.miniLabel}>RISK BEFORE ACTION</Text>
            <CampaignRiskGauge score={simResults.riskBefore} label="CRITICAL" size={95} />
          </View>
          <View style={[styles.card, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.miniLabel}>RISK AFTER ACTION</Text>
            <CampaignRiskGauge
              score={simResults.riskAfter}
              label={simResults.riskAfter < 0.4 ? 'REDUCED' : 'ELEVATED'}
              size={95}
            />
          </View>
        </View>

        {/* Delta metrics */}
        <View style={styles.deltaRow}>
          <View style={styles.deltaItem}>
            <Text style={styles.deltaLabel}>CAMPAIGN RISK Δ</Text>
            <Text style={[styles.deltaVal, { color: Colors.primary }]}>{simResults.delta1}%</Text>
            <Text style={styles.deltaSub}>Expected Reduction</Text>
          </View>
          <View style={styles.deltaDivider} />
          <View style={styles.deltaItem}>
            <Text style={styles.deltaLabel}>FORECAST CONFIDENCE Δ</Text>
            <Text style={[styles.deltaVal, { color: Colors.success || '#10b981' }]}>+{simResults.delta2}%</Text>
            <Text style={styles.deltaSub}>Calibration Gain</Text>
          </View>
        </View>

        {/* ── AFFECTED HOSTS ──────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="account-tree" size={16} color={Colors.primary} />
            <View>
              <Text style={styles.cardTitle}>Projected Host State Impact (Pre → Post Action)</Text>
              <Text style={styles.cardSub}>Simulated ATT&CK state reduction per affected node</Text>
            </View>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.5 }]}>HOST</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>PRE-STATE</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>POST-STATE</Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Δ RISK</Text>
          </View>

          {hosts.slice(0, 4).map(h => {
            const isTarget = h.name === whatIfTarget;
            return (
              <View key={h.id} style={[styles.tableRow, isTarget && styles.tableRowTarget]}>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.hostCell}>{h.name}</Text>
                  {isTarget && <Text style={styles.targetLabel}>↑ ACTION TARGET</Text>}
                </View>
                <Text style={[styles.td, { flex: 1, textAlign: 'center', color: Colors.danger }]}>Extreme</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'center', color: Colors.primary }]}>Elevated</Text>
                <Text style={[styles.td, { flex: 0.8, textAlign: 'right', color: Colors.primary, fontWeight: 'bold' }]}>−58%</Text>
              </View>
            );
          })}
        </View>

        {/* Advisory */}
        <View style={styles.advisoryCard}>
          <Ionicons name="shield-checkmark" size={15} color={Colors.primary} />
          <Text style={styles.advisoryText}>
            This counterfactual simulation generates advisory-only projections for analyst decision
            support. No network enforcement or host isolation actions are automatically triggered.
            All findings should be reviewed by a senior SOC analyst before operational execution.
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

  contextCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(76,215,246,0.07)', borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderHighlight, padding: Spacing.md,
  },
  contextTitle: { color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  contextBody:  { color: Colors.textSecondary, fontSize: 10, lineHeight: 15 },

  card: {
    backgroundColor: Colors.panelBackground, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle:  { color: Colors.textWhite, fontSize: 12, fontWeight: 'bold' },
  cardSub:    { color: Colors.textSecondary, fontSize: 9, marginTop: 1 },

  inputLabel: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionChip: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderLight || '#3d494c',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(76,215,246,0.14)' },
  actionChipText:   { color: Colors.textSecondary, fontSize: 11 },
  actionChipTextActive: { color: Colors.primary, fontWeight: 'bold' },

  targetChip: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderLight || '#3d494c',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  targetChipActive: { borderColor: Colors.warning, backgroundColor: 'rgba(245,158,11,0.14)' },
  targetChipText:   { color: Colors.textSecondary, fontSize: 11 },
  targetChipTextActive: { color: Colors.warning, fontWeight: 'bold' },

  simBtn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingVertical: 11, alignItems: 'center', marginTop: 6,
  },
  simRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  simBtnText: { color: Colors.primaryDark || '#003640', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  simNote: { color: Colors.textMuted || '#5d6870', fontSize: 9, textAlign: 'center' },

  dualLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendText:  { color: Colors.textSecondary, fontSize: 9 },

  dualRow: { flexDirection: 'row', gap: Spacing.md },
  miniLabel: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textAlign: 'center' },

  deltaRow: {
    backgroundColor: Colors.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: Spacing.md,
  },
  deltaItem: { alignItems: 'center', gap: 2 },
  deltaLabel: { color: Colors.textSecondary, fontSize: 8, fontWeight: '700', letterSpacing: 0.4 },
  deltaVal:   { fontSize: 22, fontWeight: '900' },
  deltaSub:   { color: Colors.textMuted || '#5d6870', fontSize: 8 },
  deltaDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 6 },
  th: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableRowTarget: { backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 4 },
  hostCell:    { color: Colors.textWhite, fontSize: 11, fontWeight: '600' },
  targetLabel: { color: Colors.warning, fontSize: 8, fontWeight: '900' },
  td:          { color: Colors.textSecondary, fontSize: 10 },

  advisoryCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(76,215,246,0.06)', borderRadius: 8,
    borderWidth: 1, borderColor: Colors.borderHighlight, padding: Spacing.sm,
  },
  advisoryText: { color: Colors.textSecondary, fontSize: 10, lineHeight: 14, flex: 1 },
});
