"use client";

import { UPLOAD_SERVICE_URL, CATALOG_SERVICE_URL, ENCODING_SERVICE_URL } from './constants';

export interface VideoFile {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
  url: string;
}

export interface EncodingJob {
  id: string;
  source_file: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  dash_manifest?: string;
  hls_manifest?: string;
}

export interface VideoStream {
  id: string;
  original_file: string;
  title: string;
  dash_url?: string;
  hls_url?: string;
  thumbnail?: string;
  duration?: number;
  created_at: string;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
}

// Upload Service API
export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${UPLOAD_SERVICE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
};

// Catalog Service API
export const getVideoFiles = async (): Promise<VideoFile[]> => {
  const response = await fetch(`${CATALOG_SERVICE_URL}/files`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }

  return response.json();
};

export const downloadVideo = (fileId: string): string => {
  return `${CATALOG_SERVICE_URL}/download/${fileId}`;
};

// Encoding Service API
export const submitEncodingJob = async (sourceFile: string): Promise<EncodingJob> => {
  const response = await fetch(`${ENCODING_SERVICE_URL}/encode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source_file: sourceFile }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit encoding job: ${response.statusText}`);
  }

  return response.json();
};

export const getEncodingJobs = async (status?: string): Promise<EncodingJob[]> => {
  const url = status 
    ? `${ENCODING_SERVICE_URL}/jobs?status=${status}` 
    : `${ENCODING_SERVICE_URL}/jobs`;
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch encoding jobs: ${response.statusText}`);
  }

  return response.json();
};

export const getEncodingJob = async (jobId: string): Promise<EncodingJob> => {
  const response = await fetch(`${ENCODING_SERVICE_URL}/jobs/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch encoding job: ${response.statusText}`);
  }

  return response.json();
};

export const getVideoStreams = async (): Promise<VideoStream[]> => {
  try {
    const response = await fetch(`${ENCODING_SERVICE_URL}/streams`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch video streams: ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    // Ensure we always return an array, even if the API returns null or undefined
    if (!data || !Array.isArray(data)) {
      console.warn('API returned invalid data for streams, defaulting to empty array');
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching video streams:', error);
    return [];
  }
};

// Helper to get the full URL for HLS or DASH manifests
export const getStreamUrl = (path?: string): string | undefined => {
  if (!path) return undefined;
  
  // DASH URLs
  if (path.startsWith('/dash/')) {
    return `${ENCODING_SERVICE_URL}${path}`;
  }
  
  // HLS URLs
  if (path.startsWith('/hls/')) {
    return `${ENCODING_SERVICE_URL}${path}`;
  }
  
  // Thumbnail URLs
  if (path.startsWith('/encoded/') || path.startsWith('/api/thumbnails/')) {
    return `${ENCODING_SERVICE_URL}${path}`;
  }
  
  return path;
}; 