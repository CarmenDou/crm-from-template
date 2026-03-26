'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInsforgeClient } from '@/lib/insforgeClient';

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const insforge = useMemo(() => getInsforgeClient(), []);

  const [message, setMessage] = useState<string>('Processing authentication callback...');

  useEffect(() => {
    (async () => {
      // Link-based flows from Insforge redirect here:
      // verify email: ?insforge_status=success|error&insforge_type=verify_email&insforge_error=...
      // reset password: ?insforge_status=ready|error&insforge_type=reset_password&token=...
      const insforgeStatus = params.get('insforge_status');
      const insforgeType = params.get('insforge_type');
      const insforgeError = params.get('insforge_error');
      const token = params.get('token');

      if (insforgeType === 'verify_email') {
        if (insforgeStatus === 'success') {
          setMessage('Email verified. Please sign in.');
          router.replace('/login?verified=1');
          return;
        }
        if (insforgeStatus === 'error') {
          setMessage(`Email verification failed: ${insforgeError || 'unknown error'}`);
          return;
        }
      }

      if (insforgeType === 'reset_password') {
        if (insforgeStatus === 'ready' && token) {
          router.replace(
            `/reset-password?token=${encodeURIComponent(token)}&insforge_status=ready&insforge_type=reset_password`
          );
          return;
        }
        if (insforgeStatus === 'error') {
          setMessage(`Invalid reset link: ${insforgeError || 'unknown error'}`);
          return;
        }
      }

      // OAuth: SDK detects insforge_code in the URL and exchanges it for a session
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error) {
        setMessage(`OAuth sign-in failed: ${error.message}`);
        return;
      }
      if (data?.user?.id) {
        router.replace('/dashboard');
        return;
      }
      router.replace('/login');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">Auth callback</h1>
      <p className="text-gray-600 text-sm">{message}</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-md mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-2">Auth callback</h1>
          <p className="text-gray-600 text-sm">Loading...</p>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
