import { useQuery } from '@tanstack/react-query';
import { useConfig } from './useConfig';
import type { InferenceModelMeta } from '../types/inference';

export const useInferenceModel = (tapisToken: string) => {
  const config = useConfig();
  const apiUrl = `${config.host}/api/inference/models`;

  return useQuery<InferenceModelMeta[]>({
    queryKey: ['inferenceModels', tapisToken],
    queryFn: async () => {
      const res = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tapis-Token': tapisToken,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    enabled: !!tapisToken,
  });
}; 