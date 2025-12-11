import { useCallback, useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface TileUploadProps {
  onUpload: (files: File[], onProgress?: (progress: number) => void) => Promise<void>;
  onClear: () => void;
  tileCount: number;
  previews: string[];
  requiredCount: number;
}

// Tile grid icon
function TileIcon() {
  return (
    <svg className="dropzone-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="28" y="4" width="16" height="16" rx="2"/>
      <rect x="4" y="28" width="16" height="16" rx="2"/>
      <rect x="28" y="28" width="16" height="16" rx="2"/>
    </svg>
  );
}

// Grid icon for tile count
function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}

export function TileUpload({
  onUpload,
  onClear,
  tileCount,
  previews,
  requiredCount: _requiredCount
}: TileUploadProps) {
  // Note: requiredCount is passed but not used in this simplified design
  void _requiredCount;
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f =>
      f.type.startsWith('image/') ||
      f.name.toLowerCase().endsWith('.heic') ||
      f.name.toLowerCase().endsWith('.heif')
    );

    if (fileArray.length > 0) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        await onUpload(fileArray, setUploadProgress);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }
  }, [onUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

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

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Dropzone */}
      <div
        onClick={tileCount === 0 ? handleClick : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`dropzone ${isDragging ? 'drag-over' : ''} ${isUploading ? 'opacity-50 pointer-events-none' : ''} ${tileCount > 0 ? 'cursor-default' : ''}`}
        style={tileCount > 0 ? { padding: '24px' } : {}}
      >
        {isUploading ? (
          <>
            <div className="progress-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 16px' }} />
            <p className="dropzone-text">Processing images...</p>
            {uploadProgress !== null && (
              <p className="dropzone-hint">{uploadProgress}% uploaded</p>
            )}
          </>
        ) : tileCount > 0 ? (
          <div style={{ textAlign: 'center' }}>
            <p className="dropzone-text" style={{ marginBottom: '8px' }}>
              {tileCount} photos uploaded
            </p>
            <p className="dropzone-hint">Drag more images here to add</p>
          </div>
        ) : (
          <>
            <TileIcon />
            <p className="dropzone-text">Upload Tile Images</p>
            <p className="dropzone-hint">Your photos for the mosaic</p>
          </>
        )}
      </div>

      {/* Tile Grid */}
      {tileCount > 0 && previews.length > 0 && (
        <div className="tile-grid">
          {previews.slice(0, 50).map((preview, idx) => (
            <div key={idx} className="tile-item">
              <img src={preview} alt={`Tile ${idx + 1}`} />
            </div>
          ))}
          {tileCount > 50 && (
            <div className="tile-item" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass-light)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              +{tileCount - 50}
            </div>
          )}
        </div>
      )}

      {/* Tile count badge */}
      {tileCount > 0 && (
        <span className="tile-count">
          <GridIcon />
          <span>{tileCount} photos</span>
        </span>
      )}

      {/* Action buttons */}
      {tileCount > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleClick}>
            Add more photos
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClear}
            style={{ color: 'var(--accent-orange)' }}
          >
            <Trash2 className="w-4 h-4" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
