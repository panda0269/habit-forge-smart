import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { CATEGORY_CONFIG, FREQUENCY_CONFIG } from '@/lib/types';
import { format, subDays } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';

export default function Reports() {
  const { user, loading: authLoading } = useAuth();
  const { habits, loading: habitsLoading, allLogs, getUserCategory } = useHabits();
  const { overallStats, categoryBreakdown } = useAnalytics(habits, allLogs);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || habitsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const userCategory = getUserCategory();
  const categoryColors = {
    consistent: 'bg-primary text-primary-foreground',
    improving: 'bg-accent text-accent-foreground',
    inconsistent: 'bg-secondary text-secondary-foreground',
  };

  const getTrend = (habit: typeof habits[0]) => {
    const today = new Date();
    const last7Days = allLogs.filter(log => {
      const logDate = new Date(log.completed_at);
      return log.habit_id === habit.id && log.completed && 
             logDate >= subDays(today, 7) && logDate <= today;
    }).length;
    
    const prev7Days = allLogs.filter(log => {
      const logDate = new Date(log.completed_at);
      return log.habit_id === habit.id && log.completed && 
             logDate >= subDays(today, 14) && logDate < subDays(today, 7);
    }).length;

    if (last7Days > prev7Days) return 'up';
    if (last7Days < prev7Days) return 'down';
    return 'stable';
  };

  const getHealthStatus = (completionRate: number) => {
    if (completionRate >= 80) return { status: 'Excellent', color: 'text-primary', icon: CheckCircle2 };
    if (completionRate >= 50) return { status: 'Good', color: 'text-accent', icon: Clock };
    return { status: 'Needs Attention', color: 'text-destructive', icon: AlertCircle };
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <h1 className="text-2xl font-display font-bold">Reports</h1>

        {/* Summary Card */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-2xl">Performance Summary</CardTitle>
                <CardDescription>Report generated on {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
              </div>
              <Badge className={categoryColors[userCategory]} variant="outline">
                {userCategory.charAt(0).toUpperCase() + userCategory.slice(1)} User
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-4xl font-display font-bold text-primary">{habits.length}</p>
                <p className="text-sm text-muted-foreground">Active Habits</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-display font-bold text-accent">{overallStats.totalCompletions}</p>
                <p className="text-sm text-muted-foreground">Total Completions</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-display font-bold text-secondary">{overallStats.avgCompletionRate}%</p>
                <p className="text-sm text-muted-foreground">Avg Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-display font-bold text-primary">{overallStats.daysActive}</p>
                <p className="text-sm text-muted-foreground">Days Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Habit Reports */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">Habit Details</h2>
          {habits.map((habit, index) => {
            const trend = getTrend(habit);
            const health = getHealthStatus(habit.completionRate);
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const HealthIcon = health.icon;

            return (
              <Card key={habit.id} variant="elevated" className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${habit.color}20` }}
                      >
                        {CATEGORY_CONFIG[habit.category]?.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{habit.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {FREQUENCY_CONFIG[habit.frequency]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{habit.description || 'No description'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 lg:w-auto">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendIcon className={`w-4 h-4 ${trend === 'up' ? 'text-primary' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`} />
                          <span className="text-lg font-bold">{habit.currentStreak}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Current Streak</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{habit.longestStreak}</p>
                        <p className="text-xs text-muted-foreground">Best Streak</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <HealthIcon className={`w-4 h-4 ${health.color}`} />
                          <span className="text-lg font-bold">{habit.completionRate}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{health.status}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Completion Progress</span>
                      <span className="font-medium">{habit.totalDays - habit.missedDays}/{habit.totalDays} days</span>
                    </div>
                    <Progress value={habit.completionRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Category Performance */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryBreakdown).map(([category, data]) => {
                const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                return (
                  <div key={category} className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${config?.color}20` }}
                    >
                      {config?.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{config?.label || category}</span>
                        <span className="text-sm text-muted-foreground">{data.percentage}%</span>
                      </div>
                      <Progress value={data.percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Summary */}
        <Card variant="elevated" className="animate-fade-in border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="font-display">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {overallStats.avgCompletionRate < 50 && (
                <li className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <span>Your overall completion rate is below 50%. Consider reducing the number of habits or focusing on your top priorities.</span>
                </li>
              )}
              {overallStats.maxStreak >= 7 && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <span>Great job! You've achieved a streak of {overallStats.maxStreak} days. Keep up the momentum!</span>
                </li>
              )}
              {habits.some(h => h.completionRate >= 80) && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <span>You have {habits.filter(h => h.completionRate >= 80).length} habit(s) with excellent consistency (80%+).</span>
                </li>
              )}
              {habits.some(h => h.currentStreak === 0 && h.totalDays > 3) && (
                <li className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-accent mt-0.5" />
                  <span>Some habits have broken streaks. Consider setting reminders to get back on track.</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
