"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { uploadFile, UploadResponse } from '../lib/api';
import { UploadCloud } from 'lucide-react';

interface UploadAreaProps {
  onUploadComplete?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ 
  onUploadComplete,
  onError 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file is a video
    if (!file.type.startsWith('video/')) {
      onError?.(new Error('Please upload a video file'));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);

      const response = await uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      
      onUploadComplete?.(response);
    } catch (error) {
      setIsUploading(false);
      onError?.(error instanceof Error ? error : new Error('Upload failed'));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`relative flex h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <UploadCloud 
        className={`mb-4 h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} 
      />

      <h3 className="mb-2 text-lg font-medium">
        {isUploading ? 'Uploading...' : 'Drag & Drop Video'}
      </h3>
      
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {isUploading 
          ? `${uploadProgress.toFixed(0)}% complete` 
          : 'Or click to browse your files'
        }
      </p>

      {isUploading ? (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      ) : (
        <Button 
          onClick={triggerFileInput} 
          disabled={isUploading}
          variant="outline"
        >
          Select Video
        </Button>
      )}
    </div>
  );
};

export default UploadArea; 