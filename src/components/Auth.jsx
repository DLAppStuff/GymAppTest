import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

// Simple email/password gate. For a single-user app you sign up once, then
// sign in on each device. RLS makes sure every device only sees your data.
const Auth = () => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fn =
      mode === 'signup'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

    const { error } = await fn;

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else if (mode === 'signup') {
      setMessage({
        type: 'success',
        text: 'Account created. If email confirmation is on, check your inbox; otherwise just sign in.',
      });
      setMode('signin');
    }
    // On successful sign-in the auth listener in App swaps this screen out.
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 app-bg-dark text-zinc-100">
      <Card className="w-full max-w-sm bg-zinc-900/80 border-zinc-800 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">
            Gym<span className="text-brand">Genius</span>
          </CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? 'Create an account to sync your progress.'
              : 'Sign in to sync your progress.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {message && (
              <p className={message.type === 'error' ? 'text-sm text-red-400' : 'text-sm text-green-400'}>
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white hover:bg-brand/90"
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-400">
            {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setMode(mode === 'signup' ? 'signin' : 'signup');
              }}
              className="text-brand underline underline-offset-4 hover:text-brand/80"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
