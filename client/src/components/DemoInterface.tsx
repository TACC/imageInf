import React, { useEffect, useState, useMemo } from 'react';
import { Row, Col, Select, Divider, Spin, Card, List, Badge, Empty, Tag } from 'antd';
import {
  LoadingOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
  TagsOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useInference } from '../hooks/useInference';
import type { TokenInfo } from '../types/token';
import type { TapisFile, InferenceModelMeta, InferenceResult } from '../types/inference';
import TapisImageViewer from './TapisImageViewer';
import { getCuratedFileList } from '../utils/examples';

interface DemoInterfaceProps {
  models: InferenceModelMeta[];
  tokenInfo: TokenInfo;
  apiBasePath: string;
}

interface AggregatedResult {
  label: string;
  count: number;
}

interface LabelPreset {
  value: string;
  label: string;
  labels: string[];
}

// Duplicate of what is defined on backend
const ALL_DEFAULT_LABELS = [
  'house',
  'building',
  'car',
  'truck',
  'bus',
  'person',
  'group of people',
  'road',
  'bridge',
  'parking lot',
  'debris',
  'rubble',
  'damaged building',
  'flooded area',
  'fallen tree',
  'trees',
  'water',
  'sky',
];

const LABEL_PRESETS: LabelPreset[] = [
  {
    value: 'structures',
    label: 'Structures',
    labels: ['house', 'building', 'road', 'bridge', 'parking lot'],
  },
  {
    value: 'damage',
    label: 'Damage & Hazards',
    labels: ['debris', 'rubble', 'damaged building', 'flooded area', 'fallen tree'],
  },
  {
    value: 'vehicles_people',
    label: 'Vehicles & People',
    labels: ['car', 'truck', 'bus', 'person', 'group of people'],
  },
  {
    value: 'environment',
    label: 'Environment',
    labels: ['trees', 'water', 'sky', 'flooded area', 'road'],
  },
  {
    value: 'all',
    label: 'All Labels (Default)',
    labels: ALL_DEFAULT_LABELS,
  },
];

