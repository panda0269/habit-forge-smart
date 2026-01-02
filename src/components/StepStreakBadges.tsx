import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { Award, Trophy, Flame, Star, Crown, Zap, Medal, Lock } from 'lucide-react';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  requiredDays: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const STREAK_BADGES: BadgeDefinition[] = [
  {
    id: 'starter',
    name: 'First Steps',
    description: 'Reached your step goal for 3 days',
    requiredDays: 3,
    icon: <Footprints className="h-5 w-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
  },
  {
    id: 'week',
    name: 'Week Warrior',
    description: '7-day step goal streak',
    requiredDays: 7,
    icon: <Flame className="h-5 w-5" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
  },
  {
    id: 'fortnight',
    name: 'Fortnight Fighter',
    description: '14-day step goal streak',
    requiredDays: 14,
    icon: <Star className="h-5 w-5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
  },
  {
    id: 'month',
    name: 'Monthly Master',
    description: '30-day step goal streak',
    requiredDays: 30,
    icon: <Trophy className="h-5 w-5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
  },
  {
    id: 'twomonth',
    name: 'Dedicated Walker',
    description: '60-day step goal streak',
    requiredDays: 60,
    icon: <Medal className="h-5 w-5" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
  },
  {
    id: 'quarter',
    name: 'Legendary',
    description: '90-day step goal streak',
    requiredDays: 90,
    icon: <Crown className="h-5 w-5" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/20',
  },
];

// Import Footprints separately for the badge
import { Footprints } from 'lucide-react';

export function StepStreakBadges() {
  const { data, isConnected } = useGoogleFit();
  
  const stepGoal = useMemo(() => {
    const saved = localStorage.getItem('dailyStepGoal');
    return saved ? parseInt(saved, 10) : 10000;
  }, []);

  const streakData = useMemo(() => {
    if (!data?.steps || data.steps.length === 0) {
      return { current: 0, longest: 0 };
    }
    
    const sortedSteps = [...data.steps].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Calculate current streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    for (let i = 0; i < sortedSteps.length; i++) {
      const day = sortedSteps[i];
      if (i === 0 && day.date !== today && day.date !== yesterday) break;
      
      if (day.count >= stepGoal) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
    
    // Calculate longest streak
    sortedSteps.forEach((day) => {
      if (day.count >= stepGoal) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });
    
    return { current: currentStreak, longest: longestStreak };
  }, [data?.steps, stepGoal]);

  const earnedBadges = useMemo(() => {
    return STREAK_BADGES.map(badge => ({
      ...badge,
      earned: streakData.longest >= badge.requiredDays,
      progress: Math.min((streakData.longest / badge.requiredDays) * 100, 100),
    }));
  }, [streakData.longest]);

  const nextBadge = earnedBadges.find(b => !b.earned);
  const earnedCount = earnedBadges.filter(b => b.earned).length;

  if (!isConnected) {
    return null;
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20">
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            Step Achievements
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {earnedCount}/{STREAK_BADGES.length} earned
            </span>
            {streakData.current > 0 && (
              <div className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">
                <Zap className="h-3 w-3" />
                {streakData.current} day streak
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Current & Longest Streak */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 text-center">
            <Flame className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-500">{streakData.current}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-center">
            <Trophy className="h-6 w-6 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-500">{streakData.longest}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </div>

        {/* Next Badge Progress */}
        {nextBadge && (
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${nextBadge.bgColor} ${nextBadge.color}`}>
                {nextBadge.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Next: {nextBadge.name}</p>
                <p className="text-xs text-muted-foreground">{nextBadge.description}</p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${nextBadge.progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {streakData.longest}/{nextBadge.requiredDays} days ({Math.round(nextBadge.progress)}%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Badges Grid */}
        <div className="grid grid-cols-3 gap-2">
          {earnedBadges.map((badge) => (
            <div
              key={badge.id}
              className={`
                p-3 rounded-xl text-center transition-all duration-300
                ${badge.earned 
                  ? `${badge.bgColor} border border-${badge.color.replace('text-', '')}/30` 
                  : 'bg-muted/30 opacity-50'
                }
              `}
              title={badge.description}
            >
              <div className={`mx-auto mb-1 ${badge.earned ? badge.color : 'text-muted-foreground'}`}>
                {badge.earned ? badge.icon : <Lock className="h-5 w-5 mx-auto" />}
              </div>
              <p className={`text-[10px] font-medium ${badge.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                {badge.name}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {badge.requiredDays} days
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
