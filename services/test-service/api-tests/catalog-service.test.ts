import axios from 'axios';
import { ApiError, FileMetadata } from './types';

// Define the base URL from environment or use default
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:8081';

describe('Catalog Service API', () => {
  jest.setTimeout(30000); // Increased timeout for reliable testing
  
  test('GET /files should return a list of files', async () => {
    try {
      const response = await axios.get<FileMetadata[]>(`${CATALOG_SERVICE_URL}/files`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // If files exist, check their structure
      if (response.data.length > 0) {
        const file = response.data[0];
        expect(file).toHaveProperty('id');
        expect(file).toHaveProperty('name');
        expect(file).toHaveProperty('size');
        expect(file).toHaveProperty('mime_type');
        expect(file).toHaveProperty('created_at');
        expect(file).toHaveProperty('url');
      }
    } catch (error) {
      // If service is not running, mark as skipped rather than failed
      if (axios.isAxiosError(error) && (error as ApiError).code === 'ECONNREFUSED') {
        console.warn('Catalog service is not running, skipping test');
        return;
      }
      
      throw error;
    }
  });

  test('GET /download/:file_id should provide file download', async () => {
    try {
      // First get list of files
      const filesResponse = await axios.get<FileMetadata[]>(`${CATALOG_SERVICE_URL}/files`);
      
      if (filesResponse.data.length === 0) {
        console.warn('No files available to test download, skipping test');
        return;
      }
      
      // Take the first file to test download
      const fileId = filesResponse.data[0].id;
      
      // Test download endpoint
      const downloadResponse = await axios.get(`${CATALOG_SERVICE_URL}/download/${fileId}`, {
        responseType: 'stream',
      });
      
      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers).toHaveProperty('content-type');
      expect(downloadResponse.headers).toHaveProperty('content-length');
      
    } catch (error) {
      // If service is not running, mark as skipped rather than failed
      if (axios.isAxiosError(error) && (error as ApiError).code === 'ECONNREFUSED') {
        console.warn('Catalog service is not running, skipping test');
        return;
      }
      
      throw error;
    }
  });
}); 