const DemoInterface: React.FC<DemoInterfaceProps> = ({ models, tokenInfo, apiBasePath }) => {
  const curatedFileList = useMemo(
    () => getCuratedFileList(tokenInfo.tapisHost),
    [tokenInfo.tapisHost]
  );

  // only supporting clip models on first pass
  const clipModels = useMemo(
    () => models.filter((m) => m.name.toLowerCase().includes('clip')),
    [models]
  );

  // Split into curated sets of 5
  const curatedSets = useMemo(() => {
    const sets: { value: string; label: string; files: TapisFile[] }[] = [];
    for (let i = 0; i < curatedFileList.length; i += 5) {
      const setNum = Math.floor(i / 5) + 1;
      sets.push({
        value: `set${setNum}`,
        label: `Curated Set #${setNum}`,
        files: curatedFileList.slice(i, i + 5),
      });
    }
    return sets;
  }, [curatedFileList]);

  const [selectedSet, setSelectedSet] = useState<string | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [selectedSensitivity, setSelectedSensitivity] = useState<'high' | 'medium' | 'low'>(
    'medium'
  );
  const [selectedLabelPreset, setSelectedLabelPreset] = useState<string>('structures');
  const [aggregatedResults, setAggregatedResults] = useState<AggregatedResult[]>([]);
  const [inferenceResults, setInferenceResults] = useState<InferenceResult[]>([]);
  const [selectedFilterLabels, setSelectedFilterLabels] = useState<string[]>([]);

  const inferenceMutation = useInference(tokenInfo.token, apiBasePath);

  // Get current files from selected set
  const currentFiles = useMemo(() => {
    if (!selectedSet) return [];
    return curatedSets.find((s) => s.value === selectedSet)?.files || [];
  }, [selectedSet, curatedSets]);

  // Get current labels from selected preset
  const currentLabels = useMemo(() => {
    const preset = LABEL_PRESETS.find((p) => p.value === selectedLabelPreset);
    return preset?.labels || ALL_DEFAULT_LABELS;
  }, [selectedLabelPreset]);

  // Build a map of file path -> labels detected
  const fileLabelsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    inferenceResults.forEach((result) => {
      const labels = new Set<string>();
      result.predictions?.forEach((p) => labels.add(p.label));
      map[result.path] = labels;
    });
    return map;
  }, [inferenceResults]);

  // Filter files based on selected labels (show files that have ANY of the selected labels)
  const filteredFiles = useMemo(() => {
    if (selectedFilterLabels.length === 0) {
      return currentFiles;
    }
    return currentFiles.filter((file) => {
      const fileLabels = fileLabelsMap[file.path];
      if (!fileLabels) return false;
      return selectedFilterLabels.some((label) => fileLabels.has(label));
    });
  }, [currentFiles, selectedFilterLabels, fileLabelsMap]);

  // Auto-select first model when models are loaded (but NOT auto-select set)
  useEffect(() => {
    if (clipModels && clipModels.length > 0 && !selectedModel) {
      setSelectedModel(clipModels[0].name);
    }
  }, [clipModels, selectedModel]);

  // Submit inference when:
  // - User first selects both a model and image set
  // - User changes model, set, or labels after initial selection
  useEffect(() => {
    if (selectedModel && selectedSet && currentFiles.length > 0) {
      inferenceMutation.mutate({
        files: currentFiles,
        model: selectedModel,
        sensitivity: selectedSensitivity,
        labels: selectedLabelPreset === 'all' ? undefined : currentLabels,
      });
    }
    // excluding inferenceMutation from deps to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, selectedSet, selectedSensitivity, selectedLabelPreset, currentFiles]);

  // Clear results and selected filter labels when switching set, model, or labels
  useEffect(() => {
    setAggregatedResults([]);
    setInferenceResults([]);
    setSelectedFilterLabels([]);
  }, [selectedSet, selectedModel, selectedLabelPreset]);

  // Aggregate inference results
  useEffect(() => {
    if (inferenceMutation.isSuccess && inferenceMutation.data) {
      const labelCounts: Record<string, number> = {};

      // Access the nested array - use aggregated_results for CLIP
      const response = inferenceMutation.data;
      const results = response.aggregated_results || response.results || [];

      // Store full results for filtering
      setInferenceResults(results);

      results.forEach((fileResult) => {
        fileResult.predictions?.forEach((prediction) => {
          labelCounts[prediction.label] = (labelCounts[prediction.label] || 0) + 1;
        });
      });

      const aggregated = Object.entries(labelCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

      setAggregatedResults(aggregated);
    }
  }, [inferenceMutation.isSuccess, inferenceMutation.data]);

  const toggleFilterLabel = (label: string) => {
    setSelectedFilterLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const clearFilterLabels = () => {
    setSelectedFilterLabels([]);
  };

  const isReady = selectedModel && selectedSet;
  const isLoading = inferenceMutation.isPending;
  const isError = inferenceMutation.isError;
  const isFiltered = selectedFilterLabels.length > 0;

  return (
    <>
      {/* Controls Section */}
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
              options={clipModels.map((m: InferenceModelMeta) => ({
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
                        onClick={(e) => e.stopPropagation()}
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
        {/* <Row gutter={16} style={{ marginBottom: 24, alignItems: 'center' }}>
          <Col span={4} style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: '#fff', fontSize: 18 }}>Sensitivity</div>
          </Col>
          <Col span={20}>
            <Select
              value={selectedSensitivity}
              style={{ width: '100%' }}
              onChange={(val) => setSelectedSensitivity(val)}
              options={[
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ]}
            />
          </Col>
        </Row> */}
        <Row gutter={16} style={{ marginBottom: 24, alignItems: 'center' }}>
          <Col span={4} style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: '#fff', fontSize: 18 }}>
              <TagsOutlined style={{ marginRight: 8 }} />
              Label Preset
            </div>
          </Col>
          <Col span={20}>
            <Select
              value={selectedLabelPreset}
              style={{ width: '100%' }}
              onChange={(val) => setSelectedLabelPreset(val)}
              options={LABEL_PRESETS.map((p) => ({
                label: `${p.label} (${p.labels.length} labels)`,
                value: p.value,
              }))}
              optionRender={(option) => {
                const preset = LABEL_PRESETS.find((p) => p.value === option.value);
                return (
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {preset?.label} ({preset?.labels.length} labels)
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {preset?.labels.join(', ')}
                    </div>
                  </div>
                );
              }}
            />
            {/* Show active labels as tags below the dropdown */}
            <div style={{ marginTop: 8, textAlign: 'left' }}>
              {currentLabels.map((label) => (
                <Tag key={label} color="blue" style={{ marginBottom: 4 }}>
                  {label}
                </Tag>
              ))}
            </div>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginBottom: 24, alignItems: 'center' }}>
          <Col span={4} style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: '#fff', fontSize: 18 }}>
              <PictureOutlined style={{ marginRight: 8 }} />
              Select a curated image set
            </div>
          </Col>
          <Col span={20}>
            <Select
              value={selectedSet}
              style={{ width: '100%' }}
              onChange={(val) => setSelectedSet(val)}
              options={curatedSets.map((s) => ({
                label: `${s.label} (${s.files.length} images)`,
                value: s.value,
              }))}
              placeholder="Choose a curated set..."
            />
          </Col>
        </Row>
        <Divider style={{ background: '#444', margin: '24px 0 0 0' }} />
      </div>

      {/* Main Content Area */}
      <Row gutter={32} style={{ marginBottom: 32, width: '100%', margin: '0 auto' }}>
        {/* Gallery - Left Side */}
        <Col span={16}>
          <div
            style={{
              background: '#1a1a1a',
              minHeight: 400,
              padding: 16,
              borderRadius: 8,
              border: '1px solid #434343',
            }}
          >
            <div
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: 500,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                Gallery
                {currentFiles.length > 0 && (
                  <span style={{ color: '#888', fontWeight: 400, marginLeft: 8 }}>
                    {isFiltered ? (
                      <>
                        {filteredFiles.length} of {currentFiles.length} images
                      </>
                    ) : (
                      `(${currentFiles.length} images)`
                    )}
                  </span>
                )}
              </div>
              {isFiltered && (
                <Tag
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={clearFilterLabels}
                  icon={<CloseCircleOutlined />}
                >
                  Clear filter
                </Tag>
              )}
            </div>

            {/* Show selected filter labels */}
            {isFiltered && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888', marginRight: 8 }}>Filtering by:</span>
                {selectedFilterLabels.map((label) => (
                  <Tag
                    key={label}
                    color="blue"
                    closable
                    onClose={() => toggleFilterLabel(label)}
                    style={{ marginBottom: 4 }}
                  >
                    {label}
                  </Tag>
                ))}
              </div>
            )}

            {!isReady ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#888' }}>
                    Select a model and a curated image set to begin
                  </span>
                }
                style={{ padding: '80px 0' }}
              />
            ) : isLoading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 300,
                }}
              >
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 32, color: '#40a9ff' }} spin />}
                />
                <span style={{ color: '#fff', marginLeft: 16 }}>Loading images...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#888' }}>
                    No images match the selected labels
                  </span>
                }
                style={{ padding: '80px 0' }}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {filteredFiles.map((file) => (
                  <Col xs={12} sm={8} md={8} key={file.path}>
                    <Card
                      hoverable
                      cover={
                        <TapisImageViewer
                          file={file}
                          style={{
                            height: 120,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        />
                      }
                      styles={{ body: { padding: 8, textAlign: 'center', background: '#2a2a2a' } }}
                      style={{ background: '#2a2a2a', borderColor: '#444' }}
                    >
                      <div
                        style={{
                          color: '#fff',
                          fontSize: 12,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.path.split('/').pop()}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </Col>

        {/* Results - Right Side */}
        <Col span={8}>
          <div
            style={{
              background: '#1a1a1a',
              color: '#fff',
              fontSize: 16,
              minHeight: 400,
              padding: 16,
              borderRadius: 8,
              border: '1px solid #434343',
            }}
          >
            <div
              style={{
                fontWeight: 500,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isLoading && <LoadingOutlined style={{ color: '#40a9ff' }} />}
              {isError && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              <span>Analysis Results</span>
              {aggregatedResults.length > 0 && (
                <span style={{ color: '#888', fontWeight: 400 }}>
                  ({aggregatedResults.length} labels)
                </span>
              )}
            </div>

            {aggregatedResults.length > 0 && (
              <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                Click labels to filter gallery
              </div>
            )}

            {!isReady ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: '#888' }}>Results will appear here</span>}
                style={{ padding: '80px 0' }}
              />
            ) : isLoading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 300,
                }}
              >
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 32, color: '#40a9ff' }} spin />}
                />
                <span style={{ color: '#fff', marginLeft: 16 }}>Analyzing...</span>
              </div>
            ) : isError ? (
              <div style={{ color: '#ff4d4f', textAlign: 'center', padding: '80px 0' }}>
                Error analyzing images
              </div>
            ) : aggregatedResults.length > 0 ? (
              <List
                dataSource={aggregatedResults}
                renderItem={(item) => {
                  const isSelected = selectedFilterLabels.includes(item.label);
                  return (
                    <List.Item
                      onClick={() => toggleFilterLabel(item.label)}
                      style={{
                        borderBottom: '1px solid #333',
                        padding: '12px 8px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(24, 144, 255, 0.15)' : 'transparent',
                        borderRadius: 4,
                        marginBottom: 2,
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          width: '100%',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            color: isSelected ? '#1890ff' : '#fff',
                            fontWeight: isSelected ? 600 : 400,
                          }}
                        >
                          {item.label}
                        </span>
                        <Badge
                          count={item.count}
                          style={{
                            backgroundColor: isSelected ? '#1890ff' : '#555',
                          }}
                          showZero
                          overflowCount={99}
                        />
                      </div>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <div style={{ color: '#888', textAlign: 'center', padding: '80px 0' }}>
                No labels detected
              </div>
            )}
          </div>
        </Col>
      </Row>
    </>
  );
};

export default DemoInterface;