import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { rewardsApi } from '@/lib/api';
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
      // Fetch user rewards
      const rewardsData = await rewardsApi.getUserRewards();
      setRewards({
        id: rewardsData.id || user.id,
        user_id: user.id,
        xp_points: rewardsData.xpPoints || 0,
        level: rewardsData.level || 1,
        created_at: rewardsData.createdAt || new Date().toISOString(),
        updated_at: rewardsData.updatedAt || new Date().toISOString(),
      });

      // Fetch all achievements
      const achievementsData = await rewardsApi.getAchievements();
      setAchievements(achievementsData.map((a: any) => ({
        id: a._id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        requirement_type: a.requirementType,
        requirement_value: a.requirementValue,
        xp_reward: a.xpReward,
        created_at: a.createdAt,
      })));

      // Fetch user achievements
      const userAchievementsData = await rewardsApi.getUserAchievements();
      setUserAchievements(userAchievementsData.map((ua: any) => ({
        id: ua.id,
        user_id: ua.userId,
        achievement_id: ua.achievementId,
        unlocked_at: ua.unlockedAt,
        achievement: ua.achievement ? {
          id: ua.achievement._id,
          name: ua.achievement.name,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          requirement_type: ua.achievement.requirementType,
          requirement_value: ua.achievement.requirementValue,
          xp_reward: ua.achievement.xpReward,
          created_at: ua.achievement.createdAt,
        } : undefined,
      })));
    } catch (err) {
      console.error('Error fetching rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addXP = async (amount: number = XP_PER_COMPLETION) => {
    if (!user || !rewards) return;

    try {
      const result = await rewardsApi.addXP(amount);
      
      if (result.leveledUp) {
        toast.success(`🎉 Level Up! You're now Level ${result.newLevel}!`);
      }

      await fetchRewards();
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  };

  const checkAndUnlockAchievements = async (stats: {
    totalCompletions: number;
    maxStreak: number;
    habitsCreated: number;
    daysActive: number;
  }) => {
    if (!user) return;

    const unlockedIds = userAchievements.map((ua) => ua.achievement_id);
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
        try {
          await rewardsApi.unlockAchievement(achievement.id);
          newAchievements.push(achievement);
        } catch (error) {
          console.error('Error unlocking achievement:', error);
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
