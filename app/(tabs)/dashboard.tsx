import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { NutritionChart } from '../../components/NutritionChart';
import { LoggedMealCategoryCard } from '../../components/LoggedMealCategoryCard';
import { LoggedWorkoutCard } from '../../components/LoggedWorkoutCard';
import { ClientActivityCard } from '../../components/ClientActivityCard';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useTheme } from '../../lib/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const todayMeals = useNutritionStore((state) => state.todayMeals);
  const workoutHistory = useWorkoutStore((state) => state.workoutHistory);
  const startSession = useWorkoutStore((state) => state.startSession);
  const liveFeedCards = useTrainerStore((state) => state.liveFeedCards);
  const clients = useTrainerStore((state) => state.clients);
  const toggleAcknowledgeEvent = useTrainerStore((state) => state.toggleAcknowledgeEvent);
  const theme = useTheme();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');

  const handleStartWorkout = () => {
    startSession();
    router.push('/workout/active-session');
  };

  const unacknowledgedCount = liveFeedCards.filter((card) => !card.isAcknowledged).length;

  const filteredFeedCards = liveFeedCards.filter((card) => {
    if (selectedClientFilter === 'ALL') return true;
    return card.clientId === selectedClientFilter || card.clientName.toLowerCase() === selectedClientFilter.toLowerCase();
  });

  // Sort: Unacknowledged (unread) updates first, then by timestamp descending
  const sortedFeedCards = [...filteredFeedCards].sort((a, b) => {
    const ackA = a.isAcknowledged ? 1 : 0;
    const ackB = b.isAcknowledged ? 1 : 0;
    if (ackA !== ackB) return ackA - ackB;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Today's Nutrition Progress */}
        <NutritionChart />

        {/* Client Activity Feed (Trainer Accounts Only) */}
        {role === 'TRAINER' && (
          <View style={styles.activityFeedContainer}>
            <View style={styles.feedHeaderRow}>
              <Text style={[styles.clientActivityHeaderTitle, { color: theme.text }]}>Client Activity</Text>
              <Text
                style={[
                  styles.feedCountBadge,
                  {
                    color: theme.isDark ? theme.accentGold : theme.primary,
                    backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                    borderColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
              >
                {unacknowledgedCount === 0
                  ? 'All Acknowledged'
                  : `${unacknowledgedCount} ${unacknowledgedCount === 1 ? 'update' : 'updates'}`}
              </Text>
            </View>

            <View style={[styles.clientActivityHeaderDivider, { backgroundColor: theme.border }]} />

            {/* Client Filter Selector Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContainer}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor:
                      selectedClientFilter === 'ALL'
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.card,
                    borderColor:
                      selectedClientFilter === 'ALL'
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.border,
                  },
                ]}
                onPress={() => setSelectedClientFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color:
                        selectedClientFilter === 'ALL'
                          ? theme.isDark
                            ? '#0A1A12'
                            : '#FFFFFF'
                          : theme.textSecondary,
                      fontWeight: selectedClientFilter === 'ALL' ? 'bold' : '600',
                    },
                  ]}
                >
                  All Clients ({liveFeedCards.length})
                </Text>
              </TouchableOpacity>

              {clients.map((client) => {
                const isActive =
                  selectedClientFilter === client.clientId ||
                  selectedClientFilter.toLowerCase() === client.fullName.toLowerCase();
                const count = liveFeedCards.filter(
                  (card) =>
                    card.clientId === client.clientId ||
                    card.clientName.toLowerCase() === client.fullName.toLowerCase()
                ).length;

                return (
                  <TouchableOpacity
                    key={client.clientId}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isActive
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.card,
                        borderColor: isActive
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedClientFilter(client.clientId)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color: isActive
                            ? theme.isDark
                              ? '#0A1A12'
                              : '#FFFFFF'
                            : theme.textSecondary,
                          fontWeight: isActive ? 'bold' : '600',
                        },
                      ]}
                    >
                      {client.fullName} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Filtered Activity Cards */}
            <View style={styles.activityList}>
              {sortedFeedCards.length === 0 ? (
                <View
                  style={[
                    styles.emptyFeedBox,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.emptyFeedText, { color: theme.textMuted }]}>
                    No recent activity logs for this client.
                  </Text>
                </View>
              ) : (
                sortedFeedCards.map((card) => (
                  <ClientActivityCard
                    key={card.id}
                    id={card.id}
                    clientName={card.clientName}
                    avatarUrl={card.avatarUrl}
                    timeAgo={card.timeAgo}
                    actionVerb={card.actionVerb}
                    targetTitle={card.targetTitle}
                    isAlert={card.isAlert}
                    isAcknowledged={card.isAcknowledged}
                    onToggleAcknowledge={() => toggleAcknowledgeEvent(card.id)}
                    tags={card.tags}
                    eventType={card.eventType}
                    photoUrl={card.photoUrl}
                    breakdownItems={card.breakdownItems}
                    updatedValues={card.updatedValues}
                    onPressCard={() => router.push(`/clients/${card.clientId}`)}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {/* Today's Meals Section */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Logged Meals</Text>
            <TouchableOpacity
              style={[
                styles.actionBtnSmall,
                {
                  backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  ...theme.shadowButton,
                },
              ]}
              onPress={() => router.push('/nutrition/scan-meal')}
            >
              <Text
                style={[
                  styles.actionBtnSmallText,
                  { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                ]}
              >
                + Log Meal
              </Text>
            </TouchableOpacity>
          </View>

          {todayMeals.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No meals logged yet today.</Text>
          ) : (
            todayMeals.map((meal) => (
              <LoggedMealCategoryCard
                key={meal.id}
                category={meal.category || 'BREAKFAST'}
                totalCalories={meal.totalCalories}
                items={meal.items}
              />
            ))
          )}
        </View>

        {/* Recent Workouts Section */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Workouts</Text>
            <TouchableOpacity
              style={[
                styles.actionBtnSmall,
                {
                  backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  ...theme.shadowButton,
                },
              ]}
              onPress={handleStartWorkout}
            >
              <Text
                style={[
                  styles.actionBtnSmallText,
                  { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                ]}
              >
                + Start Workout
              </Text>
            </TouchableOpacity>
          </View>

          {workoutHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No recent workout sessions logged.</Text>
          ) : (
            workoutHistory.slice(0, 5).map((session) => (
              <LoggedWorkoutCard key={session.id} session={session} />
            ))
          )}
        </View>
      </ScrollView>

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  activityFeedContainer: {
    marginBottom: 20,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clientActivityHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  feedCountBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  clientActivityHeaderDivider: {
    height: 1,
    marginBottom: 14,
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterContainer: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  activityList: {
    gap: 4,
  },
  emptyFeedBox: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyFeedText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnSmallText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
