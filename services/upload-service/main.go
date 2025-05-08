package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

const (
	uploadDir     = "./media"
	maxUploadSize = 1024 * 1024 * 1024 // 1GB
)

type UploadResponse struct {
	FileID     string    `json:"file_id"`
	Filename   string    `json:"filename"`
	Size       int64     `json:"size"`
	MimeType   string    `json:"mime_type"`
	UploadedAt time.Time `json:"uploaded_at"`
}

func main() {
	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Set up HTTP server with CORS middleware
	mux := http.NewServeMux()
	mux.HandleFunc("/upload", uploadHandler)
	mux.HandleFunc("/health", healthCheckHandler)

	// Create server with CORS middleware
	corsHandler := corsMiddleware(mux)

	port := getEnv("PORT", "8080")
	log.Printf("Upload service starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, corsHandler); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// corsMiddleware adds CORS headers to all responses
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get the Origin header
		origin := r.Header.Get("Origin")

		// Allow requests from localhost:3000 and the IP address
		allowedOrigins := []string{"http://localhost:3000", "http://192.168.1.11:3000"}

		// Check if the request origin is allowed
		originAllowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				originAllowed = true
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

		// If no matching origin or empty origin, default to localhost
		if !originAllowed {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding")

		// Handle preflight OPTIONS request
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Pass request to the next handler
		next.ServeHTTP(w, r)
	})
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// Remove the CORS headers from here as they're handled by the middleware
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate content length
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "File too large or invalid multipart form", http.StatusBadRequest)
		return
	}

	// Get file from request
	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file from form", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Basic validation for video files
	contentType := handler.Header.Get("Content-Type")
	if !isVideoContentType(contentType) {
		http.Error(w, "Only video files are allowed", http.StatusBadRequest)
		return
	}

	// Generate a unique filename
	fileID := fmt.Sprintf("%d_%s", time.Now().UnixNano(), handler.Filename)
	filePath := filepath.Join(uploadDir, fileID)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Error creating destination file", http.StatusInternalServerError)
		log.Printf("Error creating file: %v", err)
		return
	}
	defer dst.Close()

	// Copy file to destination
	size, err := io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		log.Printf("Error copying file: %v", err)
		return
	}

	// Prepare response
	response := UploadResponse{
		FileID:     fileID,
		Filename:   handler.Filename,
		Size:       size,
		MimeType:   contentType,
		UploadedAt: time.Now(),
	}

	// Send notification to encoding service (to be implemented)
	// TODO: Send notification to encoding service

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	// Remove the CORS headers from here as they're handled by the middleware
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func isVideoContentType(contentType string) bool {
	videoTypes := []string{
		"video/mp4",
		"video/mpeg",
		"video/ogg",
		"video/webm",
		"video/quicktime",
		"video/x-matroska",
		"video/x-flv",
		"video/x-ms-wmv",
	}

	for _, vt := range videoTypes {
		if contentType == vt {
			return true
		}
	}
	return false
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
