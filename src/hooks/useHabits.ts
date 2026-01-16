import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Habit, HabitLog, HabitWithStats, HabitCategory, HabitFrequency, UserCategory, XP_PER_COMPLETION, calculateLevel } from '@/lib/types';
import { format, subDays, differenceInDays, startOfDay, parseISO } from 'date-fns';

// Demo accounts that need special treatment for accurate metrics display
// (Used only to make demo numbers human-sane; does NOT affect XP awarding.)
const DEMO_EMAILS = ['pandasyaysyo@gmail.com', 'janwee12c@gmail.com'];
// Demo safety window per requirement: recompute metrics from Dec 1, 2025 -> today
const DEMO_FIX_START_DATE = startOfDay(parseISO('2025-12-01'));
// Bump key so the one-time cleanup runs again after logic changes
const DEMO_FIX_STORAGE_KEY = 'demo_metrics_fix_v4_done';

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

    // Demo safety: for demo accounts, we compute "total days" starting from Dec 1, 2025.
    // This avoids confusing demo states like a long active streak paired with a tiny % caused by
    // very old habit creation dates (e.g. created Dec 2024 = 400+ days ago).
    const isDemoAccount = DEMO_EMAILS.includes(user?.email ?? '');
    const effectiveStartDate =
      isDemoAccount && habitCreatedDate < DEMO_FIX_START_DATE
        ? DEMO_FIX_START_DATE
        : habitCreatedDate;

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

      let logsData = logsResponse.data as HabitLog[];

      // DEMO SAFETY: one-time correction pass for demo accounts.
      // Removes duplicate completion rows for the same habit/day (Dec 1, 2025 -> today).
      const isDemoAccount = DEMO_EMAILS.includes(user.email ?? '');
      if (isDemoAccount) {
        try {
          const alreadyDone = localStorage.getItem(DEMO_FIX_STORAGE_KEY) === '1';
          if (!alreadyDone) {
            const startStr = format(DEMO_FIX_START_DATE, 'yyyy-MM-dd');
            const groups = new Map<string, HabitLog[]>();

            for (const log of logsData) {
              if (!log.completed) continue;
              if (log.completed_at < startStr) continue;
              const k = `${log.habit_id}|${log.completed_at}`;
              const arr = groups.get(k);
              if (arr) arr.push(log);
              else groups.set(k, [log]);
            }

            const idsToDelete: string[] = [];
            for (const [, arr] of groups) {
              if (arr.length <= 1) continue;
              arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              for (let i = 1; i < arr.length; i++) idsToDelete.push(arr[i].id);
            }

            if (idsToDelete.length > 0) {
              const { error: deleteError } = await supabase
                .from('habit_logs')
                .delete()
                .in('id', idsToDelete);

              if (deleteError) throw deleteError;

              const idsSet = new Set(idsToDelete);
              logsData = logsData.filter((l) => !idsSet.has(l.id));
            }

            localStorage.setItem(DEMO_FIX_STORAGE_KEY, '1');
          }
        } catch (e) {
          // Non-fatal: continue without blocking dashboard rendering
          console.warn('Demo correction pass failed:', e);
        }
      }

      setAllLogs(logsData);

      const habitsWithStats = (habitsResponse.data as Habit[]).map((habit) =>
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
    // Send to MERN backend
    try {
      const mernResponse = await fetch(`http://localhost:5000/api/habits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: habitData.title,
          frequency: habitData.frequency,
        }),
      });

      if (!mernResponse.ok) {
        const errorData = await mernResponse.json().catch(() => ({}));
        console.warn('MERN backend error:', errorData.error || 'Failed to update habit in MERN backend');
      }
    } catch (mernError) {
      console.warn('MERN backend unavailable:', mernError);
    }

    // Update in Supabase (existing Lovable backend)
    const { error } = await supabase
      .from('habits')
      .update(habitData)
      .eq('id', id);

    if (error) throw error;
    await fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    // Send to MERN backend
    try {
      const mernResponse = await fetch(`http://localhost:5000/api/habits/${id}`, {
        method: 'DELETE',
      });

      if (!mernResponse.ok) {
        const errorData = await mernResponse.json().catch(() => ({}));
        console.warn('MERN backend error:', errorData.error || 'Failed to delete habit in MERN backend');
      }
    } catch (mernError) {
      console.warn('MERN backend unavailable:', mernError);
    }

    // Delete from Supabase (existing Lovable backend)
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

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const completedAt = date || todayStr;

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

      // XP: award only for completing *today* (no backfill / recalculation impact)
      if (completedAt === todayStr) {
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
