import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/Theme';
import { Header } from '@/components/Header';
import { TransitionMatrixHeatmap } from '@/components/SvgCharts';

export default function StatesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'natural' | 'synthetic'>('all');

  const attackStates = [
    { id: 'TA0001', name: 'Initial Access', tactic: 'Panic/Ingress', confidence: 92, type: 'natural', flows: 480 },
    { id: 'TA0002', name: 'Execution', tactic: 'Foothold', confidence: 88, type: 'natural', flows: 230 },
    { id: 'TA0003', name: 'Persistence', tactic: 'Interactive Cron', confidence: 75, type: 'synthetic', flows: 140 },
    { id: 'TA0004', name: 'Privilege Escalation', tactic: 'Kernel Probe', confidence: 82, type: 'natural', flows: 95 },
    { id: 'TA0008', name: 'Lateral Movement', tactic: 'SMB/RDP Scan', confidence: 94, type: 'natural', flows: 620 },
    { id: 'TA0011', name: 'Command & Control', tactic: 'Beacon Pulse', confidence: 86, type: 'synthetic', flows: 1840 },
    { id: 'TA0010', name: 'Exfiltration', tactic: 'Disrupted S3 Pipe', confidence: 79, type: 'natural', flows: 110 },
  ];

  const filteredStates = attackStates.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tactic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === 'all' || s.type === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <View style={styles.container}>
      <Header title="Data and States" showOfflineBadge={true} />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Dataset Inventory Cards */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="inventory-2" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Dataset Inventory</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Ready</Text>
            </View>
          </View>

          <View style={styles.inventoryGrid}>
            <View style={styles.invCard}>
              <Text style={styles.invTitle}>CorePCAP</Text>
              <Text style={styles.invSize}>25.1 GB</Text>
              <Text style={styles.invSub}>Updated 2h ago</Text>
            </View>
            <View style={styles.invCard}>
              <Text style={styles.invTitle}>Host Logs</Text>
              <Text style={styles.invSize}>8.0 GB</Text>
              <Text style={styles.invSub}>Updated 6h ago</Text>
            </View>
            <View style={styles.invCard}>
              <Text style={styles.invTitle}>CIC-IDS-2018</Text>
              <Text style={styles.invSize}>52.0 TB</Text>
              <Text style={styles.invSub}>Parquet Format</Text>
            </View>
          </View>
        </View>

        {/* 2. Search & Filter Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ATT&CK state, tactic, or ID..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filters */}
        <View style={styles.filterRow}>
          {(['all', 'natural', 'synthetic'] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                selectedCategory === cat && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. ATT&CK State List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="shield-lock" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>MITRE ATT&CK State List</Text>
            </View>
            <Text style={styles.countText}>{filteredStates.length} Tactics</Text>
          </View>

          <View style={styles.statesList}>
            {filteredStates.map(state => (
              <View key={state.id} style={styles.stateItem}>
                <View style={styles.stateTopRow}>
                  <View style={styles.stateIdBadge}>
                    <Text style={styles.stateIdText}>{state.id}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.stateNameText}>{state.name}</Text>
                    <Text style={styles.stateTacticSub}>{state.tactic}</Text>
                  </View>
                  <View style={styles.stateTypeBadge}>
                    <Text
                      style={[
                        styles.stateTypeText,
                        { color: state.type === 'natural' ? Colors.primary : Colors.warning },
                      ]}
                    >
                      {state.type}
                    </Text>
                  </View>
                </View>

                <View style={styles.stateMetaRow}>
                  <View style={styles.confidenceBarWrap}>
                    <Text style={styles.confLabel}>Confidence:</Text>
                    <View style={styles.confTrack}>
                      <View
                        style={[
                          styles.confFill,
                          {
                            width: `${state.confidence}%`,
                            backgroundColor:
                              state.confidence > 85 ? Colors.primary : Colors.warning,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.confValText}>{`${state.confidence}%`}</Text>
                  </View>
                  <Text style={styles.flowCountText}>{`${state.flows} flows`}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Transition Matrix Heatmap */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="grid" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Transition Matrix Heatmap</Text>
            </View>
          </View>
          <TransitionMatrixHeatmap />
        </View>

        {/* 5. Performance Limitations */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="information-circle" size={16} color={Colors.warning} />
            <Text style={styles.warningTitle}>State Taxonomy Guidance</Text>
          </View>
          <Text style={styles.warningText}>
            Transition matrices are calibrated against combined CIC-IDS and CTU-13 benchmark
            corpuses. Natural flows are tagged via heuristic Zeek parsers; synthetic flows are generated
            via replay sandbox injections.
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
  statusPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    color: Colors.success,
    fontSize: 9,
    fontWeight: 'bold',
  },
  countText: {
    color: Colors.textSecondary,
    fontSize: 9,
  },

  // Inventory Grid
  inventoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  invCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 8,
    gap: 2,
  },
  invTitle: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  invSize: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '900',
  },
  invSub: {
    color: Colors.textSecondary,
    fontSize: 8,
  },

  // Search
  searchBarContainer: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textWhite,
    fontSize: 12,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },

  // States List
  statesList: {
    gap: 8,
  },
  stateItem: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: Spacing.sm,
    gap: 6,
  },
  stateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateIdBadge: {
    backgroundColor: '#151b28',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stateIdText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  stateNameText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: 'bold',
  },
  stateTacticSub: {
    color: Colors.textSecondary,
    fontSize: 9,
  },
  stateTypeBadge: {
    backgroundColor: '#151b28',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stateTypeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  stateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 4,
  },
  confidenceBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  confLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
  },
  confTrack: {
    width: 60,
    height: 4,
    backgroundColor: '#151b28',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confFill: {
    height: '100%',
    borderRadius: 2,
  },
  confValText: {
    color: Colors.textWhite,
    fontSize: 9,
    fontWeight: 'bold',
  },
  flowCountText: {
    color: Colors.textSecondary,
    fontSize: 9,
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
