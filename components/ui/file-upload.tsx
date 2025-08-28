'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { lookup } from 'mime-types';

interface FileUploadProps {
  onFileUpload: (file: File, content: string) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
}

export function FileUpload({ 
  onFileUpload, 
  acceptedFileTypes = ['.html', '.css', '.js'],
  maxFileSize = 1024 * 1024 // 1MB
}: FileUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / 1024)}KB`;
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(extension)) {
      return `Only ${acceptedFileTypes.join(', ')} files are allowed`;
    }

    // Check MIME type
    const mimeType = lookup(file.name);
    const allowedMimeTypes = ['text/html', 'text/css', 'application/javascript', 'text/javascript'];
    if (mimeType && !allowedMimeTypes.includes(mimeType)) {
      return `Invalid file type. Expected HTML, CSS, or JavaScript file`;
    }

    return null;
  }, [acceptedFileTypes, maxFileSize]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      for (const file of acceptedFiles) {
        const error = validateFile(file);
        if (error) {
          setUploadError(error);
          setIsUploading(false);
          return;
        }

        // Read file content
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });

        onFileUpload(file, content);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload, validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm'],
      'text/css': ['.css'],
      'application/javascript': ['.js'],
      'text/javascript': ['.js']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={isUploading} />
        
        <div className="flex flex-col items-center space-y-3">
          {isUploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive
                ? 'Drop your file here'
                : isUploading
                ? 'Uploading...'
                : 'Drag & drop a file here, or click to select'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Supports HTML, CSS, and JavaScript files (max {Math.round(maxFileSize / 1024)}KB)
            </p>
          </div>
        </div>
      </Card>

      {uploadError && (
        <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{uploadError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUploadError(null)}
            className="ml-auto h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
