import { Button } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useConfig } from '../hooks/useConfig';

const Login = () => {
  const config = useConfig();
  const [searchParams] = useSearchParams();

  const handleLogin = () => {
    // Store where to return after successful auth
    const returnTo = searchParams.get('returnTo') || '/';
    sessionStorage.setItem('oauth_return_to', returnTo);

    // Generate a random state parameter for security
    // a store state in sessionStorage for verification
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);

    // TODO Support multiple Tapis tenants; we support multi-tenancy if the client is iframed under a CEP portal
    const authUrl = new URL('https://designsafe.tapis.io/v3/oauth2/authorize');
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append(
      'redirect_uri',
      `${window.location.origin}/imageinf/ui/auth/callback/`
    );
    authUrl.searchParams.append('response_type', 'token');

    // TODO tapis not supporting at the moment

    //authUrl.searchParams.append('state', state);

    // Redirect to OAuth provider
    window.location.href = authUrl.toString();
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'top',
          minHeight: '100vh',
          marginTop: '1rem',
        }}
      >
        <Button type="primary" size="large" onClick={handleLogin}>
          Login
        </Button>
      </div>
    </div>
  );
};

export default Login;
