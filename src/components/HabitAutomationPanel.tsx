import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Merge, 
  Heart,
  Lightbulb,
  Play,
  RefreshCw,
  Brain,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useHabitAutomation } from '@/hooks/useHabitAutomation';
import { HabitWithStats, UserCategory, HabitCategory } from '@/lib/types';
import { MergeHabitsDialog } from '@/components/MergeHabitsDialog';
import { cn } from '@/lib/utils';

interface HabitAutomationPanelProps {
  habits: HabitWithStats[];
  userCategory: UserCategory;
  onMergeHabits: (selectedHabitIds: string[], newHabitData: {
    title: string;
    description: string;
    category: HabitCategory;
  }) => Promise<void>;
}

const actionIcons: Record<string, React.ReactNode> = {
  mark_missed: <Clock className="w-4 h-4" />,
  reschedule: <RefreshCw className="w-4 h-4" />,
  simplify: <TrendingDown className="w-4 h-4" />,
  merge: <Merge className="w-4 h-4" />,
  encourage: <Heart className="w-4 h-4" />
};

const actionLabels: Record<string, string> = {
  mark_missed: 'Likely Missed',
  reschedule: 'Reschedule Suggested',
  simplify: 'Simplify Recommended',
  merge: 'Consider Merging',
  encourage: 'Encouragement'
};

const severityColors: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20'
};

const decisionIcons: Record<string, React.ReactNode> = {
  REDUCE_LOAD: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  READY_TO_LEVEL_UP: <Sparkles className="w-5 h-5 text-green-500" />,
  FOCUS_MODE: <Brain className="w-5 h-5 text-purple-500" />,
  EVENING_PUSH: <Zap className="w-5 h-5 text-orange-500" />,
  MAINTAIN_COURSE: <CheckCircle2 className="w-5 h-5 text-primary" />
};

export function HabitAutomationPanel({ habits, userCategory, onMergeHabits }: HabitAutomationPanelProps) {
  const { result, loading, runAutomation } = useHabitAutomation(habits, userCategory);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [suggestedMergeCategory, setSuggestedMergeCategory] = useState<string | undefined>();

  // Removed auto-run on mount - automation now only runs on meaningful events

  const handleMergeClick = (category?: string) => {
    setSuggestedMergeCategory(category);
    setMergeDialogOpen(true);
  };

  const handleMerge = async (selectedHabitIds: string[], newHabitData: {
    title: string;
    description: string;
    category: HabitCategory;
  }) => {
    await onMergeHabits(selectedHabitIds, newHabitData);
    runAutomation(); // Refresh automation after merge
  };

  if (habits.length === 0) return null;

  if (loading && !result) {
    return (
      <Card variant="elevated" className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 animate-spin flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Automation Engine Running...</p>
              <p className="text-sm text-muted-foreground">Analyzing your habits and patterns</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const { autoUpdates, microHabit, systemDecision, insights } = result;
  const hasMergeSuggestion = autoUpdates.some(u => u.action === 'merge');

  return (
    <div className="space-y-4">
      {/* System Decision - Hero Card */}
      <Card variant="elevated" className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {decisionIcons[systemDecision.decision] || <Brain className="w-5 h-5" />}
              <CardTitle className="text-lg">System Decision</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {Math.round(systemDecision.confidence * 100)}% confident
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-foreground mb-1">
            {systemDecision.decision.replace(/_/g, ' ')}
          </p>
          <p className="text-sm text-muted-foreground">{systemDecision.reasoning}</p>
          {systemDecision.impactedHabits.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {systemDecision.impactedHabits.map((habit, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {habit}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Micro Habit for Today */}
      <Card variant="elevated" className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">Your Micro-Habit for Today</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-xl font-bold text-foreground">{microHabit.title}</p>
              <p className="text-sm text-muted-foreground">
                {microHabit.duration} • {microHabit.bestTime}
              </p>
            </div>
            
            <div className="bg-background/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action Steps:</p>
              <ol className="space-y-1">
                {microHabit.actionSteps.map((step, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            
            <p className="text-sm text-muted-foreground italic">
              💡 {microHabit.motivation}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Updates */}
      {autoUpdates.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Auto-Updates</CardTitle>
              </div>
              <Badge variant="outline">{autoUpdates.length} actions</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {autoUpdates.map((update, i) => (
              <div 
                key={i} 
                className={cn(
                  "p-3 rounded-lg border",
                  severityColors[update.severity]
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {actionIcons[update.action]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{update.habitTitle}</span>
                      <Badge variant="outline" className="text-xs">
                        {actionLabels[update.action]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{update.reason}</p>
                    {update.suggestedTime && (
                      <p className="text-xs mt-1">
                        Suggested time: <strong>{update.suggestedTime}</strong>
                      </p>
                    )}
                    {update.action === 'merge' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2"
                        onClick={() => handleMergeClick(update.habitTitle.replace(' habits', ''))}
                      >
                        <Merge className="w-3 h-3 mr-1" />
                        Merge Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Merge Button */}
      {habits.length >= 3 && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleMergeClick()}
            className="gap-2"
          >
            <Merge className="w-4 h-4" />
            Merge Similar Habits
          </Button>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-lg">Quick Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <p key={i} className="text-sm text-muted-foreground">{insight}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => runAutomation()}
          disabled={loading}
          className="text-muted-foreground"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh Analysis
        </Button>
      </div>

      {/* Merge Dialog */}
      <MergeHabitsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        habits={habits}
        suggestedCategory={suggestedMergeCategory}
        onMerge={handleMerge}
      />
    </div>
  );
}
