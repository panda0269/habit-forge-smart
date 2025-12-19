import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Merge, Sparkles, AlertTriangle } from 'lucide-react';
import { HabitWithStats, HabitCategory, CATEGORY_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MergeHabitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: HabitWithStats[];
  suggestedCategory?: string;
  onMerge: (selectedHabitIds: string[], newHabitData: {
    title: string;
    description: string;
    category: HabitCategory;
  }) => Promise<void>;
}

export function MergeHabitsDialog({ 
  open, 
  onOpenChange, 
  habits, 
  suggestedCategory,
  onMerge 
}: MergeHabitsDialogProps) {
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter habits by suggested category or show all low-performers
  const eligibleHabits = suggestedCategory 
    ? habits.filter(h => h.category === suggestedCategory && h.completionRate < 70)
    : habits.filter(h => h.completionRate < 50);

  // Auto-select habits from same category
  useEffect(() => {
    if (open && suggestedCategory) {
      const categoryHabits = habits
        .filter(h => h.category === suggestedCategory && h.completionRate < 50)
        .map(h => h.id);
      setSelectedHabits(categoryHabits.slice(0, 3));
    }
  }, [open, suggestedCategory, habits]);

  // Generate smart title suggestion
  useEffect(() => {
    if (selectedHabits.length >= 2) {
      const selected = habits.filter(h => selectedHabits.includes(h.id));
      const categories = [...new Set(selected.map(h => h.category))];
      
      if (categories.length === 1) {
        const categoryLabel = CATEGORY_CONFIG[categories[0] as HabitCategory]?.label || 'Combined';
        setNewTitle(`Daily ${categoryLabel} Routine`);
        setNewDescription(
          `Combined habit: ${selected.map(h => h.title).join(', ')}`
        );
      } else {
        setNewTitle('Daily Power Routine');
        setNewDescription(
          `Combined habit: ${selected.map(h => h.title).join(', ')}`
        );
      }
    }
  }, [selectedHabits, habits]);

  const toggleHabit = (habitId: string) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };

  const handleMerge = async () => {
    if (selectedHabits.length < 2 || !newTitle.trim()) return;
    
    setIsSubmitting(true);
    try {
      const selectedHabitData = habits.filter(h => selectedHabits.includes(h.id));
      const primaryCategory = selectedHabitData[0]?.category || 'other';
      
      await onMerge(selectedHabits, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: primaryCategory as HabitCategory
      });
      
      onOpenChange(false);
      setSelectedHabits([]);
      setNewTitle('');
      setNewDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedHabitData = habits.filter(h => selectedHabits.includes(h.id));
  const avgCompletionRate = selectedHabitData.length > 0
    ? Math.round(selectedHabitData.reduce((sum, h) => sum + h.completionRate, 0) / selectedHabitData.length)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-primary" />
            Merge Habits
          </DialogTitle>
          <DialogDescription>
            Combine similar habits into one focused habit to reduce overwhelm and improve consistency.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Banner */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600">This action will delete the selected habits</p>
                <p className="text-muted-foreground">A new combined habit will be created. Your completion history will be preserved in analytics.</p>
              </div>
            </CardContent>
          </Card>

          {/* Habit Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select habits to merge (min 2)</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {eligibleHabits.map(habit => {
                const isSelected = selectedHabits.includes(habit.id);
                const categoryConfig = CATEGORY_CONFIG[habit.category as HabitCategory];
                
                return (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleHabit(habit.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{habit.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {categoryConfig?.icon} {categoryConfig?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{habit.completionRate}% completion</span>
                          <span>•</span>
                          <span>{habit.currentStreak} day streak</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Stats */}
          {selectedHabits.length >= 2 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Merge Preview</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Habits to merge</p>
                    <p className="font-semibold">{selectedHabits.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg. Completion</p>
                    <p className="font-semibold">{avgCompletionRate}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Merging into one habit typically improves completion rates by 30-50%
                </p>
              </CardContent>
            </Card>
          )}

          {/* New Habit Details */}
          {selectedHabits.length >= 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">New Habit Title</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter a name for the combined habit"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe what this combined habit includes"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMerge}
            disabled={selectedHabits.length < 2 || !newTitle.trim() || isSubmitting}
          >
            <Merge className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Merging...' : `Merge ${selectedHabits.length} Habits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
