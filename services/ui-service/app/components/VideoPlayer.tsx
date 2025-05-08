"use client";

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';

interface VideoPlayerProps {
  hlsUrl?: string;
  dashUrl?: string;
  title?: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  hlsUrl,
  dashUrl,
  title,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate refs and URLs first
    const videoElement = videoRef.current;
    if (!videoElement) {
      setError('Video element not available');
      setLoading(false);
      return;
    }

    // Check if we have valid URLs
    if (!hlsUrl && !dashUrl) {
      console.warn('No video URLs provided');
      setError('No video source provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Clean up previous instances
    let hls: Hls | null = null;
    let dash: dashjs.MediaPlayerClass | null = null;

    const setupPlayer = async () => {
      try {
        if (hlsUrl) {
          // Validate URL format
          try {
            new URL(hlsUrl); // Will throw if invalid URL
          } catch (urlError) {
            console.error('Invalid HLS URL:', hlsUrl, urlError);
            setError('Invalid video source URL');
            setLoading(false);
            return;
          }

          // Use HLS.js if the browser doesn't support HLS natively
          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              xhrSetup: (xhr) => {
                xhr.addEventListener('error', () => {
                  console.error('XHR error with URL:', hlsUrl);
                });
              }
            });
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setLoading(false);
              videoElement.play().catch(err => {
                console.error('Error playing video:', err);
                setError('Failed to play the video. Try clicking play.');
              });
            });

            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) {
                console.error('HLS error:', data);
                setError('Error loading the video stream.');
              }
            });
          } 
          // For Safari which has native HLS support
          else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = hlsUrl;
            videoElement.addEventListener('loadedmetadata', () => {
              setLoading(false);
              videoElement.play().catch(err => {
                console.error('Error playing video:', err);
                setError('Failed to play the video. Try clicking play.');
              });
            });

            videoElement.addEventListener('error', (e) => {
              console.error('Video element error:', e);
              setError('Error loading the video.');
            });
          } else {
            setError('Your browser does not support HLS playback.');
          }
        } 
        else if (dashUrl) {
          // Validate URL format
          try {
            new URL(dashUrl); // Will throw if invalid URL
          } catch (urlError) {
            console.error('Invalid DASH URL:', dashUrl, urlError);
            setError('Invalid video source URL');
            setLoading(false);
            return;
          }

          // Use dash.js for DASH streams
          dash = dashjs.MediaPlayer().create();
          dash.initialize(videoElement, dashUrl, true);
          dash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
            setLoading(false);
          });
          dash.on(dashjs.MediaPlayer.events.ERROR, (error: unknown) => {
            console.error('DASH error:', error);
            setError('Error loading the DASH stream.');
          });
        } else {
          setError('No video source provided.');
        }
      } catch (err) {
        console.error('Video player setup error:', err);
        setError('Failed to initialize the video player.');
        setLoading(false);
      }
    };

    setupPlayer();

    // Cleanup
    return () => {
      if (hls) {
        hls.destroy();
      }
      if (dash) {
        dash.reset();
      }
    };
  }, [hlsUrl, dashUrl]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-white">
          <p>{error}</p>
        </div>
      )}
      
      <video 
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        poster={loading ? undefined : undefined}
        title={title}
      />
    </div>
  );
};

export default VideoPlayer; 