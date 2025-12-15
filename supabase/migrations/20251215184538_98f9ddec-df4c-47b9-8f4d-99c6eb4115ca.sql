-- Add reminder_time column to habits for notification scheduling
ALTER TABLE public.habits 
ADD COLUMN reminder_time TIME DEFAULT NULL,
ADD COLUMN reminder_enabled BOOLEAN DEFAULT false;

-- Create user_rewards table for tracking XP, levels, and achievements
CREATE TABLE public.user_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  xp_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create achievements table for badge definitions
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'streak', 'completions', 'habits_created', 'days_active'
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements junction table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS on new tables
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS for user_rewards
CREATE POLICY "Users can view their own rewards" 
ON public.user_rewards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rewards" 
ON public.user_rewards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards" 
ON public.user_rewards 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Achievements are public (read-only for all authenticated users)
CREATE POLICY "Achievements are viewable by authenticated users" 
ON public.achievements 
FOR SELECT 
TO authenticated
USING (true);

-- RLS for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Trigger for updating user_rewards updated_at
CREATE TRIGGER update_user_rewards_updated_at
BEFORE UPDATE ON public.user_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, xp_reward) VALUES
  ('First Step', 'Complete your first habit', '🌱', 'completions', 1, 10),
  ('Getting Started', 'Create 3 habits', '📋', 'habits_created', 3, 25),
  ('Week Warrior', 'Reach a 7-day streak', '🔥', 'streak', 7, 50),
  ('Consistency King', 'Reach a 30-day streak', '👑', 'streak', 30, 200),
  ('Century Club', 'Complete 100 habit entries', '💯', 'completions', 100, 150),
  ('Habit Master', 'Reach a 60-day streak', '🏆', 'streak', 60, 500),
  ('Dedicated', 'Be active for 14 days', '📅', 'days_active', 14, 75),
  ('Month Strong', 'Be active for 30 days', '💪', 'days_active', 30, 150),
  ('Habit Explorer', 'Create habits in 5 different categories', '🧭', 'habits_created', 5, 100),
  ('Unstoppable', 'Reach a 100-day streak', '⚡', 'streak', 100, 1000);