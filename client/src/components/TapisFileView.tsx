import React, { useState } from 'react';
import { Typography, Modal } from 'antd';
import { LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useFileContent } from '../hooks/useFileContent';
import { useToken } from '../hooks/useToken';
import type { TapisFile } from '../types/inference';

const { Text } = Typography;

interface TapisFileViewProps {
  file: TapisFile | null;
  style?: React.CSSProperties;
}

export const TapisFileView: React.FC<TapisFileViewProps> = ({ file, style }) => {
  const { data: tokenData } = useToken();
  const {
    data: fileContent,
    isLoading: fileLoading,
    isError: fileError,
  } = useFileContent(tokenData, file);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImgUrl, setModalImgUrl] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    setModalImgUrl(imageUrl);
    setModalOpen(true);
  };

  const renderContent = () => {
    if (fileLoading) {
      return <LoadingOutlined style={{ color: '#40a9ff', fontSize: 24 }} />;
    }

    if (fileError) {
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />;
    }

    if (fileContent) {
      console.log('File content received:', {
        contentType: fileContent.contentType,
        size: fileContent.data.size,
        type: fileContent.data.type,
      });
    }

    if (fileContent && fileContent.contentType.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(fileContent.data);
      return (
        <img
          src={imageUrl}
          alt="Selected image"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 4,
            cursor: 'pointer',
          }}
          onClick={() => handleImageClick(imageUrl)}
        />
      );
    }

    // Fallback: check if blob type is image or if file extension suggests it's an image
    if (
      fileContent &&
      (fileContent.data.type.startsWith('image/') ||
        (file && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.path)))
    ) {
      const imageUrl = URL.createObjectURL(fileContent.data);
      return (
        <img
          src={imageUrl}
          alt="Selected image"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 4,
            cursor: 'pointer',
          }}
          onClick={() => handleImageClick(imageUrl)}
        />
      );
    }

    return (
      <div>
        <Text style={{ color: '#888' }}>Not an image file</Text>
        <br />
        <Text style={{ color: '#666', fontSize: 12 }}>
          Content-Type: {fileContent?.contentType || 'unknown'} | Blob Type:{' '}
          {fileContent?.data.type || 'unknown'}
        </Text>
      </div>
    );
  };

  return (
    <>
      <div style={style}>{renderContent()}</div>
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width="90vw"
        style={{ top: 24 }}
        bodyStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0 }}
        destroyOnClose
      >
        {modalImgUrl && (
          <img
            src={modalImgUrl}
            alt="Full size preview"
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 8,
              background: '#111',
              margin: 0,
            }}
          />
        )}
      </Modal>
    </>
  );
};

export default TapisFileView;
