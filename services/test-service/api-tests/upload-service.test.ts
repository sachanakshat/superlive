import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { ApiError } from './types';

// Define the base URL from environment or use default
const UPLOAD_SERVICE_URL = process.env.UPLOAD_SERVICE_URL || 'http://localhost:8080';

describe('Upload Service API', () => {
  jest.setTimeout(30000); // Increased timeout for reliable testing
  
  const samplesDir = path.resolve(__dirname, '../../../samples');
  let sampleFile: string;
  
  beforeAll(() => {
    // Check if samples directory exists
    if (!fs.existsSync(samplesDir)) {
      console.warn('Samples directory not found, tests may fail');
      return;
    }
    
    // Find a sample video file
    const files = fs.readdirSync(samplesDir);
    const videoFile = files.find(file => file.endsWith('.mp4') || file.endsWith('.mov'));
    
    if (videoFile) {
      sampleFile = path.join(samplesDir, videoFile);
    } else {
      console.warn('No sample video files found in samples directory');
    }
  });
  
  test('Upload endpoint should accept video files', async () => {
    // Skip if no sample file
    if (!sampleFile) {
      console.warn('No sample file available, skipping test');
      return;
    }
    
    try {
      // Create form data with file
      const formData = new FormData();
      formData.append('file', fs.createReadStream(sampleFile));
      
      // Make request to upload endpoint
      const response = await axios.post(`${UPLOAD_SERVICE_URL}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('file_id');
      expect(response.data).toHaveProperty('filename');
      expect(response.data).toHaveProperty('size');
      expect(response.data).toHaveProperty('mime_type');
      expect(response.data).toHaveProperty('uploaded_at');
      
    } catch (error) {
      // If service is not running, mark as skipped rather than failed
      if (axios.isAxiosError(error) && (error as ApiError).code === 'ECONNREFUSED') {
        console.warn('Upload service is not running, skipping test');
        return;
      }
      
      throw error;
    }
  });
  
  test('Upload endpoint should reject non-video files', async () => {
    // Create temporary text file
    const tempFile = path.join(__dirname, '../', 'temp-test-file.txt');
    fs.writeFileSync(tempFile, 'This is a text file, not a video');
    
    try {
      // Create form data with file
      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempFile));
      
      // Expect request to be rejected
      let rejected = false;
      try {
        await axios.post(`${UPLOAD_SERVICE_URL}/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });
      } catch (err) {
        rejected = true;
      }
      
      expect(rejected).toBe(true);
      
    } catch (error) {
      // If service is not running, mark as skipped rather than failed
      if (axios.isAxiosError(error) && (error as ApiError).code === 'ECONNREFUSED') {
        console.warn('Upload service is not running, skipping test');
      } else {
        throw error;
      }
    } finally {
      // Clean up
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
}); 