'use client';

import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInsforgeClient } from '@/lib/insforgeClient';

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const insforge = useMemo(() => getInsforgeClient(), []);

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);
    setInfoText(null);
    try {
      const { data, error } = await insforge.auth.verifyEmail({ email, otp });
      if (error) throw error;
      if (data?.accessToken) {
        router.replace('/dashboard');
        return;
      }
      setInfoText('Verified. Please sign in on the login page.');
      router.replace('/login?verified=1');
    } catch (err: any) {
      setErrorText(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setLoading(true);
    setErrorText(null);
    setInfoText(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await insforge.auth.resendVerificationEmail({ email, redirectTo });
      if (error) throw error;
      if (data?.success) setInfoText(data.message || 'Verification email sent again');
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">Verify email</h1>
      <p className="text-gray-600 text-sm mb-6">
        If your project uses <strong>code</strong> verification, enter the 6-digit code from the email. If it uses{' '}
        <strong>link</strong> verification, open the link in the email (it redirects to{' '}
        <code className="text-xs">/auth/callback</code>).
      </p>

      <form onSubmit={onVerify} className="grid gap-4">
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
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            className="px-3 py-2 rounded border border-gray-300"
            placeholder="123456"
          />
        </label>

        {infoText ? <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{infoText}</div> : null}
        {errorText ? <div className="text-sm text-red-700 bg-red-50 p-3 rounded">{errorText}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
        >
          Verify
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={loading || !email}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
        >
          Resend verification email
        </button>

        <a href="/login" className="text-sm text-gray-700 hover:underline">
          Back to sign in
        </a>
      </form>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-md mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-2">Verify email</h1>
          <p className="text-gray-600 text-sm">Loading...</p>
        </main>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
