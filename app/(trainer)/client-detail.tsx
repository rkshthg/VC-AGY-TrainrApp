import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerStore } from '@/features/trainer/presentation/trainerStore';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { fetchClientDetailedOverview, formatRelativeLogDate } from '@/features/auth/data/authService';
import { fetchUserAssignedPlan } from '@/features/workout/data/workoutService';
import { DBWorkoutPlan } from '@/features/workout/domain/workout';
import { StatusBadge } from '@/core/presentation/components/StatusBadge';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { NeumorphicInput } from '@/core/presentation/components/NeumorphicInput';
import { WorkoutPlanBuilder } from '@/features/workout/presentation/WorkoutPlanBuilder';

export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clients, selectedClientId, updateClientTarget } = useTrainerStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const client = clients.find((c) => c.id === selectedClientId) || clients[0];
  const [calInput, setCalInput] = useState(client?.calorie_target?.toString() || '2200');
  const [proteinInput, setProteinInput] = useState(client?.protein_target?.toString() || '160');

  const [loading, setLoading] = useState(true);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [lastMealPrevDay, setLastMealPrevDay] = useState<any | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<any[]>([]);
  const [clientPlan, setClientPlan] = useState<DBWorkoutPlan | null>(null);
  const [buildPlanModalVisible, setBuildPlanModalVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (client?.id) {
        loadClientDetails(client.id);
      }
    }, [client?.id])
  );

  const loadClientDetails = async (clientId: string) => {
    setLoading(true);
    const data = await fetchClientDetailedOverview(clientId);
    setTodayMeals(data.todayMeals);
    setLastMealPrevDay(data.lastMealPrevDay);
    setWorkoutSessions(data.workoutSessions);

    const plan = await fetchUserAssignedPlan(clientId);
    setClientPlan(plan);
    setLoading(false);
  };

  const handleUpdateTargets = () => {
    if (!client?.id) return;
    updateClientTarget(client.id, parseFloat(calInput) || 2000, parseFloat(proteinInput) || 160);
    Alert.alert('Targets Updated 🎯', `Set daily goal for ${client.name}: ${calInput} kcal & ${proteinInput}g protein.`);
  };

  if (!client) {
    return (
      <View className={`flex-1 justify-center items-center p-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}>
        <Text className={`text-base font-bold mb-4 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>No Client Selected</Text>
        <NeumorphicButton title="Back to Roster" variant="gold" onPress={() => router.back()} />
      </View>
    );
  }

  const todayCaloriesTotal = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const todayProteinTotal = todayMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0);

  return (
    <>
      <ScrollView
        className={`flex-1 p-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20) + 10,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        {/* Back Header */}
        <TouchableOpacity className="mb-4 flex-row items-center" onPress={() => router.back()}>
          <Text className={`font-bold text-sm ${isLight ? 'text-[#C5A028]' : 'text-gold-light'}`}>← Back to Roster</Text>
        </TouchableOpacity>

        {/* Primary Client Profile Card */}
        <NeumorphicView variant="goldAccent" className="p-5 mb-6">
          <View className="flex-row justify-between items-start mb-3">
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text className={`text-2xl font-black mb-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{client.name}</Text>
              <Text className={`text-xs font-medium ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{client.goal}</Text>
              {client.email ? (
                <Text className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-sage-light'}`}>{client.email}</Text>
              ) : null}
            </View>
            <StatusBadge status={client.status_badge} />
          </View>

          <Text className={`text-xs mb-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Last active: {client.last_active}</Text>

          {/* Set Macro & Calorie Targets */}
          <NeumorphicView variant="inset" className="p-4">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-3 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
              Set Client Macro & Calorie Targets
            </Text>
            <View className="flex-row space-x-3 mb-3">
              <View className="flex-1">
                <NeumorphicInput
                  label="Calories (kcal)"
                  value={calInput}
                  onChangeText={setCalInput}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <NeumorphicInput
                  label="Protein (g)"
                  value={proteinInput}
                  onChangeText={setProteinInput}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <NeumorphicButton
              title="Save Target Updates"
              variant="gold"
              size="sm"
              className="w-full"
              onPress={handleUpdateTargets}
            />
          </NeumorphicView>
        </NeumorphicView>

        {loading && <ActivityIndicator color={isLight ? '#C5A028' : '#E5C158'} className="my-6" />}

        {/* SECTION 0: CLIENT CURRENT WORKOUT PLAN & EDIT ACTION */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
              📋 Client's Current Workout Plan
            </Text>
            <TouchableOpacity
              onPress={() => setBuildPlanModalVisible(true)}
              className={`px-3 py-1 rounded-xl border ${
                isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/40 border-gold-bright/40'
              }`}
            >
              <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                {clientPlan ? '✏️ Edit Plan' : '🏋️‍♂️ Build Plan'}
              </Text>
            </TouchableOpacity>
          </View>

          <NeumorphicView variant="extruded" className="p-5">
            {!clientPlan ? (
              <View className="py-2 items-center">
                <Text className={`text-xs text-center mb-3 font-medium ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  No workout plan currently assigned to {client.name}. Build a personalized split routine!
                </Text>
                <NeumorphicButton
                  title="+ Build & Assign Workout Plan"
                  variant="gold"
                  size="sm"
                  onPress={() => setBuildPlanModalVisible(true)}
                />
              </View>
            ) : (
              <View>
                <View className="flex-row justify-between items-start mb-2">
                  <View style={{ flex: 1 }}>
                    <Text className={`text-xl font-black ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                      {clientPlan.name}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                      {clientPlan.description || 'Assigned Training Routine'}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-0.5 rounded border ${
                    isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/60 border-gold-bright/40'
                  }`}>
                    <Text className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                      {clientPlan.goal || 'Active Plan'}
                    </Text>
                  </View>
                </View>

                {/* Plan Routines Days List */}
                <View className="mt-3">
                  {clientPlan.days?.map((day, idx) => (
                    <View
                      key={day.id || idx}
                      className={`py-2.5 px-3 mb-2 rounded-xl border flex-row justify-between items-center ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-deepGreen-elevated border-deepGreen-border'
                      }`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                          Day {idx + 1}: {day.day_label}
                        </Text>
                        <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                          {day.exercises?.length || 0} Scheduled Exercises
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </NeumorphicView>
        </View>


        {/* SECTION 1: TODAY'S MEALS & PREVIOUS DAY LAST MEAL */}
        <View className="mb-6">
          <Text className={`text-xs font-bold uppercase tracking-wider mb-3 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
            🥗 Nutrition Logs (Today & Previous Day)
          </Text>

          {/* Today's Macro Progress Overview Card */}
          <NeumorphicView variant="extruded" className="p-4 mb-4">
            <View className="flex-row justify-between items-center mb-1">
              <Text className={`text-sm font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Today's Total Intake</Text>
              <Text className={`text-xs font-bold ${isLight ? 'text-[#C5A028]' : 'text-gold-bright'}`}>
                {todayCaloriesTotal} / {client.calorie_target} kcal
              </Text>
            </View>
            <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              Protein: {todayProteinTotal}g / {client.protein_target}g target
            </Text>
          </NeumorphicView>

          {/* Today's Logged Meals List */}
          <NeumorphicView variant="extruded" className="p-5 mb-4">
            <Text className={`text-base font-bold mb-3 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              Today's Logged Meals ({todayMeals.length})
            </Text>

            {todayMeals.length === 0 ? (
              <Text className={`text-xs text-center py-2 font-medium ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                No meals logged by {client.name} today yet. Send a quick check-in nudge!
              </Text>
            ) : (

              todayMeals.map((m) => (
                <View
                  key={m.id || Math.random().toString()}
                  className={`py-3 flex-row justify-between items-center border-b ${
                    isLight ? 'border-slate-200' : 'border-deepGreen-border'
                  }`}
                >
                  <View className="flex-row items-center space-x-3 flex-1 pr-2">
                    {m.image_url ? (
                      <Image source={{ uri: m.image_url }} className="w-12 h-12 rounded-xl bg-black/30" />
                    ) : (
                      <View className={`w-10 h-10 rounded-xl items-center justify-center ${
                        isLight ? 'bg-slate-200' : 'bg-deepGreen-elevated'
                      }`}>
                        <Text className="text-base">🥗</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View className="flex-row items-center space-x-2 mb-0.5">
                        <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{m.meal_name}</Text>
                        <View className={`px-2 py-0.5 rounded ${isLight ? 'bg-amber-100' : 'bg-gold-dark/40'}`}>
                          <Text className={`text-[9px] font-bold uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                            {m.meal_type || 'meal'}
                          </Text>
                        </View>
                      </View>
                      <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                        {m.calories} kcal • {m.protein_g || 0}g P • {m.carbs_g || 0}g C • {m.fat_g || 0}g F
                      </Text>
                    </View>
                  </View>
                  <Text className={`text-xs font-semibold ${isLight ? 'text-[#C5A028]' : 'text-gold-bright'}`}>
                    {m.display_logged_date || formatRelativeLogDate(m.logged_date, m.logged_time)}
                  </Text>
                </View>
              ))
            )}
          </NeumorphicView>

          {/* Last Meal of Previous Day */}
          <NeumorphicView variant="goldAccent" className="p-5">
            <View className="flex-row justify-between items-center mb-2">
              <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                🌙 Last Meal of Previous Day
              </Text>
              {lastMealPrevDay?.logged_date ? (
                <Text className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-sage'}`}>
                  {formatRelativeLogDate(lastMealPrevDay.logged_date)}
                </Text>
              ) : null}
            </View>

            {!lastMealPrevDay ? (
              <Text className={`text-xs text-center py-2 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                No previous day meal logged in system.
              </Text>
            ) : (
              <View className="flex-row items-center space-x-3 mt-1">
                {lastMealPrevDay.image_url ? (
                  <Image source={{ uri: lastMealPrevDay.image_url }} className="w-14 h-14 rounded-xl bg-black/40" />
                ) : (
                  <View className={`w-12 h-12 rounded-xl items-center justify-center ${
                    isLight ? 'bg-amber-100' : 'bg-gold-dark/40'
                  }`}>
                    <Text className="text-xl">🍲</Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center space-x-2 mb-0.5">
                    <Text className={`font-bold text-base ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                      {lastMealPrevDay.meal_name}
                    </Text>
                    <View className={`px-2 py-0.5 rounded ${isLight ? 'bg-amber-200' : 'bg-gold-dark/60'}`}>
                      <Text className={`text-[9px] font-bold uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                        {lastMealPrevDay.meal_type || 'meal'}
                      </Text>
                    </View>
                  </View>
                  <Text className={`text-xs font-semibold ${isLight ? 'text-[#C5A028]' : 'text-gold-light'}`}>
                    {lastMealPrevDay.calories} kcal • {lastMealPrevDay.protein_g || 0}g P • {lastMealPrevDay.carbs_g || 0}g C • {lastMealPrevDay.fat_g || 0}g F
                  </Text>
                  <Text className={`text-[10px] mt-0.5 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                    Logged: {lastMealPrevDay.display_logged_date || formatRelativeLogDate(lastMealPrevDay.logged_date, lastMealPrevDay.logged_time)}
                  </Text>
                </View>
              </View>
            )}
          </NeumorphicView>
        </View>

        {/* SECTION 2: LOGGED WORKOUT HISTORY & EXERCISES */}
        <View className="mb-6">
          <Text className={`text-xs font-bold uppercase tracking-wider mb-3 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
            🏋️ Detailed Workout Sessions ({workoutSessions.length})
          </Text>

          {workoutSessions.length === 0 ? (
            <NeumorphicView variant="extruded" className="p-5">
              <Text className={`text-xs text-center py-2 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                No workout sessions recorded for this client yet.
              </Text>
            </NeumorphicView>
          ) : (
            workoutSessions.map((ws, idx) => (
              <NeumorphicView key={ws.id || idx.toString()} variant="extruded" className="p-5 mb-4">
                <View className="flex-row justify-between items-start mb-2">
                  <View style={{ flex: 1 }}>
                    <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{ws.title}</Text>
                    <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                      {ws.date} • {ws.duration_minutes || 45} Mins • {ws.notes || 'Completed'}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded border ${
                    isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/40 border-gold-bright/30'
                  }`}>
                    <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Completed</Text>
                  </View>
                </View>

                {/* Detailed Exercises & Sets List */}
                {ws.exercises && ws.exercises.length > 0 ? (
                  <NeumorphicView variant="inset" className="p-3.5 mt-3">
                    <Text className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                      isLight ? 'text-[#8B6E14]' : 'text-gold-light'
                    }`}>
                      Exercises & Weight Lifted:
                    </Text>

                    {ws.exercises.map((ex: any, exIdx: number) => {
                      const completedSets = ex.completed_sets || ex.sets || [];
                      return (
                        <View
                          key={ex.exercise_id || exIdx.toString()}
                          className={`py-2 border-b ${
                            isLight ? 'border-slate-200' : 'border-deepGreen-border'
                          }`}
                        >
                          <Text className={`font-bold text-sm mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                            {ex.exercise_name || ex.name || `Exercise ${exIdx + 1}`}
                          </Text>

                          {Array.isArray(completedSets) && completedSets.length > 0 ? (
                            <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                              {completedSets.map((s: any, sIdx: number) => (
                                <View
                                  key={s.id || sIdx.toString()}
                                  className={`px-2 py-1 rounded border ${
                                    s.isPR
                                      ? isLight ? 'bg-amber-200 border-amber-400' : 'bg-gold-dark/60 border-gold-bright/50'
                                      : isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-elevated border-deepGreen-border'
                                  }`}
                                >
                                  <Text className={`text-[11px] font-bold ${
                                    s.isPR ? (isLight ? 'text-[#8B6E14]' : 'text-gold-bright') : (isLight ? 'text-[#0F291E]' : 'text-sage')
                                  }`}>
                                    Set {s.set_number || sIdx + 1}: {s.weight_kg || 0}kg × {s.reps || 0} {s.isPR ? '⭐ PR' : ''}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                              {ex.sets_target || 3} sets • {ex.reps_min || 8}-{ex.reps_max || 12} reps
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </NeumorphicView>
                ) : null}
              </NeumorphicView>
            ))
          )}
        </View>
      </ScrollView>

      {/* Build Workout Plan Modal */}
      <Modal visible={buildPlanModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: isLight ? '#F8FAF8' : '#0A1913', paddingTop: Math.max(insets.top, 20) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isLight ? '#e2e8f0' : '#1C4033' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: isLight ? '#0F291E' : '#FFFFFF' }}>
              Build Workout Plan for {client.name}
            </Text>
            <TouchableOpacity onPress={() => setBuildPlanModalVisible(false)} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isLight ? '#476355' : '#E5C158' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <WorkoutPlanBuilder
            userRole="trainer"
            initialClientId={client.id}
            initialPlan={clientPlan}
            onComplete={() => {
              setBuildPlanModalVisible(false);
              loadClientDetails(client.id);
            }}
          />
        </View>
      </Modal>
    </>
  );
}




