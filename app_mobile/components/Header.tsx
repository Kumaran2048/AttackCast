import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';

interface HeaderProps {
  title?: string;
  showOfflineBadge?: boolean;
  showReplayControls?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showOfflineBadge = true,
  showReplayControls = false,
}) => {
  const { isPlaying, setIsPlaying, speed, setSpeed, windowNum, toastMessage } = useApp();

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const cycleSpeed = () => {
    if (speed === 1) setSpeed(2);
    else if (speed === 2) setSpeed(4);
    else setSpeed(1);
  };

  return (
    <View style={styles.headerWrapper}>
      {/* Toast Bar if active */}
      {toastMessage && (
        <View style={styles.toastBar}>
          <Ionicons name="information-circle" size={14} color={Colors.primary} />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastMessage}
          </Text>
        </View>
      )}

      <View style={styles.headerContainer}>
        {/* Left: Brand / Title */}
        <View style={styles.brandRow}>
          <View style={styles.logoIconContainer}>
            <MaterialCommunityIcons name="radar" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.brandTitle}>AttackCast</Text>
            {title && <Text style={styles.screenSubtitle}>{title}</Text>}
          </View>
        </View>

        {/* Center/Right Controls */}
        <View style={styles.rightRow}>
          {showOfflineBadge && (
            <View style={styles.offlineBadge}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>Offline Mode</Text>
            </View>
          )}

          {showReplayControls && (
            <View style={styles.replayControls}>
              <TouchableOpacity
                onPress={togglePlay}
                style={[styles.ctrlBtn, isPlaying && styles.ctrlBtnActive]}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={14}
                  color={isPlaying ? Colors.background : Colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={cycleSpeed} style={styles.speedBtn}>
                <Text style={styles.speedText}>{`${speed}x`}</Text>
              </TouchableOpacity>
              <View style={styles.windowPill}>
                <Text style={styles.windowText}>{`W:${windowNum}`}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: Colors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
  },
  toastBar: {
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderHighlight,
    paddingVertical: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toastText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  screenSubtitle: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  offlineText: {
    color: Colors.warning,
    fontSize: 10,
    fontWeight: 'bold',
  },
  replayControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.panelBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
    gap: 4,
  },
  ctrlBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnActive: {
    backgroundColor: Colors.primary,
  },
  speedBtn: {
    paddingHorizontal: 6,
    height: 26,
    borderRadius: 6,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  windowPill: {
    paddingHorizontal: 6,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
