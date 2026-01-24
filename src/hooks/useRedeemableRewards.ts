import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useRewards } from './useRewards';
import { rewardsApi } from '@/lib/api';
import { toast } from 'sonner';

export interface RedeemableReward {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_cost: number;
  reward_type: 'badge' | 'theme' | 'title' | 'boost';
  is_active: boolean;
  created_at: string;
}

export interface UserRedeemedReward {
  id: string;
  user_id: string;
  reward_id: string;
  redeemed_at: string;
  reward?: RedeemableReward;
}

export function useRedeemableRewards() {
  const { user } = useAuth();
  const { rewards, refreshRewards } = useRewards();
  const [redeemableRewards, setRedeemableRewards] = useState<RedeemableReward[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<UserRedeemedReward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!user) {
      setRedeemableRewards([]);
      setRedeemedRewards([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch all active redeemable rewards
      const rewardsData = await rewardsApi.getRedeemable();
      setRedeemableRewards(rewardsData.map((r: any) => ({
        id: r._id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        xp_cost: r.xpCost,
        reward_type: r.rewardType,
        is_active: r.isActive,
        created_at: r.createdAt,
      })));

      // Fetch user's redeemed rewards
      const redeemedData = await rewardsApi.getUserRedeemed();
      setRedeemedRewards(redeemedData.map((r: any) => ({
        id: r.id,
        user_id: r.userId,
        reward_id: r.rewardId,
        redeemed_at: r.redeemedAt,
        reward: r.reward ? {
          id: r.reward._id,
          name: r.reward.name,
          description: r.reward.description,
          icon: r.reward.icon,
          xp_cost: r.reward.xpCost,
          reward_type: r.reward.rewardType,
          is_active: r.reward.isActive,
          created_at: r.reward.createdAt,
        } : undefined,
      })));
    } catch (err) {
      console.error('Error fetching redeemable rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const redeemReward = async (rewardId: string) => {
    if (!user || !rewards) return false;

    const reward = redeemableRewards.find((r) => r.id === rewardId);
    if (!reward) {
      toast.error('Reward not found');
      return false;
    }

    // Check if already redeemed
    if (redeemedRewards.some((r) => r.reward_id === rewardId)) {
      toast.error('You already have this reward!');
      return false;
    }

    // Check if user has enough XP
    if (rewards.xp_points < reward.xp_cost) {
      toast.error(`Not enough XP! You need ${reward.xp_cost - rewards.xp_points} more XP.`);
      return false;
    }

    try {
      await rewardsApi.redeem(rewardId);

      toast.success(`🎉 You redeemed ${reward.name}!`, {
        description: `${reward.xp_cost} XP spent`,
      });

      // Refresh data
      await fetchRewards();
      await refreshRewards();

      return true;
    } catch (err) {
      console.error('Error redeeming reward:', err);
      toast.error('Failed to redeem reward. Please try again.');
      return false;
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return {
    redeemableRewards,
    redeemedRewards,
    loading,
    redeemReward,
    refreshRewards: fetchRewards,
  };
}
