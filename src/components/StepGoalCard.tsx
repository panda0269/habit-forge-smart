import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Footprints, Target, Trophy, Settings, X, Check, Flame, Zap } from 'lucide-react';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { toast } from 'sonner';

interface StepGoalCardProps {
  onGoalReached?: () => void;
}

export function StepGoalCard({ onGoalReached }: StepGoalCardProps) {
  const { data, isConnected } = useGoogleFit();
  const [stepGoal, setStepGoal] = useState<number>(() => {
    const saved = localStorage.getItem('dailyStepGoal');
    return saved ? parseInt(saved, 10) : 10000;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(stepGoal.toString());
  const [hasNotifiedGoal, setHasNotifiedGoal] = useState(false);

  // Get today's steps from the data
  const todaySteps = data?.steps?.find(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.date === today;
  })?.count || 0;

  // Calculate step goal streak
  const stepStreak = useMemo(() => {
    if (!data?.steps || data.steps.length === 0) return { current: 0, longest: 0, daysReached: 0 };
    
    const sortedSteps = [...data.steps].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let daysReached = 0;
    
    // Count days goal was reached
    sortedSteps.forEach(day => {
      if (day.count >= stepGoal) daysReached++;
    });
    
    // Calculate current streak (starting from today or yesterday)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    for (let i = 0; i < sortedSteps.length; i++) {
      const day = sortedSteps[i];
      // Start counting from today or yesterday
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
    
    return { current: currentStreak, longest: longestStreak, daysReached };
  }, [data?.steps, stepGoal]);

  const progress = Math.min((todaySteps / stepGoal) * 100, 100);
  const isGoalReached = todaySteps >= stepGoal;
  const stepsRemaining = Math.max(stepGoal - todaySteps, 0);

  // Notify when goal is reached
  useEffect(() => {
    if (isGoalReached && !hasNotifiedGoal && todaySteps > 0) {
      toast.success('🎉 Daily step goal reached!', {
        description: `You've walked ${todaySteps.toLocaleString()} steps today!`
      });
      setHasNotifiedGoal(true);
      onGoalReached?.();
    }
  }, [isGoalReached, hasNotifiedGoal, todaySteps, onGoalReached]);

  // Reset notification flag at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      setHasNotifiedGoal(false);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  const handleSaveGoal = () => {
    const newGoal = parseInt(tempGoal, 10);
    if (isNaN(newGoal) || newGoal < 1000) {
      toast.error('Please enter a goal of at least 1,000 steps');
      return;
    }
    if (newGoal > 100000) {
      toast.error('Please enter a goal less than 100,000 steps');
      return;
    }
    setStepGoal(newGoal);
    localStorage.setItem('dailyStepGoal', newGoal.toString());
    setIsEditing(false);
    toast.success('Step goal updated!');
  };

  const presetGoals = [5000, 7500, 10000, 12500, 15000];

  if (!isConnected) {
    return (
      <Card variant="outlined" className="opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Footprints className="h-4 w-4 text-muted-foreground" />
            Daily Step Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect Google Fit to track your step goals
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20">
              <Footprints className="h-4 w-4 text-blue-500" />
            </div>
            Daily Step Goal
          </CardTitle>
          <div className="flex items-center gap-2">
            {stepStreak.current > 0 && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                <Zap className="h-3 w-3 mr-1" />
                {stepStreak.current} day streak
              </Badge>
            )}
            {isGoalReached ? (
              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                <Trophy className="h-3 w-3 mr-1" />
                Done!
              </Badge>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => {
                  setTempGoal(stepGoal.toString());
                  setIsEditing(true);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={tempGoal}
                onChange={(e) => setTempGoal(e.target.value)}
                className="h-9"
                placeholder="Enter step goal"
                min={1000}
                max={100000}
              />
              <Button size="icon" variant="ghost" onClick={handleSaveGoal}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presetGoals.map((goal) => (
                <Button
                  key={goal}
                  variant={parseInt(tempGoal) === goal ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setTempGoal(goal.toString())}
                >
                  {goal.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {todaySteps.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  of {stepGoal.toLocaleString()} steps
                </p>
              </div>
              <div className="text-right">
                {isGoalReached ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <Flame className="h-5 w-5" />
                    <span className="font-semibold">+{(todaySteps - stepGoal).toLocaleString()}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {stepsRemaining.toLocaleString()} to go
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={progress} 
                className={`h-3 ${isGoalReached ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {stepGoal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Streak Stats */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-bold text-orange-500">{stepStreak.current}</p>
                <p className="text-[10px] text-muted-foreground">Current Streak</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-purple-500">{stepStreak.longest}</p>
                <p className="text-[10px] text-muted-foreground">Best Streak</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-500">{stepStreak.daysReached}</p>
                <p className="text-[10px] text-muted-foreground">Goals Hit</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
