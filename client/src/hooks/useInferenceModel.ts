import { useQuery } from '@tanstack/react-query';
import type { InferenceModelMeta } from '../types/inference';

const fetchModels = async (token: string): Promise<InferenceModelMeta[]> => {
  const response = await fetch(`/api/inference/models`, {
    headers: {
      'X-Tapis-Token': token,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
};

export const useInferenceModel = (token: string) => {
  return useQuery({
    queryKey: ['inferenceModels', token],
    queryFn: () => fetchModels(token),
    enabled: !!token,
  });
}; 