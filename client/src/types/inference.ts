export interface TapisFile {
  systemId: string;
  path: string;
}

export interface InferenceRequest {
  files: TapisFile[];
  model?: string;
}

export interface InferenceResponse {
  // Adjust this as needed to match your backend's response
  [key: string]: any;
}

export interface InferenceModelMeta {
  name: string;
  description: string;
  link: string;
} 