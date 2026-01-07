import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronLeft, ChevronRight, Check, CalendarDays } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  subMonths, 
  addMonths, 
  isToday, 
  isFuture,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks
} from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitWithStats } from '@/lib/types';

interface HabitCalendarProps {
  habits: HabitWithStats[];
  onToggleHabit: (habitId: string, date: string) => void;
}

type ViewMode = 'month' | 'week';

export function HabitCalendar({ habits, onToggleHabit }: HabitCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Calculate days based on view mode
  const daysToShow = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  }, [currentDate, viewMode]);

  // For month view padding
  const startDayOfWeek = viewMode === 'month' ? startOfMonth(currentDate).getDay() : 0;
  const paddingDays = viewMode === 'month' ? Array.from({ length: startDayOfWeek }, () => null) : [];
  const allDays = [...paddingDays, ...daysToShow];

  // Calculate completion data for each day
  const dayCompletionData = useMemo(() => {
    const data: Record<string, { completed: number; total: number }> = {};
    
    daysToShow.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const completed = habits.filter(h => 
        h.logs?.some(log => log.completed_at === dateStr && log.completed)
      ).length;
      data[dateStr] = { completed, total: habits.length };
    });
    
    return data;
  }, [habits, daysToShow]);

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getCompletionColor = (completed: number, total: number) => {
    if (total === 0) return 'bg-muted';
    const rate = completed / total;
    if (rate === 0) return 'bg-muted';
    if (rate < 0.5) return 'bg-red-500/30';
    if (rate < 0.75) return 'bg-yellow-500/30';
    if (rate < 1) return 'bg-emerald-500/50';
    return 'bg-emerald-500';
  };

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const habitsForSelectedDate = selectedDate && !isFuture(selectedDate) ? habits.map(habit => ({
    ...habit,
    completedOnDate: habit.logs?.some(log => log.completed_at === selectedDateStr && log.completed) ?? false
  })) : [];

  const getHeaderTitle = () => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Habit Calendar
          </CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="week" className="text-xs px-3 h-6">
                <CalendarDays className="h-3 w-3 mr-1" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3 h-6">
                <Calendar className="h-3 w-3 mr-1" />
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm font-medium">
            {getHeaderTitle()}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="text-xs h-8">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className={cn(
          "grid grid-cols-7 gap-1",
          viewMode === 'week' && "gap-2"
        )}>
          {allDays.map((day, index) => {
            if (!day) {
              return <div key={`padding-${index}`} className="aspect-square" />;
            }

            const dateStr = format(day, 'yyyy-MM-dd');
            const data = dayCompletionData[dateStr] || { completed: 0, total: 0 };
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const isFutureDate = isFuture(day);

            return (
              <button
                key={dateStr}
                onClick={() => !isFutureDate && setSelectedDate(day)}
                disabled={isFutureDate}
                className={cn(
                  "rounded-lg flex flex-col items-center justify-center text-sm transition-all relative",
                  viewMode === 'week' ? "aspect-square p-2 min-h-[70px]" : "aspect-square",
                  isFutureDate && "opacity-30 cursor-not-allowed",
                  !isFutureDate && "hover:ring-2 hover:ring-primary/50 cursor-pointer",
                  isSelected && "ring-2 ring-primary bg-primary/10",
                  isTodayDate && !isSelected && "ring-1 ring-primary/30",
                  getCompletionColor(data.completed, data.total)
                )}
              >
                <span className={cn(
                  "font-medium",
                  viewMode === 'week' && "text-lg",
                  isTodayDate && "text-primary font-bold"
                )}>
                  {format(day, 'd')}
                </span>
                {viewMode === 'week' && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(day, 'EEE')}
                  </span>
                )}
                {data.completed > 0 && !isFutureDate && (
                  <span className={cn(
                    "text-muted-foreground",
                    viewMode === 'week' ? "text-xs mt-1" : "text-[10px]"
                  )}>
                    {data.completed}/{data.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date details */}
        {selectedDate && !isFuture(selectedDate) && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <h4 className="font-medium text-sm">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h4>
            {habitsForSelectedDate.length === 0 ? (
              <p className="text-sm text-muted-foreground">No habits to track</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {habitsForSelectedDate.map(habit => (
                  <div 
                    key={habit.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg transition-colors",
                      habit.completedOnDate ? "bg-primary/10" : "bg-muted/50"
                    )}
                  >
                    <span className="text-sm">{habit.title}</span>
                    <Button
                      variant={habit.completedOnDate ? "success" : "outline"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onToggleHabit(habit.id, selectedDateStr!)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
