package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	// Directories
	mediaDir   = "./media"        // Source media files (shared with upload service)
	encodedDir = "./encoded"      // Output directory for encoded files
	dashDir    = "./encoded/dash" // MPEG-DASH output
	hlsDir     = "./encoded/hls"  // HLS output

	// Default encoding resolutions
	resolutions = "426:240,640:360,854:480,1280:720,1920:1080"

	// Queue settings
	maxConcurrentJobs = 2
)

// Resolution represents a video resolution
type Resolution struct {
	Width  int
	Height int
}

// EncodingJob represents a video encoding job
type EncodingJob struct {
	ID           string    `json:"id"`
	SourceFile   string    `json:"source_file"`
	Status       string    `json:"status"` // pending, processing, completed, failed
	Progress     int       `json:"progress"`
	ErrorMessage string    `json:"error_message,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	StartedAt    time.Time `json:"started_at,omitempty"`
	CompletedAt  time.Time `json:"completed_at,omitempty"`
	DashManifest string    `json:"dash_manifest,omitempty"`
	HlsManifest  string    `json:"hls_manifest,omitempty"`
}

// Stream represents a video stream ready for playback
type Stream struct {
	ID           string    `json:"id"`
	OriginalFile string    `json:"original_file"`
	Title        string    `json:"title"`
	DashURL      string    `json:"dash_url,omitempty"`
	HlsURL       string    `json:"hls_url,omitempty"`
	Thumbnail    string    `json:"thumbnail,omitempty"`
	Duration     int       `json:"duration,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// Global variables
var (
	// In-memory job queue
	jobQueue      = make(chan EncodingJob, 100)
	activeJobs    = make(map[string]EncodingJob)
	completedJobs = make(map[string]EncodingJob)
	failedJobs    = make(map[string]EncodingJob)
	jobsMutex     = &sync.RWMutex{}
)

func main() {
	// Create required directories
	createDirectories()

	// Start job processor workers
	for i := 0; i < maxConcurrentJobs; i++ {
		go worker()
	}

	// Set up HTTP server with CORS middleware
	mux := http.NewServeMux()
	mux.HandleFunc("/encode", submitJobHandler)
	mux.HandleFunc("/jobs", listJobsHandler)
	mux.HandleFunc("/jobs/", getJobHandler)
	mux.HandleFunc("/streams", listStreamsHandler)
	mux.HandleFunc("/health", healthCheckHandler)

	// Add a specific handler for thumbnail files
	mux.HandleFunc("/api/thumbnails/", thumbnailDirectHandler)

	// Add a test endpoint that serves a single known thumbnail
	mux.HandleFunc("/test-thumbnail", func(w http.ResponseWriter, r *http.Request) {
		// Get the first job ID from the completed jobs
		var jobID string
		jobsMutex.RLock()
		for id := range completedJobs {
			jobID = id
			break
		}
		jobsMutex.RUnlock()

		if jobID == "" {
			http.Error(w, "No completed jobs found", http.StatusNotFound)
			return
		}

		thumbnailPath := filepath.Join(encodedDir, jobID, "thumbnail.jpg")
		log.Printf("Test thumbnail path: %s", thumbnailPath)

		// Check if file exists
		if _, err := os.Stat(thumbnailPath); os.IsNotExist(err) {
			http.Error(w, "Thumbnail file not found", http.StatusNotFound)
			return
		}

		// Set content type
		w.Header().Set("Content-Type", "image/jpeg")

		// Serve the file directly
		http.ServeFile(w, r, thumbnailPath)
	})

	// Serve encoded files
	mux.Handle("/dash/", http.StripPrefix("/dash/", http.FileServer(http.Dir(dashDir))))
	mux.Handle("/hls/", http.StripPrefix("/hls/", http.FileServer(http.Dir(hlsDir))))
	mux.Handle("/encoded/", http.StripPrefix("/encoded/", logFileServer(http.Dir(encodedDir))))

	// Add a debug endpoint for thumbnails
	mux.HandleFunc("/debug/thumbnail/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/debug/thumbnail/")
		fullPath := filepath.Join(encodedDir, path)

		log.Printf("Debug thumbnail request for: %s (full path: %s)", path, fullPath)

		// Check if file exists
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			log.Printf("Thumbnail file not found: %s", fullPath)
			http.Error(w, "Thumbnail not found", http.StatusNotFound)
			return
		}

		// Serve the file
		http.ServeFile(w, r, fullPath)
	})

	// Create server with CORS middleware
	corsHandler := corsMiddleware(mux)

	// Start file watcher to pick up new uploads
	go watchForNewFiles()

	port := getEnv("PORT", "8082")
	log.Printf("Encoding service starting on port %s...", port)
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

