/**
 * Authentication Page
 * 
 * Handles login and signup for Ludo multiplayer game.
 * Redirects to game lobby after successful authentication.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Loader2, User, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

type AuthMode = 'login' | 'signup';

// Input validation schemas
const emailSchema = z.string().trim().email('Invalid email address').max(255, 'Email too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password too long');
const displayNameSchema = z.string().trim().max(50, 'Display name too long').optional();

// Allowed origins for redirect (production URLs)
const ALLOWED_ORIGINS = [
  'https://ludo.lovable.app',
  'https://id-preview--989925a7-6fee-4f1b-905d-5800dc29bdb4.lovable.app',
];

// Get safe redirect URL (fallback to relative path if origin not allowed)
const getSafeRedirectUrl = (): string => {
  const origin = window.location.origin;
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app')) {
    return `${origin}/`;
  }
  // Fallback to relative path for safety
  return '/';
};

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/', { replace: true });
      }
      setCheckingSession(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/', { replace: true });
      }
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs with zod
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: 'Invalid email',
        description: emailResult.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        title: 'Invalid password',
        description: passwordResult.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    if (mode === 'signup' && displayName) {
      const displayNameResult = displayNameSchema.safeParse(displayName);
      if (!displayNameResult.success) {
        toast({
          title: 'Invalid display name',
          description: displayNameResult.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: 'Login failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome back!',
            description: 'Successfully logged in.',
          });
          navigate('/', { replace: true });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: emailResult.data,
          password: passwordResult.data,
          options: {
            emailRedirectTo: getSafeRedirectUrl(),
            data: {
              display_name: displayName.trim() || emailResult.data.split('@')[0],
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please log in instead.',
              variant: 'destructive',
            });
            setMode('login');
          } else {
            toast({
              title: 'Signup failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'You can now join games.',
          });
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Ludo
          </h1>
          <p className="text-muted-foreground">
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-secondary/50 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn size={18} />
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'signup'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus size={18} />
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Display Name (optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your gaming name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg mt-6"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {mode === 'login' ? 'Logging in...' : 'Creating account...'}
              </>
            ) : (
              <>
                {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                {mode === 'login' ? 'Log In' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-primary hover:underline font-medium"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;
