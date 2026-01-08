import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Habit, HabitLog, HabitWithStats, HabitCategory, HabitFrequency, UserCategory } from '@/lib/types';
import { format, subDays, differenceInDays, startOfDay, parseISO } from 'date-fns';

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = useCallback((habit: Habit, logs: HabitLog[]): HabitWithStats => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Single source of truth: derive everything from habit_logs
    const habitLogs = logs.filter((log) => log.habit_id === habit.id && log.completed);

    // IMPORTANT: A habit can only be completed once per day.
    // If multiple logs exist for the same day, treat them as a single completion.
    const uniqueCompletedDates = Array.from(
      new Set(habitLogs.map((log) => log.completed_at))
    );

    const completedToday = uniqueCompletedDates.includes(todayStr);

    // Total tracked days: from habit creation date through today (inclusive)
    const habitCreatedDate = startOfDay(new Date(habit.created_at));
    const totalDays = Math.max(1, differenceInDays(new Date(), habitCreatedDate) + 1);

    const completedDays = uniqueCompletedDates.length;
    const completionRate = Math.min(
      100,
      Math.max(0, Math.round((completedDays / totalDays) * 100))
    );

    // Current streak: consecutive days ending today. If today not completed => 0.
    let currentStreak = 0;
    if (completedToday) {
      let checkDate = new Date();
      while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        if (!uniqueCompletedDates.includes(dateStr)) break;
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    }

    // Longest streak: max historical consecutive run
    let longestStreak = 0;
    if (uniqueCompletedDates.length > 0) {
      const sortedAsc = [...uniqueCompletedDates].sort(
        (a, b) => parseISO(a).getTime() - parseISO(b).getTime()
      );

      let run = 1;
      longestStreak = 1;

      for (let i = 1; i < sortedAsc.length; i++) {
        const diff = differenceInDays(parseISO(sortedAsc[i]), parseISO(sortedAsc[i - 1]));
        if (diff === 1) {
          run++;
        } else {
          longestStreak = Math.max(longestStreak, run);
          run = 1;
        }
      }

      longestStreak = Math.max(longestStreak, run);
    }

    // Disallow impossible states
    currentStreak = Math.min(currentStreak, totalDays, completedDays);
    longestStreak = Math.min(longestStreak, totalDays, completedDays);

    const missedDays = Math.max(0, totalDays - completedDays);

    return {
      ...habit,
      completedToday,
      currentStreak,
      longestStreak,
      completionRate,
      missedDays,
      totalDays,
      // keep the underlying logs for calendar + UI; duplicates won't affect correctness now
      logs: habitLogs,
    };
  }, []);

  const fetchHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [habitsResponse, logsResponse] = await Promise.all([
        supabase
          .from('habits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user.id),
      ]);

      if (habitsResponse.error) throw habitsResponse.error;
      if (logsResponse.error) throw logsResponse.error;

      const logsData = logsResponse.data as HabitLog[];
      setAllLogs(logsData);

      const habitsWithStats = (habitsResponse.data as Habit[]).map(habit => 
        calculateStats(habit, logsData)
      );

      setHabits(habitsWithStats);
    } catch (err) {
      console.error('Error fetching habits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch habits');
    } finally {
      setLoading(false);
    }
  }, [user, calculateStats]);

  const createHabit = async (habitData: {
    title: string;
    description?: string;
    category: HabitCategory;
    frequency: HabitFrequency;
    color?: string;
    reminder_enabled?: boolean;
    reminder_time?: string | null;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        title: habitData.title,
        description: habitData.description || null,
        category: habitData.category,
        frequency: habitData.frequency,
        color: habitData.color || '#10B981',
        reminder_enabled: habitData.reminder_enabled || false,
        reminder_time: habitData.reminder_time || null,
      })
      .select()
      .single();

    if (error) throw error;
    
    await fetchHabits();
    return data;
  };

  const updateHabit = async (id: string, habitData: Partial<Habit>) => {
    const { error } = await supabase
      .from('habits')
      .update(habitData)
      .eq('id', id);

    if (error) throw error;
    await fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchHabits();
  };

  const mergeHabits = async (
    habitIds: string[], 
    newHabitData: { 
      title: string; 
      description: string; 
      category: HabitCategory;
    }
  ) => {
    if (!user) throw new Error('User not authenticated');
    if (habitIds.length < 2) throw new Error('Need at least 2 habits to merge');

    // Get the habits to merge for reference
    const habitsToMerge = habits.filter(h => habitIds.includes(h.id));
    
    // Calculate best color from merged habits
    const primaryHabit = habitsToMerge[0];
    const color = primaryHabit?.color || '#10B981';

    // Create the new merged habit
    const { data: newHabit, error: createError } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        title: newHabitData.title,
        description: newHabitData.description || `Merged from: ${habitsToMerge.map(h => h.title).join(', ')}`,
        category: newHabitData.category,
        frequency: 'daily',
        color,
        reminder_enabled: habitsToMerge.some(h => h.reminder_enabled),
        reminder_time: habitsToMerge.find(h => h.reminder_time)?.reminder_time || null,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Delete the old habits
    const { error: deleteError } = await supabase
      .from('habits')
      .delete()
      .in('id', habitIds);

    if (deleteError) throw deleteError;

    await fetchHabits();
    return newHabit;
  };

  const toggleHabitCompletion = async (habitId: string, date?: string) => {
    if (!user) throw new Error('User not authenticated');
    
    const completedAt = date || format(new Date(), 'yyyy-MM-dd');
    
    // Check if log exists
    const { data: existingLog } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', habitId)
      .eq('completed_at', completedAt)
      .maybeSingle();

    if (existingLog) {
      // Delete the log (toggle off)
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', existingLog.id);
      
      if (error) throw error;
    } else {
      // Create new log (toggle on)
      const { error } = await supabase
        .from('habit_logs')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          completed_at: completedAt,
          completed: true,
        });
      
      if (error) throw error;
    }

    await fetchHabits();
  };

  const getUserCategory = useCallback((): UserCategory => {
    if (habits.length === 0) return 'inconsistent';
    
    const avgCompletionRate = habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length;
    
    if (avgCompletionRate >= 80) return 'consistent';
    if (avgCompletionRate >= 50) return 'improving';
    return 'inconsistent';
  }, [habits]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return {
    habits,
    allLogs,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    mergeHabits,
    toggleHabitCompletion,
    refreshHabits: fetchHabits,
    getUserCategory,
  };
}
