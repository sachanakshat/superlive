# SuperLive - P2P Video Streaming Platform

A distributed microservices platform for video uploading, processing, and streaming with HLS and MPEG-DASH support.

## Project Overview

SuperLive consists of multiple microservices, each handling a specific part of the video streaming workflow:

- **Upload Service**: Handles video file uploads
- **Catalog Service**: Manages video files and metadata
- **Encoding Service**: Processes videos into HLS and MPEG-DASH formats
- **UI Service**: Next.js web application for the user interface

## Project Structure

```
superlive/
├── docker-compose.yml     # Main docker compose file
├── services/             
│   ├── upload-service/    # Video upload microservice
│   ├── catalog-service/   # Video catalog microservice
│   ├── encoding-service/  # Video encoding microservice
│   └── ui-service/        # Next.js UI application
└── README.md             # This file
```

## Quick Start

### Running with Docker Compose

The easiest way to run the entire platform:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Once started, access the web interface at [http://localhost:3000](http://localhost:3000)

### Running Services Individually

Each service can be run individually for development:

```bash
# UI Service
cd services/ui-service
npm install
npm run dev

# Go-based services
cd services/upload-service
go run main.go

cd services/catalog-service
go run main.go

cd services/encoding-service
go run main.go
```

## Services

### Upload Service

A microservice for handling video file uploads.

#### Features
- Validates uploaded files are video files
- Stores uploaded videos locally
- Returns metadata for successful uploads

#### API Endpoints

**POST /upload**
- Uploads a video file
- Response: File metadata including ID and size

**GET /health**
- Health check endpoint

### Catalog Service

A microservice for managing and serving video files.

#### Features
- Lists all available video files with metadata
- Provides download functionality for specific files

#### API Endpoints

**GET /files**
- Lists all available video files with metadata

**GET /download/{file_id}**
- Downloads a specific video file by its ID

**GET /health**
- Health check endpoint

### Encoding Service

A microservice for processing video files into adaptive streaming formats.

#### Features
- Processes videos into HLS and MPEG-DASH formats
- Creates multiple quality levels for adaptive bitrate streaming
- Generates thumbnails
- Automatic processing via file watcher
- API for managing encoding jobs

#### API Endpoints

**POST /encode**
- Submit a new encoding job

**GET /jobs**
- List all encoding jobs
- Query params: `status` to filter jobs

**GET /jobs/{job_id}**
- Get details of a specific encoding job

**GET /streams**
- List all streams available for playback

**GET /health**
- Health check endpoint

**Media Access**
- GET /dash/{job_id}/manifest.mpd - DASH manifest
- GET /hls/{job_id}/master.m3u8 - HLS master playlist

### UI Service

A Next.js web application for the user interface.

#### Features
- Video upload with drag-and-drop
- Video browsing and playback
- Adaptive streaming with HLS and DASH
- Responsive design with TailwindCSS

## Environment Variables

Each service uses environment variables for configuration:

- **Upload Service**: 
  - `PORT`: HTTP server port (default: 8080)

- **Catalog Service**: 
  - `PORT`: HTTP server port (default: 8081)

- **Encoding Service**: 
  - `PORT`: HTTP server port (default: 8082)

- **UI Service**: 
  - `UPLOAD_SERVICE_URL`: URL for the upload service
  - `CATALOG_SERVICE_URL`: URL for the catalog service
  - `ENCODING_SERVICE_URL`: URL for the encoding service

## Testing

SuperLive includes a comprehensive test suite with both UI and API tests.

### UI Tests
UI tests use Playwright to test the frontend functionality:
- Homepage layout and rendering
- Video playback functionality
- Upload functionality

### API Tests
API tests use Jest with Axios to verify backend services:
- Upload Service endpoints
- Encoding Service operations
- Catalog Service file management

### Running Tests

To run the tests:

```bash
# Install test dependencies
npm run install:test

# Run all tests (UI and API)
npm test

# Run just UI tests
npm run test:ui

# Run just API tests
npm run test:api

# View test reports
npm run report
```

### Test Reports

Tests generate detailed reports that show:
- Pass/fail status for each test
- Coverage statistics
- Error details for failed tests

### Pre-Build Testing

The build process integrates with testing to ensure quality:

```bash
# Build UI service with tests (build only proceeds if tests pass)
npm run build:ui
```

## Streaming Technology

This platform supports two main streaming technologies:

1. **HLS (HTTP Live Streaming)**: Apple's adaptive bitrate streaming protocol, widely supported across devices.

2. **MPEG-DASH**: Dynamic Adaptive Streaming over HTTP, an industry standard used widely across platforms.

Both formats provide adaptive bitrate streaming that automatically adjusts video quality based on network conditions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).
