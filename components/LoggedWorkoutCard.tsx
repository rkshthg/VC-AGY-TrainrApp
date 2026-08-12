import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompletedWorkoutHeader } from '../store/workoutStore';
import { useTheme } from '../lib/theme';

export interface LoggedWorkoutCardProps {
  session: CompletedWorkoutHeader;
  defaultExpanded?: boolean;
}

export const LoggedWorkoutCard: React.FC<LoggedWorkoutCardProps> = ({
  session,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const theme = useTheme();

  // Format date label (e.g. Yesterday, Today, or Jul 20)
  const formatSessionDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  };

  // Derive vector icon name from title
  const getSessionIconName = (title: string): keyof typeof Ionicons.glyphMap => {
    const lower = title.toLowerCase();
    if (lower.includes('push') || lower.includes('bench') || lower.includes('chest')) return 'barbell-outline';
    if (lower.includes('pull') || lower.includes('back') || lower.includes('arm')) return 'fitness-outline';
    if (lower.includes('leg') || lower.includes('squat')) return 'walk-outline';
    if (lower.includes('core') || lower.includes('cardio') || lower.includes('hiit')) return 'flame-outline';
    return 'flash-outline';
  };

  const exerciseLogs = session.exerciseLogs || [
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10 reps', targetWeightKg: 75, totalVolumeKg: 1800 },
    { name: 'Seated DB Shoulder Press', sets: 3, reps: '10-12 reps', targetWeightKg: 20, totalVolumeKg: 950 },
    { name: 'Tricep Rope Pushdown', sets: 3, reps: '12-15 reps', targetWeightKg: 25, totalVolumeKg: 800 },
  ];

  const iconName = getSessionIconName(session.title);

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          ...theme.shadow,
        },
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons
            name={iconName}
            size={18}
            color={theme.isDark ? theme.accentGold : theme.primary}
          />
          <Text
            style={[
              styles.sessionTitle,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
            numberOfLines={1}
          >
            {session.title.toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.totalVolumeText, { color: theme.text }]}>
          {session.totalVolumeKg >= 1000
            ? `${(session.totalVolumeKg / 1000).toFixed(1)}k`
            : session.totalVolumeKg}{' '}
          <Text
            style={[
              styles.volumeUnit,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          >
            kg
          </Text>
        </Text>
      </View>

      {/* Subheader & Dropdown Toggle Row */}
      <View style={styles.subHeaderRow}>
        <Text style={[styles.sessionMetaText, { color: theme.textSecondary }]}>
          {formatSessionDate(session.date)} • {session.durationMinutes} min • {session.exerciseCount}{' '}
          Exercises
        </Text>

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
              {isExpanded ? 'Hide Details' : `${session.exerciseCount || 3} Exercises`}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Expanded Exercise Inset List */}
      {isExpanded && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.itemsList}>
            {exerciseLogs.map((item, index) => (
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
                  <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                  <Text
                    style={[
                      styles.itemVolumeText,
                      { color: theme.isDark ? theme.accentGold : theme.primary },
                    ]}
                  >
                    {item.totalVolumeKg || 1200} <Text style={styles.volumeSubUnit}>kg</Text>
                  </Text>
                </View>

                <Text style={[styles.itemBottomRow, { color: theme.textSecondary }]}>
                  {item.sets} sets <Text style={{ color: theme.accentGold }}>•</Text> {item.reps}{' '}
                  <Text style={{ color: theme.border }}>|</Text> @ {item.targetWeightKg || 60} kg
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  totalVolumeText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  volumeUnit: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'normal',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
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
    gap: 10,
  },
  itemCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemVolumeText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  volumeSubUnit: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'normal',
  },
  itemBottomRow: {
    fontSize: 12,
    fontWeight: '500',
  },
});
