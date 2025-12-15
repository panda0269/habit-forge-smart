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
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
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
