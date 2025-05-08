# Catalog Service

A microservice for managing and serving video files in the SuperLive P2P streaming platform.

## Features

- Lists all available video files with metadata
- Provides download functionality for specific files
- Ready for Docker deployment
- Designed to work with the Upload Service

## API Endpoints

### GET /files

Lists all available video files with metadata.

**Response:**
```json
[
  {
    "id": "1624567890_example.mp4",
    "name": "example.mp4",
    "size": 1024000,
    "mime_type": "video/mp4",
    "created_at": "2023-05-20T15:30:45Z",
    "url": "/download/1624567890_example.mp4"
  }
]
```

### GET /download/{file_id}

Downloads a specific video file by its ID.

**Response:**
- The binary file content with appropriate content type and disposition headers

### GET /health

Health check endpoint for the service.

**Response:**
```json
{
  "status": "healthy"
}
```

## Running Locally

```bash
# Run directly with Go
go run main.go

# Or build and run
go build -o catalog-service
./catalog-service
```

## Environment Variables

- `PORT`: HTTP server port (default: 8081)

## Docker

```bash
# Build the Docker image
docker build -t superlive/catalog-service .

# Run the container
docker run -p 8081:8081 superlive/catalog-service
```

## Integration with Upload Service

The Catalog Service expects video files to follow the naming convention used by the Upload Service:
`{timestamp}_{original_filename}`

It reads these files from the shared `media` directory, which should be mounted as a volume in Docker.
