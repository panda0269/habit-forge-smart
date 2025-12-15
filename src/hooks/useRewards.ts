import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserRewards, Achievement, UserAchievement, XP_PER_COMPLETION, calculateLevel } from '@/lib/types';
import { toast } from 'sonner';

export function useRewards() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!user) {
      setRewards(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch or create user rewards
      let { data: rewardsData, error: rewardsError } = await supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (rewardsError) throw rewardsError;

      if (!rewardsData) {
        const { data: newRewards, error: createError } = await supabase
          .from('user_rewards')
          .insert({ user_id: user.id, xp_points: 0, level: 1 })
          .select()
          .single();

        if (createError) throw createError;
        rewardsData = newRewards;
      }

      setRewards(rewardsData as UserRewards);

      // Fetch all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData as Achievement[]);

      // Fetch user achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;
      setUserAchievements(userAchievementsData as UserAchievement[]);

    } catch (err) {
      console.error('Error fetching rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addXP = async (amount: number = XP_PER_COMPLETION) => {
    if (!user || !rewards) return;

    const newXP = rewards.xp_points + amount;
    const newLevel = calculateLevel(newXP);

    const { error } = await supabase
      .from('user_rewards')
      .update({ xp_points: newXP, level: newLevel })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error adding XP:', error);
      return;
    }

    if (newLevel > rewards.level) {
      toast.success(`🎉 Level Up! You're now Level ${newLevel}!`);
    }

    await fetchRewards();
  };

  const checkAndUnlockAchievements = async (stats: {
    totalCompletions: number;
    maxStreak: number;
    habitsCreated: number;
    daysActive: number;
  }) => {
    if (!user) return;

    const unlockedIds = userAchievements.map(ua => ua.achievement_id);
    const newAchievements: Achievement[] = [];

    for (const achievement of achievements) {
      if (unlockedIds.includes(achievement.id)) continue;

      let unlocked = false;
      switch (achievement.requirement_type) {
        case 'completions':
          unlocked = stats.totalCompletions >= achievement.requirement_value;
          break;
        case 'streak':
          unlocked = stats.maxStreak >= achievement.requirement_value;
          break;
        case 'habits_created':
          unlocked = stats.habitsCreated >= achievement.requirement_value;
          break;
        case 'days_active':
          unlocked = stats.daysActive >= achievement.requirement_value;
          break;
      }

      if (unlocked) {
        const { error } = await supabase
          .from('user_achievements')
          .insert({ user_id: user.id, achievement_id: achievement.id });

        if (!error) {
          newAchievements.push(achievement);
          await addXP(achievement.xp_reward);
        }
      }
    }

    if (newAchievements.length > 0) {
      for (const achievement of newAchievements) {
        toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
          description: achievement.description,
        });
      }
      await fetchRewards();
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return {
    rewards,
    achievements,
    userAchievements,
    loading,
    addXP,
    checkAndUnlockAchievements,
    refreshRewards: fetchRewards,
  };
}
