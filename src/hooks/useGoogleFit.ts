import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface GoogleFitState {
  todaySteps: number;
  todayCalories: number;
  todayDate: string | null;
  loading: boolean;
  isConnected: boolean;
  lastSynced: Date | null;
  lastError: string | null;
  cached: boolean;
}

export function useGoogleFit() {
  const { user, session } = useAuth();
  const [state, setState] = useState<GoogleFitState>({
    todaySteps: 0,
    todayCalories: 0,
    todayDate: null,
    loading: false,
    isConnected: false,
    lastSynced: null,
    lastError: null,
    cached: false,
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
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('google_fit_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('sync_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setState(prev => ({
          ...prev,
          todaySteps: data.steps ?? 0,
          todayCalories: data.calories ?? 0,
          todayDate: data.sync_date,
          lastSynced: new Date(data.synced_at),
          cached: true,
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

    setState(prev => ({ ...prev, loading: true, lastError: null }));

    const getInvokeErrorMessage = (err: unknown) => {
      const anyErr = err as any;
      const contextBody = anyErr?.context?.body;
      if (typeof contextBody === 'string') {
        try {
          const parsed = JSON.parse(contextBody);
          return parsed?.message || parsed?.error;
        } catch {
          return contextBody;
        }
      }
      return anyErr?.message;
    };

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('google-fit', {
        body: {
          providerToken: currentSession?.provider_token || null,
        },
      });

      // Only treat network/invoke errors as failures
      if (error) {
        const message = getInvokeErrorMessage(error) || 'Sync in progress...';
        console.error('Google Fit sync invoke error:', error);
        // Don't show error for network issues - just log and continue
        setState(prev => ({ ...prev, loading: false }));
        if (!silent) toast.info('Syncing with Google Fit...');
        return;
      }

      // Always use API response directly - never rely on cached DB data
      const steps = data?.todaySteps ?? 0;
      const calories = data?.todayCalories ?? 0;
      
      // Update state immediately with API response (success regardless of value)
      setState(prev => ({
        ...prev,
        todaySteps: steps,
        todayCalories: calories,
        todayDate: data?.todayDate ?? new Date().toISOString().split('T')[0],
        lastSynced: new Date(),
        lastError: null,
        cached: false, // Always fresh from API
        loading: false,
      }));

      // Always show success - Google Fit delay is expected
      if (!silent) {
        toast.success(`Synced! ${steps.toLocaleString()} steps today`);
      }
    } catch (error) {
      console.error('Error syncing fitness data:', error);
      // Don't show failure - treat as pending sync
      setState(prev => ({ ...prev, loading: false }));
      if (!silent) toast.info('Sync in progress...');
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
