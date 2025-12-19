import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sun, 
  Moon, 
  Dumbbell, 
  Brain, 
  Sparkles,
  Coffee,
  BookOpen,
  Heart,
  Zap,
  Plus,
  Check,
  Package
} from 'lucide-react';
import { HabitCategory, HabitFrequency } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HabitTemplate {
  title: string;
  description: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  color: string;
  reminder_time: string | null;
}

interface TemplatePack {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  habits: HabitTemplate[];
}

const templatePacks: TemplatePack[] = [
  {
    id: 'morning',
    name: 'Morning Routine',
    description: 'Start your day with energy and purpose',
    icon: <Sun className="w-6 h-6" />,
    gradient: 'from-amber-500/20 to-orange-500/20',
    habits: [
      { title: 'Wake up early', description: 'Rise before 7 AM', category: 'health', frequency: 'daily', color: '#F59E0B', reminder_time: '06:30' },
      { title: 'Drink water', description: 'Start with a glass of water', category: 'health', frequency: 'daily', color: '#06B6D4', reminder_time: '06:35' },
      { title: 'Morning stretch', description: '5-minute body stretch', category: 'fitness', frequency: 'daily', color: '#10B981', reminder_time: '06:45' },
      { title: 'Healthy breakfast', description: 'Eat a nutritious breakfast', category: 'health', frequency: 'daily', color: '#8B5CF6', reminder_time: '07:15' },
    ]
  },
  {
    id: 'evening',
    name: 'Evening Wind-down',
    description: 'Relax and prepare for restful sleep',
    icon: <Moon className="w-6 h-6" />,
    gradient: 'from-indigo-500/20 to-purple-500/20',
    habits: [
      { title: 'Digital sunset', description: 'No screens 1 hour before bed', category: 'mindfulness', frequency: 'daily', color: '#6366F1', reminder_time: '21:00' },
      { title: 'Evening reflection', description: 'Journal 3 things you\'re grateful for', category: 'mindfulness', frequency: 'daily', color: '#EC4899', reminder_time: '21:30' },
      { title: 'Prepare for tomorrow', description: 'Set out clothes and plan next day', category: 'productivity', frequency: 'daily', color: '#F59E0B', reminder_time: '21:45' },
      { title: 'Sleep by 10:30', description: 'Get to bed on time', category: 'health', frequency: 'daily', color: '#8B5CF6', reminder_time: '22:15' },
    ]
  },
  {
    id: 'fitness',
    name: 'Fitness Starter',
    description: 'Build strength and endurance gradually',
    icon: <Dumbbell className="w-6 h-6" />,
    gradient: 'from-green-500/20 to-emerald-500/20',
    habits: [
      { title: '10-minute walk', description: 'Get moving every day', category: 'fitness', frequency: 'daily', color: '#10B981', reminder_time: '07:00' },
      { title: 'Bodyweight exercises', description: 'Push-ups, squats, planks', category: 'fitness', frequency: 'daily', color: '#F59E0B', reminder_time: '07:30' },
      { title: 'Stay hydrated', description: 'Drink 8 glasses of water', category: 'health', frequency: 'daily', color: '#06B6D4', reminder_time: '09:00' },
      { title: 'Stretch session', description: '10-minute flexibility routine', category: 'fitness', frequency: 'daily', color: '#8B5CF6', reminder_time: '19:00' },
    ]
  },
  {
    id: 'productivity',
    name: 'Productivity Boost',
    description: 'Maximize focus and get things done',
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    habits: [
      { title: 'Plan your day', description: 'Write top 3 priorities', category: 'productivity', frequency: 'daily', color: '#6366F1', reminder_time: '08:00' },
      { title: 'Deep work block', description: '90 minutes of focused work', category: 'productivity', frequency: 'daily', color: '#F59E0B', reminder_time: '09:00' },
      { title: 'Inbox zero', description: 'Process all emails', category: 'productivity', frequency: 'daily', color: '#10B981', reminder_time: '11:00' },
      { title: 'Daily review', description: 'Review progress and wins', category: 'productivity', frequency: 'daily', color: '#EC4899', reminder_time: '17:00' },
    ]
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness Journey',
    description: 'Cultivate inner peace and awareness',
    icon: <Heart className="w-6 h-6" />,
    gradient: 'from-pink-500/20 to-rose-500/20',
    habits: [
      { title: 'Morning meditation', description: '10 minutes of stillness', category: 'mindfulness', frequency: 'daily', color: '#8B5CF6', reminder_time: '07:00' },
      { title: 'Mindful breathing', description: '3 deep breaths, 3 times daily', category: 'mindfulness', frequency: 'daily', color: '#06B6D4', reminder_time: '12:00' },
      { title: 'Gratitude practice', description: 'List 3 things you appreciate', category: 'mindfulness', frequency: 'daily', color: '#EC4899', reminder_time: '20:00' },
      { title: 'Body scan', description: '5-minute relaxation check-in', category: 'mindfulness', frequency: 'daily', color: '#10B981', reminder_time: '21:00' },
    ]
  },
  {
    id: 'learning',
    name: 'Learning Journey',
    description: 'Grow your knowledge every day',
    icon: <BookOpen className="w-6 h-6" />,
    gradient: 'from-violet-500/20 to-purple-500/20',
    habits: [
      { title: 'Read 20 pages', description: 'Daily reading habit', category: 'learning', frequency: 'daily', color: '#6366F1', reminder_time: '08:00' },
      { title: 'Learn new word', description: 'Expand your vocabulary', category: 'learning', frequency: 'daily', color: '#F59E0B', reminder_time: '09:00' },
      { title: 'Practice skill', description: '30 minutes on a new skill', category: 'learning', frequency: 'daily', color: '#10B981', reminder_time: '18:00' },
      { title: 'Teach someone', description: 'Share what you learned', category: 'social', frequency: 'daily', color: '#EC4899', reminder_time: '19:00' },
    ]
  }
];

