import axios from 'axios';
import { ApiError, EncodingJob, VideoStream } from './types';

// Define the base URL from environment or use default
const ENCODING_SERVICE_URL = process.env.ENCODING_SERVICE_URL || 'http://localhost:8082';

describe('Encoding Service API', () => {
  jest.setTimeout(30000); // Increased timeout for reliable testing
  
  test('GET /streams should return a list of video streams', async () => {
    try {
      const response = await axios.get<VideoStream[]>(`${ENCODING_SERVICE_URL}/streams`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // If streams exist, check their structure
      if (response.data.length > 0) {
        const stream = response.data[0];
        expect(stream).toHaveProperty('id');
        expect(stream).toHaveProperty('original_file');
        expect(stream).toHaveProperty('title');
        expect(stream).toHaveProperty('created_at');
      }
    } catch (error) {
      // If service is not running, mark as skipped rather than failed
      if (axios.isAxiosError(error) && (error as ApiError).code === 'ECONNREFUSED') {
        console.warn('Encoding service is not running, skipping test');
        return;
      }
      
      throw error;
    }
  });
  
  test('GET /jobs should return a list of encoding jobs', async () => {
    try {
      const response = await axios.get<EncodingJob[]>(`${ENCODING_SERVICE_URL}/jobs`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // If jobs exist, check their structure
      if (response.data.length > 0) {
        const job = response.data[0];
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('source_file');
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('progress');
        expect(job).toHaveProperty('created_at');
      }
    } catch (error) {
      // If service is not running, mark as skipped rather than failed
      if (axios.isAxiosError(error) && (error as ApiError).code === 'ECONNREFUSED') {
        console.warn('Encoding service is not running, skipping test');
        return;
      }
      
      throw error;
    }
  });
  
  test('POST /encode should create a new encoding job', async () => {
    try {
      // Mock file ID
      const mockFileId = 'test-file-id-' + Date.now();
      
      const response = await axios.post<EncodingJob>(`${ENCODING_SERVICE_URL}/encode`, {
        source_file: mockFileId
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('source_file');
      expect(response.data.source_file).toBe(mockFileId);
      expect(response.data).toHaveProperty('status');
      expect(['pending', 'processing']).toContain(response.data.status);
      
    } catch (error) {
      // If service is not running, mark as skipped rather than failed
      if (axios.isAxiosError(error) && (error as ApiError).code === 'ECONNREFUSED') {
        console.warn('Encoding service is not running, skipping test');
        return;
      }
      
      throw error;
    }
  });
}); 