import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';

const Logout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Clear all session storage
    sessionStorage.clear();

    // Check if we know where we want to go to (via returnTo)
    const returnTo = searchParams.get('returnTo');
    const loginPath = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';

    // Redirect to login
    navigate(loginPath);
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
      <Spin size="large" tip="Logging out..." />
    </div>
  );
};

export default Logout;
