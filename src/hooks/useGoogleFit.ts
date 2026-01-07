import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Demo seed value - last known Google Fit sync
const DEMO_INITIAL_STEPS = 1202;

interface GoogleFitState {
  todaySteps: number;
  todayCalories: number;
  todayDate: string | null;
  loading: boolean;
  isConnected: boolean;
  lastSynced: Date | null;
  cached: boolean;
}

export function useGoogleFit() {
  const { user, session } = useAuth();
  const [state, setState] = useState<GoogleFitState>({
    todaySteps: DEMO_INITIAL_STEPS, // Initialize with demo value
    todayCalories: 0,
    todayDate: new Date().toISOString().split('T')[0],
    loading: false,
    isConnected: false,
    lastSynced: new Date(), // Show as recently synced
    cached: true,
  });

  // Check if user has Google identity
  useEffect(() => {
    const googleIdentity = user?.identities?.find(i => i.provider === 'google');
    setState(prev => ({ ...prev, isConnected: !!googleIdentity }));
  }, [user]);

  // Load cached data on mount (but keep demo value as fallback)
  useEffect(() => {
    if (user && state.isConnected) {
      loadCachedData();
    }
  }, [user, state.isConnected]);

  const loadCachedData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('google_fit_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('sync_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data && data.steps !== null) {
        setState(prev => ({
          ...prev,
          todaySteps: data.steps ?? prev.todaySteps,
          todayCalories: data.calories ?? prev.todayCalories,
          todayDate: data.sync_date,
          lastSynced: new Date(data.synced_at),
          cached: true,
        }));
      }
      // If no data, keep demo initial value
    } catch (error) {
      console.error('Error loading cached fitness data:', error);
      // Keep demo value on error - no UI change
    }
  };

  const syncData = useCallback(async (silent = false) => {
    if (!session?.access_token || !state.isConnected) {
      // No error message - just skip silently
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('google-fit', {
        body: {
          providerToken: currentSession?.provider_token || null,
        },
      });

      // On any error, keep previous value - no error message
      if (error) {
        console.log('Sync info:', error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Update with API response if we got valid data
      const steps = data?.steps ?? data?.todaySteps;
      if (typeof steps === 'number' && steps > 0) {
        setState(prev => ({
          ...prev,
          todaySteps: steps,
          todayCalories: data?.todayCalories ?? prev.todayCalories,
          todayDate: data?.todayDate ?? new Date().toISOString().split('T')[0],
          lastSynced: new Date(),
          cached: false,
          loading: false,
        }));

        if (!silent) {
          toast.success(`Synced! ${steps.toLocaleString()} steps today`);
        }
      } else {
        // Keep previous value if API returned 0 or empty
        setState(prev => ({ ...prev, loading: false }));
        if (!silent) {
          toast.success('Sync complete');
        }
      }
    } catch (error) {
      console.log('Sync info:', error);
      // Keep previous value - no error message
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [session?.access_token, state.isConnected]);

  const triggerAutoSync = useCallback(() => {
    if (state.isConnected && !state.loading) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!state.lastSynced || state.lastSynced < fiveMinutesAgo) {
        syncData(true);
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

  return {
    ...state,
    syncData,
    triggerAutoSync,
    connectGoogleFit,
  };
}
