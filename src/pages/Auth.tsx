import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Sparkles, ArrowLeft, Mail } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/');
      } else if (view === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast.success('Account created successfully!');
        navigate('/');
      } else if (view === 'forgot-password') {
        await authApi.forgotPassword(email);
        setForgotEmailSent(true);
        toast.success('Password reset email sent!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setForgotEmailSent(false);
  };

  const switchView = (newView: AuthView) => {
    resetForm();
    setView(newView);
  };

  // Forgot password success view
  if (view === 'forgot-password' && forgotEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card variant="elevated" className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-glow">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-base">
              If an account exists with <strong>{email}</strong>, we've sent a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => switchView('login')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card variant="elevated" className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-glow">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-display">
            {view === 'login' && 'Welcome Back'}
            {view === 'signup' && 'Get Started'}
            {view === 'forgot-password' && 'Reset Password'}
          </CardTitle>
          <CardDescription>
            {view === 'login' && 'Sign in to continue your habit journey'}
            {view === 'signup' && 'Create an account to build better habits'}
            {view === 'forgot-password' && 'Enter your email to receive a reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'signup' && (
              <Input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
            {view !== 'forgot-password' && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12"
              />
            )}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {view === 'login' && 'Sign In'}
              {view === 'signup' && 'Create Account'}
              {view === 'forgot-password' && 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            {view === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => switchView('forgot-password')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => switchView('signup')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}
            {view === 'signup' && (
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Already have an account? Sign in
              </button>
            )}
            {view === 'forgot-password' && (
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="inline mr-1 h-4 w-4" />
                Back to Login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
