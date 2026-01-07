import { AppLayout } from '@/components/AppLayout';
import { GoogleFitIntegration } from '@/components/GoogleFitIntegration';
import { StepGoalCard } from '@/components/StepGoalCard';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { useHabits } from '@/hooks/useHabits';
import { Activity, Footprints, Flame } from 'lucide-react';
import { toast } from 'sonner';

export default function Fitness() {
  const { todaySteps, todayCalories, isConnected } = useGoogleFit();
  const { habits, toggleHabitCompletion } = useHabits();

  const handleGoalReached = () => {
    // Auto-complete any step-related habit
    const stepHabit = habits.find(h => 
      h.title.toLowerCase().includes('step') || 
      h.title.toLowerCase().includes('walk')
    );
    
    if (stepHabit && !stepHabit.completedToday) {
      toggleHabitCompletion(stepHabit.id);
      toast.success(`"${stepHabit.title}" auto-completed!`, {
        description: 'Great job reaching your step goal!',
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-glow">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Fitness Dashboard</h1>
            <p className="text-muted-foreground">Track your steps, calories, and fitness goals</p>
          </div>
        </div>

        {/* Quick Stats - Today only */}
        {isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Footprints className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Steps Today</span>
              </div>
              <p className="text-3xl font-bold text-blue-500">{todaySteps.toLocaleString()}</p>
            </div>
            
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-muted-foreground">Calories Today</span>
              </div>
              <p className="text-3xl font-bold text-orange-500">{todayCalories.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StepGoalCard onGoalReached={handleGoalReached} />
          <GoogleFitIntegration />
        </div>
      </div>
    </AppLayout>
  );
}
