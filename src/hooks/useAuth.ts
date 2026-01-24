import { useState, useEffect, useCallback } from 'react';
import { authApi, getToken, removeToken } from '@/lib/api';

export interface User {
  id: string;
  _id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  xpPoints: number;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user: userData } = await authApi.getMe();
        setUser({
          id: userData._id,
          _id: userData._id,
          email: userData.email,
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl,
          xpPoints: userData.xpPoints || 0,
          level: userData.level || 1,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        });
      } catch (error) {
        // Token is invalid, remove it
        removeToken();
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const { user: userData } = await authApi.register(email, password, displayName);
      const newUser = {
        id: userData._id,
        _id: userData._id,
        email: userData.email,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        xpPoints: userData.xpPoints || 0,
        level: userData.level || 1,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      };
      setUser(newUser);
      return { data: { user: newUser }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { user: userData } = await authApi.login(email, password);
      const newUser = {
        id: userData._id,
        _id: userData._id,
        email: userData.email,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        xpPoints: userData.xpPoints || 0,
        level: userData.level || 1,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      };
      setUser(newUser);
      return { data: { user: newUser }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    authApi.logout();
    setUser(null);
    return { error: null };
  }, []);

  const updateProfile = useCallback(async (data: { displayName?: string; avatarUrl?: string }) => {
    try {
      const { user: userData } = await authApi.updateProfile(data);
      const updatedUser = {
        id: userData._id,
        _id: userData._id,
        email: userData.email,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        xpPoints: userData.xpPoints || 0,
        level: userData.level || 1,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      };
      setUser(updatedUser);
      return { data: { user: updatedUser }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }, []);

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
}
