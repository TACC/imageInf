import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToken } from '../hooks/useToken';
import { useInference } from '../hooks/useInference';
import { Button, Typography, Select, Row, Col, Input, Layout, message } from 'antd';
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
  const { data: tokenData, isError, isLoading } = useToken();
  const [selectedFile, setSelectedFile] = useState<TapisFile | null>(fileOptions[0]);
  const [result, setResult] = useState('');

  // Use the inference hook
  const imageInfUrl = 'http://localhost:8080/api'; // TODO: move to config if needed
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
        <Row style={{ width: '100%' }} align="middle" justify="space-between">
          <Col flex="auto">
            <Title style={{ color: '#fff', marginBottom: 0, marginTop: 16, fontSize: 32 }}>imageInf.</Title>
            <Paragraph style={{ color: '#fff', marginBottom: 0, marginTop: 0, maxWidth: 600 }}>
              AI-powered image inferencing service that applies domain-specific categorization tags to uploaded datasets to support research workflows and data discovery.
            </Paragraph>
          </Col>
          <Col>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => navigate('/logout')}
              style={{ marginLeft: 16, marginTop: 16 }}
            >
              Logout
            </Button>
          </Col>
        </Row>
      </Header>
      <Content style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px 0 16px' }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <Select
            value={selectedFile?.path}
            style={{ width: 500 }}
            onChange={val => {
              const file = fileOptions.find(f => f.path === val) || null;
              setSelectedFile(file);
            }}
            options={fileOptions.map(f => ({
              label: `${f.systemId}:${f.path}`,
              value: f.path,
            }))}
          />
        </div>

        <Row gutter={32} style={{ marginBottom: 32 }}>
          <Col span={12} style={{ minHeight: 200, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* TODO: Show image preview here */}
            <Text style={{ color: '#888' }}>Image preview (coming soon)</Text>
          </Col>
          <Col span={12}>
            <TextArea
              value={result}
              onChange={e => setResult(e.target.value)}
              rows={10}
              placeholder="Inference results will appear here"
              style={{ background: '#1a1a1a', color: '#fff' }}
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
    </Layout>
  );
};

export default MainPage;
