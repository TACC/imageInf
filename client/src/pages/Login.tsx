import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spin, Layout } from 'antd';
import { useConfig } from '../hooks/useConfig';

const { Content } = Layout;

const Login = () => {
  const config = useConfig();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Store where to return after successful auth
    const returnTo = searchParams.get('returnTo') || '/';
    sessionStorage.setItem('oauth_return_to', returnTo);

    // Generate a random state parameter for security
    // and store state in sessionStorage for verification
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

    // TODO tapis not supporting state parameter at the moment
    //authUrl.searchParams.append('state', state);

    // Redirect to OAuth provider
    window.location.replace(authUrl.toString());
  }, [config.clientId, searchParams]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#242424' }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Redirecting to login..." />
      </Content>
    </Layout>
  );
};

export default Login;
