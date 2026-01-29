import { useNavigate } from 'react-router-dom';
import { Button, Typography, Card, Row, Col, Layout, Spin } from 'antd';
import { CodeOutlined, PictureOutlined, LoginOutlined } from '@ant-design/icons';
import { useToken } from '../hooks/useToken';
import { useConfig } from '../hooks/useConfig';

const { Title, Paragraph } = Typography;
const { Content } = Layout;

const LandingPage = () => {
  const navigate = useNavigate();
  const config = useConfig();
  const { data: tokenData, isLoading: tokenLoading } = useToken();

  const handleLogin = () => {
    sessionStorage.setItem('oauth_return_to', '/');

    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);

    const authUrl = new URL('https://designsafe.tapis.io/v3/oauth2/authorize');
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append(
      'redirect_uri',
      `${window.location.origin}/imageinf/ui/auth/callback/`
    );
    authUrl.searchParams.append('response_type', 'token');

    window.location.href = authUrl.toString();
  };

  if (tokenLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#242424' }}>
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#242424' }}>
      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <Title style={{ color: '#fff', marginBottom: 8 }}>imageInf</Title>
        <Paragraph style={{ color: '#888', marginBottom: 48, textAlign: 'center', maxWidth: 600 }}>
          Image inferencing service.
        </Paragraph>

        {tokenData?.isValid ? (
          <Row gutter={24}>
            <Col>
              <Card
                hoverable
                style={{ width: 280, background: '#1a1a1a', borderColor: '#434343' }}
                onClick={() => navigate('/demo')}
              >
                <div style={{ textAlign: 'center' }}>
                  <CodeOutlined style={{ fontSize: 48, color: '#40a9ff', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#fff', marginBottom: 8 }}>
                    Developer Demo
                  </Title>
                  <Paragraph style={{ color: '#888', marginBottom: 16 }}>
                    Explore API and image inference.
                  </Paragraph>
                  <Button type="primary">Open</Button>
                </div>
              </Card>
            </Col>
            <Col>
              <Card
                hoverable
                style={{ width: 280, background: '#1a1a1a', borderColor: '#434343' }}
                onClick={() => navigate('/classify')}
              >
                <div style={{ textAlign: 'center' }}>
                  <PictureOutlined style={{ fontSize: 48, color: '#40a9ff', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#fff', marginBottom: 8 }}>
                    Gallery Classifier
                  </Title>
                  <Paragraph style={{ color: '#888', marginBottom: 16 }}>
                    Classify curated image sets.
                  </Paragraph>
                  <Button type="primary">Open</Button>
                </div>
              </Card>
            </Col>
          </Row>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Button type="primary" size="large" onClick={handleLogin}>
              Login
            </Button>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default LandingPage;
