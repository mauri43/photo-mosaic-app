import { useCallback, useState, useRef } from 'react';
import { Upload, LayoutGrid, Trash2, CheckCircle } from 'lucide-react';

interface TileUploadProps {
  onUpload: (files: File[], onProgress?: (progress: number) => void) => Promise<void>;
  onClear: () => void;
  tileCount: number;
  previews: string[];
  requiredCount: number;
}

export function TileUpload({
  onUpload,
  onClear,
  tileCount,
  previews,
  requiredCount
}: TileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f =>
      f.type.startsWith('image/') ||
      f.name.toLowerCase().endsWith('.heic') ||
      f.name.toLowerCase().endsWith('.heif')
    );

    if (fileArray.length > 0) {
      console.log(`Processing ${fileArray.length} tile images`);
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
    // Reset input
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
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const hasEnoughTiles = tileCount >= requiredCount;

  return (
    <div className="space-y-4">
      {/* Hidden file input - iOS compatible with multiple selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300">
            {tileCount} tile{tileCount !== 1 ? 's' : ''} uploaded
          </span>
          {hasEnoughTiles && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
        </div>
        {tileCount > 0 && (
          <button
            onClick={onClear}
            className="text-red-400 hover:text-red-300 active:text-red-200 text-sm flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isUploading && uploadProgress !== null && (
        <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Status message */}
      {!hasEnoughTiles && tileCount > 0 && requiredCount > 0 && (
        <div className="text-yellow-400 text-sm bg-yellow-400/10 rounded-lg px-3 py-2">
          Need {requiredCount - tileCount} more images for selected quality
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={tileCount === 0 ? handleClick : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${tileCount > 0
            ? 'border-gray-700 bg-gray-800/30'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50 cursor-pointer active:bg-gray-700/50'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-gray-400">Processing images...</p>
            {uploadProgress !== null && (
              <p className="text-gray-500 text-sm">{uploadProgress}% uploaded</p>
            )}
          </div>
        ) : tileCount > 0 ? (
          <div className="space-y-3">
            {/* Tile previews */}
            <div className="flex flex-wrap justify-center gap-1 max-h-32 overflow-hidden">
              {previews.slice(0, 30).map((preview, idx) => (
                <img
                  key={idx}
                  src={preview}
                  alt={`Tile ${idx + 1}`}
                  className="w-10 h-10 object-cover rounded"
                />
              ))}
              {tileCount > 30 && (
                <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                  +{tileCount - 30}
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="text-blue-400 hover:text-blue-300 active:text-blue-200 text-sm underline"
            >
              Add more images
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-gray-400" />
            <div>
              <p className="text-gray-300 font-medium">
                Tap to select tile images
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Select multiple photos from your library
              </p>
            </div>
            <p className="text-gray-600 text-xs">
              Supports PNG, JPG, HEIC, WebP
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
