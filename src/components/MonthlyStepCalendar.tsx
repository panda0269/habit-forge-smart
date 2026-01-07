import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { Calendar, Footprints, Flame } from 'lucide-react';
import { format } from 'date-fns';

export function MonthlyStepCalendar() {
  const { todaySteps, todayCalories, isConnected, todayDate } = useGoogleFit();

  if (!isConnected) {
    return null;
  }

  const today = new Date();

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20">
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          Today - {format(today, 'MMMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-center">
            <Footprints className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-500">{todaySteps.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Steps Today</p>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 text-center">
            <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-orange-500">{todayCalories.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Calories Burned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
