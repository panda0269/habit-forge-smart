import { useGoogleFit } from '@/hooks/useGoogleFit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Footprints, Flame, RefreshCw, Link2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function GoogleFitIntegration() {
  const {
    todaySteps,
    todayCalories,
    todayDate,
    loading,
    isConnected,
    lastSynced,
    lastError,
    cached,
    syncData,
    connectGoogleFit,
  } = useGoogleFit();

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Fit</CardTitle>
              <CardDescription>Today's fitness data</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!isConnected ? (
          <div className="text-center py-6 space-y-4">
            <div className="p-4 rounded-full bg-muted w-fit mx-auto">
              <Link2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect Google Fit to sync your steps and calories
              </p>
              <Button onClick={connectGoogleFit}>
                Connect Google Fit
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {lastSynced && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(lastSynced, { addSuffix: true })}
                  </span>
                )}
                {cached && (
                  <Badge variant="outline" className="text-xs">Cached</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => syncData()} disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Sync Now</span>
              </Button>
            </div>

            {lastError && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2">
                <p className="text-xs text-destructive font-medium">Sync error</p>
                <p className="text-sm text-destructive/90">{lastError}</p>
              </div>
            )}

            {/* Today's Stats - Always show, even 0 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-500/10 text-center">
                <Footprints className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-500">{todaySteps.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Steps Today</p>
                {todayDate && (
                  <p className="text-xs text-muted-foreground mt-1">{todayDate}</p>
                )}
              </div>
              <div className="p-4 rounded-xl bg-orange-500/10 text-center">
                <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-orange-500">{todayCalories.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Calories</p>
              </div>
            </div>

            {todaySteps === 0 && !loading && !lastError && (
              <p className="text-center text-xs text-muted-foreground">
                No steps recorded yet today. Keep moving! 🚶
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
