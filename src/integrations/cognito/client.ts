import { CognitoUserPool } from 'amazon-cognito-identity-js';

const USER_POOL_ID  = import.meta.env.VITE_COGNITO_USER_POOL_ID  as string;
const CLIENT_ID     = import.meta.env.VITE_COGNITO_CLIENT_ID     as string;

export const cognitoConfigured = Boolean(USER_POOL_ID && CLIENT_ID);

if (!cognitoConfigured) {
  console.warn('[cognito] VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_CLIENT_ID not set — sign-in is disabled.');
}

// The fallback pool id must match Cognito's expected `<region>_<alphanumeric>`
// shape. A plain string like 'placeholder' makes the constructor throw
// "Invalid UserPoolId format" at module load, which takes down the whole app
// before React mounts — a blank page instead of a site with sign-in disabled.
const FALLBACK_POOL_ID = 'us-east-1_000000000';

function createPool(): CognitoUserPool {
  try {
    return new CognitoUserPool({
      UserPoolId: USER_POOL_ID || FALLBACK_POOL_ID,
      ClientId:   CLIENT_ID   || 'placeholder',
    });
  } catch (e) {
    // Never let an auth misconfiguration break page rendering. Auth calls will
    // fail on their own; everything else keeps working.
    console.warn('[cognito] pool init failed, sign-in disabled:', (e as Error).message);
    return new CognitoUserPool({ UserPoolId: FALLBACK_POOL_ID, ClientId: 'placeholder' });
  }
}

export const userPool = createPool();
