import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { Award, Footprints, Flame } from 'lucide-react';

export function StepStreakBadges() {
  const { todaySteps, todayCalories, isConnected } = useGoogleFit();

  if (!isConnected) {
    return null;
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          Today's Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-500/10 text-center">
            <Footprints className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-500">{todaySteps.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Steps</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-500/10 text-center">
            <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-500">{todayCalories.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
