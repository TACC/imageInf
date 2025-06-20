import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToken } from '../hooks/useToken';
import { useInference } from '../hooks/useInference';
import { useConfig } from '../hooks/useConfig';
import { Button, Typography, Select, Row, Col, Input, Layout, message, Divider } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import type { TapisFile } from '../types/inference';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Header, Content } = Layout;

const fileOptions: TapisFile[] = [
  {
   /* Image from "PRJ-3379 | GEER - Marshall Fire, Colorado" project on DesignSafe */
    systemId: 'designsafe.storage.published',
    path: '/PRJ-3379/RApp/uwrapid/Home/Photo 1642618419.jpg',
  },
  {
    systemId: 'designsafe.storage.published',
    path: '/PRJ-3379/RApp/uwrapid/Home/foojpg',
  },
];

export const MainPage = () => {
  const navigate = useNavigate();
  const config = useConfig();
  const { data: tokenData, isError, isLoading } = useToken();
  const [selectedFile, setSelectedFile] = useState<TapisFile | null>(fileOptions[0]);
  const [result, setResult] = useState('');

  // Use the inference hook
  const imageInfUrl = `${config.host}/api`;
  const inferenceMutation = useInference(tokenData?.token ?? '', imageInfUrl);

  useEffect(() => {
    if (isError || (!isLoading && !tokenData?.isValid)) {
      navigate('/login');
    }
  }, [isError, tokenData, isLoading, navigate]);

  // Clear results when switching files
  useEffect(() => {
    setResult('');
  }, [selectedFile]);

  // Show inference results in the text area
  useEffect(() => {
    if (inferenceMutation.isSuccess && inferenceMutation.data) {
      setResult(JSON.stringify(inferenceMutation.data, null, 2));
    } else if (inferenceMutation.isError && inferenceMutation.error instanceof Error) {
      setResult(`Error: ${inferenceMutation.error.message}`);
    }
  }, [inferenceMutation.isSuccess, inferenceMutation.data, inferenceMutation.isError, inferenceMutation.error]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleSubmit = () => {
    if (selectedFile && tokenData?.token) {
      inferenceMutation.mutate({ files: [selectedFile] });
    } else {
      message.error('No file selected or not authenticated');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#242424' }}>
      <Header style={{ background: 'transparent', padding: '0 32px', position: 'relative', minHeight: 100, display: 'flex', alignItems: 'center' }}>
        <Row style={{ width: '100%' }} align="middle" justify="start">
          <Col flex="auto">
            <Title style={{ color: '#fff', marginBottom: 0, marginTop: 16, fontSize: 32, textAlign: 'center' }}>imageInf.</Title>
            <Paragraph style={{ color: '#fff', marginBottom: 0, marginTop: 0, maxWidth: 600, textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
              AI-powered image inferencing service that applies domain-specific categorization tags to uploaded datasets to support research workflows and data discovery.
            </Paragraph>
          </Col>
        </Row>
      </Header>
      <Content style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 16px 0 16px' }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ textAlign: 'left', maxWidth: 800, margin: '0 auto 8px auto', fontWeight: 500, color: '#fff', fontSize: 18 }}>
            Select an image from the curated set
          </div>
          <Select
            value={selectedFile?.path}
            style={{ width: 800, maxWidth: '100%' }}
            onChange={val => {
              const file = fileOptions.find(f => f.path === val) || null;
              setSelectedFile(file);
            }}
            options={fileOptions.map(f => ({
              label: `${f.systemId}:${f.path}`,
              value: f.path,
            }))}
          />
          <Divider style={{ background: '#444', margin: '24px 0 0 0' }} />
        </div>

        <Row gutter={32} style={{ marginBottom: 32, width: 900, maxWidth: '100%', margin: '0 auto' }}>
          <Col span={14} style={{ minHeight: 240, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
            {/* TODO: Show image preview here */}
            <Text style={{ color: '#888' }}>Image preview (coming soon)</Text>
          </Col>
          <Col span={10}>
            <TextArea
              value={result}
              onChange={e => setResult(e.target.value)}
              rows={14}
              placeholder="Inference results will appear here"
              style={{ background: '#1a1a1a', color: '#fff', fontSize: 16 }}
            />
          </Col>
        </Row>

        <div style={{ textAlign: 'center' }}>
          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            disabled={!!result || inferenceMutation.isPending}
            loading={inferenceMutation.isPending}
          >
            Submit
          </Button>
        </div>
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
    </Layout>
  );
};

export default MainPage;
