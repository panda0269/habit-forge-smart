import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FitnessData {
  steps: Array<{ date: string; count: number }>;
  calories: Array<{ date: string; value: number }>;
  activities: Array<{ date: string; segments: number }>;
}

interface GoogleFitState {
  data: FitnessData | null;
  loading: boolean;
  isConnected: boolean;
  lastSynced: Date | null;
}

export function useGoogleFit() {
  const { user, session } = useAuth();
  const [state, setState] = useState<GoogleFitState>({
    data: null,
    loading: false,
    isConnected: false,
    lastSynced: null,
  });

  // Check if user has Google identity
  useEffect(() => {
    const googleIdentity = user?.identities?.find(i => i.provider === 'google');
    setState(prev => ({ ...prev, isConnected: !!googleIdentity }));
  }, [user]);

  // Load cached data on mount
  useEffect(() => {
    if (user && state.isConnected) {
      loadCachedData();
    }
  }, [user, state.isConnected]);

  const loadCachedData = async () => {
    if (!user) return;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('google_fit_data')
        .select('*')
        .eq('user_id', user.id)
        .gte('sync_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('sync_date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setState(prev => ({
          ...prev,
          data: {
            steps: data.map(d => ({ date: d.sync_date, count: d.steps })),
            calories: data.map(d => ({ date: d.sync_date, value: d.calories })),
            activities: data.map(d => ({ date: d.sync_date, segments: d.activity_segments })),
          },
          lastSynced: new Date(data[data.length - 1].synced_at),
        }));
      }
    } catch (error) {
      console.error('Error loading cached fitness data:', error);
    }
  };

  const syncData = useCallback(async (silent = false) => {
    if (!session?.access_token || !state.isConnected) {
      if (!silent) toast.error('Please connect Google Fit first');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Get the current session to check for provider_token
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('google-fit', {
        body: {
          action: 'all',
          saveToDb: true,
          // Pass the provider token from the browser session
          providerToken: currentSession?.provider_token || null,
        },
      });

      if (error) {
        // Surface useful backend error details instead of a generic toast.
        // (Most common case: missing Google Fit permissions / missing provider token.)
        const message = (error as any)?.message || 'Failed to sync fitness data';
        if (!silent) toast.error(message);
        throw error;
      }

      if (data?.error) {
        if (!silent) toast.error(data.message || data.error);
        return;
      }

      setState(prev => ({
        ...prev,
        data: data?.data ?? null,
        lastSynced: new Date(),
      }));

      if (!silent) toast.success('Fitness data synced!');
    } catch (error) {
      console.error('Error syncing fitness data:', error);

      const message =
        (error as any)?.message ||
        'Failed to sync fitness data. Try reconnecting Google Fit.';

      if (!silent) toast.error(message);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [session?.access_token, state.isConnected]);

  // Auto-sync function to be called when habits are logged
  const triggerAutoSync = useCallback(() => {
    if (state.isConnected && !state.loading) {
      // Only auto-sync if last sync was more than 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!state.lastSynced || state.lastSynced < fiveMinutesAgo) {
        syncData(true); // silent sync
      }
    }
  }, [state.isConnected, state.loading, state.lastSynced, syncData]);

  const connectGoogleFit = async () => {
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
    }
  };

  const totalSteps = state.data?.steps?.reduce((sum, d) => sum + d.count, 0) || 0;
  const totalCalories = state.data?.calories?.reduce((sum, d) => sum + d.value, 0) || 0;
  const avgSteps = state.data?.steps?.length ? Math.round(totalSteps / state.data.steps.length) : 0;

  return {
    ...state,
    syncData,
    triggerAutoSync,
    connectGoogleFit,
    totalSteps,
    totalCalories,
    avgSteps,
  };
}
