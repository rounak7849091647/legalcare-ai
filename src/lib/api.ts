declare global {
  interface Window {
    __LEGALCARE_CONFIG__?: { apiUrl?: string };
  }
}

import { getFreshToken } from '@/lib/auth-token';

// Base URL of the AWS/Express backend — no trailing slash.
// Resolution order (first non-empty wins):
//   1. import.meta.env.VITE_API_URL        ← build-time, but ONLY in dev (see below)
//   2. window.__LEGALCARE_CONFIG__.apiUrl  ← runtime, edit /legalcare-config.js after deploy
//   3. import.meta.env.VITE_API_URL        ← build-time
// The dev-first rule matters: /legalcare-config.js ships a PRODUCTION api URL, and
// because the runtime value wins it would otherwise hijack `npm run dev` and point
// local work at the deployed backend. In a production build DEV is false, so the
// runtime config keeps its normal priority.
function resolveApiUrl(): string {
  const buildTime = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (import.meta.env.DEV && buildTime) return buildTime.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const runtime = window.__LEGALCARE_CONFIG__?.apiUrl?.trim();
    if (runtime) return runtime.replace(/\/$/, '');
  }
  return (buildTime || 'http://localhost:8080').replace(/\/$/, '');
}

export const getApiUrl = resolveApiUrl;

interface FunctionOptions { body?: unknown; }

/**
 * Calls the AWS Express backend at /functions/v1/<name>.
 * Used for AI functions, OTP, email validation etc.
 */
export const invokeFunction = async (functionName: string, options: FunctionOptions = {}) => {
  const endpoint = `${resolveApiUrl()}/functions/v1/${functionName}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options.body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const data = await response.json();
    return { data, error: null };
  }
  return { data: await response.text(), error: null };
};

/**
 * Authenticated fetch — attaches the Cognito access token.
 * Used for data API routes (/api/cases, /api/calendar-events, etc.)
 */
export const authFetch = async <T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  // Always get a fresh (auto-refreshed) token — handles the 60-min expiry transparently
  const token = await getFreshToken();
  const response = await fetch(`${resolveApiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const getChatUrl = (): string =>
  `${resolveApiUrl()}/functions/v1/legal-chat`;
