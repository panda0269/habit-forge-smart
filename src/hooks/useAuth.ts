import { useState, useEffect } from 'react';
import { AuthApiError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const hasOAuthCode = new URL(window.location.href).searchParams.has('code');

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);

      // If we are returning from an OAuth redirect, don't mark auth as "done" until
      // exchangeCodeForSession has had a chance to run (otherwise route guards can
      // redirect to /auth and strip query params).
      if (!hasOAuthCode || session) {
        setLoading(false);
      }
    });

    // THEN handle OAuth code exchange (if present) and check for existing session
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        // When returning from OAuth, ensure we exchange the code BEFORE route guards
        // potentially navigate away and strip query params.
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled) {
            setSession(data.session);
            setUser(data.session?.user ?? null);
          }

          // Clean up URL so we don't re-process the code on refresh
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());

          if (error) throw error;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        // If the browser has a stale refresh token (common after changing auth config),
        // Supabase will throw refresh_token_not_found. Clear local auth state so OAuth can succeed.
        if (err instanceof AuthApiError && err.code === 'refresh_token_not_found') {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
        }

        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
