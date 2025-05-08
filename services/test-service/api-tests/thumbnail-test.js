const fetch = require('node-fetch');
const { expect } = require('@jest/globals');

describe('Thumbnail API', () => {
  let streamId;
  let thumbnailUrl;
  
  test('should list streams with thumbnail URLs', async () => {
    const response = await fetch('http://localhost:8082/streams');
    expect(response.status).toBe(200);
    
    const streams = await response.json();
    console.log('Streams response:', streams);
    
    // If there are any streams, check for thumbnail
    if (streams.length > 0) {
      streamId = streams[0].id;
      thumbnailUrl = streams[0].thumbnail;
      
      // Check thumbnail URL format
      expect(thumbnailUrl).toBeDefined();
      expect(thumbnailUrl).toMatch(/^\/encoded\/.*\/thumbnail\.jpg$/);
      console.log('Thumbnail URL found:', thumbnailUrl);
    } else {
      console.log('No streams found to test thumbnail');
    }
  });
  
  test('should be able to access thumbnail if streams exist', async () => {
    // Skip if no streams were found
    if (!thumbnailUrl) {
      console.log('Skipping thumbnail test as no streams were found');
      return;
    }
    
    const fullUrl = `http://localhost:8082${thumbnailUrl}`;
    console.log('Attempting to fetch thumbnail from:', fullUrl);
    
    const response = await fetch(fullUrl);
    
    // Check if thumbnail is accessible
    expect(response.status).toBe(200);
    
    // Check if response is an image
    const contentType = response.headers.get('content-type');
    expect(contentType).toMatch(/^image\//);
    
    console.log('Thumbnail successfully fetched with content type:', contentType);
  });
}); 