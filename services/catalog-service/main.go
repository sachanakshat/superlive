package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	// Using the same upload directory as the upload service
	mediaDir = "./media"
)

type FileInfo struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	MimeType  string    `json:"mime_type"`
	CreatedAt time.Time `json:"created_at"`
	URL       string    `json:"url"`
}

func main() {
	// Ensure the media directory exists
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		log.Fatalf("Failed to create media directory: %v", err)
	}

	// Set up HTTP server with CORS middleware
	mux := http.NewServeMux()
	mux.HandleFunc("/files", listFilesHandler)
	mux.HandleFunc("/download/", downloadFileHandler)
	mux.HandleFunc("/health", healthCheckHandler)

	// Create server with CORS middleware
	corsHandler := corsMiddleware(mux)

	port := getEnv("PORT", "8081")
	log.Printf("Catalog service starting on port %s...", port)
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

func listFilesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	files, err := getAvailableFiles()
	if err != nil {
		http.Error(w, "Error retrieving files", http.StatusInternalServerError)
		log.Printf("Error retrieving files: %v", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func downloadFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract file ID from URL path
	fileID := strings.TrimPrefix(r.URL.Path, "/download/")
	if fileID == "" {
		http.Error(w, "File ID is required", http.StatusBadRequest)
		return
	}

	// Find the file path
	filePath := filepath.Join(mediaDir, fileID)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Get file information
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		http.Error(w, "Error retrieving file info", http.StatusInternalServerError)
		log.Printf("Error retrieving file info: %v", err)
		return
	}

	// Determine content type
	contentType := getContentTypeFromFilename(fileID)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", getOriginalFilename(fileID)))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// Serve the file
	http.ServeFile(w, r, filePath)
}

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func getAvailableFiles() ([]FileInfo, error) {
	var files []FileInfo

	err := filepath.WalkDir(mediaDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if d.IsDir() {
			return nil
		}

		// Get file info
		fileInfo, err := d.Info()
		if err != nil {
			return err
		}

		filename := fileInfo.Name()
		// Extract timestamp and original filename
		parts := strings.SplitN(filename, "_", 2)
		if len(parts) != 2 {
			// Skip files that don't match our naming convention
			return nil
		}

		originalFilename := parts[1]
		size := fileInfo.Size()
		contentType := getContentTypeFromFilename(filename)

		// Create file metadata
		file := FileInfo{
			ID:        filename,
			Name:      originalFilename,
			Size:      size,
			MimeType:  contentType,
			CreatedAt: fileInfo.ModTime(),
			URL:       fmt.Sprintf("/download/%s", filename),
		}

		files = append(files, file)
		return nil
	})

	return files, err
}

func getContentTypeFromFilename(filename string) string {
	ext := filepath.Ext(filename)
	switch strings.ToLower(ext) {
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".ogg":
		return "video/ogg"
	case ".mov":
		return "video/quicktime"
	case ".mkv":
		return "video/x-matroska"
	case ".flv":
		return "video/x-flv"
	case ".wmv":
		return "video/x-ms-wmv"
	default:
		return "application/octet-stream"
	}
}

func getOriginalFilename(fileID string) string {
	parts := strings.SplitN(fileID, "_", 2)
	if len(parts) < 2 {
		return fileID
	}
	return parts[1]
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
