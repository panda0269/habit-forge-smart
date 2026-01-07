import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths, isToday, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitWithStats } from '@/lib/types';

interface HabitCalendarProps {
  habits: HabitWithStats[];
  onToggleHabit: (habitId: string, date: string) => void;
}

export function HabitCalendar({ habits, onToggleHabit }: HabitCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  // Create padding days for the start of the month
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => null);

  const allDays = [...paddingDays, ...daysInMonth];

  // Calculate completion data for each day
  const dayCompletionData = useMemo(() => {
    const data: Record<string, { completed: number; total: number }> = {};
    
    daysInMonth.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const completed = habits.filter(h => 
        h.logs?.some(log => log.completed_at === dateStr && log.completed)
      ).length;
      data[dateStr] = { completed, total: habits.length };
    });
    
    return data;
  }, [habits, daysInMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
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

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Habit Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {format(currentMonth, 'MMMM yyyy')}
        </p>
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
        <div className="grid grid-cols-7 gap-1">
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
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative",
                  isFutureDate && "opacity-30 cursor-not-allowed",
                  !isFutureDate && "hover:ring-2 hover:ring-primary/50 cursor-pointer",
                  isSelected && "ring-2 ring-primary bg-primary/10",
                  isTodayDate && !isSelected && "ring-1 ring-primary/30",
                  getCompletionColor(data.completed, data.total)
                )}
              >
                <span className={cn(
                  "font-medium",
                  isTodayDate && "text-primary font-bold"
                )}>
                  {format(day, 'd')}
                </span>
                {data.completed > 0 && !isFutureDate && (
                  <span className="text-[10px] text-muted-foreground">
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
