import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { HabitCategory, HabitFrequency, CATEGORY_CONFIG, FREQUENCY_CONFIG, HabitWithStats } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2, Bell, Clock } from 'lucide-react';

interface EditHabitDialogProps {
  habit: HabitWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: {
    title: string;
    description: string | null;
    category: HabitCategory;
    frequency: HabitFrequency;
    reminder_enabled: boolean;
    reminder_time: string | null;
  }) => Promise<void>;
}

export function EditHabitDialog({ habit, open, onOpenChange, onSave }: EditHabitDialogProps) {
  const { permission, requestPermission } = useNotifications();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setDescription(habit.description || '');
      setCategory(habit.category);
      setFrequency(habit.frequency);
      setReminderEnabled(habit.reminder_enabled || false);
      setReminderTime(habit.reminder_time || '09:00');
    }
  }, [habit]);

  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }
    setReminderEnabled(enabled);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !habit) return;

    setLoading(true);
    try {
      await onSave(habit.id, {
        title: title.trim(),
        description: description.trim() || null,
        category,
        frequency,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? reminderTime : null,
      });
      
      toast.success('Habit updated!');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update habit:', err);
      toast.error('Failed to update habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit Habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Habit Name</Label>
            <Input
              id="edit-title"
              placeholder="e.g., Morning meditation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Add notes about this habit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Category</Label>
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
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
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
          </div>

          {/* Reminder Settings */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="edit-reminder" className="font-medium">Daily Reminder</Label>
                  <p className="text-xs text-muted-foreground">Get notified to complete this habit</p>
                </div>
              </div>
              <Switch
                id="edit-reminder"
                checked={reminderEnabled}
                onCheckedChange={handleReminderToggle}
              />
            </div>

            {reminderEnabled && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="edit-reminderTime" className="text-sm">Reminder Time</Label>
                <Input
                  id="edit-reminderTime"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-auto ml-auto"
                />
              </div>
            )}
            
            {permission === 'denied' && (
              <p className="text-xs text-destructive">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
