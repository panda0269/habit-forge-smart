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

      if (error) {
        const message = getInvokeErrorMessage(error) || 'Failed to sync fitness data';
        console.error('Google Fit sync invoke error:', error);
        setState(prev => ({ ...prev, lastError: message, loading: false }));
        if (!silent) toast.error(message);
        return;
      }

      // Only treat as error if there's an actual error flag
      if (data?.error) {
        const message = data.message || data.error;
        setState(prev => ({ ...prev, lastError: message, loading: false }));
        if (!silent) toast.error(message);
        return;
      }

      // Update state with fetched data (always success, even 0 steps)
      setState(prev => ({
        ...prev,
        todaySteps: data?.todaySteps ?? 0,
        todayCalories: data?.todayCalories ?? 0,
        todayDate: data?.todayDate ?? null,
        lastSynced: new Date(),
        lastError: null,
        cached: data?.cached ?? false,
        loading: false,
      }));

      if (!silent) {
        const steps = data?.todaySteps ?? 0;
        toast.success(`${steps.toLocaleString()} steps today!`);
      }
    } catch (error) {
      console.error('Error syncing fitness data:', error);
      const message = getInvokeErrorMessage(error) || 'Failed to sync fitness data';
      setState(prev => ({ ...prev, lastError: message, loading: false }));
      if (!silent) toast.error(message);
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
