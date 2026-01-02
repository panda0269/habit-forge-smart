import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { ChevronLeft, ChevronRight, Calendar, Footprints } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, subMonths, addMonths, isToday, parseISO, isSameDay } from 'date-fns';

export function MonthlyStepCalendar() {
  const { data, isConnected } = useGoogleFit();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const stepGoal = useMemo(() => {
    const saved = localStorage.getItem('dailyStepGoal');
    return saved ? parseInt(saved, 10) : 10000;
  }, []);

  const calendarData = useMemo(() => {
    if (!data?.steps) return [];
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const stepData = data.steps.find(s => s.date === dateStr);
      const steps = stepData?.count || 0;
      const percentage = stepGoal > 0 ? (steps / stepGoal) * 100 : 0;
      
      return {
        date: day,
        dateStr,
        steps,
        percentage,
        reachedGoal: steps >= stepGoal,
      };
    });
  }, [data?.steps, currentMonth, stepGoal]);

  const monthStats = useMemo(() => {
    const daysWithData = calendarData.filter(d => d.steps > 0);
    const totalSteps = daysWithData.reduce((sum, d) => sum + d.steps, 0);
    const avgSteps = daysWithData.length > 0 ? Math.round(totalSteps / daysWithData.length) : 0;
    const goalsReached = calendarData.filter(d => d.reachedGoal).length;
    const bestDay = daysWithData.length > 0 ? Math.max(...daysWithData.map(d => d.steps)) : 0;
    
    return { totalSteps, avgSteps, goalsReached, bestDay, daysWithData: daysWithData.length };
  }, [calendarData]);

  // Get intensity color based on percentage of goal
  const getIntensityColor = (percentage: number, steps: number) => {
    if (steps === 0) return 'bg-muted/30';
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-green-400';
    if (percentage >= 50) return 'bg-blue-400';
    if (percentage >= 25) return 'bg-blue-300';
    return 'bg-blue-200';
  };

  // Get start day offset (0 = Sunday, 1 = Monday, etc.)
  const startDayOffset = getDay(startOfMonth(currentMonth));

  if (!isConnected) {
    return null;
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20">
              <Calendar className="h-4 w-4 text-emerald-500" />
            </div>
            Monthly Overview
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              disabled={isSameMonth(currentMonth, new Date())}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{monthStats.totalSteps.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Steps</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{monthStats.avgSteps.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Daily Avg</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-green-500">{monthStats.goalsReached}</p>
            <p className="text-[10px] text-muted-foreground">Goals Met</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-purple-500">{monthStats.bestDay.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Best Day</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] text-muted-foreground font-medium py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Calendar days */}
            {calendarData.map((day) => (
              <div
                key={day.dateStr}
                className={`
                  aspect-square rounded-md flex flex-col items-center justify-center relative cursor-default
                  transition-all duration-200 hover:ring-2 hover:ring-primary/50
                  ${getIntensityColor(day.percentage, day.steps)}
                  ${isToday(day.date) ? 'ring-2 ring-primary' : ''}
                `}
                title={`${format(day.date, 'MMM d')}: ${day.steps.toLocaleString()} steps (${Math.round(day.percentage)}%)`}
              >
                <span className={`text-[10px] font-medium ${day.steps > 0 ? 'text-white' : 'text-muted-foreground'}`}>
                  {format(day.date, 'd')}
                </span>
                {day.reachedGoal && (
                  <Footprints className="h-2.5 w-2.5 text-white absolute bottom-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">Less</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <div className="w-3 h-3 rounded-sm bg-blue-200" />
            <div className="w-3 h-3 rounded-sm bg-blue-300" />
            <div className="w-3 h-3 rounded-sm bg-blue-400" />
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <div className="w-3 h-3 rounded-sm bg-green-500" />
          </div>
          <span className="text-[10px] text-muted-foreground">Goal+</span>
        </div>
      </CardContent>
    </Card>
  );
}
