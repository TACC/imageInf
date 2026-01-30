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
  metadata?: ImageMetadata | null;
}

export interface ImageMetadata {
  date_taken?: string;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  camera_make?: string;
  camera_model?: string;
}

export interface InferenceRequest {
  files: TapisFile[];
  model?: string;
  labels?: string[]; // Note: CLIP only
  sensitivity?: 'high' | 'medium' | 'low'; // Note: CLIP only
}

export interface InferenceResponse {
  model: string;
  aggregated_results: InferenceResult[];
  results: InferenceResult[];
}

export interface InferenceModelMeta {
  name: string;
  type: string;
  description: string;
  link: string;
}
