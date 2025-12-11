import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface TargetUploadProps {
  onUpload: (file: File) => void;
  preview: string | null;
  dimensions: { width: number; height: number } | null;
}

export function TargetUpload({ onUpload, preview, dimensions }: TargetUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1
  });

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
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) onUpload(file);
            };
            input.click();
          }}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Change target image
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragActive
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        {isDragActive ? (
          <>
            <Upload className="w-12 h-12 text-blue-400" />
            <p className="text-blue-400 font-medium">Drop the image here</p>
          </>
        ) : (
          <>
            <ImageIcon className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-gray-300 font-medium">
                Drag & drop your target image here
              </p>
              <p className="text-gray-500 text-sm mt-1">
                or click to browse files
              </p>
            </div>
            <p className="text-gray-600 text-xs">
              Supports PNG, JPG, GIF, WebP
            </p>
          </>
        )}
      </div>
    </div>
  );
}
