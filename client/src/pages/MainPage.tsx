import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToken } from '../hooks/useToken';
import { useConfig } from '../hooks/useConfig';
import { useInferenceModel } from '../hooks/useInferenceModel';
import { Button, Typography, Row, Col, Layout, List, Modal } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import InferenceInterface from '../components/InferenceInterface';

const { Title, Paragraph } = Typography;
const { Header, Content } = Layout;

export const MainPage = () => {
  const navigate = useNavigate();
  const config = useConfig();
  const { data: tokenData, isError, isLoading: tokenLoading } = useToken();
  const { data: models, isLoading: modelsLoading } = useInferenceModel(
    tokenData?.token ?? '',
    config.apiBasePath
  );
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (isError || (!tokenLoading && !tokenData?.isValid)) {
      navigate('/login');
    }
  }, [isError, tokenData, tokenLoading, navigate]);

  if (tokenLoading || modelsLoading || !models || !tokenData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#242424',
          width: '100vw',
        }}
      >
        <div style={{ color: '#fff', fontSize: 32, textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#242424' }}>
      <Header
        style={{
          background: 'transparent',
          padding: '0 32px',
          position: 'relative',
          minHeight: 100,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Row style={{ width: '100%' }} align="middle" justify="start">
          <Col flex="auto">
            <Title
              style={{
                color: '#fff',
                marginBottom: 0,
                marginTop: 16,
                fontSize: 32,
                textAlign: 'center',
              }}
            >
              imageInf - DEMO
            </Title>
            <Paragraph
              style={{
                color: '#fff',
                marginBottom: 0,
                marginTop: 0,
                maxWidth: '90%',
                textAlign: 'center',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              AI-powered image inferencing service that applies domain-specific categorization tags
              to uploaded datasets to support research workflows and data discovery.{' '}
              <a
                onClick={() => setIsModalVisible(true)}
                style={{ color: '#40a9ff', cursor: 'pointer', textDecoration: 'underline' }}
              >
                See current limitations/notes
              </a>
            </Paragraph>
          </Col>
        </Row>
      </Header>
      <Content style={{ maxWidth: '100%', margin: '0 auto', padding: '40px 16px 0 16px' }}>
        <InferenceInterface
          models={models}
          token={tokenData.token}
          apiBasePath={config.apiBasePath}
        />
      </Content>
      <div style={{ width: '100%', textAlign: 'center', margin: '48px 0 24px 0' }}>
        <Button
          icon={<LogoutOutlined />}
          onClick={() => navigate('/logout')}
          style={{ marginTop: 16 }}
        >
          Logout
        </Button>
      </div>
      <Modal
        title="Current Limitations & Notes"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
        bodyStyle={{ background: '#fafafa' }}
      >
        <List
          dataSource={[
            'Hardcoded to a single tapis tenant (designsafe.tapis.io)',
            'Uses a limited/curated set of images for demo',
            'Service is locked to a single image inferencing model huggingface.co/google/vit-base-patch16-224',
            'Service is currently limited to synchronous behavior (i.e. no database or celery workers yet)',
          ]}
          renderItem={(item: string) => (
            <List.Item
              style={{ borderBottom: 'none', padding: '4px 0 4px 20px', position: 'relative' }}
            >
              <span style={{ position: 'absolute', left: 0, top: 6 }}>•</span>
              {item}
            </List.Item>
          )}
        />
      </Modal>
    </Layout>
  );
};

export default MainPage;
