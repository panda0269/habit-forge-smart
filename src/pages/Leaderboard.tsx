import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Flame, Target, TrendingUp, Crown } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_habits: number;
  total_completions: number;
  best_streak: number;
  avg_completion_rate: number;
}

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
                <p className="text-2xl font-bold text-gray-500">{leaderboard[1]?.total_completions}</p>
                <p className="text-xs text-muted-foreground">completions</p>
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
                <p className="text-3xl font-bold text-yellow-600">{leaderboard[0]?.total_completions}</p>
                <p className="text-sm text-muted-foreground">completions</p>
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
                <p className="text-2xl font-bold text-amber-600">{leaderboard[2]?.total_completions}</p>
                <p className="text-xs text-muted-foreground">completions</p>
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{entry.display_name}</h3>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.total_habits} habits tracked
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="flex items-center gap-1 justify-end">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="font-bold">{entry.best_streak}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">streak</p>
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
