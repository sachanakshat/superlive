"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getEncodingJobs, EncodingJob } from '../lib/api';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface JobsSectionProps {
  shouldRefresh?: boolean;
  onRefreshComplete?: () => void;
}

const JobsSection: React.FC<JobsSectionProps> = ({ 
  shouldRefresh = false,
  onRefreshComplete
}) => {
  const [jobs, setJobs] = useState<EncodingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEncodingJobs();
      
      if (Array.isArray(data)) {
        // Sort by created_at (newest first)
        data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setJobs(data);
      } else {
        console.error('Expected array of jobs but got:', data);
        setJobs([]);
      }
    } catch (err) {
      setError('Failed to load encoding jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
      if (onRefreshComplete) onRefreshComplete();
    }
  }, [onRefreshComplete]);

  useEffect(() => {
    fetchJobs();
    
    // Set up a polling interval to refresh jobs
    const interval = setInterval(fetchJobs, 5000);
    
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Refresh when shouldRefresh prop changes
  useEffect(() => {
    if (shouldRefresh) {
      fetchJobs();
    }
  }, [shouldRefresh, fetchJobs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting to process';
      case 'processing':
        return 'Currently processing';
      case 'completed':
        return 'Ready to play';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const getFileName = (path: string) => {
    // Extract just the filename from the path
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-lg border bg-card p-6 text-center">
        <div>
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border bg-card p-6 text-center">
        <p className="mb-2 text-lg font-medium">No encoding jobs</p>
        <p className="text-muted-foreground">
          Upload a video to start encoding
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div 
          key={job.id}
          className="rounded-lg border bg-card shadow-sm overflow-hidden"
        >
          <div className="flex items-center p-4 border-b border-border">
            <div className="mr-2">
              {getStatusIcon(job.status)}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{getFileName(job.source_file)}</h3>
              <p className="text-sm text-muted-foreground">
                {getStatusText(job.status)} • {formatTime(job.created_at)}
              </p>
            </div>
            {job.status === 'processing' && (
              <div className="ml-auto">
                <div className="flex items-center">
                  <span className="mr-2 text-sm font-medium">{job.progress}%</span>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {job.error_message && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm">
              <p><strong>Error:</strong> {job.error_message}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default JobsSection; 