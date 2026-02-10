import React from 'react';
import { Button, Tag, Empty, Modal, Divider } from 'antd';
import { LeftOutlined, RightOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import TapisImageViewer from './TapisImageViewer';
import type { TapisFile, InferenceResult } from '../types/inference';

interface ImageBrowserProps {
  files: TapisFile[];
  currentIndex: number | null;
  onIndexChange: (index: number | null) => void;
  inferenceResults: InferenceResult[];
}

const ImageBrowser: React.FC<ImageBrowserProps> = ({
  files,
  currentIndex,
  onIndexChange,
  inferenceResults,
}) => {
  const isOpen = currentIndex !== null;
  const safeIndex = currentIndex ?? 0;
  const currentFile = files[safeIndex] || null;
  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < files.length - 1;

  // Get labels for current file from inference results
  const currentLabels: string[] = React.useMemo(() => {
    if (!currentFile) return [];
    const result = inferenceResults.find((r) => r.path === currentFile.path);
    if (!result?.predictions) return [];
    return result.predictions.map((p) => p.label);
  }, [currentFile, inferenceResults]);

  const handlePrev = () => {
    if (canGoPrev) {
      onIndexChange(safeIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onIndexChange(safeIndex + 1);
    }
  };

  const handleClose = () => {
    onIndexChange(null);
  };

  // TODO: Implement label editing functionality
  const handleAcceptAll = () => {
    console.log('Accept all labels:', currentLabels);
    // TODO: Save accepted labels
  };

  const handleRemoveLabel = (label: string) => {
    console.log('Remove label:', label);
    // TODO: Remove label from suggestions
  };

  const handleAddLabel = () => {
    console.log('Add new label');
    // TODO: Open label picker or input
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width="90vw"
      style={{ top: 24 }}
      styles={{
        body: { background: '#1a1a1a', padding: 24 },
        content: { background: '#1a1a1a' },
      }}
      destroyOnClose
    >
      {files.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: '#888' }}>No images to display</span>}
        />
      ) : (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left: Navigation + Image */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={handlePrev}
              disabled={!canGoPrev}
              style={{
                color: canGoPrev ? '#fff' : '#555',
                fontSize: 24,
                height: 64,
                width: 64,
              }}
            />

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <TapisImageViewer
                file={currentFile}
                style={{
                  height: '60vh',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <div style={{ color: '#888', fontSize: 14, marginTop: 12 }}>
                {safeIndex + 1} of {files.length}
              </div>
              <div
                style={{
                  color: '#fff',
                  fontSize: 16,
                  marginTop: 4,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentFile?.path.split('/').pop()}
              </div>
            </div>

            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={handleNext}
              disabled={!canGoNext}
              style={{
                color: canGoNext ? '#fff' : '#555',
                fontSize: 24,
                height: 64,
                width: 64,
              }}
            />
          </div>

          {/* Right: Suggested Labels */}
          <div
            style={{
              width: 250,
              borderLeft: '1px solid #333',
              paddingLeft: 24,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 500, fontSize: 18, marginBottom: 8 }}>
              Suggested Labels
              {currentLabels.length > 0 && (
                <span style={{ color: '#888', fontWeight: 400, marginLeft: 8 }}>
                  ({currentLabels.length})
                </span>
              )}
            </div>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
              Review and edit AI-suggested labels
            </div>

            {currentLabels.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {currentLabels.map((label) => (
                    <Tag
                      key={label}
                      color="blue"
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleRemoveLabel(label);
                      }}
                      style={{ marginBottom: 0, fontSize: 14 }}
                    >
                      {label}
                    </Tag>
                  ))}
                </div>

                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={handleAddLabel}
                  style={{
                    color: '#888',
                    padding: '4px 0',
                    justifyContent: 'flex-start',
                    marginBottom: 16,
                  }}
                >
                  Add label
                </Button>

                <Divider style={{ margin: '0 0 16px 0', borderColor: '#333' }} />

                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleAcceptAll}
                  style={{ width: '100%' }}
                >
                  Accept All
                </Button>
              </>
            ) : (
              <>
                <div style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                  No labels detected
                </div>
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={handleAddLabel}
                  style={{
                    color: '#888',
                    padding: '4px 0',
                    justifyContent: 'flex-start',
                  }}
                >
                  Add label manually
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ImageBrowser;
