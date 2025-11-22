import { useQuery } from '@tanstack/react-query';
import type { InferenceModelMeta } from '../types/inference';

const fetchModels = async (token: string, apiBasePath: string): Promise<InferenceModelMeta[]> => {
  const response = await fetch(`${apiBasePath}/api/inference/models`, {
    headers: {
      'X-Tapis-Token': token,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
};

export const useInferenceModel = (token: string, apiBasePath: string) => {
  return useQuery({
    queryKey: ['inferenceModels', token],
    queryFn: () => fetchModels(token, apiBasePath),
    enabled: !!token,
  });
};
