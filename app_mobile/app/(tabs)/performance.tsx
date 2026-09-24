import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/Theme';
import { Header } from '@/components/Header';
import {
  ConfusionMatrixGrid,
  CalibrationPlot,
  LeadTimeHistogram,
  AreaForecastChart,
} from '@/components/SvgCharts';

export default function PerformanceScreen() {
  const metrics = [
    { label: 'Accuracy', value: '0.95', color: Colors.primary },
    { label: 'Min-rough', value: '0.67', color: Colors.warning },
    { label: 'Precision', value: '0.95', color: Colors.primary },
    { label: 'With-loss', value: '0.39', color: Colors.danger },
    { label: 'F1-Score', value: '0.91', color: Colors.success },
    { label: 'Vulnerability', value: '1.25', color: Colors.warning },
  ];

  const baselines = [
    { model: 'Majority Class', f1: '0.31', prec: '0.12', rec: '0.88', highlight: false },
    { model: 'Markov Chain', f1: '0.52', prec: '0.45', rec: '0.62', highlight: false },
    { model: 'Logistic Regression', f1: '0.68', prec: '0.71', rec: '0.65', highlight: false },
    { model: 'World Model (AttackCast)', f1: '0.89', prec: '0.87', rec: '0.91', highlight: true },
  ];

  return (
    <View style={styles.container}>
      <Header title="Model Performance" showOfflineBadge={true} />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>Dataset: Synthetic Benchmark</Text>
          </View>
          <View style={[styles.tagBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Text style={[styles.tagText, { color: Colors.success }]}>Offline Validated</Text>
          </View>
        </View>

        {/* 1. Metric Cards Grid (6 metrics) */}
        <View style={styles.metricsGrid}>
          {metrics.map(m => (
            <View key={m.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* 2. Model Baseline Comparison Table */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="table-headers-eye" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Baseline Model Comparison</Text>
            </View>
            <Text style={styles.sampleCount}>Sample: 4.5M</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Model</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>F1</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Prec</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Rec</Text>
            </View>

            {baselines.map((b, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  b.highlight && styles.tableRowHighlight,
                ]}
              >
                <Text
                  style={[
                    styles.modelName,
                    b.highlight && { color: Colors.primary, fontWeight: 'bold' },
                  ]}
                >
                  {b.model}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { flex: 1, textAlign: 'center' },
                    b.highlight && { color: Colors.primary, fontWeight: 'bold' },
                  ]}
                >
                  {b.f1}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { flex: 1, textAlign: 'center' },
                    b.highlight && { color: Colors.primary, fontWeight: 'bold' },
                  ]}
                >
                  {b.prec}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { flex: 1, textAlign: 'right' },
                    b.highlight && { color: Colors.primary, fontWeight: 'bold' },
                  ]}
                >
                  {b.rec}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. Confusion Matrix & Calibration Reliability (Side by Side) */}
        <View style={styles.dualCardRow}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.miniCardTitle}>Confusion Matrix</Text>
            <ConfusionMatrixGrid />
          </View>

          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.miniCardTitle}>Calibration Plot</Text>
            <CalibrationPlot />
          </View>
        </View>

        {/* 4. Lead-Time Distribution */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="bar-chart" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Lead-Time Distribution (Horizons 1–5)</Text>
            </View>
          </View>
          <LeadTimeHistogram />
        </View>

        {/* 5. Feedback: Before and After False Alarms Sparkline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="wave" size={16} color={Colors.warning} />
              <Text style={styles.cardTitle}>Feedback: Retrained False Alarms</Text>
            </View>
            <Text style={styles.sampleCount}>-74% False Positive Rate</Text>
          </View>
          <AreaForecastChart
            data={[
              { label: 'Iter 0', prob: 88 },
              { label: 'Iter 1', prob: 54 },
              { label: 'Iter 2', prob: 32 },
              { label: 'Iter 3', prob: 21 },
              { label: 'Iter 4', prob: 14 },
            ]}
            height={100}
          />
        </View>

        {/* 6. Honest Performance Limitations Callout */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle" size={16} color={Colors.warning} />
            <Text style={styles.warningTitle}>Performance Limitations & Boundary Conditions</Text>
          </View>
          <Text style={styles.warningText}>
            Fictional benchmark metrics used in validation profiles. Predictions represent
            probabilistic horizons and assume calibrated feature extraction. Unseen zero-day protocol
            tunnels may degrade lead-time guarantees.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 32,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '31%',
    backgroundColor: Colors.panelBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
  },

  card: {
    backgroundColor: Colors.panelBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sampleCount: {
    color: Colors.textSecondary,
    fontSize: 9,
  },
  miniCardTitle: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },

  dualCardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  // Table
  table: {
    gap: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
  },
  th: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tableRowHighlight: {
    backgroundColor: 'rgba(76, 215, 246, 0.1)',
    borderRadius: 4,
  },
  modelName: {
    flex: 2,
    color: Colors.textPrimary,
    fontSize: 10,
  },
  td: {
    color: Colors.textSecondary,
    fontSize: 10,
  },

  warningCard: {
    backgroundColor: Colors.warningBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    padding: Spacing.sm,
    gap: 4,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningTitle: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: 'bold',
  },
  warningText: {
    color: Colors.textPrimary,
    fontSize: 10,
    lineHeight: 14,
  },
});
