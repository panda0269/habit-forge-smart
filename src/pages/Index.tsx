import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Sparkles, Flame, Target, TrendingUp, Bell } from 'lucide-react';
import { HabitCard } from '@/components/HabitCard';
import { CreateHabitDialog } from '@/components/CreateHabitDialog';
import { EditHabitDialog } from '@/components/EditHabitDialog';
import { AIRecommendations } from '@/components/AIRecommendations';
import { AppLayout } from '@/components/AppLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { BehindScheduleAlert } from '@/components/BehindScheduleAlert';
import { HabitAutomationPanel } from '@/components/HabitAutomationPanel';
import { HabitTemplates } from '@/components/HabitTemplates';
import { HabitCategory, HabitFrequency, HabitWithStats } from '@/lib/types';
import { toast } from 'sonner';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { habits, loading: habitsLoading, toggleHabitCompletion, deleteHabit, updateHabit, getUserCategory, refreshHabits, mergeHabits, createHabit } = useHabits();
  const { scheduleHabitReminders, permission, requestPermission, testNotification, isSupported } = useNotifications();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStats | null>(null);
  const [aiTriggerCount, setAiTriggerCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (habits.length > 0 && permission === 'granted') {
      scheduleHabitReminders(habits);
    }
  }, [habits, scheduleHabitReminders, permission]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleToggleHabit = useCallback(async (habitId: string) => {
    await toggleHabitCompletion(habitId);
    setAiTriggerCount(prev => prev + 1);
  }, [toggleHabitCompletion]);

  const handleHabitCreated = useCallback(async () => {
    // Refresh habits list after creation
    await refreshHabits();
    setAiTriggerCount(prev => prev + 1);
  }, [refreshHabits]);

  const handleMergeHabits = useCallback(async (
    selectedHabitIds: string[], 
    newHabitData: { title: string; description: string; category: any }
  ) => {
    await mergeHabits(selectedHabitIds, newHabitData);
    toast.success(`Merged ${selectedHabitIds.length} habits into "${newHabitData.title}"`);
    setAiTriggerCount(prev => prev + 1);
  }, [mergeHabits]);

  const handleAddTemplateHabits = useCallback(async (templateHabits: {
    title: string;
    description: string;
    category: HabitCategory;
    frequency: HabitFrequency;
    color: string;
    reminder_time: string | null;
  }[]) => {
    for (const habit of templateHabits) {
      await createHabit({
        title: habit.title,
        description: habit.description,
        category: habit.category,
        frequency: habit.frequency,
        color: habit.color,
        reminder_enabled: !!habit.reminder_time,
        reminder_time: habit.reminder_time,
      });
    }
    toast.success(`Added ${templateHabits.length} habits from template!`);
    setAiTriggerCount(prev => prev + 1);
  }, [createHabit]);

  const handleEditHabit = useCallback((habit: HabitWithStats) => {
    setSelectedHabit(habit);
    setEditDialogOpen(true);
  }, []);

  const handleSaveHabit = useCallback(async (id: string, data: {
    title: string;
    description: string | null;
    category: HabitCategory;
    frequency: HabitFrequency;
    reminder_enabled: boolean;
    reminder_time: string | null;
  }) => {
    await updateHabit(id, data);
    setAiTriggerCount(prev => prev + 1);
  }, [updateHabit]);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      scheduleHabitReminders(habits);
    }
  };

  if (authLoading || habitsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const completedToday = habits.filter(h => h.completedToday).length;
  const totalStreak = habits.reduce((sum, h) => sum + h.currentStreak, 0);
  const avgCompletion = habits.length > 0 
    ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length) 
    : 0;
  
  const habitsWithReminders = habits.filter(h => h.reminder_enabled).length;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Notification Banner */}
        {isSupported && permission !== 'granted' && habits.length > 0 && (
          <Card variant="outlined" className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">Get reminded to complete your habits</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleEnableNotifications}>
                Enable
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated" className="animate-fade-in">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-display font-bold">{completedToday}/{habits.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Streak Days</p>
                <p className="text-2xl font-display font-bold">{totalStreak}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-display font-bold">{avgCompletion}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Habits Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-display font-bold">Your Habits</h2>
              {habitsWithReminders > 0 && permission === 'granted' && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  {habitsWithReminders} with reminders
                </span>
              )}
            </div>
            <Button variant="hero" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Habit
            </Button>
          </div>
          
          {habits.length === 0 ? (
            <div className="space-y-6">
              <Card variant="outlined" className="p-8 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No habits yet</h3>
                <p className="text-muted-foreground mb-4">Start with a template pack or create your own habit!</p>
                <Button variant="hero" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Custom Habit
                </Button>
              </Card>
              <HabitTemplates 
                onAddHabits={handleAddTemplateHabits} 
                existingHabitCount={habits.length}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {habits.map((habit, index) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggle={() => handleToggleHabit(habit.id)}
                  onDelete={() => deleteHabit(habit.id)}
                  onEdit={() => handleEditHabit(habit)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick-Add Templates (when user has habits) */}
        {habits.length > 0 && (
          <HabitTemplates 
            onAddHabits={handleAddTemplateHabits} 
            existingHabitCount={habits.length}
          />
        )}

        {/* Habit Automation Panel */}
        {habits.length > 0 && (
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">🤖 Automation Engine</h2>
            <HabitAutomationPanel 
              habits={habits} 
              userCategory={getUserCategory()} 
              onMergeHabits={handleMergeHabits}
            />
          </section>
        )}

        {/* AI Recommendations */}
        {habits.length > 0 && (
          <AIRecommendations 
            habits={habits} 
            userCategory={getUserCategory()} 
            triggerCount={aiTriggerCount}
          />
        )}
      </div>

      <CreateHabitDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
        onHabitCreated={handleHabitCreated}
      />

      <EditHabitDialog
        habit={selectedHabit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveHabit}
      />

      {/* Behind Schedule Alert */}
      <BehindScheduleAlert 
        habits={habits} 
        onDismiss={() => {}} 
      />
    </AppLayout>
  );
}
