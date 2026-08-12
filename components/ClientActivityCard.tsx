import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

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
  photoUrl?: string;
  updatedValues?: { label: string; value: string }[];
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
  photoUrl,
  updatedValues,
  onPressCard,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalAck, setInternalAck] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const theme = useTheme();

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
        {
          backgroundColor: theme.card,
          borderColor: isAlert ? theme.warning : theme.border,
          ...theme.shadow,
        },
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
          <Image
            source={{ uri: avatarUrl }}
            style={[
              styles.avatarImage,
              { borderColor: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              {
                backgroundColor: theme.isDark ? theme.cardInner : theme.badgeBg,
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarInitials,
                { color: theme.isDark ? theme.accentGold : theme.primary },
              ]}
            >
              {initials}
            </Text>
          </View>
        )}

        {/* Content Column */}
        <View style={styles.contentCol}>
          {/* Top Row: Name, Time */}
          <View style={styles.topRow}>
            <Text style={[styles.clientName, { color: theme.text }]}>{clientName}</Text>
            <Text style={[styles.timeAgoText, { color: theme.textMuted }]}>{timeAgo}</Text>
          </View>

          {/* Action Line */}
          <Text style={styles.actionLine}>
            <Text
              style={{
                color: isAlert ? theme.warning : theme.textSecondary,
                fontWeight: isAlert ? 'bold' : 'normal',
              }}
            >
              {actionVerb}{' '}
            </Text>
            <Text
              style={{
                color: isAlert
                  ? theme.warning
                  : theme.isDark
                  ? theme.accentGold
                  : theme.primary,
                fontWeight: 'bold',
              }}
            >
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
                      {
                        backgroundColor: isAlertTag
                          ? theme.isDark
                            ? '#3B1A08'
                            : '#FEF3C7'
                          : theme.isDark
                          ? theme.badgeBg
                          : '#E8F5E9',
                        borderColor: isAlertTag
                          ? theme.warning
                          : theme.isDark
                          ? theme.accentGold
                          : theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        {
                          color: isAlertTag
                            ? theme.warning
                            : theme.isDark
                            ? theme.accentGold
                            : theme.primary,
                        },
                      ]}
                    >
                      {tag.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: isExpanded
                    ? theme.isDark
                      ? theme.cardInner
                      : theme.badgeBg
                    : theme.cardInner,
                  borderColor: isExpanded ? theme.accentGold : theme.border,
                },
              ]}
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons
                  name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={12}
                  color={
                    isExpanded
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    {
                      color: isExpanded
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {isExpanded ? 'Hide Details' : 'View Breakdown'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Details Section */}
      {isExpanded && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {eventType === 'UPLOAD_CHECKIN' || photoUrl || updatedValues ? (
            <View style={styles.checkinDropdownContent}>
              {/* Picture (if any) - Clickable to Expand */}
              {photoUrl && (
                <TouchableOpacity
                  style={[styles.dropdownPhotoCard, { backgroundColor: theme.cardInner, borderColor: theme.border }]}
                  onPress={() => setIsPhotoModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: photoUrl }} style={styles.dropdownPhotoImg} resizeMode="cover" />
                  <View style={[styles.expandOverlayBadge, { backgroundColor: theme.isDark ? 'rgba(10,26,18,0.85)' : 'rgba(0,0,0,0.7)' }]}>
                    <Ionicons name="expand-outline" size={13} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>Tap to Expand</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Updated Values Grid */}
              {updatedValues && updatedValues.length > 0 && (
                <View style={{ marginTop: photoUrl ? 4 : 0 }}>
                  <Text style={[styles.dropdownSectionTitle, { color: theme.textSecondary }]}>UPDATED FIELDS & VALUES:</Text>
                  <View style={styles.updatedValuesGrid}>
                    {updatedValues.map((val, vIdx) => (
                      <View
                        key={vIdx}
                        style={[
                          updatedValues.length === 1 ? styles.valBadgeFull : styles.valBadge,
                          { backgroundColor: theme.cardInner, borderColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.valBadgeLabel, { color: theme.textMuted }]}>{val.label}</Text>
                        <Text style={[styles.valBadgeValue, { color: theme.text }]}>{val.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.itemsList}>
              {itemsToRender.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.itemTopRow}>
                    <Text style={[styles.itemName, { color: theme.text }]}>{item.title}</Text>
                    <Text
                      style={[
                        styles.itemValueText,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      {item.value}
                    </Text>
                  </View>
                  <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                    {item.subtitle}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Trainer Action Bar inside Dropdown */}
          <View style={[styles.trainerActionBar, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.acknowledgedBtn,
                {
                  backgroundColor: acknowledged
                    ? theme.isDark
                      ? theme.accentGold
                      : theme.primary
                    : theme.cardInner,
                  borderColor: acknowledged
                    ? theme.isDark
                      ? theme.accentGold
                      : theme.primary
                    : theme.border,
                },
              ]}
              onPress={handleToggleAck}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={acknowledged ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={16}
                  color={acknowledged ? (theme.isDark ? '#0A1A12' : '#FFFFFF') : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.acknowledgedBtnText,
                    {
                      color: acknowledged
                        ? theme.isDark
                          ? '#0A1A12'
                          : '#FFFFFF'
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {acknowledged ? 'Acknowledged' : 'Mark Acknowledged'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Full-Screen Image Preview Modal for Trainer */}
      <Modal
        visible={isPhotoModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsPhotoModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.photoModalContent,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <View style={styles.photoModalHeader}>
              <Text style={[styles.photoModalTitle, { color: theme.text }]}>
                {clientName}'s Transformation Photo
              </Text>
              <TouchableOpacity onPress={() => setIsPhotoModalOpen(false)}>
                <Ionicons name="close-outline" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {photoUrl && (
              <View style={styles.trainerExpandedPhotoBox}>
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.trainerExpandedPhotoImg}
                  resizeMode="contain"
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.closePhotoBtn,
                {
                  backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                },
              ]}
              onPress={() => setIsPhotoModalOpen(false)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.closePhotoBtnText,
                  { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                ]}
              >
                Close Preview
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
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
    borderWidth: 2,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  contentCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  clientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  timeAgoText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionLine: {
    fontSize: 13,
    marginBottom: 8,
  },
  subFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  itemValueText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  itemSubtitle: {
    fontSize: 11,
  },
  trainerActionBar: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  acknowledgedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  acknowledgedBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  checkinDropdownContent: {
    paddingHorizontal: 4,
  },
  dropdownPhotoCard: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
  },
  dropdownPhotoImg: {
    width: '100%',
    height: '100%',
  },
  dropdownSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  updatedValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valBadge: {
    width: '48%',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  valBadgeFull: {
    width: '100%',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  valBadgeLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  valBadgeValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  expandOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trainerExpandedPhotoBox: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  trainerExpandedPhotoImg: {
    width: '100%',
    height: '100%',
  },
  closePhotoBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  closePhotoBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
