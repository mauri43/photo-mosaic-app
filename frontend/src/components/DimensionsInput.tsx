import { useState, useEffect } from 'react';
import { Ruler, Lock, Unlock } from 'lucide-react';
import type { ResolutionRequirements } from '../types';

interface DimensionsInputProps {
  initialWidth: number;
  initialHeight: number;
  originalDimensions: { width: number; height: number } | null;
  requirements: ResolutionRequirements | null;
  onSubmit: (width: number, height: number) => void;
}

export function DimensionsInput({
  initialWidth,
  initialHeight,
  originalDimensions,
  requirements,
  onSubmit
}: DimensionsInputProps) {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const aspectRatio = originalDimensions
    ? originalDimensions.width / originalDimensions.height
    : 1;

  useEffect(() => {
    setWidth(initialWidth);
    setHeight(initialHeight);
  }, [initialWidth, initialHeight]);

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    if (lockAspectRatio) {
      setHeight(Math.round(newWidth / aspectRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (lockAspectRatio) {
      setWidth(Math.round(newHeight * aspectRatio));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (width >= 100 && height >= 100) {
      onSubmit(width, height);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Width (px)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
              min={100}
              max={20000}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setLockAspectRatio(!lockAspectRatio)}
            className={`mt-6 p-2 rounded-lg ${
              lockAspectRatio
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-700 text-gray-400'
            }`}
            title={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            {lockAspectRatio ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Height (px)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
              min={100}
              max={20000}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={width < 100 || height < 100}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Ruler className="w-4 h-4" />
          Calculate Requirements
        </button>
      </form>

      {requirements && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
            Required Tile Images
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">{requirements.low}</div>
              <div className="text-xs text-gray-400 mt-1">Low</div>
              <div className="text-xs text-gray-500">
                {requirements.gridLow.cols}x{requirements.gridLow.rows}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 ring-2 ring-blue-500">
              <div className="text-2xl font-bold text-blue-400">{requirements.medium}</div>
              <div className="text-xs text-gray-400 mt-1">Medium</div>
              <div className="text-xs text-gray-500">
                {requirements.gridMedium.cols}x{requirements.gridMedium.rows}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{requirements.high}</div>
              <div className="text-xs text-gray-400 mt-1">High</div>
              <div className="text-xs text-gray-500">
                {requirements.gridHigh.cols}x{requirements.gridHigh.rows}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Upload at least this many unique images for each resolution level
          </p>
        </div>
      )}
    </div>
  );
}
