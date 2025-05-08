# Encoding Service

A microservice for processing video files into adaptive streaming formats (HLS and MPEG-DASH) in the SuperLive P2P streaming platform.

## Features

- Automatically processes uploaded videos into streaming formats
- Creates multiple quality levels for adaptive bitrate streaming (240p to 1080p)
- Generates both MPEG-DASH and HLS formats
- Creates thumbnail images for videos
- Job queue system for handling parallel processing
- File watcher that automatically picks up new uploads
- REST API for managing encoding jobs

## Technologies Used

- **HLS (HTTP Live Streaming)**: Apple's adaptive bitrate streaming protocol
- **MPEG-DASH**: Dynamic Adaptive Streaming over HTTP
- **Fragmented MP4**: Self-contained video fragments for better seeking
- **FFmpeg**: For video transcoding and segmentation
- **MediaSource Extensions (MSE)**: Compatible output for browser-based playback

## API Endpoints

### POST /encode

Submit a new encoding job.

**Request:**
```json
{
  "source_file": "1624567890_example.mp4"
}
```

**Response:**
```json
{
  "id": "job_1624568990",
  "source_file": "1624567890_example.mp4",
  "status": "pending",
  "progress": 0,
  "created_at": "2023-05-20T15:30:45Z"
}
```

### GET /jobs

List all encoding jobs.

**Query Parameters:**
- `status`: Filter by job status ("active", "completed", "failed")

**Response:**
```json
[
  {
    "id": "job_1624568990",
    "source_file": "1624567890_example.mp4",
    "status": "completed",
    "progress": 100,
    "created_at": "2023-05-20T15:30:45Z",
    "started_at": "2023-05-20T15:30:46Z",
    "completed_at": "2023-05-20T15:35:12Z",
    "dash_manifest": "/dash/job_1624568990/manifest.mpd",
    "hls_manifest": "/hls/job_1624568990/master.m3u8"
  }
]
```

### GET /jobs/{job_id}

Get details of a specific encoding job.

**Response:**
Same as above for a single job.

### GET /streams

List all streams available for playback.

**Response:**
```json
[
  {
    "id": "job_1624568990",
    "original_file": "1624567890_example.mp4",
    "title": "example.mp4",
    "dash_url": "/dash/job_1624568990/manifest.mpd",
    "hls_url": "/hls/job_1624568990/master.m3u8",
    "thumbnail": "/encoded/job_1624568990/thumbnail.jpg",
    "created_at": "2023-05-20T15:35:12Z"
  }
]
```

### GET /health

Health check endpoint for the service.

**Response:**
```json
{
  "status": "healthy"
}
```

## Media Access Endpoints

### GET /dash/{job_id}/manifest.mpd

Access MPEG-DASH manifest file for a specific encoding job.

### GET /hls/{job_id}/master.m3u8

Access HLS master playlist for a specific encoding job.

## Running Locally

### Prerequisites

- Go 1.19+
- FFmpeg installed on your system

```bash
# Run directly with Go
go run main.go

# Or build and run
go build -o encoding-service
./encoding-service
```

## Environment Variables

- `PORT`: HTTP server port (default: 8082)

## Docker

```bash
# Build the Docker image
docker build -t superlive/encoding-service .

# Run the container
docker run -p 8082:8082 superlive/encoding-service
```

## Integration with Other Services

The encoding service:
1. Watches the same `media` directory that the upload service writes to
2. Automatically processes new video files
3. Makes processed streams available to clients for playback via URLs that can be used by the frontend

## Adaptive Bitrate Streaming Details

This service creates:

- Multiple resolution versions: 240p, 360p, 480p, 720p, and 1080p
- Fragmented MP4 segments for MPEG-DASH
- HLS segments (.ts files) for HLS
- Master playlists that allow client players to switch between different quality levels
- All files necessary for seeking to any position in the video

The output is compatible with HTML5 video players that support MSE (MediaSource Extensions).
