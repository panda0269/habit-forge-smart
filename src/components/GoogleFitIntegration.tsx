import { useGoogleFit } from '@/hooks/useGoogleFit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Footprints, Flame, RefreshCw, Link2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

export function GoogleFitIntegration() {
  const {
    data,
    loading,
    isConnected,
    lastSynced,
    lastError,
    syncData,
    connectGoogleFit,
    totalSteps,
    totalCalories,
    avgSteps,
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
              <CardDescription>Auto-syncs when you log habits</CardDescription>
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
                Connect Google Fit to sync your steps, calories, and activity data
              </p>
              <Button onClick={connectGoogleFit}>
                Connect Google Fit
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              {lastSynced && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last synced {formatDistanceToNow(lastSynced, { addSuffix: true })}
                </span>
              )}
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
              <div className="rounded-xl border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Sync error</p>
                <p className="text-sm">{lastError}</p>
              </div>
            )}

            {data ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-center">
                    <Footprints className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-blue-500">{totalSteps.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Steps</p>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-500/10 text-center">
                    <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-orange-500">{totalCalories.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Calories</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/10 text-center">
                    <Activity className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-green-500">{avgSteps.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Avg/Day</p>
                  </div>
                </div>

                {data.steps && data.steps.length > 0 && (
                  <div className="h-48">
                    <p className="text-sm font-medium mb-2">Steps (Last 7 Days)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.steps}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          formatter={(value: number) => [value.toLocaleString(), 'Steps']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Click "Sync Now" to fetch your fitness data</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
