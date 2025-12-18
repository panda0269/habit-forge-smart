import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HabitWithStats, CATEGORY_CONFIG } from '@/lib/types';
import { Check, Flame, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface HabitCardProps {
  habit: HabitWithStats;
  onToggle: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}

function getTimeRemaining(reminderTime: string | null): { hours: number; minutes: number; isPast: boolean } | null {
  if (!reminderTime) return null;
  
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  
  const targetTime = new Date();
  targetTime.setHours(hours, minutes, 0, 0);
  
  const diff = targetTime.getTime() - now.getTime();
  const isPast = diff < 0;
  const absDiff = Math.abs(diff);
  
  const hoursRemaining = Math.floor(absDiff / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours: hoursRemaining, minutes: minutesRemaining, isPast };
}

export function HabitCard({ habit, onToggle, onDelete, style }: HabitCardProps) {
  const categoryConfig = CATEGORY_CONFIG[habit.category];
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; isPast: boolean } | null>(null);

  useEffect(() => {
    if (!habit.reminder_time || habit.completedToday) {
      setTimeRemaining(null);
      return;
    }

    const updateTime = () => {
      setTimeRemaining(getTimeRemaining(habit.reminder_time));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [habit.reminder_time, habit.completedToday]);

  const isBehind = timeRemaining?.isPast && !habit.completedToday;
  const isUrgent = timeRemaining && !timeRemaining.isPast && timeRemaining.hours === 0 && timeRemaining.minutes <= 30 && !habit.completedToday;

  return (
    <Card 
      variant="elevated" 
      className={cn(
        "animate-fade-in overflow-hidden", 
        habit.completedToday && "ring-2 ring-primary/50",
        isBehind && "ring-2 ring-destructive/50 bg-destructive/5",
        isUrgent && "ring-2 ring-warning/50 bg-warning/5"
      )}
      style={style}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryConfig.icon}</span>
            <div>
              <h3 className="font-semibold font-display">{habit.title}</h3>
              <p className="text-xs text-muted-foreground">{categoryConfig.label}</p>
            </div>
          </div>
          <Button
            variant={habit.completedToday ? "success" : "outline"}
            size="icon"
            onClick={onToggle}
            className={cn("transition-all", habit.completedToday && "animate-check-bounce")}
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>

        {/* Time remaining indicator */}
        {timeRemaining && !habit.completedToday && (
          <div className={cn(
            "flex items-center gap-2 text-xs mb-3 p-2 rounded-lg",
            isBehind && "bg-destructive/10 text-destructive",
            isUrgent && !isBehind && "bg-warning/10 text-warning",
            !isBehind && !isUrgent && "bg-muted text-muted-foreground"
          )}>
            <Clock className="w-3.5 h-3.5" />
            {isBehind ? (
              <span className="font-medium">
                {timeRemaining.hours > 0 ? `${timeRemaining.hours}h ` : ''}{timeRemaining.minutes}m overdue
              </span>
            ) : (
              <span>
                {timeRemaining.hours > 0 ? `${timeRemaining.hours}h ` : ''}{timeRemaining.minutes}m remaining
              </span>
            )}
          </div>
        )}

        {habit.completedToday && habit.reminder_time && (
          <div className="flex items-center gap-2 text-xs mb-3 p-2 rounded-lg bg-primary/10 text-primary">
            <Check className="w-3.5 h-3.5" />
            <span className="font-medium">Completed on time!</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-accent">
            <Flame className="w-4 h-4" />
            <span className="font-medium">{habit.currentStreak} day streak</span>
          </div>
          <span className="text-muted-foreground">{habit.completionRate}%</span>
        </div>

        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
            style={{ width: `${habit.completionRate}%` }}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
