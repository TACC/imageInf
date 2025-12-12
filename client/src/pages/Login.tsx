import { Button } from 'antd';
import { useConfig } from '../hooks/useConfig';

const Login = () => {
  const config = useConfig();

  const handleLogin = () => {
    // Generate a random state parameter for security
    // a store state in sessionStorage for verification
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);

    // TODO Support multiple Tapis tenants; currently we do if it is client is iframed under a CEP portal
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
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Button type="primary" size="large" onClick={handleLogin}>
        Login
      </Button>
    </div>
  );
};

export default Login;
