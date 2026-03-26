'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getInsforgeClient } from '@/lib/insforgeClient';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const insforge = useMemo(() => getInsforgeClient(), []);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);
    setInfoText(null);

    try {
      if (mode === 'signup') {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { data, error } = await insforge.auth.signUp({
          email,
          password,
          name: name || undefined,
          redirectTo,
        });
        if (error) throw error;
        if (data?.requireEmailVerification) {
          setInfoText('Verification email sent. Complete verification (code or link) before signing in.');
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
      } else {
        const { data, error } = await insforge.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (!data) throw new Error('Sign-in failed: no session returned');
      }
      router.push('/dashboard');
    } catch (err: any) {
      setErrorText(err?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function onOAuth(provider: 'clerk') {
    setLoading(true);
    setErrorText(null);
    setInfoText(null);
    try {
      await insforge.auth.signInWithOAuth({
        provider,
        redirectTo: `${window.location.origin}/auth/callback`,
      });
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to start OAuth');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">{mode === 'signin' ? 'Sign in' : 'Sign up'}</h1>
      <p className="text-gray-600 mb-6 text-sm">Sign in with Insforge to open the CRM dashboard.</p>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`px-3 py-2 rounded border ${
            mode === 'signin' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`px-3 py-2 rounded border ${
            mode === 'signup' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        {mode === 'signup' ? (
          <label className="grid gap-2 text-sm">
            Name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded border border-gray-300"
              placeholder="John Doe"
            />
          </label>
        ) : null}

        <label className="grid gap-2 text-sm">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="px-3 py-2 rounded border border-gray-300"
            placeholder="user@example.com"
          />
        </label>

        <label className="grid gap-2 text-sm">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="px-3 py-2 rounded border border-gray-300"
            placeholder="••••••••"
          />
        </label>

        {infoText ? <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{infoText}</div> : null}
        {errorText ? <div className="text-sm text-red-700 bg-red-50 p-3 rounded">{errorText}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>

        {mode === 'signin' || mode === 'signup' ? (
          <div className="grid gap-3 mt-2">
            <button
              type="button"
              onClick={() => onOAuth('clerk')}
              disabled={loading}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            >
              Continue with Clerk
            </button>
            <div className="text-xs text-gray-500">You will be redirected to Clerk to sign in.</div>
          </div>
        ) : null}
      </form>
    </main>
  );
}
