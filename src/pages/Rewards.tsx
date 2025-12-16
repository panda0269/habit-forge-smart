import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRewards } from '@/hooks/useRewards';
import { useHabits } from '@/hooks/useHabits';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, Star, Lock, Sparkles, Zap } from 'lucide-react';
import { XP_PER_LEVEL, calculateXpProgress } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';

export default function Rewards() {
  const { user, loading: authLoading } = useAuth();
  const { rewards, achievements, userAchievements, loading: rewardsLoading, checkAndUnlockAchievements } = useRewards();
  const { habits, loading: habitsLoading, allLogs } = useHabits();
  const { overallStats } = useAnalytics(habits, allLogs);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (habits.length > 0 && !habitsLoading) {
      checkAndUnlockAchievements({
        totalCompletions: overallStats.totalCompletions,
        maxStreak: overallStats.maxStreak,
        habitsCreated: habits.length,
        daysActive: overallStats.daysActive,
      });
    }
  }, [habits, overallStats, habitsLoading]);

  if (authLoading || rewardsLoading || habitsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !rewards) return null;

  const xpProgress = calculateXpProgress(rewards.xp_points);
  const unlockedIds = userAchievements.map(ua => ua.achievement_id);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <h1 className="text-2xl font-display font-bold">Rewards</h1>

        {/* Level & XP Card */}
        <Card variant="elevated" className="animate-fade-in overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <CardContent className="p-8 relative">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <div className="w-28 h-28 rounded-full bg-card flex flex-col items-center justify-center">
                    <Star className="w-8 h-8 text-accent mb-1" />
                    <span className="text-3xl font-display font-bold">{rewards.level}</span>
                    <span className="text-xs text-muted-foreground">LEVEL</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  {rewards.xp_points} XP
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-display font-bold mb-2">Level {rewards.level} Achiever</h2>
                <p className="text-muted-foreground mb-4">
                  {XP_PER_LEVEL - xpProgress} XP until Level {rewards.level + 1}
                </p>
                <div className="max-w-md">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Progress to next level</span>
                    <span className="font-medium">{xpProgress}/{XP_PER_LEVEL} XP</span>
                  </div>
                  <Progress value={(xpProgress / XP_PER_LEVEL) * 100} className="h-3" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 bg-muted/50 p-4 rounded-xl">
                <Zap className="w-6 h-6 text-accent" />
                <span className="text-2xl font-bold">{userAchievements.length}</span>
                <span className="text-xs text-muted-foreground">Achievements</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="elevated" className="animate-fade-in">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{overallStats.totalCompletions}</p>
              <p className="text-xs text-muted-foreground">Completions</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{overallStats.maxStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-secondary">{habits.length}</p>
              <p className="text-xs text-muted-foreground">Habits Created</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{overallStats.daysActive}</p>
              <p className="text-xs text-muted-foreground">Days Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <div>
          <h2 className="text-xl font-display font-bold mb-4">Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {achievements.map((achievement, index) => {
              const isUnlocked = unlockedIds.includes(achievement.id);
              const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);

              return (
                <Card 
                  key={achievement.id} 
                  variant={isUnlocked ? "elevated" : "outlined"}
                  className={cn(
                    "animate-fade-in transition-all",
                    isUnlocked ? "border-accent/50" : "opacity-60"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-3xl",
                        isUnlocked ? "bg-accent/20" : "bg-muted"
                      )}>
                        {isUnlocked ? achievement.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{achievement.name}</h3>
                          {isUnlocked && <Sparkles className="w-4 h-4 text-accent" />}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            +{achievement.xp_reward} XP
                          </span>
                          {isUnlocked && userAchievement && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(userAchievement.unlocked_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* XP Earning Guide */}
        <Card variant="glass" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              How to Earn XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">+10</span>
                </div>
                <div>
                  <p className="font-medium">Complete a Habit</p>
                  <p className="text-xs text-muted-foreground">Each daily completion</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Unlock Achievements</p>
                  <p className="text-xs text-muted-foreground">10-1000 XP per badge</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium">Maintain Streaks</p>
                  <p className="text-xs text-muted-foreground">Unlock streak achievements</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
