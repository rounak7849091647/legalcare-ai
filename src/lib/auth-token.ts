/**
 * Module-level token store.
 * useAuth sets this on login/session-restore; data-fetching modules read it.
 * This avoids prop-drilling the token through every component.
 *
 * getFreshToken() automatically refreshes the Cognito access token if expired
 * (Cognito access tokens are valid for 60 minutes — the refresh token is valid
 * for 5 days by default). This is done lazily on demand so there's no background
 * polling.
 */
import { userPool } from '@/integrations/cognito/client';
import type { CognitoUserSession } from 'amazon-cognito-identity-js';

let _token: string | null = null;

export const setAuthToken = (token: string | null) => { _token = token; };
export const getAuthToken = (): string | null => _token;

/**
 * Returns a valid Cognito access token, refreshing it silently if expired.
 * Falls back to the stored token if Cognito refresh fails (e.g., not logged in).
 */
export const getFreshToken = (): Promise<string | null> => {
  return new Promise(resolve => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return resolve(_token);

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(_token);
      const fresh = session.getAccessToken().getJwtToken();
      // Update stored token with refreshed value
      _token = fresh;
      resolve(fresh);
    });
  });
};
