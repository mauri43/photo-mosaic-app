import { useCallback, useRef } from 'react';
import { Image as ImageIcon, Camera } from 'lucide-react';

interface TargetUploadProps {
  onUpload: (file: File) => void;
  preview: string | null;
  dimensions: { width: number; height: number } | null;
  isLoading?: boolean;
}

export function TargetUpload({ onUpload, preview, dimensions, isLoading }: TargetUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      onUpload(file);
    }
    // Reset input so same file can be selected again
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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-lg overflow-hidden border-2 border-green-500 bg-gray-800">
          <img
            src={preview}
            alt="Target"
            className="w-full h-64 object-contain bg-gray-900"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 text-sm">
            <span className="text-green-400">Target image loaded</span>
            {dimensions && (
              <span className="text-gray-400 ml-2">
                ({dimensions.width} x {dimensions.height} px)
              </span>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={handleClick}
          className="text-sm text-blue-400 hover:text-blue-300 underline active:text-blue-200"
        >
          Change target image
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input - iOS compatible */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main upload area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 active:bg-gray-700/50
          border-gray-600 hover:border-gray-500 bg-gray-800/50
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Processing image...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ImageIcon className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-gray-300 font-medium">
                Tap to select your target image
              </p>
              <p className="text-gray-500 text-sm mt-1">
                or drag & drop on desktop
              </p>
            </div>
            <p className="text-gray-600 text-xs">
              Supports PNG, JPG, HEIC, WebP
            </p>
          </div>
        )}
      </div>

      {/* Alternative: Camera button for mobile */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            // Create a separate input for camera capture
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) onUpload(file);
            };
            input.click();
          }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 active:text-gray-200"
        >
          <Camera className="w-4 h-4" />
          Take a photo instead
        </button>
      </div>
    </div>
  );
}
