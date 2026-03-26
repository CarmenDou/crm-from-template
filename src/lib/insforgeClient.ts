'use client';

import { createClient, type InsForgeClient } from '@insforge/sdk';

let cached: InsForgeClient | null = null;

export function getInsforgeClient(): InsForgeClient {
  if (cached) return cached;

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL');
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_INSFORGE_ANON_KEY');

  cached = createClient({
    baseUrl,
    anonKey,
    // Browser mode: SDK handles refresh-cookie flow
    isServerMode: false,
  });
  return cached;
}
