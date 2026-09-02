import { CognitoUserPool } from 'amazon-cognito-identity-js';

const USER_POOL_ID  = import.meta.env.VITE_COGNITO_USER_POOL_ID  as string;
const CLIENT_ID     = import.meta.env.VITE_COGNITO_CLIENT_ID     as string;

if (!USER_POOL_ID || !CLIENT_ID) {
  console.warn('[cognito] VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_CLIENT_ID not set — auth will not work.');
}

export const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID || 'placeholder',
  ClientId:   CLIENT_ID   || 'placeholder',
});
