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

export default function DashboardScreen() {
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const todayMeals = useNutritionStore((state) => state.todayMeals);
  const workoutHistory = useWorkoutStore((state) => state.workoutHistory);
  const startSession = useWorkoutStore((state) => state.startSession);
  const liveFeedCards = useTrainerStore((state) => state.liveFeedCards);
  const clients = useTrainerStore((state) => state.clients);
  const toggleAcknowledgeEvent = useTrainerStore((state) => state.toggleAcknowledgeEvent);

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
    <View style={styles.container}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Today's Nutrition Progress */}
        <NutritionChart />

        {/* Client Activity Feed (Trainer Accounts Only) */}
        {role === 'TRAINER' && (
          <View style={styles.activityFeedContainer}>
            <View style={styles.feedHeaderRow}>
              <Text style={styles.clientActivityHeaderTitle}>Client Activity</Text>
              <Text style={[styles.feedCountBadge, unacknowledgedCount === 0 && styles.feedCountBadgeDone]}>
                {unacknowledgedCount === 0
                  ? '✓ All Acknowledged'
                  : `${unacknowledgedCount} ${unacknowledgedCount === 1 ? 'update' : 'updates'}`}
              </Text>
            </View>

            <View style={styles.clientActivityHeaderDivider} />

            {/* Client Filter Selector Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContainer}
            >
              <TouchableOpacity
                style={[styles.filterPill, selectedClientFilter === 'ALL' && styles.filterPillActive]}
                onPress={() => setSelectedClientFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, selectedClientFilter === 'ALL' && styles.filterPillTextActive]}>
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
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setSelectedClientFilter(client.clientId)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {client.fullName} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Filtered Activity Cards */}
            <View style={styles.activityList}>
              {sortedFeedCards.length === 0 ? (
                <View style={styles.emptyFeedBox}>
                  <Text style={styles.emptyFeedText}>No recent activity logs for this client.</Text>
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
                    onPressCard={() => router.push(`/clients/${card.clientId}`)}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {/* Today's Meals Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🥗 Today's Logged Meals</Text>
            <TouchableOpacity
              style={styles.actionBtnSmall}
              onPress={() => router.push('/nutrition/scan-meal')}
            >
              <Text style={styles.actionBtnSmallText}>+ Log Meal</Text>
            </TouchableOpacity>
          </View>

          {todayMeals.length === 0 ? (
            <Text style={styles.emptyText}>No meals logged yet today.</Text>
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
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏋️ Recent Workouts</Text>
            <TouchableOpacity style={styles.actionBtnSmall} onPress={handleStartWorkout}>
              <Text style={styles.actionBtnSmallText}>+ Start Workout</Text>
            </TouchableOpacity>
          </View>

          {workoutHistory.length === 0 ? (
            <Text style={styles.emptyText}>No recent workout sessions logged.</Text>
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
    backgroundColor: '#0F172A',
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
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
  },
  feedCountBadge: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedCountBadgeDone: {
    color: '#34D399',
    backgroundColor: '#022C22',
  },
  clientActivityHeaderDivider: {
    height: 1,
    backgroundColor: '#10B98122',
    marginBottom: 14,
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterContainer: {
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterPillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#A7F3D0',
    fontWeight: 'bold',
  },
  activityList: {
    gap: 4,
  },
  emptyFeedBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyFeedText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionBtnSmall: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  workoutTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  workoutSummary: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  workoutDate: {
    color: '#64748B',
    fontSize: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
