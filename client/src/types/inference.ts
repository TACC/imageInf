export interface TapisFile {
  systemId: string;
  path: string;
}

export interface Prediction {
  label: string;
  score: number;
}

export interface InferenceResult {
  systemId: string;
  path: string;
  predictions: Prediction[];
}

export interface InferenceRequest {
  files: TapisFile[];
  model?: string;
}

export interface InferenceResponse {
  model: string;
  results: InferenceResult[];
}

export interface InferenceModelMeta {
  name: string;
  description: string;
  link: string;
}
