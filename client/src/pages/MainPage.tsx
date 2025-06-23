import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToken } from '../hooks/useToken';
import { useInference } from '../hooks/useInference';
import { useConfig } from '../hooks/useConfig';
import { useInferenceModel } from '../hooks/useInferenceModel';
import TapisFileView from '../components/TapisFileView';
import { Button, Typography, Select, Row, Col, Input, Layout, Divider, List, Modal } from 'antd';
import { LogoutOutlined, LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { TapisFile, InferenceModelMeta } from '../types/inference';

const { Title, Paragraph } = Typography;
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

interface InferenceInterfaceProps {
  selectedFile: TapisFile | null;
  setSelectedFile: (file: TapisFile | null) => void;
  selectedModel: string | undefined;
  setSelectedModel: (model: string) => void;
  result: string;
  setResult: (result: string) => void;
  models: InferenceModelMeta[] | undefined;
  modelsLoading: boolean;
}

const InferenceInterface: React.FC<InferenceInterfaceProps> = ({
  selectedFile,
  setSelectedFile,
  selectedModel,
  setSelectedModel,
  result,
  setResult,
  models,
  modelsLoading,
}) => {
  return (
    <>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <Row gutter={16} style={{ marginBottom: 24, alignItems: 'center' }}>
          <Col span={6} style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: '#fff', fontSize: 18 }}>
              Select a model
            </div>
          </Col>
          <Col span={18}>
            <Select
              value={selectedModel}
              style={{ width: '100%' }}
              loading={modelsLoading}
              onChange={val => setSelectedModel(val)}
              options={models?.map((m: InferenceModelMeta) => ({
                label: (
                  <span>
                    <b>{m.name}</b>
                    <span style={{ color: '#aaa', marginLeft: 8 }}>{m.description}</span>
                    {m.link && (
                      <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: '#40a9ff' }}>
                        [link]
                      </a>
                    )}
                  </span>
                ),
                value: m.name,
              }))}
              placeholder="Select a model"
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginBottom: 24, alignItems: 'center' }}>
          <Col span={6} style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: '#fff', fontSize: 18 }}>
              Select an image from the curated set
            </div>
          </Col>
          <Col span={18}>
            <Select
              value={selectedFile?.path}
              style={{ width: '100%' }}
              onChange={val => {
                const file = fileOptions.find(f => f.path === val) || null;
                setSelectedFile(file);
              }}
              options={fileOptions.map(f => ({
                label: `${f.systemId}:${f.path}`,
                value: f.path,
              }))}
            />
          </Col>
        </Row>
        <Divider style={{ background: '#444', margin: '24px 0 0 0' }} />
      </div>

      <Row gutter={32} style={{ marginBottom: 32, width: '100%', margin: '0 auto' }}>
        <Col span={12} style={{ minHeight: 400, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, width: 500 }}>
          <TapisFileView file={selectedFile} />
        </Col>
        <Col span={12}>
          <div style={{ 
            background: '#1a1a1a', 
            color: '#fff', 
            fontSize: 16, 
            width: 500,
            minHeight: 400,
            padding: 12,
            borderRadius: 6,
            border: '1px solid #434343',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8
          }}>
            {(result === 'Making request...' || result === 'Error') && (
              <div style={{ marginTop: 2 }}>
                {result === 'Making request...' ? (
                  <LoadingOutlined style={{ color: '#40a9ff' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
              </div>
            )}
            <TextArea
              value={result}
              onChange={e => setResult(e.target.value)}
              rows={20}
              placeholder="Inference results will appear here"
              style={{ 
                background: 'transparent', 
                color: '#fff', 
                fontSize: 16, 
                width: '100%',
                border: 'none',
                padding: 0,
                resize: 'none'
              }}
            />
          </div>
        </Col>
      </Row>
    </>
  );
};

export const MainPage = () => {
  const navigate = useNavigate();
  const config = useConfig();
  const { data: tokenData, isError, isLoading } = useToken();
  const [selectedFile, setSelectedFile] = useState<TapisFile | null>(fileOptions[0]);
  const [result, setResult] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const { data: models, isLoading: modelsLoading } = useInferenceModel(tokenData?.token);
  const [isModalVisible, setIsModalVisible] = useState(false);

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

  // Auto-select first model when models are loaded
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  // Auto-submit when both model and file are selected
  useEffect(() => {
    if (selectedModel && selectedFile && tokenData?.token) {
      inferenceMutation.mutate({ files: [selectedFile], model: selectedModel });
    }
  }, [selectedModel, selectedFile, tokenData?.token]);

  // Show inference results in the text area
  useEffect(() => {
    if (inferenceMutation.isPending) {
      setResult('Making request...');
    } else
    if (inferenceMutation.isSuccess && inferenceMutation.data) {
      setResult(JSON.stringify(inferenceMutation.data, null, 2));
    } else if (inferenceMutation.isError) {
      setResult('Error');
    }
  }, [inferenceMutation.isSuccess, inferenceMutation.data, inferenceMutation.isError, inferenceMutation.error, inferenceMutation.isPending]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#242424' }}>
      <Header style={{ background: 'transparent', padding: '0 32px', position: 'relative', minHeight: 100, display: 'flex', alignItems: 'center' }}>
        <Row style={{ width: '100%' }} align="middle" justify="start">
          <Col flex="auto">
            <Title style={{ color: '#fff', marginBottom: 0, marginTop: 16, fontSize: 32, textAlign: 'center' }}>imageInf - DEMO</Title>
            <Paragraph style={{ color: '#fff', marginBottom: 0, marginTop: 0, maxWidth: '90%', textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
              AI-powered image inferencing service that applies domain-specific categorization tags to uploaded datasets to support research workflows and data discovery.{' '}
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
      <Content style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 16px 0 16px' }}>
        {!modelsLoading && (
          <InferenceInterface
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            result={result}
            setResult={setResult}
            models={models}
            modelsLoading={modelsLoading}
          />
        )}
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
            <List.Item style={{ borderBottom: 'none', padding: '4px 0 4px 20px', position: 'relative' }}>
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
