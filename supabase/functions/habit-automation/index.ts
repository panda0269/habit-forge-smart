import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HabitData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  color: string;
  reminder_time: string | null;
  reminder_enabled: boolean;
  created_at: string;
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  missedDays: number;
  totalDays: number;
  logs: Array<{ completed_at: string; completed: boolean }>;
}

interface AutomationRequest {
  habits: HabitData[];
  userCategory: 'consistent' | 'improving' | 'inconsistent';
  currentTime: string;
  dayOfWeek: number;
}

interface AutomationResult {
  autoUpdates: AutoUpdate[];
  microHabit: MicroHabit;
  systemDecision: SystemDecision;
  insights: string[];
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { habits, userCategory, currentTime, dayOfWeek }: AutomationRequest = await req.json();
    
    console.log(`Automation engine started - ${habits.length} habits, category: ${userCategory}`);

    const currentHour = parseInt(currentTime.split(':')[0]);
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isEvening = currentHour >= 18;
    const isMorning = currentHour >= 6 && currentHour < 12;

    // Analysis functions
    const analyzeHabitPatterns = (habit: HabitData) => {
      const recentLogs = habit.logs.slice(0, 7);
      const missedThisWeek = 7 - recentLogs.length;
      const isChronicStruggle = habit.completionRate < 30;
      const isStreakBroken = habit.currentStreak === 0 && habit.longestStreak > 3;
      const needsReschedule = missedThisWeek >= 3;
      const isOverdue = habit.reminder_time && !habit.completedToday && 
        currentTime > habit.reminder_time;
      
      return {
        missedThisWeek,
        isChronicStruggle,
        isStreakBroken,
        needsReschedule,
        isOverdue,
        completionTrend: habit.completionRate > 50 ? 'positive' : 'negative'
      };
    };

    // Generate auto-updates
    const autoUpdates: AutoUpdate[] = [];
    const insights: string[] = [];

    for (const habit of habits) {
      const analysis = analyzeHabitPatterns(habit);

      // 1. Auto-mark as missed if overdue and pattern suggests it won't be done
      if (analysis.isOverdue && analysis.isChronicStruggle) {
        autoUpdates.push({
          habitId: habit.id,
          habitTitle: habit.title,
          action: 'mark_missed',
          reason: `Typically not completed after ${habit.reminder_time}. Pattern shows ${habit.completionRate}% completion rate.`,
          severity: 'warning'
        });
      }

      // 2. Suggest rescheduling for frequently missed habits
      if (analysis.needsReschedule) {
        const suggestedTime = isMorning ? '07:00' : '19:00';
        autoUpdates.push({
          habitId: habit.id,
          habitTitle: habit.title,
          action: 'reschedule',
          reason: `Missed ${analysis.missedThisWeek} times this week. Consider a different time slot.`,
          severity: 'critical',
          suggestedTime
        });
      }

      // 3. Simplify habits for struggling users
      if ((userCategory === 'inconsistent' || analysis.isChronicStruggle) && habit.totalDays > 7) {
        autoUpdates.push({
          habitId: habit.id,
          habitTitle: habit.title,
          action: 'simplify',
          reason: `Completion rate is ${habit.completionRate}%. Reducing scope may help build momentum.`,
          severity: 'info',
          originalDifficulty: 'full',
          newDifficulty: 'micro'
        });
      }

      // 4. Encourage on streak breaks
      if (analysis.isStreakBroken) {
        autoUpdates.push({
          habitId: habit.id,
          habitTitle: habit.title,
          action: 'encourage',
          reason: `You had a ${habit.longestStreak}-day streak! Let's rebuild it starting today.`,
          severity: 'info'
        });
      }
    }

    // 4. Detect habit overload and suggest merging
    const categoryGroups: Record<string, HabitData[]> = {};
    habits.forEach(h => {
      if (!categoryGroups[h.category]) categoryGroups[h.category] = [];
      categoryGroups[h.category].push(h);
    });

    for (const [category, categoryHabits] of Object.entries(categoryGroups)) {
      if (categoryHabits.length >= 3 && userCategory !== 'consistent') {
        const lowPerformers = categoryHabits.filter(h => h.completionRate < 50);
        if (lowPerformers.length >= 2) {
          autoUpdates.push({
            habitId: lowPerformers[0].id,
            habitTitle: `${category} habits`,
            action: 'merge',
            reason: `${lowPerformers.length} similar ${category} habits struggling. Consider combining into one focused habit.`,
            severity: 'warning'
          });
        }
      }
    }

    // Generate micro-habit for today
    const incompleteHabits = habits.filter(h => !h.completedToday);
    const easiestHabit = incompleteHabits.sort((a, b) => b.completionRate - a.completionRate)[0];
    
