# Upload Service

A microservice for handling video file uploads in the SuperLive P2P streaming platform.

## Features

- Validates uploaded files are video files
- Stores uploaded videos locally
- Returns metadata for successful uploads
- Ready for Docker deployment
- Will integrate with encoding service (coming soon)

## API Endpoints

### POST /upload

Uploads a video file to the service.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form with `file` field containing the video file

**Response:**
```json
{
  "file_id": "1234567890_example.mp4",
  "filename": "example.mp4",
  "size": 1024000,
  "mime_type": "video/mp4",
  "uploaded_at": "2023-05-20T15:30:45Z"
}
```

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
go build -o upload-service
./upload-service
```

## Environment Variables

- `PORT`: HTTP server port (default: 8080)

## Docker

```bash
# Build the Docker image
docker build -t superlive/upload-service .

# Run the container
docker run -p 8080:8080 superlive/upload-service
```

## Next Steps

- Integration with encoding service
- Authentication and authorization
- File deduplication
- Support for chunked uploads 