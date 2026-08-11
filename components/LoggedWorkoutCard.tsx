import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CompletedWorkoutHeader } from '../store/workoutStore';

export interface LoggedWorkoutCardProps {
  session: CompletedWorkoutHeader;
  defaultExpanded?: boolean;
}

export const LoggedWorkoutCard: React.FC<LoggedWorkoutCardProps> = ({
  session,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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

  // Derive icon from title
  const getSessionIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('push') || lower.includes('bench')) return '🏋️';
    if (lower.includes('pull') || lower.includes('back')) return '💪';
    if (lower.includes('leg') || lower.includes('squat')) return '🦵';
    if (lower.includes('core') || lower.includes('cardio')) return '🔥';
    return '⚡';
  };

  const exerciseLogs = session.exerciseLogs || [
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10 reps', targetWeightKg: 75, totalVolumeKg: 1800 },
    { name: 'Seated DB Shoulder Press', sets: 3, reps: '10-12 reps', targetWeightKg: 20, totalVolumeKg: 950 },
    { name: 'Tricep Rope Pushdown', sets: 3, reps: '12-15 reps', targetWeightKg: 25, totalVolumeKg: 800 },
  ];

  return (
    <View style={styles.outerContainer}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.sessionIcon}>{getSessionIcon(session.title)}</Text>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session.title.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.totalVolumeText}>
          {session.totalVolumeKg >= 1000
            ? `${(session.totalVolumeKg / 1000).toFixed(1)}k`
            : session.totalVolumeKg}{' '}
          <Text style={styles.volumeUnit}>kg</Text>
        </Text>
      </View>

      {/* Subheader & Dropdown Toggle Row */}
      <View style={styles.subHeaderRow}>
        <Text style={styles.sessionMetaText}>
          {formatSessionDate(session.date)} • {session.durationMinutes} min • {session.exerciseCount}{' '}
          Exercises
        </Text>

        <TouchableOpacity
          style={[styles.toggleBtn, isExpanded && styles.toggleBtnActive]}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, isExpanded && styles.toggleBtnTextActive]}>
            {isExpanded ? '▲ Hide Details' : `▼ ${session.exerciseCount || 3} Exercises`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expanded Exercise Inset List */}
      {isExpanded && (
        <>
          <View style={styles.divider} />

          <View style={styles.itemsList}>
            {exerciseLogs.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemVolumeText}>
                    {item.totalVolumeKg} <Text style={styles.itemVolumeUnit}>kg</Text>
                  </Text>
                </View>

                <Text style={styles.itemBottomRow}>
                  {item.sets} Sets <Text style={styles.dotSeparator}>•</Text> {item.reps}{' '}
                  <Text style={styles.pipeSeparator}>|</Text> Target: {item.targetWeightKg} kg
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
    backgroundColor: '#091512',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  sessionIcon: {
    fontSize: 16,
  },
  sessionTitle: {
    color: '#A7F3D0',
    fontSize: 13.5,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  totalVolumeText: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  volumeUnit: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: 'normal',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sessionMetaText: {
    color: '#64748B',
    fontSize: 11,
    flex: 1,
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
    marginBottom: 4,
  },
  itemName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  itemVolumeText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  itemVolumeUnit: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: 'normal',
  },
  itemBottomRow: {
    color: '#94A3B8',
    fontSize: 11,
  },
  dotSeparator: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  pipeSeparator: {
    color: '#334155',
  },
});
