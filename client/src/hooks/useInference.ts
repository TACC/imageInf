import { useMutation } from '@tanstack/react-query';
import type { InferenceRequest, InferenceResponse } from '../types/inference';

export const useInference = (tapisToken: string, imageInfUrl: string) => {
  return useMutation({
    mutationFn: async (inferenceRequest: InferenceRequest) => {
      const response = await fetch(`${imageInfUrl}/inference/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tapis-Token': tapisToken,
        },
        body: JSON.stringify(inferenceRequest),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json() as Promise<InferenceResponse>;
    },
  });
}; 