interface HabitTemplatesProps {
  onAddHabits: (habits: HabitTemplate[]) => Promise<void>;
  existingHabitCount: number;
}

export function HabitTemplates({ onAddHabits, existingHabitCount }: HabitTemplatesProps) {
  const [selectedPack, setSelectedPack] = useState<TemplatePack | null>(null);
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const handlePackClick = (pack: TemplatePack) => {
    setSelectedPack(pack);
    setSelectedHabits(pack.habits.map((_, i) => i)); // Select all by default
  };

  const toggleHabit = (index: number) => {
    setSelectedHabits(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleAddHabits = async () => {
    if (!selectedPack || selectedHabits.length === 0) return;
    
    setIsAdding(true);
    try {
      const habitsToAdd = selectedHabits.map(i => selectedPack.habits[i]);
      await onAddHabits(habitsToAdd);
      setSelectedPack(null);
      setSelectedHabits([]);
    } finally {
      setIsAdding(false);
    }
  };

  const isCompact = existingHabitCount > 0;

  return (
    <>
      <Card variant={isCompact ? "outlined" : "elevated"}>
        <CardHeader className={isCompact ? "pb-3" : ""}>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle className={isCompact ? "text-lg" : "text-xl"}>
              {isCompact ? "Quick-Add Templates" : "Start with a Template Pack"}
            </CardTitle>
          </div>
          {!isCompact && (
            <CardDescription>
              Choose a pre-built habit pack to jumpstart your journey
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            "grid gap-3",
            isCompact 
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" 
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {templatePacks.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handlePackClick(pack)}
                className={cn(
                  "text-left rounded-xl border transition-all hover:scale-[1.02] hover:shadow-md",
                  isCompact ? "p-3" : "p-4",
                  `bg-gradient-to-br ${pack.gradient} border-border/50`
                )}
              >
                <div className={cn(
                  "flex items-center gap-2",
                  isCompact ? "flex-col text-center" : ""
                )}>
                  <div className={cn(
                    "rounded-lg bg-background/80 flex items-center justify-center",
                    isCompact ? "w-10 h-10" : "w-12 h-12"
                  )}>
                    {pack.icon}
                  </div>
                  <div className={isCompact ? "mt-1" : ""}>
                    <p className={cn(
                      "font-semibold",
                      isCompact ? "text-xs" : "text-sm"
                    )}>
                      {pack.name}
                    </p>
                    {!isCompact && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pack.description}
                      </p>
                    )}
                  </div>
                </div>
                {!isCompact && (
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {pack.habits.length} habits
                    </Badge>
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Selection Dialog */}
      <Dialog open={!!selectedPack} onOpenChange={() => setSelectedPack(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedPack && (
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                  selectedPack.gradient
                )}>
                  {selectedPack.icon}
                </div>
              )}
              <div>
                <DialogTitle>{selectedPack?.name}</DialogTitle>
                <DialogDescription>{selectedPack?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Select habits to add:</p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (selectedPack) {
                    if (selectedHabits.length === selectedPack.habits.length) {
                      setSelectedHabits([]);
                    } else {
                      setSelectedHabits(selectedPack.habits.map((_, i) => i));
                    }
                  }
                }}
              >
                {selectedHabits.length === selectedPack?.habits.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>

            <div className="space-y-2">
              {selectedPack?.habits.map((habit, index) => {
                const isSelected = selectedHabits.includes(index);
                return (
                  <div
                    key={index}
                    onClick={() => toggleHabit(index)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleHabit(index)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: habit.color }}
                          />
                          <span className="font-medium text-sm">{habit.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {habit.description}
                        </p>
                        {habit.reminder_time && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ⏰ Reminder at {habit.reminder_time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPack(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddHabits}
              disabled={selectedHabits.length === 0 || isAdding}
            >
              {isAdding ? (
                <>Adding...</>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Add {selectedHabits.length} Habit{selectedHabits.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
