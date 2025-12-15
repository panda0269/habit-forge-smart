import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHabits } from '@/hooks/useHabits';
import { HabitCategory, HabitFrequency, CATEGORY_CONFIG, FREQUENCY_CONFIG } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateHabitDialog({ open, onOpenChange }: CreateHabitDialogProps) {
  const { createHabit } = useHabits();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await createHabit({ title: title.trim(), category, frequency });
      toast.success('Habit created!');
      setTitle('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to create habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create New Habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            placeholder="Habit name (e.g., Morning meditation)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12"
            required
          />
          
          <Select value={category} onValueChange={(v) => setCategory(v as HabitCategory)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.icon} {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={frequency} onValueChange={(v) => setFrequency(v as HabitFrequency)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Create Habit
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
