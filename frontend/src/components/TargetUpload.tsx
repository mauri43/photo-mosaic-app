import { useCallback, useRef, useState } from 'react';

interface TargetUploadProps {
  onUpload: (file: File) => void;
  preview: string | null;
  dimensions: { width: number; height: number } | null;
  isLoading?: boolean;
}

// Target image dropzone icon
function TargetIcon() {
  return (
    <svg className="dropzone-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="10" width="36" height="28" rx="4"/>
      <circle cx="18" cy="22" r="4"/>
      <path d="M42 30l-10-8-8 6-6-4-12 10"/>
    </svg>
  );
}

export function TargetUpload({ onUpload, preview, dimensions, isLoading }: TargetUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Show preview if image is uploaded
  if (preview) {
    return (
      <div>
        <div className="uploaded-preview">
          <div className="uploaded-image-container">
            <img
              src={preview}
              alt="Target preview"
              className="uploaded-thumb"
            />
            <div className="uploaded-info">
              <p className="uploaded-name">Target image</p>
              {dimensions && (
                <p className="uploaded-meta">{dimensions.width} x {dimensions.height} px</p>
              )}
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleFileChange}
              className="hidden"
              style={{ display: 'none' }}
            />
            <button className="btn btn-ghost btn-sm" onClick={handleClick}>
              Replace image
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`dropzone ${isDragging ? 'drag-over' : ''} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {isLoading ? (
          <>
            <div className="progress-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 16px' }} />
            <p className="dropzone-text">Processing image...</p>
          </>
        ) : (
          <>
            <TargetIcon />
            <p className="dropzone-text">Upload Target Image</p>
            <p className="dropzone-hint">Drag & drop or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}
