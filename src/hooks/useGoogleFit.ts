import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Demo seed value - last known sync
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
  const [state] = useState<GoogleFitState>({
    todaySteps: DEMO_INITIAL_STEPS,
    todayCalories: 0,
    todayDate: new Date().toISOString().split('T')[0],
    loading: false,
    isConnected: false,
    lastSynced: new Date(),
    cached: true,
  });

  // Google Fit is not available in standalone MERN mode
  // This hook provides placeholder functionality for compatibility
  
  const syncData = useCallback(async (silent = false) => {
    if (!silent) {
      toast.info('Fitness sync requires external API configuration');
    }
  }, []);

  const triggerAutoSync = useCallback(() => {
    // No-op in standalone mode
  }, []);

  const connectGoogleFit = async () => {
    toast.info('Fitness integration requires OAuth configuration');
  };

  return {
    ...state,
    syncData,
    triggerAutoSync,
    connectGoogleFit,
  };
}