// logFileServer creates a file server with logging
func logFileServer(root http.FileSystem) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("File server request: %s", r.URL.Path)

		// Check if file exists
		f, err := root.Open(r.URL.Path)
		if err != nil {
			log.Printf("Error opening file: %v", err)
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		defer f.Close()

		// Serve the file
		http.FileServer(root).ServeHTTP(w, r)
	})
}

// createDirectories creates all necessary directories
func createDirectories() {
	dirs := []string{
		mediaDir,
		encodedDir,
		dashDir,
		hlsDir,
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("Failed to create directory %s: %v", dir, err)
		}
	}
}

// worker processes jobs from the queue
func worker() {
	for job := range jobQueue {
		// Update job status to processing
		job.Status = "processing"
		job.StartedAt = time.Now()
		updateJob(job)

		log.Printf("Processing job %s: %s", job.ID, job.SourceFile)

		// Process the video
		err := processVideo(job)

		jobsMutex.Lock()
		if err != nil {
			job.Status = "failed"
			job.ErrorMessage = err.Error()
			failedJobs[job.ID] = job
			delete(activeJobs, job.ID)
			log.Printf("Job %s failed: %v", job.ID, err)
		} else {
			job.Status = "completed"
			job.Progress = 100
			job.CompletedAt = time.Now()
			job.DashManifest = fmt.Sprintf("/dash/%s/manifest.mpd", job.ID)
			job.HlsManifest = fmt.Sprintf("/hls/%s/master.m3u8", job.ID)
			completedJobs[job.ID] = job
			delete(activeJobs, job.ID)
			log.Printf("Job %s completed successfully", job.ID)
		}
		jobsMutex.Unlock()
	}
}

// processVideo processes a video file using ffmpeg
func processVideo(job EncodingJob) error {
	sourceFilePath := filepath.Join(mediaDir, job.SourceFile)
	outputBasePath := filepath.Join(encodedDir, job.ID)
	dashOutputPath := filepath.Join(dashDir, job.ID)
	hlsOutputPath := filepath.Join(hlsDir, job.ID)

	// Create output directories
	if err := os.MkdirAll(dashOutputPath, 0755); err != nil {
		return fmt.Errorf("failed to create DASH output directory: %w", err)
	}

	if err := os.MkdirAll(hlsOutputPath, 0755); err != nil {
		return fmt.Errorf("failed to create HLS output directory: %w", err)
	}

	// Get video dimensions to maintain aspect ratio
	width, height, err := getVideoDimensions(sourceFilePath)
	if err != nil {
		return fmt.Errorf("failed to get video dimensions: %w", err)
	}

	// Check if the video file has audio
	hasAudio, err := checkForAudioStream(sourceFilePath)
	if err != nil {
		log.Printf("Warning: Could not determine if file has audio: %v", err)
		// Continue with default behavior assuming it might have audio
		hasAudio = true
	}

	// Create thumbnail
	if err := createThumbnail(sourceFilePath, filepath.Join(outputBasePath, "thumbnail.jpg")); err != nil {
		log.Printf("Warning: Failed to create thumbnail: %v", err)
		// Continue processing, thumbnail is not critical
	}

	// Generate fragmented MP4 for DASH
	if err := generateDASH(sourceFilePath, dashOutputPath, job.ID, hasAudio, width, height); err != nil {
		return fmt.Errorf("DASH generation failed: %w", err)
	}

	// Generate HLS
	if err := generateHLS(sourceFilePath, hlsOutputPath, job.ID, hasAudio, width, height); err != nil {
		return fmt.Errorf("HLS generation failed: %w", err)
	}

	return nil
}

// getVideoDimensions gets the width and height of the video file
func getVideoDimensions(inputFile string) (int, int, error) {
	cmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=s=x:p=0",
		inputFile,
	)

	output, err := cmd.Output()
	if err != nil {
		return 0, 0, err
	}

	// Parse the output which should be in format "width x height"
	parts := strings.Split(strings.TrimSpace(string(output)), "x")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("unexpected ffprobe output format: %s", string(output))
	}

	width, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid width value: %w", err)
	}

	height, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid height value: %w", err)
	}

	return width, height, nil
}

