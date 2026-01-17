import { useQuery } from '@tanstack/react-query';
import type { TapisFile } from '../types/inference';
import type { TokenInfo } from '../types/token';

interface FileContentResponse {
  data: Blob;
  contentType: string;
}

const fetchFileContent = async (
  tokenData: TokenInfo,
  file: TapisFile
): Promise<FileContentResponse> => {
  const response = await fetch(
    `${tokenData.tapisHost}/v3/files/content/${file.systemId}${file.path}`,
    {
      headers: {
        'X-Tapis-Token': tokenData.token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  const blob = await response.blob();
  return {
    data: blob,
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
};

export const useFileContent = (tokenData: TokenInfo | undefined, file: TapisFile | null) => {
  return useQuery({
    queryKey: ['fileContent', file?.systemId, file?.path],
    queryFn: () => {
      if (!tokenData || !file) {
        throw new Error('Missing required data');
      }
      return fetchFileContent(tokenData, file);
    },
    enabled: !!tokenData?.token && !!file,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
};
