export interface Scene {
  id: string;
  scriptSegment: string;
  visualPrompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface VideoStyleAnalysis {
  styleDescription: string;
  mood: string;
}

export enum AppStep {
  SETUP = 'SETUP',
  STORYBOARD = 'STORYBOARD',
}

export interface GenerationConfig {
  characterImage: string | null; // Base64
  referenceVideo: File | null;
  script: string;
  styleContext: string;
}
