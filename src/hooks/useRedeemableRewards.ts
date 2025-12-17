import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRewards } from './useRewards';
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
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('redeemable_rewards')
        .select('*')
        .eq('is_active', true)
        .order('xp_cost', { ascending: true });

      if (rewardsError) throw rewardsError;
      setRedeemableRewards(rewardsData as RedeemableReward[]);

      // Fetch user's redeemed rewards
      const { data: redeemedData, error: redeemedError } = await supabase
        .from('user_redeemed_rewards')
        .select('*, reward:redeemable_rewards(*)')
        .eq('user_id', user.id);

      if (redeemedError) throw redeemedError;
      setRedeemedRewards(redeemedData as UserRedeemedReward[]);

    } catch (err) {
      console.error('Error fetching redeemable rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const redeemReward = async (rewardId: string) => {
    if (!user || !rewards) return false;

    const reward = redeemableRewards.find(r => r.id === rewardId);
    if (!reward) {
      toast.error('Reward not found');
      return false;
    }

    // Check if already redeemed
    if (redeemedRewards.some(r => r.reward_id === rewardId)) {
      toast.error('You already have this reward!');
      return false;
    }

    // Check if user has enough XP
    if (rewards.xp_points < reward.xp_cost) {
      toast.error(`Not enough XP! You need ${reward.xp_cost - rewards.xp_points} more XP.`);
      return false;
    }

    try {
      // Deduct XP from user
      const newXP = rewards.xp_points - reward.xp_cost;
      const { error: updateError } = await supabase
        .from('user_rewards')
        .update({ xp_points: newXP })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record the redemption
      const { error: redeemError } = await supabase
        .from('user_redeemed_rewards')
        .insert({ user_id: user.id, reward_id: rewardId });

      if (redeemError) throw redeemError;

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