// checkForAudioStream checks if the video file has audio streams
func checkForAudioStream(inputFile string) (bool, error) {
	cmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-select_streams", "a:0",
		"-show_entries", "stream=codec_type",
		"-of", "csv=p=0",
		inputFile,
	)

	output, err := cmd.Output()
	if err != nil {
		return false, err
	}

	// If there's output containing "audio", the file has an audio stream
	return strings.Contains(string(output), "audio"), nil
}

// generateDASH generates MPEG-DASH files
func generateDASH(inputFile, outputDir, jobID string, hasAudio bool, origWidth, origHeight int) error {
	// Calculate scaled resolutions that maintain aspect ratio
	resVariants := calculateResolutions(origWidth, origHeight)

	// Create a separate DASH output for each resolution to avoid aspect ratio conflicts
	for _, res := range resVariants {
		variantName := fmt.Sprintf("%dp", res.Height)
		variantDir := filepath.Join(outputDir, variantName)

		if err := os.MkdirAll(variantDir, 0755); err != nil {
			return fmt.Errorf("failed to create variant directory: %w", err)
		}

		args := []string{
			"-i", inputFile,
			"-c:v", "libx264",
			"-preset", "medium",
			"-keyint_min", "60",
			"-g", "60",
			"-sc_threshold", "0",
			"-profile:v", "high",
			"-vf", fmt.Sprintf("scale=%d:%d", res.Width, res.Height),
			"-b:v", getBitrateForHeight(res.Height),
		}

		// Add audio only if available
		if hasAudio {
			args = append(args,
				"-map", "0:v:0",
				"-map", "0:a:0?", // The ? makes this mapping optional
				"-c:a", "aac",
				"-b:a", "128k",
			)
		} else {
			args = append(args, "-map", "0:v:0")
		}

		// Add output file (MP4 format)
		args = append(args,
			"-f", "mp4",
			filepath.Join(variantDir, "stream.mp4"))

		cmd := exec.Command("ffmpeg", args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("ffmpeg encoding error for %dp: %w - %s", res.Height, err, string(output))
		}
	}

	// Generate a master DASH manifest file
	manifestContent := `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" minBufferTime="PT1.5S" type="static" mediaPresentationDuration="PT0H3M0.0S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
  <Period duration="PT0H3M0.0S">`

	// Add AdaptationSet for video
	manifestContent += `
    <AdaptationSet segmentAlignment="true" group="1" maxWidth="` + fmt.Sprintf("%d", origWidth) + `" maxHeight="` + fmt.Sprintf("%d", origHeight) + `" maxFrameRate="30" par="16:9">`

	// Add each video representation
	for _, res := range resVariants {
		variantName := fmt.Sprintf("%dp", res.Height)
		manifestContent += `
      <Representation id="` + variantName + `" mimeType="video/mp4" codecs="avc1.64001F" width="` + fmt.Sprintf("%d", res.Width) + `" height="` + fmt.Sprintf("%d", res.Height) + `" frameRate="30" sar="1:1" bandwidth="` + getBandwidthForHeight(res.Height) + `">
        <BaseURL>` + variantName + `/stream.mp4</BaseURL>
      </Representation>`
	}

	manifestContent += `
    </AdaptationSet>`

	// Add AdaptationSet for audio if available
	if hasAudio {
		manifestContent += `
    <AdaptationSet segmentAlignment="true" group="2">
      <Representation id="audio" mimeType="audio/mp4" codecs="mp4a.40.2" bandwidth="128000">
        <BaseURL>240p/stream.mp4</BaseURL>
      </Representation>
    </AdaptationSet>`
	}

	manifestContent += `
  </Period>
</MPD>`

	// Write the manifest file
	manifestPath := filepath.Join(outputDir, "manifest.mpd")
	if err := os.WriteFile(manifestPath, []byte(manifestContent), 0644); err != nil {
		return fmt.Errorf("failed to write DASH manifest: %w", err)
	}

	return nil
}

