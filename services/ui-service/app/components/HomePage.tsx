"use client";

import React, { useEffect, useState } from 'react';
import UploadArea from './UploadArea';
import VideoCard from './VideoCard';
import VideoPlayerPage from './VideoPlayerPage';
import JobsSection from './JobsSection';
import { VideoStream, getVideoStreams, submitEncodingJob, UploadResponse } from '../lib/api';
import { AlertCircle, Upload, Clock, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const [videos, setVideos] = useState<VideoStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoStream | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [refreshJobs, setRefreshJobs] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVideoStreams();
      
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setVideos(data);
      } else {
        console.error('Expected array of videos but got:', data);
        setVideos([]);
      }
    } catch (err) {
      setError('Failed to load videos. Please try again later.');
      console.error('Error fetching videos:', err);
      setVideos([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (response: UploadResponse) => {
    try {
      setUploadError(null);
      setUploadSuccess(`File "${response.filename}" uploaded successfully!`);
      
      // Submit the uploaded file for encoding
      await submitEncodingJob(response.file_id);
      
      // Trigger refresh of jobs section
      setRefreshJobs(true);
      
      // Reload the video list after a short delay to allow encoding to start
      // and retry several times with increasing delays
      const retryFetchWithDelay = (attemptCount: number) => {
        setTimeout(async () => {
          try {
            await fetchVideos();
            
            if (videos.length === 0 && attemptCount < 5) {
              // If still no videos, try again with an increased delay
              console.log(`No videos found yet, retrying in ${(attemptCount + 1) * 2} seconds...`);
              retryFetchWithDelay(attemptCount + 1);
            }
          } catch (err) {
            console.error('Error in retry fetch:', err);
            if (attemptCount < 5) {
              retryFetchWithDelay(attemptCount + 1);
            }
          }
        }, attemptCount * 2000); // Increasing delay: 2s, 4s, 6s, 8s, 10s
      };
      
      // Start the retry process
      retryFetchWithDelay(1);
      
    } catch (err) {
      setUploadError('File uploaded but encoding failed. Please try again.');
      console.error('Error submitting encoding job:', err);
    }
  };

  const handleUploadError = (err: Error) => {
    setUploadError(err.message);
    setUploadSuccess(null);
  };

  const handlePlayVideo = (video: VideoStream) => {
    setSelectedVideo(video);
  };

  const handleBackToVideos = () => {
    setSelectedVideo(null);
  };

  const handleRefreshComplete = () => {
    setRefreshJobs(false);
  };

  // If a video is selected, display the video player page
  if (selectedVideo) {
    return <VideoPlayerPage video={selectedVideo} onBack={handleBackToVideos} />;
  }

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <h1 className="mb-8 text-center text-4xl font-bold">SuperLive</h1>
      
      <section className="mb-12">
        <div className="mb-6 flex items-center">
          <Upload className="mr-2 h-6 w-6" />
          <h2 className="text-2xl font-semibold">Upload Video</h2>
        </div>
        
        <UploadArea 
          onUploadComplete={handleUploadComplete}
          onError={handleUploadError}
        />
        
        {uploadError && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{uploadError}</p>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-green-100 p-3 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <p>{uploadSuccess}</p>
          </div>
        )}
      </section>
      
      <section className="mb-12">
        <div className="mb-6 flex items-center">
          <Clock className="mr-2 h-6 w-6" />
          <h2 className="text-2xl font-semibold">Encoding Jobs</h2>
        </div>
        
        <JobsSection 
          shouldRefresh={refreshJobs}
          onRefreshComplete={handleRefreshComplete}
        />
      </section>
      
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Your Videos</h2>
        
        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="flex min-h-40 items-center justify-center rounded-lg border bg-card p-6 text-center">
            <div>
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
              <p>{error}</p>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border bg-card p-6 text-center">
            <p className="mb-2 text-lg font-medium">No videos available yet</p>
            <p className="text-muted-foreground">
              Upload a video to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={handlePlayVideo}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
} 