    const microHabitTemplates: Record<string, { action: string; steps: string[] }> = {
      health: { 
        action: 'Do 5 deep breaths', 
        steps: ['Sit comfortably', 'Breathe in for 4 seconds', 'Hold for 4 seconds', 'Exhale for 4 seconds'] 
      },
      fitness: { 
        action: 'Do 10 stretches', 
        steps: ['Stretch arms overhead', 'Touch your toes', 'Roll your shoulders', 'Neck rotations'] 
      },
      productivity: { 
        action: 'Clear 3 items from desk', 
        steps: ['Identify 3 items', 'Put each in its place', 'Wipe surface clean'] 
      },
      mindfulness: { 
        action: 'Notice 5 things around you', 
        steps: ['Look around slowly', 'Name 5 things you see', 'Notice their colors', 'Appreciate the moment'] 
      },
      learning: { 
        action: 'Read one page of any book', 
        steps: ['Pick up a book', 'Read just one page', 'Note one thing you learned'] 
      },
      social: { 
        action: 'Send one appreciation text', 
        steps: ['Think of someone you appreciate', 'Write a short thank you', 'Send it'] 
      },
      other: { 
        action: 'Write down one small win from today', 
        steps: ['Reflect on your day', 'Find one positive thing', 'Write it down'] 
      }
    };

    const baseCategory = easiestHabit?.category || 'other';
    const template = microHabitTemplates[baseCategory] || microHabitTemplates.other;

    const microHabit: MicroHabit = {
      title: template.action,
      duration: '2-5 minutes',
      relatedHabit: easiestHabit?.title || null,
      actionSteps: template.steps,
      bestTime: isEvening ? 'Now (wind down time)' : isMorning ? 'Right after this' : 'During your next break',
      motivation: easiestHabit 
        ? `This builds momentum for "${easiestHabit.title}"` 
        : 'Small actions create big changes over time'
    };

    // Generate system-level decision
    let systemDecision: SystemDecision;

    const avgCompletionRate = habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length;
    const totalHabits = habits.length;
    const criticalHabits = autoUpdates.filter(u => u.severity === 'critical').length;

    if (criticalHabits >= 2) {
      systemDecision = {
        decision: 'REDUCE_LOAD',
        reasoning: `${criticalHabits} habits need urgent attention. Recommending habit consolidation to prevent burnout.`,
        impactedHabits: autoUpdates.filter(u => u.severity === 'critical').map(u => u.habitTitle),
        confidence: 0.85
      };
    } else if (avgCompletionRate > 80 && userCategory === 'consistent') {
      systemDecision = {
        decision: 'READY_TO_LEVEL_UP',
        reasoning: `You're crushing it with ${Math.round(avgCompletionRate)}% completion! Consider adding a new challenge.`,
        impactedHabits: [],
        confidence: 0.9
      };
    } else if (userCategory === 'inconsistent' && totalHabits > 3) {
      systemDecision = {
        decision: 'FOCUS_MODE',
        reasoning: `Tracking ${totalHabits} habits with inconsistent completion. Focusing on top 2-3 habits will yield better results.`,
        impactedHabits: habits.sort((a, b) => a.completionRate - b.completionRate).slice(0, 2).map(h => h.title),
        confidence: 0.75
      };
    } else if (isEvening && incompleteHabits.length > 0) {
      systemDecision = {
        decision: 'EVENING_PUSH',
        reasoning: `${incompleteHabits.length} habits remaining for today. Let's try to complete at least one more.`,
        impactedHabits: incompleteHabits.slice(0, 2).map(h => h.title),
        confidence: 0.7
      };
    } else {
      systemDecision = {
        decision: 'MAINTAIN_COURSE',
        reasoning: 'Current habit load and completion patterns are sustainable. Keep going!',
        impactedHabits: [],
        confidence: 0.8
      };
    }

    // Generate insights
    if (habits.length > 0) {
      const bestDay = habits.reduce((best, h) => {
        return h.completionRate > best.rate ? { habit: h.title, rate: h.completionRate } : best;
      }, { habit: '', rate: 0 });
      
      insights.push(`🏆 Your best habit: "${bestDay.habit}" at ${bestDay.rate}% completion`);
      
      if (isWeekday) {
        insights.push(`📅 Weekday mode: Focus on quick wins during work hours`);
      } else {
        insights.push(`🌟 Weekend energy: Great time for longer habits`);
      }

      if (totalStreak(habits) > 10) {
        insights.push(`🔥 Combined streak power: ${totalStreak(habits)} days across all habits!`);
      }
    }

    const result: AutomationResult = {
      autoUpdates,
      microHabit,
      systemDecision,
      insights
    };

    console.log(`Automation complete: ${autoUpdates.length} updates, decision: ${systemDecision.decision}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Automation engine error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function totalStreak(habits: HabitData[]): number {
  return habits.reduce((sum, h) => sum + h.currentStreak, 0);
}
