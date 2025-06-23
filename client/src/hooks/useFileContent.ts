import { useQuery } from '@tanstack/react-query';
import type { TapisFile } from '../types/inference';

interface FileContentResponse {
  data: Blob;
  contentType: string;
}

const fetchFileContent = async (tapisToken: string, file: TapisFile): Promise<FileContentResponse> => {
  const response = await fetch(`https://designsafe.tapis.io/v3/files/content/${file.systemId}${file.path}`, {
    headers: {
      'X-Tapis-Token': tapisToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  const blob = await response.blob();
  return {
    data: blob,
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
};

export const useFileContent = (tapisToken: string, file: TapisFile | null) => {
  
  return useQuery({
    queryKey: ['fileContent', file?.systemId, file?.path],
    queryFn: () => fetchFileContent(tapisToken, file!),
    enabled: !!tapisToken && !!file,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 