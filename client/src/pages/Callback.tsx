import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // TODO: Tapis should return in fragment instead of query param
        // const fragment = window.location.hash.substring(1); // Remove the # character
        // const params = new URLSearchParams(fragment);

        // Get the access token from query params
        const accessToken = searchParams.get('access_token');
        const expiresIn = searchParams.get('expires_in') ?? '3600'; // Default to 1 hour but should be 4 hours

        if (!accessToken) {
          throw new Error('No access token received');
        }

        // TODO skipping as Tapis not supporting `state` parameter at the moment (see Login.tsx)
        /*
        const storedState = sessionStorage.getItem('oauth_state');
        if (state !== storedState) {
          throw new Error('State mismatch');
        }*/

        // Calculate expiration time (convert seconds to milliseconds)
        const expiresAt = Date.now() + parseInt(expiresIn) * 1000;

        // Store the token and expiration
        sessionStorage.setItem('access_token', accessToken);
        sessionStorage.setItem('expires_at', expiresAt.toString());

        // Clear the state
        sessionStorage.removeItem('oauth_state');

        // Redirect to original page (or home)
        const returnTo = sessionStorage.getItem('oauth_return_to') || '/';
        navigate(returnTo, { replace: true });
      } catch (error) {
        console.error('Authentication error:', error);
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Spin size="large" tip="Completing authentication..." />
    </div>
  );
};

export default Callback;
