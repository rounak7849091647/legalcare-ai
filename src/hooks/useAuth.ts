import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserSession,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';
import { userPool } from '@/integrations/cognito/client';
import { invokeFunction } from '@/lib/api';
import { setAuthToken } from '@/lib/auth-token';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// ── Decode a JWT payload (base64url) without verifying the signature.
// Used only on the CLIENT side after the server has already verified.
const decodeJwtPayload = (token: string): Record<string, unknown> => {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch { return {}; }
};

// ── Public user shape ────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;           // Cognito sub
  email: string;
  fullName: string;
  emailVerified: boolean;
}

interface AuthHook {
  user: AuthUser | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; userId?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (credential: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  confirmPasswordReset: (email: string, otp: string, newPassword: string) => Promise<{ error: Error | null }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: Error | null }>;
  sendOTP: (email: string, userId: string) => Promise<{ error: Error | null }>;
  verifyOTP: (email: string, otp: string, password: string) => Promise<{ error: Error | null }>;
  getAccessToken: () => string | null;
}

// ── Admin notification (fire-and-forget) ─────────────────────────────────────
const notifyAdmin = (event: 'login' | 'signup', name: string, email: string) => {
  invokeFunction('auth-notify', {
    body: { event, name, email, timestamp: new Date().toISOString(), userAgent: navigator.userAgent },
  }).catch(() => { /* silent */ });
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const attrsToMap = (attrs: CognitoUserAttribute[]) =>
  Object.fromEntries(attrs.map(a => [a.getName(), a.getValue()]));

const loadCurrentSession = (): Promise<{ user: AuthUser; token: string } | null> =>
  new Promise(resolve => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return resolve(null);

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);

      cognitoUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr || !attributes) return resolve(null);
        const m = attrsToMap(attributes);
        resolve({
          user: {
            id:            m['sub']            || '',
            email:         m['email']          || '',
            fullName:      m['name']           || m['email'] || '',
            emailVerified: m['email_verified'] === 'true',
          },
          token: session.getAccessToken().getJwtToken(),
        });
      });
    });
  });

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthHook => {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  // Keep a ref to the CognitoUser so we can call getSession for token refresh
  const cognitoUserRef = useRef<CognitoUser | null>(null);

  // Restore session on mount
  useEffect(() => {
    loadCurrentSession().then(result => {
      if (result) {
        setUser(result.user);
        setAuthToken(result.token);
        cognitoUserRef.current = userPool.getCurrentUser();
      }
      setIsLoading(false);
    });
  }, []);

  // ── getAccessToken ──────────────────────────────────────────────────────────
  const getAccessToken = useCallback((): string | null => {
    // Return cached token; Cognito auto-refreshes on next getSession call
    return cognitoUserRef.current
      ? (userPool.getCurrentUser()?.getSignInUserSession()?.getAccessToken().getJwtToken() ?? null)
      : null;
  }, []);

  // ── Sign Up ─────────────────────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    return new Promise<{ error: Error | null; userId?: string; emailError?: string }>(resolve => {
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name',  Value: fullName }),
      ];
      userPool.signUp(email, password, attributes, [], async (err, result) => {
        if (err) return resolve({ error: new Error(err.message) });
        const userId = result?.userSub;
        // Send our custom OTP (Cognito email verification disabled in pool).
        // Await it so we can tell the user if the email did not actually go out —
        // the account is created either way, they just may need to resend.
        let emailError: string | undefined;
        try {
          const { data } = await invokeFunction('send-verification', { body: { email, userId } });
          if (data?.error) emailError = data.error as string;
        } catch (e) {
          emailError = (e as Error).message;
        }
        notifyAdmin('signup', fullName, email);
        resolve({ error: null, userId, emailError });
      });
    });
  }, []);

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const sendOTP = useCallback(async (email: string, userId: string) => {
    try {
      const { data } = await invokeFunction('send-verification', { body: { email, userId } });
      if (data?.error) throw new Error(data.error);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  // ── Verify OTP (confirms account + auto-signs-in) ───────────────────────────
  const verifyOTP = useCallback(async (email: string, otp: string, password: string) => {
    try {
      const { data } = await invokeFunction('verify-otp', { body: { email, otp } });
      if (!data?.valid) throw new Error(data?.error || 'Invalid or expired code.');

      // OTP confirmed → sign in automatically
      return new Promise<{ error: Error | null }>(resolve => {
        const cognitoUser  = new CognitoUser({ Username: email, Pool: userPool });
        const authDetails  = new AuthenticationDetails({ Username: email, Password: password });

        cognitoUser.authenticateUser(authDetails, {
          onSuccess: session => {
            cognitoUser.getUserAttributes((_, attributes) => {
              const m = attrsToMap(attributes || []);
              const authUser: AuthUser = {
                id:            m['sub']   || '',
                email,
                fullName:      m['name']  || email,
                emailVerified: true,
              };
              cognitoUserRef.current = cognitoUser;
              setUser(authUser);
              setAuthToken(session.getAccessToken().getJwtToken());
              toast.success(`Welcome to LegalCareAI, ${authUser.fullName.split(' ')[0]}! 🎉`);
              navigate('/dashboard');
              resolve({ error: null });
            });
          },
          onFailure: err => resolve({ error: new Error(err.message) }),
        });
      });
    } catch (error) {
      return { error: error as Error };
    }
  }, [navigate]);

  // ── Sign In ─────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    return new Promise<{ error: Error | null }>(resolve => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: session => {
          cognitoUser.getUserAttributes((_, attributes) => {
            const m = attrsToMap(attributes || []);
            const emailVerified = m['email_verified'] === 'true';

            if (!emailVerified) {
              cognitoUser.signOut();
              return resolve({
                error: new Error(
                  'EMAIL_NOT_VERIFIED: Your email is not verified yet. ' +
                  'Enter the 6-digit code we sent you, or request a new one below.'
                ),
              });
            }

            const authUser: AuthUser = {
              id:            m['sub']   || '',
              email,
              fullName:      m['name']  || email,
              emailVerified: true,
            };
            cognitoUserRef.current = cognitoUser;
            setUser(authUser);
            setAuthToken(session.getAccessToken().getJwtToken());
            toast.success(`Welcome back, ${authUser.fullName.split(' ')[0] || 'there'}!`);
            notifyAdmin('login', authUser.fullName, email);
            navigate('/dashboard');
            resolve({ error: null });
          });
        },
        onFailure: err => {
          const msg = err.message || 'Sign in failed';
          resolve({ error: new Error(msg) });
        },
        newPasswordRequired: () => {
          resolve({ error: new Error('NEW_PASSWORD_REQUIRED: Please contact support.') });
        },
      });
    });
  }, [navigate]);

  // ── Sign In With Google ─────────────────────────────────────────────────────
  // credential = Google ID token string from @react-oauth/google onSuccess callback
  const signInWithGoogle = useCallback(async (credential: string) => {
    try {
      const { data } = await invokeFunction('google-signin', { body: { credential } });
      if (!data?.ok) throw new Error(data?.error || 'Google sign-in failed');

      const { accessToken, user: googleUser } = data as {
        accessToken: string;
        user: { email: string; fullName: string; emailVerified: boolean };
      };

      // Decode Cognito access token to get the sub (unique user ID)
      const payload = decodeJwtPayload(accessToken);
      const authUser: AuthUser = {
        id:            (payload.sub as string) || '',
        email:         googleUser.email,
        fullName:      googleUser.fullName,
        emailVerified: true,
      };

      setAuthToken(accessToken);
      setUser(authUser);
      // Note: we don't have a CognitoUser object here, but the token is stored
      // so authFetch (which calls getFreshToken → userPool.getCurrentUser) will
      // fall back to _token if no session exists. The token lasts 60 min.
      toast.success(`Welcome, ${authUser.fullName.split(' ')[0]}! 👋`);
      notifyAdmin('login', authUser.fullName, authUser.email);
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [navigate]);

  // ── Sign Out ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    const cognitoUser = userPool.getCurrentUser();
    cognitoUser?.signOut();
    cognitoUserRef.current = null;
    setUser(null);
    setAuthToken(null);
    toast.success('Signed out successfully');
    navigate('/');
  }, [navigate]);

  // ── Reset password (sends OTP via our SMTP) ─────────────────────────────────
  const resetPassword = useCallback(async (email: string) => {
    try {
      const { data } = await invokeFunction('send-verification', {
        body: { email, userId: null, purpose: 'reset' },
      });
      if (data?.error) throw new Error(data.error);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  // ── Confirm password reset (verifies OTP + sets new password via Cognito Admin) ─
  const confirmPasswordReset = useCallback(async (email: string, otp: string, newPassword: string) => {
    try {
      const { data } = await invokeFunction('confirm-password-reset', {
        body: { email, otp, newPassword },
      });
      if (!data?.ok) throw new Error(data?.error || 'Reset failed. Please try again.');
      toast.success('Password updated! You can now sign in.');
      navigate('/auth');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [navigate]);

  // ── Update password (when already logged in) ────────────────────────────────
  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    return new Promise<{ error: Error | null }>(resolve => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) return resolve({ error: new Error('Not authenticated') });

      cognitoUser.getSession((err: Error | null) => {
        if (err) return resolve({ error: err });
        cognitoUser.changePassword(currentPassword, newPassword, (changeErr) => {
          if (changeErr) return resolve({ error: new Error(changeErr.message) });
          toast.success('Password updated successfully!');
          resolve({ error: null });
        });
      });
    });
  }, []);

  return {
    user, isLoading,
    signUp, signIn, signInWithGoogle, signOut,
    resetPassword, confirmPasswordReset, updatePassword,
    sendOTP, verifyOTP, getAccessToken,
  };
};
