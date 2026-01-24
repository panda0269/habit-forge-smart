import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { habitsApi, habitLogsApi, rewardsApi } from '@/lib/api';
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
    const habitCreatedDate = startOfDay(new Date(habit.created_at));
    const effectiveStartDate = habitCreatedDate;
    const startDateStr = format(effectiveStartDate, 'yyyy-MM-dd');

    const habitLogs = logs.filter(
      (log) =>
        log.habit_id === habit.id &&
        log.completed &&
        log.completed_at >= startDateStr
    );

    const uniqueCompletedDates = Array.from(new Set(habitLogs.map((log) => log.completed_at)));
    const completedToday = uniqueCompletedDates.includes(todayStr);
    const totalDays = Math.max(1, differenceInDays(startOfDay(new Date()), effectiveStartDate) + 1);
    const completedDays = uniqueCompletedDates.length;
    const completionRate = Math.min(100, Math.max(0, Math.round((completedDays / totalDays) * 100)));

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

      // Fetch habits from MERN backend
      let habitsData: Habit[] = [];
      try {
        const mernHabits = await habitsApi.getAll(user.id);
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
      } catch (mernError) {
        console.warn('MERN backend unavailable:', mernError);
      }

      // Fetch logs from MERN backend
      let logsData: HabitLog[] = [];
      try {
        const mernLogs = await habitLogsApi.getByUser(user.id);
        logsData = mernLogs.map((log: any) => ({
          id: log._id,
          habit_id: log.habitId,
          user_id: log.userId,
          completed_at: log.date,
          completed: log.completed,
          notes: log.notes || null,
          created_at: log.createdAt,
        }));
      } catch (logsError) {
        console.warn('MERN backend unavailable for logs:', logsError);
      }

      setAllLogs(logsData);
      const habitsWithStats = habitsData.map((habit) => calculateStats(habit, logsData));
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

    const data = await habitsApi.create({
      userId: user.id,
      title: habitData.title,
      description: habitData.description || null,
      category: habitData.category,
      frequency: habitData.frequency,
      color: habitData.color || '#10B981',
      reminderEnabled: habitData.reminder_enabled || false,
      reminderTime: habitData.reminder_time || null,
    });

    await fetchHabits();
    return data;
  };

  const updateHabit = async (id: string, habitData: Partial<Habit>) => {
    await habitsApi.update(id, {
      title: habitData.title,
      description: habitData.description,
      category: habitData.category,
      frequency: habitData.frequency,
      color: habitData.color,
      reminderEnabled: habitData.reminder_enabled,
      reminderTime: habitData.reminder_time,
    });
    await fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    await habitsApi.delete(id);
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

    const habitsToMerge = habits.filter((h) => habitIds.includes(h.id));
    const primaryHabit = habitsToMerge[0];
    const color = primaryHabit?.color || '#10B981';

    const newHabit = await habitsApi.create({
      userId: user.id,
      title: newHabitData.title,
      description: newHabitData.description || `Merged from: ${habitsToMerge.map((h) => h.title).join(', ')}`,
      category: newHabitData.category,
      frequency: 'daily',
      color,
      reminderEnabled: habitsToMerge.some((h) => h.reminder_enabled),
      reminderTime: habitsToMerge.find((h) => h.reminder_time)?.reminder_time || null,
    });

    await Promise.all(habitIds.map((habitId) => habitsApi.delete(habitId).catch(() => {})));
    await fetchHabits();
    return newHabit;
  };

  const toggleHabitCompletion = async (habitId: string, date?: string) => {
    if (!user) throw new Error('User not authenticated');

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const completedAt = date || todayStr;

    try {
      const result = await habitLogsApi.toggle(habitId, user.id, completedAt);

      // Award XP for completing today
      if (result.action === 'created' && completedAt === todayStr) {
        try {
          await rewardsApi.addXP(XP_PER_COMPLETION);
        } catch (xpError) {
          console.warn('Failed to add XP:', xpError);
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
