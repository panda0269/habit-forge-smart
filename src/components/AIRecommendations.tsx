import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { HabitWithStats, UserCategory } from '@/lib/types';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AIRecommendationsProps {
  habits: HabitWithStats[];
  userCategory: UserCategory;
}

export function AIRecommendations({ habits, userCategory }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const habitData = habits.map(h => ({
        id: h.id,
        title: h.title,
        category: h.category,
        frequency: h.frequency,
        completionRate: h.completionRate,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
        missedDays: h.missedDays,
        totalDays: h.totalDays,
      }));

      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { habits: habitData, userCategory },
      });

      if (error) throw error;
      setRecommendations(data.recommendations);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      toast.error('Failed to get AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-secondary-foreground" />
          </div>
          <CardTitle className="font-display">AI Coach</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRecommendations} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {recommendations ? 'Refresh' : 'Get Insights'}
        </Button>
      </CardHeader>
      <CardContent>
        {!recommendations && !loading && (
          <p className="text-muted-foreground text-center py-4">
            Click "Get Insights" to receive personalized AI recommendations based on your habit data.
          </p>
        )}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {recommendations && !loading && (
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {recommendations}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
