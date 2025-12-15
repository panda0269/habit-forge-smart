import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, TrendingUp, Calendar, Target, Flame, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CATEGORY_CONFIG } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { habits, loading: habitsLoading, allLogs } = useHabits();
  const { weeklyData, monthlyData, calendarData, categoryBreakdown, overallStats } = useAnalytics(habits, allLogs);
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

  const pieData = Object.entries(categoryBreakdown).map(([category, data]) => ({
    name: CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.label || category,
    value: data.completed,
    color: CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.color || '#64748B',
  }));

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-primary';
    if (percentage >= 50) return 'bg-accent';
    if (percentage > 0) return 'bg-secondary';
    return 'bg-muted';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-glow">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display font-bold">Analytics</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="elevated" className="animate-fade-in">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{overallStats.totalCompletions}</p>
              <p className="text-sm text-muted-foreground">Total Completions</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6 text-center">
              <Flame className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{overallStats.maxStreak}</p>
              <p className="text-sm text-muted-foreground">Longest Streak</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-secondary mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{overallStats.avgCompletionRate}%</p>
              <p className="text-sm text-muted-foreground">Avg Completion</p>
            </CardContent>
          </Card>
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{overallStats.daysActive}</p>
              <p className="text-sm text-muted-foreground">Days Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Trend Chart */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display">Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Completion']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPercentage)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Progress */}
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <CardTitle className="font-display">Monthly Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                      formatter={(value: number) => [`${value}%`, 'Completion']}
                    />
                    <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <CardTitle className="font-display">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Heatmap */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              30-Day Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                  {day}
                </div>
              ))}
              {calendarData.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all hover:scale-105 cursor-default',
                    getCompletionColor(day.percentage)
                  )}
                  title={`${format(day.date, 'MMM d')}: ${day.completed}/${day.total} (${day.percentage}%)`}
                >
                  <span className={cn(
                    'font-semibold',
                    day.percentage > 0 ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}>
                    {format(day.date, 'd')}
                  </span>
                  {day.percentage > 0 && (
                    <span className="text-[10px] text-primary-foreground/80">{day.percentage}%</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted" />
                <span className="text-xs text-muted-foreground">0%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-secondary" />
                <span className="text-xs text-muted-foreground">1-49%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-accent" />
                <span className="text-xs text-muted-foreground">50-79%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span className="text-xs text-muted-foreground">80%+</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
