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
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';

export default function PcapUploadScreen() {
  const router = useRouter();
  const { pcapFiles, addMockPcap, launchPcapReplay, showToast } = useApp();
  const [scenarioName, setScenarioName] = useState('Malware_Campaign_v3');
  const [selectedPcapId, setSelectedPcapId] = useState(pcapFiles[0]?.id || 'pcap-1');

  const selectedPcap = pcapFiles.find(f => f.id === selectedPcapId) || pcapFiles[0];

  const canonicalFlows = [
    { id: '101', src: '192.168.1.5', dst: '10.0.0.12', sport: 4444, dport: 80, proto: 'TCP', pkts: 67, bytes: '1,345,980' },
    { id: '102', src: '192.168.1.5', dst: '10.0.0.12', sport: 4444, dport: 80, proto: 'TCP', pkts: 13, bytes: '1,345,980' },
    { id: '103', src: '192.168.1.18', dst: '10.0.0.12', sport: 5122, dport: 443, proto: 'TCP', pkts: 45, bytes: '820,400' },
    { id: '104', src: '192.168.1.25', dst: '172.16.0.4', sport: 3912, dport: 445, proto: 'SMB', pkts: 128, bytes: '2,910,200' },
  ];

  const handleLaunch = () => {
    launchPcapReplay(selectedPcap.id);
    router.push('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Header title="PCAP Upload & Ingestion" showOfflineBadge={true} />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Drag & Drop Upload Zone */}
        <TouchableOpacity
          style={styles.dropZone}
          onPress={() => addMockPcap(`network_trace_${Math.floor(Math.random() * 900 + 100)}.pcap`)}
          activeOpacity={0.8}
        >
          <View style={styles.dropIconBox}>
            <MaterialCommunityIcons name="file-upload-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.dropTitle}>Drag & Drop PCAP Capture</Text>
          <Text style={styles.dropSub}>or tap to browse local files (Offline Sandbox)</Text>
        </TouchableOpacity>

        {/* 2. Upload Queue & Multi-Stage Processing */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="queue" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Upload Queue & Processing Stages</Text>
            </View>
            <Text style={styles.fileCountText}>{pcapFiles.length} PCAPs</Text>
          </View>

          <View style={styles.pcapList}>
            {pcapFiles.map(file => {
              const isSelected = file.id === selectedPcap.id;
              return (
                <TouchableOpacity
                  key={file.id}
                  style={[styles.pcapItem, isSelected && styles.pcapItemSelected]}
                  onPress={() => setSelectedPcapId(file.id)}
                >
                  <View style={styles.pcapMainRow}>
                    <View style={styles.pcapIconWrap}>
                      <MaterialCommunityIcons name="file-document-outline" size={16} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pcapFileName}>{file.name}</Text>
                      <Text style={styles.pcapMetaSub}>
                        {file.size} • {file.timeSpan}
                      </Text>
                    </View>
                    <View style={styles.pcapStatusPill}>
                      <Text style={styles.pcapStatusText}>{file.status}</Text>
                    </View>
                  </View>

                  {/* Multi-step progress bars */}
                  <View style={styles.progressRow}>
                    <View style={styles.stageBlock}>
                      <Text style={styles.stageLabel}>Parsing (100%)</Text>
                      <View style={styles.stageTrack}>
                        <View style={[styles.stageFill, { width: '100%', backgroundColor: Colors.primary }]} />
                      </View>
                    </View>
                    <View style={styles.stageBlock}>
                      <Text style={styles.stageLabel}>Normalization (100%)</Text>
                      <View style={styles.stageTrack}>
                        <View style={[styles.stageFill, { width: '100%', backgroundColor: Colors.primary }]} />
                      </View>
                    </View>
                    <View style={styles.stageBlock}>
                      <Text style={styles.stageLabel}>Features (75%)</Text>
                      <View style={styles.stageTrack}>
                        <View style={[styles.stageFill, { width: '75%', backgroundColor: Colors.warning }]} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Metadata Summary Grid */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="information" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Metadata Summary ({selectedPcap.name})</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Hosts</Text>
              <Text style={styles.metaValue}>{selectedPcap.hosts}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Time Span</Text>
              <Text style={styles.metaValue}>{selectedPcap.timeSpan}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Alerts</Text>
              <Text style={[styles.metaValue, { color: Colors.warning }]}>
                {selectedPcap.alerts}
              </Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Flows</Text>
              <Text style={[styles.metaValue, { color: Colors.primary }]}>
                {selectedPcap.flows.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Canonical Flow Preview Table */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="table-chart" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Canonical Flow Preview</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 0.8 }]}>Src IP</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>Dst IP</Text>
              <Text style={[styles.th, { flex: 0.5, textAlign: 'center' }]}>Port</Text>
              <Text style={[styles.th, { flex: 0.5, textAlign: 'center' }]}>Proto</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Bytes</Text>
            </View>

            {canonicalFlows.map(flow => (
              <View key={flow.id} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 0.8, color: Colors.textWhite }]}>{flow.src}</Text>
                <Text style={[styles.td, { flex: 0.8, color: Colors.textSecondary }]}>{flow.dst}</Text>
                <Text style={[styles.td, { flex: 0.5, textAlign: 'center', color: Colors.primary }]}>{flow.dport}</Text>
                <Text style={[styles.td, { flex: 0.5, textAlign: 'center' }]}>{flow.proto}</Text>
                <Text style={[styles.td, { flex: 0.8, textAlign: 'right', color: Colors.textPrimary }]}>{flow.bytes}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 5. Scenario Naming & Launch Replay */}
        <View style={styles.launchCard}>
          <Text style={styles.inputLabel}>Scenario Replay Name</Text>
          <TextInput
            style={styles.scenarioInput}
            value={scenarioName}
            onChangeText={setScenarioName}
            placeholder="Enter scenario name..."
            placeholderTextColor={Colors.textSecondary}
          />

          <TouchableOpacity
            style={styles.launchBtn}
            onPress={handleLaunch}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={18} color={Colors.primaryDark} />
            <Text style={styles.launchBtnText}>Launch Replay in Live Monitor</Text>
          </TouchableOpacity>
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
  dropZone: {
    backgroundColor: Colors.panelBackground,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.borderHighlight,
    borderRadius: 10,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dropIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dropSub: {
    color: Colors.textSecondary,
    fontSize: 10,
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
  fileCountText: {
    color: Colors.textSecondary,
    fontSize: 9,
  },

  pcapList: {
    gap: 8,
  },
  pcapItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: 8,
  },
  pcapItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(76, 215, 246, 0.06)',
  },
  pcapMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pcapIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcapFileName: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: 'bold',
  },
  pcapMetaSub: {
    color: Colors.textSecondary,
    fontSize: 9,
  },
  pcapStatusPill: {
    backgroundColor: '#151b28',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pcapStatusText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },

  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stageBlock: {
    flex: 1,
    gap: 3,
  },
  stageLabel: {
    color: Colors.textSecondary,
    fontSize: 8,
  },
  stageTrack: {
    height: 4,
    backgroundColor: '#151b28',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stageFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Metadata Grid
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBox: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  metaLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
  },
  metaValue: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '900',
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
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  td: {
    fontSize: 10,
  },

  // Launch Card
  launchCard: {
    backgroundColor: Colors.panelBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  scenarioInput: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    color: Colors.textWhite,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  launchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  launchBtnText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
