'use client';

import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInsforgeClient } from '@/lib/insforgeClient';

type Mode = 'link' | 'code';

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const insforge = useMemo(() => getInsforgeClient(), []);

  const insforgeStatus = params.get('insforge_status');
  const tokenFromLink = params.get('token') || '';

  const [mode, setMode] = useState<Mode>(tokenFromLink ? 'link' : 'code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState(tokenFromLink);
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  async function onResetWithLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);
    setInfoText(null);
    try {
      if (!token) {
        throw new Error('Missing token. Open the link from your email, or switch to code flow.');
      }
      const { data, error } = await insforge.auth.resetPassword({ newPassword, otp: token });
      if (error) throw error;
      setInfoText(data?.message || 'Password updated');
      router.replace('/login?reset=1');
    } catch (err: any) {
      setErrorText(err?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  async function onResetWithCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);
    setInfoText(null);
    try {
      const { data: exchanged, error: exErr } = await insforge.auth.exchangeResetPasswordToken({
        email,
        code,
      });
      if (exErr) throw exErr;
      if (!exchanged?.token) throw new Error('Could not get reset token');

      const { data, error } = await insforge.auth.resetPassword({
        newPassword,
        otp: exchanged.token,
      });
      if (error) throw error;
      setInfoText(data?.message || 'Password updated');
      router.replace('/login?reset=1');
    } catch (err: any) {
      setErrorText(err?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  const linkReady = insforgeStatus === 'ready' || !!tokenFromLink;

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">Reset password</h1>
      <p className="text-gray-600 text-sm mb-6">
        Supports both link-based reset (token in URL) and code-based reset (6-digit code, then token exchange).
      </p>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`px-3 py-2 rounded border ${
            mode === 'link' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'
          }`}
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => setMode('code')}
          className={`px-3 py-2 rounded border ${
            mode === 'code' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'
          }`}
        >
          Code
        </button>
      </div>

      {mode === 'link' ? (
        <form onSubmit={onResetWithLink} className="grid gap-4">
          {!linkReady ? (
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              You have not arrived from the email link yet (it should include <code>token</code>). If you only have a
              6-digit code, switch to <strong>Code</strong>.
            </div>
          ) : null}

          <label className="grid gap-2 text-sm">
            Token (from email link)
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="px-3 py-2 rounded border border-gray-300"
              placeholder="token=..."
            />
          </label>

          <label className="grid gap-2 text-sm">
            New password
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              required
              className="px-3 py-2 rounded border border-gray-300"
            />
          </label>

          {infoText ? <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{infoText}</div> : null}
          {errorText ? <div className="text-sm text-red-700 bg-red-50 p-3 rounded">{errorText}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : 'Reset password'}
          </button>
        </form>
      ) : (
        <form onSubmit={onResetWithCode} className="grid gap-4">
          <label className="grid gap-2 text-sm">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="px-3 py-2 rounded border border-gray-300"
            />
          </label>

          <label className="grid gap-2 text-sm">
            6-digit code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              required
              className="px-3 py-2 rounded border border-gray-300"
              placeholder="123456"
            />
          </label>

          <label className="grid gap-2 text-sm">
            New password
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              required
              className="px-3 py-2 rounded border border-gray-300"
            />
          </label>

          {infoText ? <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{infoText}</div> : null}
          {errorText ? <div className="text-sm text-red-700 bg-red-50 p-3 rounded">{errorText}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : 'Reset password'}
          </button>
        </form>
      )}

      <div className="mt-6 text-sm flex items-center justify-between">
        <a href="/forgot-password" className="text-gray-700 hover:underline">
          Forgot password
        </a>
        <a href="/login" className="text-gray-700 hover:underline">
          Back to sign in
        </a>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-md mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-2">Reset password</h1>
          <p className="text-gray-600 text-sm">Loading...</p>
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