// generateHLS generates HLS files
func generateHLS(inputFile, outputDir, jobID string, hasAudio bool, origWidth, origHeight int) error {
	// Calculate scaled resolutions that maintain aspect ratio
	resVariants := calculateResolutions(origWidth, origHeight)

	// Create master playlist
	masterPlaylist := filepath.Join(outputDir, "master.m3u8")

	// Create variant streams
	for i, res := range resVariants {
		variantName := fmt.Sprintf("%dp", res.Height)
		variantDir := filepath.Join(outputDir, variantName)

		if err := os.MkdirAll(variantDir, 0755); err != nil {
			return fmt.Errorf("failed to create variant directory: %w", err)
		}

		variantPlaylist := filepath.Join(variantDir, "playlist.m3u8")

		args := []string{
			"-i", inputFile,
			"-c:v", "libx264",
			"-preset", "medium",
			"-profile:v", "main",
			"-crf", "23",
			"-sc_threshold", "0",
			"-g", "60",
			"-keyint_min", "60",
			"-hls_time", "6",
			"-hls_list_size", "0",
			"-hls_segment_filename", filepath.Join(variantDir, "segment_%03d.ts"),
			"-vf", fmt.Sprintf("scale=%d:%d", res.Width, res.Height),
			"-b:v", getBitrateForHeight(res.Height),
		}

		// Add audio only if available
		if hasAudio {
			args = append(args,
				"-map", "0:v:0",
				"-map", "0:a:0?", // The ? makes this mapping optional
				"-c:a", "aac",
				"-b:a", "128k",
			)
		} else {
			args = append(args, "-map", "0:v:0")
		}

		args = append(args, variantPlaylist)

		cmd := exec.Command("ffmpeg", args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("ffmpeg error for %dp: %w - %s", res.Height, err, string(output))
		}

		// Write entry to master playlist for this variant
		if i == 0 {
			// Initialize master playlist
			if err := os.WriteFile(masterPlaylist, []byte("#EXTM3U\n#EXT-X-VERSION:3\n"), 0644); err != nil {
				return fmt.Errorf("failed to initialize master playlist: %w", err)
			}
		}

		// Append to master playlist
		entry := fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%s,RESOLUTION=%dx%d,NAME=%s\n%s/playlist.m3u8\n",
			getBandwidthForHeight(res.Height),
			res.Width, res.Height,
			variantName,
			variantName)

		f, err := os.OpenFile(masterPlaylist, os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			return fmt.Errorf("failed to open master playlist: %w", err)
		}
		defer f.Close()

		if _, err := f.WriteString(entry); err != nil {
			return fmt.Errorf("failed to write to master playlist: %w", err)
		}
	}

	return nil
}

// calculateResolutions calculates scaled resolutions maintaining aspect ratio
func calculateResolutions(origWidth, origHeight int) []Resolution {
	// Target heights
	targetHeights := []int{240, 360, 480, 720, 1080}

	// Calculate aspect ratio
	aspectRatio := float64(origWidth) / float64(origHeight)

	// Create resolutions that maintain aspect ratio
	var resolutions []Resolution

	for _, h := range targetHeights {
		// Skip resolutions higher than the original
		if h > origHeight {
			continue
		}

		// Calculate width that maintains aspect ratio
		w := int(math.Round(float64(h) * aspectRatio))

		// Make width even (required by some codecs)
		if w%2 != 0 {
			w++
		}

		resolutions = append(resolutions, Resolution{
			Width:  w,
			Height: h,
		})
	}

	// If no resolutions were added (e.g., very small source video), add the original
	if len(resolutions) == 0 {
		// Make dimensions even
		if origWidth%2 != 0 {
			origWidth++
		}
		if origHeight%2 != 0 {
			origHeight++
		}

		resolutions = append(resolutions, Resolution{
			Width:  origWidth,
			Height: origHeight,
		})
	}

	return resolutions
}

// getBitrateForHeight returns an appropriate bitrate for the given resolution height
func getBitrateForHeight(height int) string {
	switch {
	case height <= 240:
		return "400k"
	case height <= 360:
		return "800k"
	case height <= 480:
		return "1200k"
	case height <= 720:
		return "2500k"
	case height <= 1080:
		return "5000k"
	default:
		return "1500k"
	}
}

// getBandwidthForHeight returns an approximate bandwidth value for the master playlist
func getBandwidthForHeight(height int) string {
	switch {
	case height <= 240:
		return "528000" // 400k video + 128k audio
	case height <= 360:
		return "928000" // 800k video + 128k audio
	case height <= 480:
		return "1328000" // 1200k video + 128k audio
	case height <= 720:
		return "2628000" // 2500k video + 128k audio
	case height <= 1080:
		return "5128000" // 5000k video + 128k audio
	default:
		return "1628000" // 1500k video + 128k audio
	}
}

