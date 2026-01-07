import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Flame, Target, TrendingUp, Crown, Zap, Star, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_habits: number;
  total_completions: number;
  best_streak: number;
  avg_completion_rate: number;
}

// Achievement badges based on stats
const getAchievementBadges = (entry: LeaderboardEntry) => {
  const badges: { icon: React.ReactNode; label: string; color: string }[] = [];
  
  // Streak badges
  if (entry.best_streak >= 30) {
    badges.push({ icon: <Flame className="w-3 h-3" />, label: "🔥 Fire Streak", color: "bg-orange-500/20 text-orange-600 border-orange-500/30" });
  } else if (entry.best_streak >= 14) {
    badges.push({ icon: <Zap className="w-3 h-3" />, label: "⚡ Hot Streak", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" });
  } else if (entry.best_streak >= 7) {
    badges.push({ icon: <Star className="w-3 h-3" />, label: "✨ Week Warrior", color: "bg-amber-500/20 text-amber-600 border-amber-500/30" });
  }
  
  // Completion rate badges
  if (entry.avg_completion_rate >= 95) {
    badges.push({ icon: <Crown className="w-3 h-3" />, label: "👑 Perfectionist", color: "bg-purple-500/20 text-purple-600 border-purple-500/30" });
  } else if (entry.avg_completion_rate >= 80) {
    badges.push({ icon: <Target className="w-3 h-3" />, label: "🎯 Consistent", color: "bg-green-500/20 text-green-600 border-green-500/30" });
  }
  
  // Volume badges
  if (entry.total_completions >= 200) {
    badges.push({ icon: <Sparkles className="w-3 h-3" />, label: "💪 Power User", color: "bg-blue-500/20 text-blue-600 border-blue-500/30" });
  } else if (entry.total_completions >= 100) {
    badges.push({ icon: <Heart className="w-3 h-3" />, label: "❤️ Dedicated", color: "bg-pink-500/20 text-pink-600 border-pink-500/30" });
  }
  
  // Habit count badges
  if (entry.total_habits >= 7) {
    badges.push({ icon: <Star className="w-3 h-3" />, label: "🌟 Multitasker", color: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30" });
  }
  
  return badges;
};

// Streak indicator component
const StreakIndicator = ({ streak }: { streak: number }) => {
  const getStreakLevel = () => {
    if (streak >= 30) return { flames: 5, color: 'text-red-500', label: 'Legendary' };
    if (streak >= 21) return { flames: 4, color: 'text-orange-500', label: 'Epic' };
    if (streak >= 14) return { flames: 3, color: 'text-yellow-500', label: 'Hot' };
    if (streak >= 7) return { flames: 2, color: 'text-amber-400', label: 'Warm' };
    if (streak >= 3) return { flames: 1, color: 'text-amber-300', label: 'Starting' };
    return { flames: 0, color: 'text-muted-foreground', label: '' };
  };
  
  const { flames, color, label } = getStreakLevel();
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: Math.max(1, flames) }).map((_, i) => (
          <Flame key={i} className={cn("w-4 h-4", flames > 0 ? color : 'text-muted-foreground/30')} />
        ))}
      </div>
      <span className="font-bold text-lg">{streak}</span>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
};

export default function Leaderboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase.rpc('get_leaderboard');
        if (error) throw error;
        setLeaderboard(data || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const userRank = leaderboard.findIndex(entry => entry.user_id === user?.id) + 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">
              See how you stack up against other habit builders (last 30 days)
            </p>
          </div>
          {userRank > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Your Rank: #{userRank}
            </Badge>
          )}
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Second Place */}
            <Card className="relative overflow-hidden border-gray-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 to-gray-400" />
              <CardContent className="pt-6 text-center">
                <Medal className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <Avatar className="w-16 h-16 mx-auto mb-3 border-4 border-gray-300">
                  <AvatarImage src={leaderboard[1]?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-gray-200 to-gray-300 text-2xl font-bold">
                    {leaderboard[1]?.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold truncate">{leaderboard[1]?.display_name}</h3>
                <div className="my-2">
                  <StreakIndicator streak={leaderboard[1]?.best_streak || 0} />
                </div>
                <p className="text-xl font-bold text-gray-500">{leaderboard[1]?.total_completions}</p>
                <p className="text-xs text-muted-foreground mb-2">completions</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {getAchievementBadges(leaderboard[1]).slice(0, 2).map((badge, i) => (
                    <span key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", badge.color)}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* First Place */}
            <Card className="relative overflow-hidden border-yellow-400 shadow-lg scale-105">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 to-amber-500" />
              <CardContent className="pt-6 text-center">
                <Crown className="w-14 h-14 text-yellow-500 mx-auto mb-2" />
                <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-yellow-400 shadow-glow">
                  <AvatarImage src={leaderboard[0]?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-yellow-300 to-amber-400 text-3xl font-bold">
                    {leaderboard[0]?.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-lg truncate">{leaderboard[0]?.display_name}</h3>
                <div className="my-2">
                  <StreakIndicator streak={leaderboard[0]?.best_streak || 0} />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{leaderboard[0]?.total_completions}</p>
                <p className="text-sm text-muted-foreground mb-2">completions</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {getAchievementBadges(leaderboard[0]).slice(0, 3).map((badge, i) => (
                    <span key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", badge.color)}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Third Place */}
            <Card className="relative overflow-hidden border-amber-600">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
              <CardContent className="pt-6 text-center">
                <Award className="w-12 h-12 text-amber-600 mx-auto mb-2" />
                <Avatar className="w-16 h-16 mx-auto mb-3 border-4 border-amber-500">
                  <AvatarImage src={leaderboard[2]?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-bold">
                    {leaderboard[2]?.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold truncate">{leaderboard[2]?.display_name}</h3>
                <div className="my-2">
                  <StreakIndicator streak={leaderboard[2]?.best_streak || 0} />
                </div>
                <p className="text-xl font-bold text-amber-600">{leaderboard[2]?.total_completions}</p>
                <p className="text-xs text-muted-foreground mb-2">completions</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {getAchievementBadges(leaderboard[2]).slice(0, 2).map((badge, i) => (
                    <span key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", badge.color)}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              All Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No leaderboard data yet. Start tracking habits to compete!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.user_id === user?.id;
                  const badges = getAchievementBadges(entry);
                  
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                        isCurrentUser 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRankBadge(rank)}`}>
                        {rank <= 3 ? getRankIcon(rank) : <span className="font-bold">{rank}</span>}
                      </div>
                      
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarImage src={entry.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {entry.display_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{entry.display_name}</h3>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {badges.slice(0, 3).map((badge, i) => (
                            <span key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", badge.color)}>
                              {badge.label}
                            </span>
                          ))}
                          {badges.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{badges.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-right">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: Math.min(3, Math.ceil(entry.best_streak / 10)) }).map((_, i) => (
                              <Flame key={i} className={cn(
                                "w-3 h-3",
                                entry.best_streak >= 21 ? "text-red-500" :
                                entry.best_streak >= 14 ? "text-orange-500" :
                                entry.best_streak >= 7 ? "text-yellow-500" : "text-amber-300"
                              )} />
                            ))}
                          </div>
                          <span className="font-bold">{entry.best_streak}</span>
                          <p className="text-[10px] text-muted-foreground">streak</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1 justify-end">
                            <Target className="w-4 h-4 text-green-500" />
                            <span className="font-bold">{entry.avg_completion_rate}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">rate</p>
                        </div>
                        
                        <div className="min-w-[80px]">
                          <p className="font-bold text-lg">{entry.total_completions}</p>
                          <p className="text-xs text-muted-foreground">completions</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}