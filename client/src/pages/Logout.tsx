import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear all session storage
    sessionStorage.clear();

    // Redirect to login
    navigate('/login');
  }, [navigate]);

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
