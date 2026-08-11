import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export interface TagPill {
  label: string;
  type?: 'success' | 'alert' | 'info';
}

export interface ActivityBreakdownItem {
  title: string;
  subtitle: string;
  value: string;
}

export interface ClientActivityProps {
  id: string;
  clientId?: string;
  clientName: string;
  avatarUrl?: string;
  timeAgo: string;
  actionVerb: string;
  targetTitle: string;
  isAlert?: boolean;
  isAcknowledged?: boolean;
  onToggleAcknowledge?: () => void;
  tags: TagPill[];
  eventType?: 'LOG_MEAL' | 'FINISH_WORKOUT' | 'UPLOAD_CHECKIN' | 'UPDATE_MEASUREMENTS' | 'MISSED_WORKOUT';
  breakdownItems?: ActivityBreakdownItem[];
  initialLiked?: boolean;
  onPressCard?: () => void;
}

export const ClientActivityCard: React.FC<ClientActivityProps> = ({
  clientName,
  avatarUrl,
  timeAgo,
  actionVerb,
  targetTitle,
  isAlert = false,
  isAcknowledged,
  onToggleAcknowledge,
  tags,
  eventType,
  breakdownItems,
  initialLiked = false,
  onPressCard,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalAck, setInternalAck] = useState(false);

  const acknowledged = isAcknowledged !== undefined ? isAcknowledged : internalAck;

  const handleToggleAck = () => {
    if (!acknowledged) {
      setIsExpanded(false);
    }
    if (onToggleAcknowledge) {
      onToggleAcknowledge();
    } else {
      setInternalAck(!internalAck);
    }
  };

  // Fallback items based on activity eventType
  const itemsToRender: ActivityBreakdownItem[] = breakdownItems || (
    eventType === 'LOG_MEAL'
      ? [
          { title: 'Grilled Chicken Breast (200g)', subtitle: 'P: 46g | C: 0g | F: 5g', value: '235 kcal' },
          { title: 'Steamed Brown Rice (150g)', subtitle: 'P: 4g | C: 34g | F: 2g', value: '170 kcal' },
          { title: 'Avocado Salad (100g)', subtitle: 'P: 2g | C: 9g | F: 15g', value: '160 kcal' },
        ]
      : eventType === 'FINISH_WORKOUT'
      ? [
          { title: 'Barbell Bench Press', subtitle: '4 Sets • 8-10 reps | Target: 75 kg', value: '1,800 kg' },
          { title: 'Seated DB Shoulder Press', subtitle: '3 Sets • 10-12 reps | Target: 20 kg', value: '950 kg' },
          { title: 'Tricep Rope Pushdown', subtitle: '3 Sets • 12-15 reps | Target: 25 kg', value: '800 kg' },
        ]
      : [
          { title: 'Front & Side Progress Photos', subtitle: 'High resolution check-in upload', value: '2 Photos' },
          { title: 'Body Weight Entry', subtitle: 'Down 0.8 kg from last week', value: '74.2 kg' },
        ]
  );

  // Generate initials for avatar fallback
  const initials = clientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.cardContainer,
        isAlert ? styles.cardAlertBorder : styles.cardNormalBorder,
      ]}
    >
      {/* Card Header Row */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onPressCard}
        activeOpacity={0.85}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}

        {/* Content Column */}
        <View style={styles.contentCol}>
          {/* Top Row: Name, Time, Like Button */}
          <View style={styles.topRow}>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.timeAgoText}>{timeAgo}</Text>
          </View>

          {/* Action Line */}
          <Text style={styles.actionLine}>
            <Text style={isAlert ? styles.actionVerbAlert : styles.actionVerbMuted}>
              {actionVerb}{' '}
            </Text>
            <Text style={isAlert ? styles.targetTitleAlert : styles.targetTitleNormal}>
              {targetTitle}
            </Text>
          </Text>

          {/* Tag Pills Row & Dropdown Toggle */}
          <View style={styles.subFooterRow}>
            <View style={styles.tagsRow}>
              {tags.map((tag, index) => {
                const isAlertTag = tag.type === 'alert' || isAlert;
                return (
                  <View
                    key={index}
                    style={[
                      styles.tagPill,
                      isAlertTag ? styles.tagPillAlert : styles.tagPillSuccess,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        isAlertTag ? styles.tagPillTextAlert : styles.tagPillTextSuccess,
                      ]}
                    >
                      {tag.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.toggleBtn, isExpanded && styles.toggleBtnActive]}
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, isExpanded && styles.toggleBtnTextActive]}>
                {isExpanded ? '▲ Hide Details' : '▼ View Breakdown'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Details Section */}
      {isExpanded && (
        <>
          <View style={styles.divider} />

          <View style={styles.itemsList}>
            {itemsToRender.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemName}>{item.title}</Text>
                  <Text style={styles.itemValueText}>{item.value}</Text>
                </View>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>
            ))}
          </View>

          {/* Trainer Action Bar inside Dropdown */}
          <View style={styles.trainerActionBar}>
            <TouchableOpacity
              style={[styles.acknowledgedBtn, acknowledged && styles.acknowledgedBtnActive]}
              onPress={handleToggleAck}
              activeOpacity={0.8}
            >
              <Text style={[styles.acknowledgedBtnText, acknowledged && styles.acknowledgedBtnTextActive]}>
                {acknowledged ? '✓ Acknowledged' : '✓ Mark Acknowledged'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardNormalBorder: {
    borderColor: '#10B98133',
  },
  cardAlertBorder: {
    borderColor: '#F59E0B66',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  avatarInitials: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contentCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  timeLikeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeAgoText: {
    color: '#64748B',
    fontSize: 11,
  },
  likeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeBtnActive: {
    backgroundColor: '#064E3B',
  },
  likeIcon: {
    fontSize: 12,
    opacity: 0.6,
  },
  likeIconActive: {
    opacity: 1,
  },
  actionLine: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  actionVerbMuted: {
    color: '#94A3B8',
  },
  actionVerbAlert: {
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  targetTitleNormal: {
    color: '#A7F3D0',
    fontWeight: 'bold',
  },
  targetTitleAlert: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  subFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagPillSuccess: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  tagPillAlert: {
    backgroundColor: '#451A03',
    borderColor: '#F59E0B',
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tagPillTextSuccess: {
    color: '#10B981',
  },
  tagPillTextAlert: {
    color: '#F59E0B',
  },
  toggleBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleBtnActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  toggleBtnText: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#10B98122',
    marginVertical: 12,
  },
  itemsList: {
    gap: 8,
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: '#0C1E19',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  itemValueText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  itemSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  trainerActionBar: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#10B98122',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  acknowledgedBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  acknowledgedBtnActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  acknowledgedBtnText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  acknowledgedBtnTextActive: {
    color: '#10B981',
  },
});
