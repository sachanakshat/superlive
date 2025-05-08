"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { VideoStream, getStreamUrl } from '../lib/api';
import { FileVideo, Play } from 'lucide-react';

interface VideoCardProps {
  video: VideoStream;
  onPlay: (video: VideoStream) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  const thumbnailUrl = video?.thumbnail ? getStreamUrl(video.thumbnail) : null;
  const title = video?.title || 'Untitled video';
  
  // Safety check for required props
  if (!video || typeof video !== 'object') {
    return (
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="flex h-48 w-full items-center justify-center bg-destructive/20 text-destructive">
          Error: Invalid video data
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={true} 
            onError={e => {
              // Use FileVideo icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              console.error(`Failed to load thumbnail: ${thumbnailUrl}`);
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <FileVideo className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <button 
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"
          onClick={() => onPlay(video)}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="h-8 w-8" />
          </div>
        </button>
      </div>
      
      <CardHeader className="p-4 pb-0">
        <CardTitle className="line-clamp-1 text-lg">{title}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Uploaded: {formatDate(video.created_at)}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={() => onPlay(video)} 
          className="w-full"
        >
          <Play className="mr-2 h-4 w-4" /> Play Video
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VideoCard; 