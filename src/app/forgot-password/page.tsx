'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { getInsforgeClient } from '@/lib/insforgeClient';

export default function ForgotPasswordPage() {
  const insforge = useMemo(() => getInsforgeClient(), []);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);
    setInfoText(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await insforge.auth.sendResetPasswordEmail({ email, redirectTo });
      if (error) throw error;
      const base =
        data?.message ||
        'If an account exists for this email, we sent password reset instructions.';
      setInfoText(
        `${base} Link-based reset opens /auth/callback with a token. Code-based reset: use /reset-password with the code from the email.`
      );
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">Forgot password</h1>
      <p className="text-gray-600 text-sm mb-6">Enter your email and we will send reset instructions.</p>

      <form onSubmit={onSubmit} className="grid gap-4">
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

        {infoText ? <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{infoText}</div> : null}
        {errorText ? <div className="text-sm text-red-700 bg-red-50 p-3 rounded">{errorText}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send reset email'}
        </button>

        <div className="flex items-center justify-between text-sm">
          <a href="/reset-password" className="text-gray-700 hover:underline">
            I have a code or token
          </a>
          <a href="/login" className="text-gray-700 hover:underline">
            Back to sign in
          </a>
        </div>
      </form>
    </main>
  );
}
