export type HabitFrequency = 'daily' | 'weekly' | 'monthly';
export type HabitCategory = 'health' | 'fitness' | 'productivity' | 'mindfulness' | 'learning' | 'social' | 'other';
export type UserCategory = 'consistent' | 'improving' | 'inconsistent';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: HabitCategory;
  frequency: HabitFrequency;
  target_count: number;
  color: string;
  reminder_time: string | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  completed: boolean;
  notes: string | null;
  created_at: string;
}

export interface HabitWithStats extends Habit {
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  missedDays: number;
  totalDays: number;
  logs: HabitLog[];
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRewards {
  id: string;
  user_id: string;
  xp_points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: 'streak' | 'completions' | 'habits_created' | 'days_active';
  requirement_value: number;
  xp_reward: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface WeeklyData {
  day: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface MonthlyData {
  week: string;
  completed: number;
  total: number;
  percentage: number;
}

export const CATEGORY_CONFIG: Record<HabitCategory, { label: string; icon: string; color: string }> = {
  health: { label: 'Health', icon: '🩺', color: '#10B981' },
  fitness: { label: 'Fitness', icon: '💪', color: '#F59E0B' },
  productivity: { label: 'Productivity', icon: '⚡', color: '#6366F1' },
  mindfulness: { label: 'Mindfulness', icon: '🧘', color: '#8B5CF6' },
  learning: { label: 'Learning', icon: '📚', color: '#EC4899' },
  social: { label: 'Social', icon: '👥', color: '#06B6D4' },
  other: { label: 'Other', icon: '✨', color: '#64748B' },
};

export const FREQUENCY_CONFIG: Record<HabitFrequency, { label: string; days: number }> = {
  daily: { label: 'Daily', days: 1 },
  weekly: { label: 'Weekly', days: 7 },
  monthly: { label: 'Monthly', days: 30 },
};

export const XP_PER_COMPLETION = 10;
export const XP_PER_LEVEL = 100;

export const calculateLevel = (xp: number): number => {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
};

export const calculateXpProgress = (xp: number): number => {
  return xp % XP_PER_LEVEL;
};
