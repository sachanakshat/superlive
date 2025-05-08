FROM golang:1.19-alpine AS builder

WORKDIR /app

# Copy go.mod and download dependencies
COPY go.mod ./
RUN go mod download

# Copy source code
COPY *.go ./

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o upload-service

# Use a smaller image for the final container
FROM alpine:latest

WORKDIR /app

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy the binary from builder
COPY --from=builder /app/upload-service .

# Create media directory instead of uploads
RUN mkdir -p /app/media

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080

# Run the service
CMD ["./upload-service"]