// createThumbnail generates a thumbnail for the video
func createThumbnail(inputFile, outputFile string) error {
	// Ensure the output directory exists
	if err := os.MkdirAll(filepath.Dir(outputFile), 0755); err != nil {
		return err
	}

	// Extract a frame at 10% into the video
	cmd := exec.Command(
		"ffmpeg",
		"-i", inputFile,
		"-ss", "00:00:03",
		"-frames:v", "1",
		"-vf", "scale=640:-1",
		outputFile,
	)

	return cmd.Run()
}

// watchForNewFiles monitors the media directory for new files and automatically creates encoding jobs
func watchForNewFiles() {
	// Initial processing of existing files
	processExistingFiles()

	// Watch for new files
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			processExistingFiles()
		}
	}
}

// processExistingFiles checks for unprocessed files and creates jobs for them
func processExistingFiles() {
	alreadyProcessedFiles := make(map[string]bool)

	// Collect all jobs that already have a source file
	jobsMutex.RLock()
	for _, job := range activeJobs {
		alreadyProcessedFiles[job.SourceFile] = true
	}
	for _, job := range completedJobs {
		alreadyProcessedFiles[job.SourceFile] = true
	}
	for _, job := range failedJobs {
		alreadyProcessedFiles[job.SourceFile] = true
	}
	jobsMutex.RUnlock()

	// Check for new files
	err := filepath.WalkDir(mediaDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if d.IsDir() {
			return nil
		}

		// Only process video files
		if !isVideoFile(path) {
			return nil
		}

		// Get the relative path to use as the source file ID
		relPath, err := filepath.Rel(mediaDir, path)
		if err != nil {
			return err
		}

		// Skip if already processed
		if alreadyProcessedFiles[relPath] {
			return nil
		}

		// Create a new job
		jobID := fmt.Sprintf("job_%d", time.Now().UnixNano())
		job := EncodingJob{
			ID:         jobID,
			SourceFile: relPath,
			Status:     "pending",
			Progress:   0,
			CreatedAt:  time.Now(),
		}

		// Add to queue
		jobsMutex.Lock()
		activeJobs[jobID] = job
		jobsMutex.Unlock()

		log.Printf("New encoding job created for file: %s", relPath)
		jobQueue <- job

		return nil
	})

	if err != nil {
		log.Printf("Error scanning media directory: %v", err)
	}
}

// isVideoFile checks if the file is a video based on its extension
func isVideoFile(path string) bool {
	ext := filepath.Ext(path)
	switch strings.ToLower(ext) {
	case ".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".mpeg", ".mpg", ".m4v":
		return true
	default:
		return false
	}
}

// HTTP handlers

