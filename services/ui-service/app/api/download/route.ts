import { NextRequest, NextResponse } from 'next/server';
import { CATALOG_SERVICE_URL } from '../../lib/constants';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing id parameter', { status: 400 });
  }

  try {
    // Forward the request to the catalog service
    const response = await fetch(`${CATALOG_SERVICE_URL}/download/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return new NextResponse(`Error from catalog service: ${response.statusText}`, { 
        status: response.status 
      });
    }

    // Get the file data
    const data = await response.arrayBuffer();
    
    // Get content type from response headers
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');
    
    // Create the response with the file data
    const res = new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition || 'attachment',
      },
    });

    return res;
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Error downloading file', { status: 500 });
  }
} 