import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Activity, Footprints, Flame, RefreshCw, Link2, Unlink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FitnessData {
  steps?: Array<{ date: string; count: number }>;
  calories?: Array<{ date: string; value: number }>;
  activities?: Array<{ date: string; segments: number }>;
}

export function GoogleFitIntegration() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [fitnessData, setFitnessData] = useState<FitnessData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if user has Google identity
    const googleIdentity = user?.identities?.find(i => i.provider === 'google');
    setIsConnected(!!googleIdentity);
  }, [user]);

  const connectGoogleFit = async () => {
    setConnecting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google Fit connection error:', error);
      toast.error('Failed to connect Google Fit');
      setConnecting(false);
    }
  };

  const fetchFitnessData = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in first');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-fit', {
        body: { action: 'all' },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.message || data.error);
        return;
      }

      setFitnessData(data.data);
      toast.success('Fitness data synced!');
    } catch (error) {
      console.error('Error fetching fitness data:', error);
      toast.error('Failed to fetch fitness data');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = fitnessData?.steps?.reduce((sum, d) => sum + d.count, 0) || 0;
  const totalCalories = fitnessData?.calories?.reduce((sum, d) => sum + d.value, 0) || 0;
  const avgSteps = fitnessData?.steps?.length ? Math.round(totalSteps / fitnessData.steps.length) : 0;

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
              <CardDescription>Sync your fitness data</CardDescription>
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
              <Button onClick={connectGoogleFit} disabled={connecting}>
                {connecting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Connect Google Fit
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchFitnessData} disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Sync Data</span>
              </Button>
            </div>

            {fitnessData ? (
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

                {fitnessData.steps && fitnessData.steps.length > 0 && (
                  <div className="h-48">
                    <p className="text-sm font-medium mb-2">Steps (Last 7 Days)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fitnessData.steps}>
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
                <p className="text-sm">Click "Sync Data" to fetch your fitness data</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
