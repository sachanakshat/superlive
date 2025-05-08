FROM golang:1.19-alpine AS builder

WORKDIR /app

# Copy go.mod and download dependencies
COPY go.mod ./
RUN go mod download

# Copy source code
COPY *.go ./

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o catalog-service

# Use a smaller image for the final container
FROM alpine:latest

WORKDIR /app

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy the binary from builder
COPY --from=builder /app/catalog-service .

# Create media directory
RUN mkdir -p /app/media

# Expose port
EXPOSE 8081

# Set environment variables
ENV PORT=8081

# Run the service
CMD ["./catalog-service"]
