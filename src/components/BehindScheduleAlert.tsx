import { useEffect, useState } from 'react';
import { HabitWithStats } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Clock } from 'lucide-react';

interface BehindScheduleAlertProps {
  habits: HabitWithStats[];
  onDismiss: () => void;
}

function getOverdueHabits(habits: HabitWithStats[]): HabitWithStats[] {
  const now = new Date();
  
  return habits.filter(habit => {
    if (habit.completedToday || !habit.reminder_time) return false;
    
    const [hours, minutes] = habit.reminder_time.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);
    
    return now.getTime() > targetTime.getTime();
  });
}

export function BehindScheduleAlert({ habits, onDismiss }: BehindScheduleAlertProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [overdueHabits, setOverdueHabits] = useState<HabitWithStats[]>([]);
  const [lastDismissed, setLastDismissed] = useState<string | null>(null);

  useEffect(() => {
    const checkOverdue = () => {
      const overdue = getOverdueHabits(habits);
      const today = new Date().toDateString();
      
      // Only show if there are overdue habits and we haven't dismissed today
      if (overdue.length > 0 && lastDismissed !== today) {
        setOverdueHabits(overdue);
        setShowAlert(true);
      }
    };

    // Check immediately
    checkOverdue();

    // Check every 5 minutes
    const interval = setInterval(checkOverdue, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [habits, lastDismissed]);

  const handleDismiss = () => {
    setShowAlert(false);
    setLastDismissed(new Date().toDateString());
    onDismiss();
  };

  if (!showAlert || overdueHabits.length === 0) return null;

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">You're Behind Schedule!</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-muted-foreground">
                You have {overdueHabits.length} habit{overdueHabits.length > 1 ? 's' : ''} that {overdueHabits.length > 1 ? 'are' : 'is'} past the scheduled time:
              </p>
              <div className="space-y-2">
                {overdueHabits.map(habit => (
                  <div 
                    key={habit.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    <Clock className="w-4 h-4 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{habit.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled for {habit.reminder_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Don't worry - you can still complete these habits today! Every small step counts.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss} className="w-full">
            Got it, I'll catch up!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
