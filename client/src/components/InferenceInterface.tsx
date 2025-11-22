import React, { useEffect, useState } from 'react';
import { Row, Col, Select, Divider, Input } from 'antd';
import { LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import TapisFileView from './TapisFileView';
import { useInference } from '../hooks/useInference';
import type { TapisFile, InferenceModelMeta } from '../types/inference';
import { curatedFileList } from '../utils/examples';

const { TextArea } = Input;

interface InferenceInterfaceProps {
  models: InferenceModelMeta[];
  token: string;
  apiBasePath: string;
}

const InferenceInterface: React.FC<InferenceInterfaceProps> = ({ models, token, apiBasePath }) => {
  const [selectedFile, setSelectedFile] = useState<TapisFile | null>(curatedFileList[0]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [result, setResult] = useState('');

  const inferenceMutation = useInference(token, apiBasePath);

  // Auto-select first model when models are loaded
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  // Auto-submit when model or file changes
  useEffect(() => {
    if (selectedModel && selectedFile) {
      inferenceMutation.mutate({ files: [selectedFile], model: selectedModel });
    }
    // we don't want inferenceMutation as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, selectedFile]);

  // Clear results when switching file or model
  useEffect(() => {
    setResult('');
  }, [selectedFile, selectedModel]);

  // Show inference results in the text area
  useEffect(() => {
    if (inferenceMutation.isPending) {
      setResult('Making request...');
    } else if (inferenceMutation.isSuccess && inferenceMutation.data) {
      setResult(JSON.stringify(inferenceMutation.data, null, 2));
    } else if (inferenceMutation.isError) {
      setResult('Error');
    }
  }, [
    inferenceMutation.isSuccess,
    inferenceMutation.data,
    inferenceMutation.isError,
    inferenceMutation.error,
    inferenceMutation.isPending,
  ]);

  return (
    <>
      <div style={{ width: '100%', marginBottom: 32, textAlign: 'center' }}>
        <Row gutter={16} style={{ marginBottom: 24, alignItems: 'center' }}>
          <Col span={4} style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: '#fff', fontSize: 18 }}>Select a model</div>
          </Col>
          <Col span={20}>
            <Select
              value={selectedModel}
              style={{ width: '100%' }}
              onChange={(val) => setSelectedModel(val)}
              options={models.map((m: InferenceModelMeta) => ({
                label: (
                  <span>
                    <b>{m.name}</b>
                    <span style={{ color: '#aaa', marginLeft: 8 }}>{m.description}</span>
                    {m.link && (
                      <a
                        href={m.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: 8, color: '#40a9ff' }}
                      >
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
          <Col span={4} style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: '#fff', fontSize: 18 }}>
              Select an image from the curated set
            </div>
          </Col>
          <Col span={20}>
            <Select
              value={selectedFile?.path}
              style={{ width: '100%' }}
              onChange={(val) => {
                const file = curatedFileList.find((f) => f.path === val) || null;
                setSelectedFile(file);
              }}
              options={curatedFileList.map((f) => ({
                label: `${f.systemId}:${f.path}`,
                value: f.path,
              }))}
            />
          </Col>
        </Row>
        <Divider style={{ background: '#444', margin: '24px 0 0 0' }} />
      </div>

      <Row gutter={32} style={{ marginBottom: 32, width: '100%', margin: '0 auto' }}>
        <Col
          span={12}
          style={{
            minHeight: 400,
            background: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            width: 600,
          }}
        >
          <TapisFileView file={selectedFile} />
        </Col>
        <Col span={12}>
          <div
            style={{
              background: '#1a1a1a',
              color: '#fff',
              fontSize: 16,
              width: 600,
              minHeight: 400,
              padding: 12,
              borderRadius: 6,
              border: '1px solid #434343',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
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
              onChange={(e) => setResult(e.target.value)}
              rows={20}
              placeholder="Inference results will appear here"
              style={{
                background: 'transparent',
                color: '#fff',
                fontSize: 16,
                width: '100%',
                minWidth: 0,
                maxWidth: 800,
                border: 'none',
                padding: 0,
                resize: 'none',
              }}
            />
          </div>
        </Col>
      </Row>
    </>
  );
};

export default InferenceInterface;