// submitJobHandler handles submissions of new encoding jobs
func submitJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		SourceFile string `json:"source_file"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if request.SourceFile == "" {
		http.Error(w, "Source file is required", http.StatusBadRequest)
		return
	}

	// Verify the file exists
	sourceFilePath := filepath.Join(mediaDir, request.SourceFile)
	if _, err := os.Stat(sourceFilePath); os.IsNotExist(err) {
		http.Error(w, "Source file not found", http.StatusNotFound)
		return
	}

	// Create job
	jobID := fmt.Sprintf("job_%d", time.Now().UnixNano())
	job := EncodingJob{
		ID:         jobID,
		SourceFile: request.SourceFile,
		Status:     "pending",
		Progress:   0,
		CreatedAt:  time.Now(),
	}

	// Add to queue
	jobsMutex.Lock()
	activeJobs[jobID] = job
	jobsMutex.Unlock()

	// Send to processing queue
	jobQueue <- job

	// Return job details
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(job)
}

// listJobsHandler returns a list of all jobs
func listJobsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get query parameters
	statusFilter := r.URL.Query().Get("status")

	// Collect jobs
	jobsMutex.RLock()
	defer jobsMutex.RUnlock()

	var jobs []EncodingJob

	// Add jobs based on status filter
	if statusFilter == "" || statusFilter == "active" {
		for _, job := range activeJobs {
			jobs = append(jobs, job)
		}
	}

	if statusFilter == "" || statusFilter == "completed" {
		for _, job := range completedJobs {
			jobs = append(jobs, job)
		}
	}

	if statusFilter == "" || statusFilter == "failed" {
		for _, job := range failedJobs {
			jobs = append(jobs, job)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobs)
}

// getJobHandler returns details for a specific job
func getJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract job ID from URL path
	jobID := strings.TrimPrefix(r.URL.Path, "/jobs/")
	if jobID == "" {
		http.Error(w, "Job ID is required", http.StatusBadRequest)
		return
	}

	// Look up the job
	jobsMutex.RLock()
	defer jobsMutex.RUnlock()

	if job, exists := activeJobs[jobID]; exists {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(job)
		return
	}

	if job, exists := completedJobs[jobID]; exists {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(job)
		return
	}

	if job, exists := failedJobs[jobID]; exists {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(job)
		return
	}

	http.Error(w, "Job not found", http.StatusNotFound)
}

// listStreamsHandler returns a list of all available streams
func listStreamsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var streams []Stream

	// Find all completed jobs that have DASH/HLS output
	jobsMutex.RLock()
	for _, job := range completedJobs {
		if job.DashManifest != "" || job.HlsManifest != "" {
			// Extract original filename from source file
			originalFile := job.SourceFile
			parts := strings.SplitN(originalFile, "_", 2)
			filename := originalFile
			if len(parts) > 1 {
				filename = parts[1]
			}

			// Get video duration if possible
			sourceFilePath := filepath.Join(mediaDir, job.SourceFile)
			duration := getVideoDuration(sourceFilePath)

			stream := Stream{
				ID:           job.ID,
				OriginalFile: job.SourceFile,
				Title:        filename,
				DashURL:      job.DashManifest,
				HlsURL:       job.HlsManifest,
				Thumbnail:    fmt.Sprintf("/encoded/%s/thumbnail.jpg", job.ID),
				Duration:     duration,
				CreatedAt:    job.CompletedAt,
			}

			streams = append(streams, stream)
		}
	}
	jobsMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(streams)
}

// getVideoDuration gets the duration of a video file in seconds
func getVideoDuration(inputFile string) int {
	cmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		inputFile,
	)

	output, err := cmd.Output()
	if err != nil {
		log.Printf("Error getting video duration: %v", err)
		return 0
	}

	// Parse output to get duration in seconds
	durStr := strings.TrimSpace(string(output))
	durFloat, err := strconv.ParseFloat(durStr, 64)
	if err != nil {
		log.Printf("Error parsing duration: %v", err)
		return 0
	}

	return int(math.Round(durFloat))
}

// healthCheckHandler is a simple health check endpoint
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

// updateJob updates the status of a job
func updateJob(job EncodingJob) {
	jobsMutex.Lock()
	defer jobsMutex.Unlock()

	activeJobs[job.ID] = job
}

// thumbnailDirectHandler serves thumbnail images directly
func thumbnailDirectHandler(w http.ResponseWriter, r *http.Request) {
	// Extract the job ID from the URL path
	jobID := strings.TrimPrefix(r.URL.Path, "/api/thumbnails/")
	log.Printf("Thumbnail requested for jobID: %s, original path: %s", jobID, r.URL.Path)

	if jobID == "" {
		log.Printf("Empty job ID in thumbnail request")
		http.Error(w, "Job ID is required", http.StatusBadRequest)
		return
	}

	thumbnailPath := filepath.Join(encodedDir, jobID, "thumbnail.jpg")
	log.Printf("Attempting to serve thumbnail from %s", thumbnailPath)

	// Check if the file exists
	if _, err := os.Stat(thumbnailPath); err != nil {
		log.Printf("Error checking thumbnail file: %v", err)
		if os.IsNotExist(err) {
			// List the encoded directory to debug
			files, listErr := os.ReadDir(encodedDir)
			if listErr != nil {
				log.Printf("Error listing encoded directory: %v", listErr)
			} else {
				log.Printf("Available jobs in encoded directory:")
				for _, file := range files {
					log.Printf("  - %s", file.Name())
				}
			}

			http.Error(w, "Thumbnail not found", http.StatusNotFound)
		} else {
			http.Error(w, "Error accessing thumbnail", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Thumbnail file found, serving: %s", thumbnailPath)

	// Set the content type
	w.Header().Set("Content-Type", "image/jpeg")

	// Serve the file
	http.ServeFile(w, r, thumbnailPath)
	log.Printf("Successfully served thumbnail for job: %s", jobID)
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
