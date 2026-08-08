import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'expo-router';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { MealEntry } from '@/types/nutrition';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dayMeals, setDayMeals] = useState<MealEntry[]>([]);
  const [dayWorkouts, setDayWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate 14 days of date pills for quick navigation
  const recentDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (user?.id && selectedDate) {
      fetchHistoryForDate(selectedDate);
    }
  }, [selectedDate, user?.id]);

  const fetchHistoryForDate = async (dateStr: string) => {
    setLoading(true);
    try {
      // 1. Fetch meals logged on selectedDate
      const { data: meals } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user?.id)
        .eq('logged_date', dateStr);

      // 2. Fetch completed workout sessions logged on selectedDate
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);

      setDayMeals((meals as any[]) || []);
      setDayWorkouts(sessions || []);
    } catch (err) {
      console.error('[CalendarScreen] Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalCalories = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = dayMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0);

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
            TRAINR HISTORY
          </Text>
          <Text className={`text-2xl font-black ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Calendar</Text>
        </View>

        <NeumorphicButton
          title="Back"
          variant="green"
          size="sm"
          onPress={() => router.back()}
        />
      </View>

      {/* Date Picker Horizontal Bar */}
      <Text className={`text-xs font-semibold mb-2 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Select Date:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 mb-6">
        {recentDates.map((dateStr) => {
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const displayDate = new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <TouchableOpacity
              key={dateStr}
              onPress={() => setSelectedDate(dateStr)}
              className={`px-4 py-3 rounded-2xl border items-center min-w-[90px] ${
                isSelected
                  ? isLight ? 'bg-[#0F291E] border-[#D4AF37]' : 'bg-gold-light border-gold-bright'
                  : isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-elevated border-deepGreen-border'
              }`}
            >
              <Text className={`text-[10px] uppercase font-bold ${
                isSelected ? 'text-white' : isLight ? 'text-[#476355]' : 'text-sage'
              }`}>
                {isToday ? 'Today' : displayDate.split(',')[0]}
              </Text>
              <Text className={`text-sm font-black mt-0.5 ${
                isSelected ? 'text-white' : isLight ? 'text-[#0F291E]' : 'text-white'
              }`}>
                {displayDate.split(',')[1]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Date Overview Card */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className={`text-xs font-bold uppercase mb-1 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
          Summary for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <View className="flex-row justify-between items-center mt-2">
          <View>
            <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Meals Logged</Text>
            <Text className={`text-xl font-black ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{dayMeals.length} Meals</Text>
            <Text className={`text-xs font-bold mt-0.5 ${isLight ? 'text-[#C5A028]' : 'text-gold-bright'}`}>
              {totalCalories} kcal • {totalProtein}g Protein
            </Text>
          </View>
          <View className="items-end">
            <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Workouts</Text>
            <Text className={`text-xl font-black ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{dayWorkouts.length} Sessions</Text>
          </View>
        </View>
      </NeumorphicView>

      {/* Workouts Logged Section */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <Text className={`text-base font-bold mb-3 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Workouts Completed ({dayWorkouts.length})
        </Text>

        {dayWorkouts.length === 0 ? (
          <Text className={`text-xs text-center py-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>No workout sessions recorded for this date.</Text>
        ) : (
          dayWorkouts.map((w: any) => (
            <View key={w.id || w.created_at} className={`py-3 flex-row justify-between items-center border-b ${
              isLight ? 'border-slate-200' : 'border-deepGreen-border'
            }`}>
              <View style={{ flex: 1 }}>
                <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{w.title || 'Workout Session'}</Text>
                <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{w.duration_minutes || 45} Mins • {w.notes || 'Completed'}</Text>
              </View>
              <View className={`px-2.5 py-1 rounded border ${
                isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/40 border-gold-bright/30'
              }`}>
                <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Completed</Text>
              </View>
            </View>
          ))
        )}
      </NeumorphicView>

      {/* Meals Logged Section */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <Text className={`text-base font-bold mb-3 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Meals Logged ({dayMeals.length})
        </Text>

        {dayMeals.length === 0 ? (
          <Text className={`text-xs text-center py-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>No meals logged for this date.</Text>
        ) : (
          dayMeals.map((m) => (
            <View key={m.id} className={`py-3 flex-row justify-between items-center border-b ${
              isLight ? 'border-slate-200' : 'border-deepGreen-border'
            }`}>
              <View style={{ flex: 1 }}>
                <View className="flex-row items-center space-x-2 mb-0.5">
                  <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{m.meal_name}</Text>
                  <View className={`px-2 py-0.5 rounded ${isLight ? 'bg-amber-100' : 'bg-gold-dark/40'}`}>
                    <Text className={`text-[9px] font-bold uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>{m.meal_type}</Text>
                  </View>
                </View>
                <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  {m.calories} kcal • {m.protein_g}g P • {m.carbs_g}g C • {m.fat_g}g F
                </Text>
              </View>

              <Text className={`text-xs font-semibold ${isLight ? 'text-[#C5A028]' : 'text-gold-bright'}`}>{m.logged_time || 'Logged'}</Text>
            </View>
          ))
        )}
      </NeumorphicView>
    </ScrollView>
  );
}

