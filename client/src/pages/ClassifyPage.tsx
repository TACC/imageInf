import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToken } from '../hooks/useToken.ts';
import { useConfig } from '../hooks/useConfig.ts';
import { useInferenceModel } from '../hooks/useInferenceModel.ts';
import { isInIframe } from '../utils/iframe.ts';
import { Button, Typography, Row, Col, Layout, List, Modal } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import DemoInterface from '../components/DemoInterface.tsx';

const { Title, Paragraph } = Typography;
const { Header, Content } = Layout;

/**
 * Gallery Classifier - Classify curated image sets and view aggregated results.
 * Image classification demo with gallery view for CEP AI showcase.
 */
export const ClassifyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = useConfig();
  const { data: tokenData, isError: tokenLoadingError, isLoading: tokenLoading } = useToken();
  const {
    data: models,
    isLoading: modelsLoading,
    isError: modelsError,
    error: modelsErrorDetail,
  } = useInferenceModel(tokenData?.token ?? '', config.apiBasePath);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const inIFrame = isInIframe();

  useEffect(() => {
    if (!inIFrame && !tokenLoading && !tokenData?.isValid) {
      navigate(`/`, { replace: true });
    }
  }, [inIFrame, tokenData, tokenLoading, navigate, location.pathname, location.search]);

  if (modelsError || tokenLoadingError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#242424',
          width: '100vw',
          color: '#ff4d4f',
          fontSize: 24,
          textAlign: 'center',
        }}
      >
        Failed to load models: {modelsErrorDetail?.message || 'Unkown Error'}
      </div>
    );
  }

  if (inIFrame && !tokenLoading && !tokenData?.isValid) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#242424',
          width: '100vw',
          color: '#ff4d4f',
          fontSize: 24,
          textAlign: 'center',
        }}
      >
        Session Expired
      </div>
    );
  }

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
    <Layout style={{ minHeight: '80vh', background: '#242424' }}>
      <Header
        style={{
          background: 'transparent',
          padding: '0 2rem',
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
              imageInf - DEMO (TODO)
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
      <Content style={{ maxWidth: '100%', margin: '0 auto', padding: '3rem 1rem 0 1rem' }}>
        <DemoInterface models={models} tokenInfo={tokenData} apiBasePath={config.apiBasePath} />
      </Content>
      {!inIFrame && (
        <div style={{ width: '100%', textAlign: 'center', margin: '1rem 0 1rem 0' }}>
          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              navigate(`/logout}`);
            }}
            style={{ marginTop: 0 }}
          >
            Logout
          </Button>
        </div>
      )}
      <Modal
        title="Current Limitations & Notes"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
        bodyStyle={{ background: '#fafafa' }}
      >
        <List
          dataSource={['TODO', 'TODO']}
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

export default ClassifyPage;
