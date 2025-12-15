import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HabitWithStats, CATEGORY_CONFIG } from '@/lib/types';
import { Check, Flame, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitCardProps {
  habit: HabitWithStats;
  onToggle: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}

export function HabitCard({ habit, onToggle, onDelete, style }: HabitCardProps) {
  const categoryConfig = CATEGORY_CONFIG[habit.category];

  return (
    <Card 
      variant="elevated" 
      className={cn("animate-fade-in overflow-hidden", habit.completedToday && "ring-2 ring-primary/50")}
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
