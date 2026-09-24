import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/Theme';
import { Header } from '@/components/Header';
import { useApp } from '@/context/AppContext';

export default function AboutScreen() {
  const { showToast } = useApp();
  const [advisoryAck, setAdvisoryAck] = useState(false);

  const docLinks = [
    { title: 'User Guide & Field Manual', desc: 'Operational workflows and SOC integration' },
    { title: 'Model Architecture Spec', desc: 'GNN-GRU dual topology forecast docs' },
    { title: 'API & Telemetry Reference', desc: 'Bro/Zeek canonical parquet schema' },
    { title: 'Dataset Format Guide', desc: 'CIC-IDS & CTU-13 benchmark mapping' },
  ];

  return (
    <View style={styles.container}>
      <Header title="About AttackCast" showOfflineBadge={true} />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Product Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="radar" size={28} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.identityTitle}>AttackCast</Text>
              <Text style={styles.identitySubtitle}>Predictive Adversary Simulation Engine</Text>
            </View>
          </View>
          <Text style={styles.identityDesc}>
            Offline-first cybersecurity intelligence engine for forecasting multi-horizon MITRE
            ATT&CK state transitions, identifying coordinated lateral campaigns, and evaluating
            counterfactual mitigations.
          </Text>
        </View>

        {/* 2. Architecture Flowchart (Block Diagram) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="sitemap" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>AttackCast Core Engine Pipeline</Text>
            </View>
          </View>

          <View style={styles.pipelineFlow}>
            {/* Step 1: Ingestion */}
            <View style={styles.pipelineStep}>
              <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>1</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Data Ingestion</Text>
                <Text style={styles.stepSub}>PCAP & Zeek raw logs parsed into Canonical Flows</Text>
              </View>
            </View>

            <View style={styles.flowArrow}><Ionicons name="arrow-down" size={14} color={Colors.primary} /></View>

            {/* Step 2: Feature Extraction */}
            <View style={styles.pipelineStep}>
              <View style={[styles.stepNumBadge, { borderColor: Colors.warning }]}><Text style={[styles.stepNumText, { color: Colors.warning }]}>2</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Feature Extraction & Windowing</Text>
                <Text style={styles.stepSub}>Temporal sliding windows (30s) + fan-out rates</Text>
              </View>
            </View>

            <View style={styles.flowArrow}><Ionicons name="arrow-down" size={14} color={Colors.primary} /></View>

            {/* Step 3: Graph & Dual Topology */}
            <View style={styles.pipelineStep}>
              <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>3</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Host Sequences & Interaction Graph</Text>
                <Text style={styles.stepSub}>Per-Host GRU + GNN Multi-Host message passing</Text>
              </View>
            </View>

            <View style={styles.flowArrow}><Ionicons name="arrow-down" size={14} color={Colors.primary} /></View>

            {/* Step 4: Forecasting & What-If */}
            <View style={styles.pipelineStep}>
              <View style={[styles.stepNumBadge, { borderColor: Colors.danger }]}><Text style={[styles.stepNumText, { color: Colors.danger }]}>4</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>ATT&CK State Forecasting & Replay</Text>
                <Text style={styles.stepSub}>K-step rollout, SHAP attribution, counterfactuals</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Operations & Safety */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="security" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Operations & Safety</Text>
            </View>
          </View>

          <View style={styles.opsGrid}>
            <View style={styles.opsRow}>
              <Text style={styles.opsLabel}>Operation Mode:</Text>
              <Text style={[styles.opsVal, { color: Colors.primary }]}>Offline-First (Air-Gapped)</Text>
            </View>
            <View style={styles.opsRow}>
              <Text style={styles.opsLabel}>Alert Response:</Text>
              <Text style={[styles.opsVal, { color: Colors.warning }]}>Advisory Only (No Auto-Block)</Text>
            </View>
            <View style={styles.opsRow}>
              <Text style={styles.opsLabel}>Model Constraints:</Text>
              <Text style={styles.opsVal}>Calibrated Probability (0–100%)</Text>
            </View>
            <View style={styles.opsRow}>
              <Text style={styles.opsLabel}>Inference Speed:</Text>
              <Text style={styles.opsVal}>Sub-100ms per 30s window</Text>
            </View>
          </View>
        </View>

        {/* 4. Advisory Limitation Banner */}
        <View style={styles.advisoryBanner}>
          <View style={styles.advisoryTop}>
            <Ionicons name="alert-circle" size={16} color={Colors.warning} />
            <Text style={styles.advisoryTitle}>Advisory-Only Limitation Notice</Text>
          </View>
          <Text style={styles.advisoryDesc}>
            Forecasts and simulated mitigations are generated for advisory analyst decision support
            and are not intended for unmonitored automated firewall enforcement.
          </Text>
          <TouchableOpacity
            style={[styles.ackBtn, advisoryAck && styles.ackBtnActive]}
            onPress={() => {
              setAdvisoryAck(!advisoryAck);
              showToast(advisoryAck ? 'Advisory unacknowledged' : 'Advisory acknowledged');
            }}
          >
            <Ionicons
              name={advisoryAck ? 'checkmark-done' : 'checkbox-outline'}
              size={14}
              color={advisoryAck ? Colors.success : Colors.textPrimary}
            />
            <Text style={styles.ackBtnText}>
              {advisoryAck ? 'Advisory Policy Acknowledged' : 'Acknowledge Policy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. Version Information */}
        <View style={styles.versionCard}>
          <View style={styles.verItem}>
            <Text style={styles.verLabel}>Core Engine</Text>
            <Text style={styles.verVal}>v2.1-fictional</Text>
          </View>
          <View style={styles.verItem}>
            <Text style={styles.verLabel}>Model Architecture</Text>
            <Text style={styles.verVal}>v2.1-k (GNN-GRU)</Text>
          </View>
          <View style={styles.verItem}>
            <Text style={styles.verLabel}>UI Version</Text>
            <Text style={styles.verVal}>v2.4 (Mobile & Web)</Text>
          </View>
        </View>

        {/* 6. Documentation Resources */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="book-open-page-variant" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Documentation Resources</Text>
            </View>
          </View>

          <View style={styles.docList}>
            {docLinks.map((doc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.docItem}
                onPress={() => showToast(`Opening documentation: ${doc.title}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={styles.docDesc}>{doc.desc}</Text>
                </View>
                <Ionicons name="open-outline" size={14} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
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
  identityCard: {
    backgroundColor: Colors.panelBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTitle: {
    color: Colors.textWhite,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  identitySubtitle: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  identityDesc: {
    color: Colors.textPrimary,
    fontSize: 11,
    lineHeight: 16,
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

  // Pipeline
  pipelineFlow: {
    gap: 4,
    alignItems: 'center',
  },
  pipelineStep: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#151b28',
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepSub: {
    color: Colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },
  flowArrow: {
    paddingVertical: 1,
  },

  // Operations Grid
  opsGrid: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 6,
    padding: Spacing.sm,
    gap: 6,
  },
  opsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opsLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  opsVal: {
    color: Colors.textWhite,
    fontSize: 10,
    fontWeight: '600',
  },

  // Advisory Banner
  advisoryBanner: {
    backgroundColor: Colors.warningBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    padding: Spacing.md,
    gap: 6,
  },
  advisoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advisoryTitle: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: 'bold',
  },
  advisoryDesc: {
    color: Colors.textPrimary,
    fontSize: 10,
    lineHeight: 14,
  },
  ackBtn: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  ackBtnActive: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  ackBtnText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },

  // Version
  versionCard: {
    flexDirection: 'row',
    gap: 8,
  },
  verItem: {
    flex: 1,
    backgroundColor: Colors.panelBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  verLabel: {
    color: Colors.textSecondary,
    fontSize: 8,
    textAlign: 'center',
  },
  verVal: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Doc links
  docList: {
    gap: 6,
  },
  docItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docTitle: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  docDesc: {
    color: Colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },
});
