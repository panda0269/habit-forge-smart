import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, TrendingDown, Minus, Trophy, Target, Flame, Calendar, Lightbulb, Save, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { CATEGORY_CONFIG } from '@/lib/types';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/AppLayout';
import { toast } from 'sonner';

export default function WeeklyReview() {
  const { user, loading: authLoading } = useAuth();
  const { habits, loading: habitsLoading, allLogs } = useHabits();
  const { weeklyData, overallStats } = useAnalytics(habits, allLogs);
  const navigate = useNavigate();

  const [reflection, setReflection] = useState('');
  const [wins, setWins] = useState('');
  const [improvements, setImprovements] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Calculate weekly stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const thisWeekLogs = allLogs.filter(log => {
    const logDate = new Date(log.completed_at);
    return logDate >= weekStart && logDate <= weekEnd && log.completed;
  });

  const lastWeekStart = subDays(weekStart, 7);
  const lastWeekEnd = subDays(weekEnd, 7);
  
  const lastWeekLogs = allLogs.filter(log => {
    const logDate = new Date(log.completed_at);
    return logDate >= lastWeekStart && logDate <= lastWeekEnd && log.completed;
  });

  const thisWeekCompletions = thisWeekLogs.length;
  const lastWeekCompletions = lastWeekLogs.length;
  const completionChange = thisWeekCompletions - lastWeekCompletions;
  const changePercentage = lastWeekCompletions > 0 
    ? Math.round((completionChange / lastWeekCompletions) * 100) 
    : thisWeekCompletions > 0 ? 100 : 0;

  // Top performing habits this week
  const habitPerformance = habits.map(habit => {
    const habitWeekLogs = thisWeekLogs.filter(log => log.habit_id === habit.id);
    const daysCompleted = habitWeekLogs.length;
    const percentage = Math.round((daysCompleted / 7) * 100);
    return { ...habit, daysCompleted, percentage };
  }).sort((a, b) => b.percentage - a.percentage);

  const topHabits = habitPerformance.filter(h => h.percentage >= 70);
  const strugglingHabits = habitPerformance.filter(h => h.percentage < 50 && h.percentage > 0);
  const missedHabits = habitPerformance.filter(h => h.percentage === 0);

  const handleSaveReflection = () => {
    // In a real app, this would save to the database
    localStorage.setItem(`weekly-review-${format(weekStart, 'yyyy-MM-dd')}`, JSON.stringify({
      reflection,
      wins,
      improvements,
      savedAt: new Date().toISOString(),
    }));
    setSaved(true);
    toast.success('Reflection saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  if (authLoading || habitsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold">Weekly Review</h1>
          <p className="text-muted-foreground">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Week at a Glance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="elevated" className="animate-fade-in">
            <CardContent className="p-5 text-center">
              <Target className="w-7 h-7 text-primary mx-auto mb-2" />
              <p className="text-2xl font-display font-bold">{thisWeekCompletions}</p>
              <p className="text-sm text-muted-foreground">Completions</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                {completionChange > 0 ? (
                  <TrendingUp className="w-7 h-7 text-primary" />
                ) : completionChange < 0 ? (
                  <TrendingDown className="w-7 h-7 text-destructive" />
                ) : (
                  <Minus className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <p className={cn(
                "text-2xl font-display font-bold",
                completionChange > 0 && "text-primary",
                completionChange < 0 && "text-destructive"
              )}>
                {completionChange > 0 ? '+' : ''}{completionChange}
              </p>
              <p className="text-sm text-muted-foreground">vs Last Week</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-5 text-center">
              <Trophy className="w-7 h-7 text-accent mx-auto mb-2" />
              <p className="text-2xl font-display font-bold">{topHabits.length}</p>
              <p className="text-sm text-muted-foreground">Star Habits</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-5 text-center">
              <Flame className="w-7 h-7 text-accent mx-auto mb-2" />
              <p className="text-2xl font-display font-bold">{overallStats.maxStreak}</p>
              <p className="text-sm text-muted-foreground">Best Streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress Chart */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Daily Progress This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Completion']}
                  />
                  <Bar 
                    dataKey="percentage" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Habit Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-primary">
                <Trophy className="w-5 h-5" />
                Star Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topHabits.length > 0 ? (
                topHabits.map(habit => (
                  <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{CATEGORY_CONFIG[habit.category].icon}</span>
                      <div>
                        <p className="font-medium">{habit.title}</p>
                        <p className="text-xs text-muted-foreground">{habit.daysCompleted}/7 days</p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">{habit.percentage}%</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No habits with 70%+ completion this week
                </p>
              )}
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-accent">
                <Lightbulb className="w-5 h-5" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {strugglingHabits.length > 0 || missedHabits.length > 0 ? (
                <>
                  {strugglingHabits.map(habit => (
                    <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{CATEGORY_CONFIG[habit.category].icon}</span>
                        <div>
                          <p className="font-medium">{habit.title}</p>
                          <p className="text-xs text-muted-foreground">{habit.daysCompleted}/7 days</p>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-accent">{habit.percentage}%</div>
                    </div>
                  ))}
                  {missedHabits.slice(0, 2).map(habit => (
                    <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{CATEGORY_CONFIG[habit.category].icon}</span>
                        <div>
                          <p className="font-medium">{habit.title}</p>
                          <p className="text-xs text-muted-foreground">Not completed this week</p>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-destructive">0%</div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All habits are on track!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reflection Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display">Weekly Reflection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="wins" className="text-base font-medium">
                🎉 What went well this week?
              </Label>
              <Textarea
                id="wins"
                placeholder="Celebrate your wins, no matter how small..."
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="improvements" className="text-base font-medium">
                🔧 What could be improved?
              </Label>
              <Textarea
                id="improvements"
                placeholder="Identify areas for growth..."
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflection" className="text-base font-medium">
                💭 Any other thoughts or insights?
              </Label>
              <Textarea
                id="reflection"
                placeholder="Free-form reflection..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={4}
              />
            </div>

            <Button 
              variant="hero" 
              size="lg" 
              className="w-full" 
              onClick={handleSaveReflection}
              disabled={saved}
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Reflection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card variant="elevated" className="animate-fade-in bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">💡 Weekly Insights</h3>
            <div className="space-y-3 text-sm">
              {changePercentage > 0 && (
                <p className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>You're up {changePercentage}% compared to last week! Keep the momentum going.</span>
                </p>
              )}
              {changePercentage < 0 && (
                <p className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <span>A slight dip from last week. Consider simplifying your routine or adjusting reminder times.</span>
                </p>
              )}
              {topHabits.length > 0 && (
                <p className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span><strong>{topHabits[0].title}</strong> is your star habit this week with {topHabits[0].percentage}% completion!</span>
                </p>
              )}
              {strugglingHabits.length > 0 && (
                <p className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span>Consider breaking down <strong>{strugglingHabits[0].title}</strong> into smaller steps.</span>
                </p>
              )}
              {habits.length > 5 && topHabits.length < habits.length / 2 && (
                <p className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>You have many habits. Consider merging similar ones to reduce overwhelm.</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
