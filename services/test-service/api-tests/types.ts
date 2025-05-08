import { AxiosError } from 'axios';

// Define error type for axios error handling
export interface ApiError extends AxiosError {
  code?: string;
}

// Define common response types for API endpoints
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
  url?: string;
}

export interface EncodingJob {
  id: string;
  source_file: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
}

export interface VideoStream {
  id: string;
  title: string;
  original_file: string;
  created_at: string;
  hls_url?: string;
  dash_url?: string;
  thumbnail?: string;
} 