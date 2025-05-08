FROM golang:1.19-alpine AS builder

WORKDIR /app

# Copy go.mod and download dependencies
COPY go.mod ./
RUN go mod download

# Copy source code
COPY *.go ./

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o encoding-service

# Use Ubuntu as the base for the final image to get ffmpeg
FROM ubuntu:22.04

# Install ffmpeg and other dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/encoding-service .

# Create necessary directories
RUN mkdir -p /app/media /app/encoded /app/encoded/dash /app/encoded/hls

# Expose port
EXPOSE 8082

# Set environment variables
ENV PORT=8082

# Run the service
CMD ["./encoding-service"]
