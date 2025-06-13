import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useToken } from '../hooks/useToken';
import { Button, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const MainPage = () => {
  const navigate = useNavigate();
  const { data, isError, isLoading } = useToken();

  useEffect(() => {
    if (isError || (!isLoading && !data?.isValid)) {
      navigate('/login');
    }
  }, [isError, data, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <p>Image inferencing service</p>

      {data?.isValid && (
        <div>
          <Text type="success">✅ Logged in</Text>
          <Button 
            icon={<LogoutOutlined />} 
            onClick={() => navigate('/logout')}
            style={{ marginLeft: 16 }}
          >
            Logout
          </Button>
        </div>
      )}
    </div>
  );
};

export default MainPage;
