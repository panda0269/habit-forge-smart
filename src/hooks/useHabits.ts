import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Habit, HabitLog, HabitWithStats, HabitCategory, HabitFrequency, UserCategory, XP_PER_COMPLETION, calculateLevel } from '@/lib/types';
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
    // (Note: completion is one-per-habit-per-day. Duplicate rows are deduped below.)

    const habitCreatedDate = startOfDay(new Date(habit.created_at));

    // Use habit creation date as the start for stats calculation
    const effectiveStartDate = habitCreatedDate;
    const startDateStr = format(effectiveStartDate, 'yyyy-MM-dd');

    const habitLogs = logs.filter(
      (log) =>
        log.habit_id === habit.id &&
        log.completed &&
        log.completed_at >= startDateStr
    );

    // Deduplicate: treat multiple logs for the same day as one completion.
    const uniqueCompletedDates = Array.from(new Set(habitLogs.map((log) => log.completed_at)));

    const completedToday = uniqueCompletedDates.includes(todayStr);

    // Total tracked days: from effective start date through today (inclusive)
    const totalDays = Math.max(1, differenceInDays(startOfDay(new Date()), effectiveStartDate) + 1);

    const completedDays = uniqueCompletedDates.length;

    // Completion %: strictly 0..100
    const completionRate = Math.min(
      100,
      Math.max(0, Math.round((completedDays / totalDays) * 100))
    );

    // Current streak: consecutive completed days ending today. If today not completed => 0.
    let currentStreak = 0;
    if (completedToday) {
      let checkDate = startOfDay(new Date());
      while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        if (!uniqueCompletedDates.includes(dateStr)) break;
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    }

    // Longest streak: max historical consecutive run (within effective window)
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

    // Disallow impossible states (math safety)
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
      // keep underlying logs (already windowed); UI + analytics should derive from allLogs
      logs: habitLogs,
    };
  }, [user?.email]);


  const fetchHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch habits from MERN backend
      let habitsData: Habit[] = [];
      try {
        const mernResponse = await fetch(`http://localhost:5000/api/habits/${user.id}`);
        
        if (!mernResponse.ok) {
          const errorData = await mernResponse.json().catch(() => ({}));
          console.warn('MERN backend error:', errorData.error || 'Failed to fetch habits from MERN backend');
        } else {
          const mernHabits = await mernResponse.json();
          // Map MERN backend response to match expected Habit type
          habitsData = mernHabits.map((habit: any) => ({
            id: habit._id,
            user_id: habit.userId,
            title: habit.title,
            description: habit.description || null,
            category: habit.category || 'other',
            frequency: habit.frequency || 'daily',
            target_count: habit.targetCount || 1,
            color: habit.color || '#10B981',
            reminder_time: habit.reminderTime || null,
            reminder_enabled: habit.reminderEnabled || false,
            created_at: habit.createdAt,
            updated_at: habit.updatedAt || habit.createdAt,
          }));
        }
      } catch (mernError) {
        console.warn('MERN backend unavailable:', mernError);
      }

      // Fetch logs from MERN backend (MongoDB)
      let logsData: HabitLog[] = [];
      try {
        const logsResponse = await fetch(`http://localhost:5000/api/habit-logs/${user.id}`);
        
        if (!logsResponse.ok) {
          const errorData = await logsResponse.json().catch(() => ({}));
          console.warn('MERN backend error fetching logs:', errorData.error || 'Failed to fetch habit logs');
        } else {
          const mernLogs = await logsResponse.json();
          // Map MERN backend response to match expected HabitLog type
          logsData = mernLogs.map((log: any) => ({
            id: log._id,
            habit_id: log.habitId,
            user_id: log.userId,
            completed_at: log.date,
            completed: log.completed,
            notes: log.notes || null,
            created_at: log.createdAt,
          }));
        }
      } catch (logsError) {
        console.warn('MERN backend unavailable for logs:', logsError);
      }

      // Note: MongoDB has unique index on (habitId, date) so duplicates are prevented at DB level

      setAllLogs(logsData);

      const habitsWithStats = habitsData.map((habit) =>
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

    // Create habit in MERN backend (MongoDB - single source of truth)
    const response = await fetch('http://localhost:5000/api/habits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        title: habitData.title,
        description: habitData.description || null,
        category: habitData.category,
        frequency: habitData.frequency,
        color: habitData.color || '#10B981',
        reminderEnabled: habitData.reminder_enabled || false,
        reminderTime: habitData.reminder_time || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create habit');
    }

    const data = await response.json();
    await fetchHabits();
    return data;
  };

  const updateHabit = async (id: string, habitData: Partial<Habit>) => {
    // Update in MERN backend (MongoDB - single source of truth)
    const response = await fetch(`http://localhost:5000/api/habits/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: habitData.title,
        description: habitData.description,
        category: habitData.category,
        frequency: habitData.frequency,
        color: habitData.color,
        reminderEnabled: habitData.reminder_enabled,
        reminderTime: habitData.reminder_time,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update habit');
    }

    await fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    // Delete from MERN backend (MongoDB - single source of truth)
    const response = await fetch(`http://localhost:5000/api/habits/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete habit');
    }

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

    // Create the new merged habit in MERN backend
    const createResponse = await fetch('http://localhost:5000/api/habits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        title: newHabitData.title,
        description: newHabitData.description || `Merged from: ${habitsToMerge.map(h => h.title).join(', ')}`,
        category: newHabitData.category,
        frequency: 'daily',
        color,
        reminderEnabled: habitsToMerge.some(h => h.reminder_enabled),
        reminderTime: habitsToMerge.find(h => h.reminder_time)?.reminder_time || null,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create merged habit');
    }

    const newHabit = await createResponse.json();

    // Delete the old habits from MERN backend
    await Promise.all(habitIds.map(async (habitId) => {
      const deleteResponse = await fetch(`http://localhost:5000/api/habits/${habitId}`, {
        method: 'DELETE',
      });
      if (!deleteResponse.ok) {
        console.warn(`Failed to delete habit ${habitId} during merge`);
      }
    }));

    await fetchHabits();
    return newHabit;
  };

  const toggleHabitCompletion = async (habitId: string, date?: string) => {
    if (!user) throw new Error('User not authenticated');

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const completedAt = date || todayStr;

    try {
      // Toggle via MERN backend (MongoDB)
      const response = await fetch('http://localhost:5000/api/habit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          habitId,
          userId: user.id,
          date: completedAt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to toggle habit completion');
      }

      const result = await response.json();

      // XP: award only for completing *today* (not for deletions or backfill)
      if (result.action === 'created' && completedAt === todayStr) {
        const { data: rewardsRow, error: rewardsReadError } = await supabase
          .from('user_rewards')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!rewardsReadError) {
          const currentXP = rewardsRow?.xp_points ?? 0;
          const newXP = currentXP + XP_PER_COMPLETION;
          const newLevel = calculateLevel(newXP);

          if (!rewardsRow) {
            await supabase
              .from('user_rewards')
              .insert({ user_id: user.id, xp_points: newXP, level: newLevel });
          } else {
            await supabase
              .from('user_rewards')
              .update({ xp_points: newXP, level: newLevel })
              .eq('user_id', user.id);
          }
        }
      }
    } catch (mernError) {
      console.warn('MERN backend error toggling completion:', mernError);
      throw mernError;
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
