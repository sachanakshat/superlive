"use client";

import React from 'react';
import VideoPlayer from './VideoPlayer';
import { VideoStream, getStreamUrl } from '../lib/api';
import { Button } from './ui/button';
import { ArrowLeft, Download } from 'lucide-react';

interface VideoPlayerPageProps {
  video: VideoStream;
  onBack: () => void;
}

const VideoPlayerPage: React.FC<VideoPlayerPageProps> = ({ video, onBack }) => {
  // Safety check for required props
  if (!video || typeof video !== 'object') {
    return (
      <div className="container mx-auto max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border bg-destructive/10 p-8 text-center text-destructive">
          <h2 className="text-xl font-semibold">Error: Invalid video data</h2>
          <Button variant="outline" onClick={onBack}>Back to videos</Button>
        </div>
      </div>
    );
  }
  
  // Use HLS URL first (better adaptive streaming), fallback to DASH
  const streamUrl = video.hls_url 
    ? getStreamUrl(video.hls_url) 
    : getStreamUrl(video.dash_url);

  const isHls = video.hls_url && streamUrl === getStreamUrl(video.hls_url);
  const title = video.title || 'Untitled video';
  const originalFile = video.original_file || 'Unknown file';
  const createdAt = video.created_at || new Date().toISOString();

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to videos
        </Button>
        
        <h1 className="text-2xl font-bold">{title}</h1>
        
        <Button 
          variant="outline" 
          asChild
          disabled={!originalFile}
        >
          <a 
            href={`/api/download?id=${encodeURIComponent(originalFile)}`} 
            download={title}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </Button>
      </div>
      
      <div className="overflow-hidden rounded-xl shadow-lg">
        {streamUrl ? (
          <VideoPlayer 
            hlsUrl={isHls ? streamUrl : undefined}
            dashUrl={!isHls ? streamUrl : undefined}
            title={title}
            className="aspect-video w-full"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <p className="text-muted-foreground">No video stream available</p>
          </div>
        )}
      </div>
      
      <div className="mt-6 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Video Information</h2>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Original File</p>
            <p className="text-base">{originalFile}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Uploaded</p>
            <p className="text-base">
              {formatDate(createdAt)}
            </p>
          </div>
          
          {video.duration && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p className="text-base">{formatDuration(video.duration)}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Streaming Format</p>
            <p className="text-base">{isHls ? 'HLS' : 'MPEG-DASH'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown date';
  }
};

export default VideoPlayerPage; 