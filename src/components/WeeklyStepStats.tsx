import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, Footprints, Target, Award } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';

export function WeeklyStepStats() {
  const { data, isConnected, avgSteps } = useGoogleFit();
  
  const stepGoal = useMemo(() => {
    const saved = localStorage.getItem('dailyStepGoal');
    return saved ? parseInt(saved, 10) : 10000;
  }, []);

  const weeklyData = useMemo(() => {
    if (!data?.steps || data.steps.length === 0) {
      return { thisWeek: [], lastWeek: [], stats: null };
    }

    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const thisWeekSteps = data.steps.filter(s => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start: thisWeekStart, end: thisWeekEnd });
    });

    const lastWeekSteps = data.steps.filter(s => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd });
    });

    // Format for chart
    const chartData = thisWeekSteps.map(s => ({
      day: format(parseISO(s.date), 'EEE'),
      steps: s.count,
      goal: stepGoal,
      reachedGoal: s.count >= stepGoal,
    }));

    // Calculate statistics
    const thisWeekTotal = thisWeekSteps.reduce((sum, s) => sum + s.count, 0);
    const lastWeekTotal = lastWeekSteps.reduce((sum, s) => sum + s.count, 0);
    const thisWeekAvg = thisWeekSteps.length > 0 ? Math.round(thisWeekTotal / thisWeekSteps.length) : 0;
    const lastWeekAvg = lastWeekSteps.length > 0 ? Math.round(lastWeekTotal / lastWeekSteps.length) : 0;
    const daysGoalReached = thisWeekSteps.filter(s => s.count >= stepGoal).length;
    const bestDay = thisWeekSteps.length > 0 ? Math.max(...thisWeekSteps.map(s => s.count)) : 0;
    
    // Trend calculation
    const percentChange = lastWeekAvg > 0 
      ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100) 
      : 0;

    return {
      chartData,
      stats: {
        thisWeekTotal,
        thisWeekAvg,
        lastWeekTotal,
        lastWeekAvg,
        percentChange,
        daysGoalReached,
        bestDay,
        daysTracked: thisWeekSteps.length,
      }
    };
  }, [data?.steps, stepGoal]);

  if (!isConnected) {
    return null;
  }

  const { chartData, stats } = weeklyData;

  if (!stats || chartData.length === 0) {
    return (
      <Card variant="outlined" className="opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Step Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No step data available yet. Sync Google Fit to see your weekly stats.
          </p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = stats.percentChange > 0 ? TrendingUp : stats.percentChange < 0 ? TrendingDown : Minus;
  const trendColor = stats.percentChange > 0 ? 'text-green-500' : stats.percentChange < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20">
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
            Weekly Statistics
          </CardTitle>
          <Badge variant="outline" className={trendColor}>
            <TrendIcon className="h-3 w-3 mr-1" />
            {stats.percentChange > 0 ? '+' : ''}{stats.percentChange}% vs last week
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-center">
            <Footprints className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-500">{stats.thisWeekTotal.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">This Week</p>
          </div>
          <div className="p-3 rounded-xl bg-green-500/10 text-center">
            <Target className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-500">{stats.thisWeekAvg.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Daily Avg</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/10 text-center">
            <Award className="h-4 w-4 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-orange-500">{stats.daysGoalReached}/{stats.daysTracked}</p>
            <p className="text-[10px] text-muted-foreground">Goals Met</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-center">
            <TrendingUp className="h-4 w-4 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-500">{stats.bestDay.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Best Day</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [value.toLocaleString() + ' steps', 'Steps']}
              />
              <ReferenceLine 
                y={stepGoal} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Goal', 
                  position: 'right',
                  fontSize: 10,
                  fill: 'hsl(var(--primary))'
                }} 
              />
              <Bar 
                dataKey="steps" 
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Last Week Comparison */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-sm">
          <span className="text-muted-foreground">Last week average:</span>
          <span className="font-medium">{stats.lastWeekAvg.toLocaleString()} steps/day</span>
        </div>
      </CardContent>
    </Card>
  );
}
