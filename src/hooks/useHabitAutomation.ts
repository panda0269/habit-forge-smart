import { useState, useCallback, useEffect } from 'react';
import { aiApi } from '@/lib/api';
import { HabitWithStats, UserCategory } from '@/lib/types';
import { format } from 'date-fns';

interface AutoUpdate {
  habitId: string;
  habitTitle: string;
  action: 'mark_missed' | 'reschedule' | 'simplify' | 'merge' | 'encourage';
  reason: string;
  severity: 'info' | 'warning' | 'critical';
  suggestedTime?: string;
  originalDifficulty?: string;
  newDifficulty?: string;
}

interface MicroHabit {
  title: string;
  duration: string;
  relatedHabit: string | null;
  actionSteps: string[];
  bestTime: string;
  motivation: string;
}

interface SystemDecision {
  decision: string;
  reasoning: string;
  impactedHabits: string[];
  confidence: number;
}

interface AutomationResult {
  autoUpdates: AutoUpdate[];
  microHabit: MicroHabit;
  systemDecision: SystemDecision;
  insights: string[];
}

export function useHabitAutomation(habits: HabitWithStats[], userCategory: UserCategory) {
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runAutomation = useCallback(async () => {
    if (habits.length === 0) return;
    
    // Prevent running too frequently (max once per 5 minutes)
    if (lastRunTime && Date.now() - lastRunTime.getTime() < 5 * 60 * 1000) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const dayOfWeek = now.getDay();

      const habitData = habits.map(h => ({
        id: h.id,
        title: h.title,
        description: h.description,
        category: h.category,
        frequency: h.frequency,
        color: h.color,
        reminder_time: h.reminder_time,
        reminder_enabled: h.reminder_enabled,
        created_at: h.created_at,
        completedToday: h.completedToday,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
        completionRate: h.completionRate,
        missedDays: h.missedDays,
        totalDays: h.totalDays,
        logs: h.logs.slice(0, 14).map(l => ({
          completed_at: l.completed_at,
          completed: l.completed
        }))
      }));

      const data = await aiApi.getAutomation(habitData, userCategory, currentTime, dayOfWeek);

      setResult(data);
      setLastRunTime(now);
    } catch (err) {
      console.error('Automation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to run automation');
    } finally {
      setLoading(false);
    }
  }, [habits, userCategory, lastRunTime]);

  return {
    result,
    loading,
    error,
    runAutomation,
    lastRunTime
  };
}
