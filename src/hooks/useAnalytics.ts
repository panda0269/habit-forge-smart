import { useMemo } from 'react';
import { HabitWithStats, WeeklyData, MonthlyData, HabitLog } from '@/lib/types';
import { format, subDays, endOfWeek, eachDayOfInterval, eachWeekOfInterval, startOfMonth, endOfMonth } from 'date-fns';

function uniqueCompletedHabitsForDay(allLogs: HabitLog[], dateStr: string): number {
  // Protect against duplicate habit_logs rows for the same habit/day.
  const uniqueHabitIds = new Set(
    allLogs
      .filter((log) => log.completed_at === dateStr && log.completed)
      .map((log) => log.habit_id)
  );
  return uniqueHabitIds.size;
}

function uniqueCompletionPairs(allLogs: HabitLog[]): number {
  const pairs = new Set(
    allLogs
      .filter((log) => log.completed)
      .map((log) => `${log.habit_id}|${log.completed_at}`)
  );
  return pairs.size;
}

export function useAnalytics(habits: HabitWithStats[], allLogs: HabitLog[]) {
  const weeklyData = useMemo((): WeeklyData[] => {
    const today = new Date();
    const data: WeeklyData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEE');

      const completed = uniqueCompletedHabitsForDay(allLogs, dateStr);
      const total = habits.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      data.push({ day: dayName, completed, total, percentage });
    }

    return data;
  }, [habits, allLogs]);

  const monthlyData = useMemo((): MonthlyData[] => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const daysInWeek = eachDayOfInterval({
        start: weekStart < monthStart ? monthStart : weekStart,
        end: weekEnd > monthEnd ? monthEnd : weekEnd > today ? today : weekEnd,
      });

      let completed = 0;
      let total = 0;

      daysInWeek.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        completed += uniqueCompletedHabitsForDay(allLogs, dateStr);
        total += habits.length;
      });

      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        week: `Week ${index + 1}`,
        completed,
        total,
        percentage,
      };
    });
  }, [habits, allLogs]);

  const calendarData = useMemo(() => {
    const today = new Date();
    const days: { date: Date; completed: number; total: number; percentage: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const completed = uniqueCompletedHabitsForDay(allLogs, dateStr);
      const total = habits.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      days.push({ date, completed, total, percentage });
    }

    return days;
  }, [habits, allLogs]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { completed: number; total: number; percentage: number }> = {};

    habits.forEach((habit) => {
      if (!breakdown[habit.category]) {
        breakdown[habit.category] = { completed: 0, total: 0, percentage: 0 };
      }
      breakdown[habit.category].total += habit.totalDays;
      breakdown[habit.category].completed += habit.totalDays - habit.missedDays;
    });

    Object.keys(breakdown).forEach((key) => {
      breakdown[key].percentage =
        breakdown[key].total > 0
          ? Math.round((breakdown[key].completed / breakdown[key].total) * 100)
          : 0;
    });

    return breakdown;
  }, [habits]);

  const overallStats = useMemo(() => {
    const totalCompletions = uniqueCompletionPairs(allLogs);
    const maxStreak = Math.max(...habits.map((h) => h.longestStreak), 0);
    const avgCompletionRate =
      habits.length > 0
        ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length)
        : 0;

    const uniqueDates = new Set(allLogs.filter((log) => log.completed).map((log) => log.completed_at));
    const daysActive = uniqueDates.size;

    return {
      totalCompletions,
      maxStreak,
      avgCompletionRate,
      daysActive,
      totalHabits: habits.length,
    };
  }, [habits, allLogs]);

  return {
    weeklyData,
    monthlyData,
    calendarData,
    categoryBreakdown,
    overallStats,
  };
}

