import { Copy, Paintbrush, Maximize, Grid2X2 } from 'lucide-react';
import type { Resolution, ResolutionRequirements, ImageAnalysis } from '../types';

interface SettingsPanelProps {
  allowDuplicates: boolean;
  allowTinting: boolean;
  fourXDetail: boolean;
  selectedResolution: Resolution;
  requirements: ResolutionRequirements | null;
  imageAnalysis: ImageAnalysis | null;
  tileCount: number;
  useAllTiles: boolean;
  manualMode: boolean;
  onDuplicatesChange: (value: boolean) => void;
  onTintingChange: (value: boolean) => void;
  onFourXDetailChange: (value: boolean) => void;
  onResolutionChange: (value: Resolution) => void;
  onUseAllTilesChange: (value: boolean) => void;
}

export function SettingsPanel({
  allowDuplicates,
  allowTinting,
  fourXDetail,
  selectedResolution,
  requirements,
  imageAnalysis,
  tileCount,
  useAllTiles,
  manualMode,
  onDuplicatesChange,
  onTintingChange,
  onFourXDetailChange,
  onResolutionChange,
  onUseAllTilesChange
}: SettingsPanelProps) {
  const getRequiredCount = (resolution: Resolution): number => {
    if (manualMode && requirements) {
      switch (resolution) {
        case 'low': return requirements.low;
        case 'medium': return requirements.medium;
        case 'high': return requirements.high;
      }
    } else if (imageAnalysis) {
      return imageAnalysis.recommendedTiles[resolution];
    }
    return 0;
  };

  const requiredCount = getRequiredCount(selectedResolution);
  const hasEnoughTiles = allowDuplicates || tileCount >= requiredCount;

  return (
    <div className="space-y-6">
      {/* Resolution Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Quality Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as Resolution[]).map((res) => {
            const count = getRequiredCount(res);
            const isDisabled = !allowDuplicates && tileCount < count;
            const willUseAll = res === 'high' && tileCount > count;

            return (
              <button
                key={res}
                onClick={() => !isDisabled && onResolutionChange(res)}
                disabled={isDisabled}
                className={`
                  p-3 rounded-lg border-2 transition-all text-center
                  ${selectedResolution === res
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : isDisabled
                      ? 'border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                  }
                `}
              >
                <div className="font-medium capitalize">{res}</div>
                <div className="text-xs mt-1 opacity-70">
                  {count} tiles {manualMode ? 'required' : 'recommended'}
                </div>
                {willUseAll && selectedResolution === res && (
                  <div className="text-xs text-green-400 mt-1">
                    Will use all {tileCount}!
                  </div>
                )}
                {isDisabled && (
                  <div className="text-xs text-red-400 mt-1">
                    Need {count - tileCount} more
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        {/* Allow Duplicates */}
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Copy className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-300">
                Allow Duplicate Tiles
              </div>
              <div className="text-xs text-gray-500">
                Reuse tiles when not enough unique images
              </div>
            </div>
          </div>
          <button
            onClick={() => onDuplicatesChange(!allowDuplicates)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${allowDuplicates ? 'bg-blue-500' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                ${allowDuplicates ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Allow Tinting */}
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Paintbrush className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-300">
                Allow Color Tinting
              </div>
              <div className="text-xs text-gray-500">
                Subtle color adjustment for better matching
              </div>
            </div>
          </div>
          <button
            onClick={() => onTintingChange(!allowTinting)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${allowTinting ? 'bg-blue-500' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                ${allowTinting ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* 4x Detail Mode */}
        <div className="flex items-center justify-between p-3 bg-purple-900/30 border border-purple-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Grid2X2 className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-sm font-medium text-purple-300">
                4x Detail Mode
              </div>
              <div className="text-xs text-purple-400">
                Each tile becomes 4 sub-tiles for higher detail
                {fourXDetail && <span className="text-purple-300"> (duplicates auto-enabled)</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => onFourXDetailChange(!fourXDetail)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${fourXDetail ? 'bg-purple-500' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                ${fourXDetail ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Use All Tiles (only for high quality in manual mode) */}
        {manualMode && selectedResolution === 'high' && tileCount > requiredCount && (
          <div className="flex items-center justify-between p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Maximize className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm font-medium text-green-300">
                  Use All {tileCount} Tiles
                </div>
                <div className="text-xs text-green-500">
                  Maximum quality with all uploaded images
                </div>
              </div>
            </div>
            <button
              onClick={() => onUseAllTilesChange(!useAllTiles)}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${useAllTiles ? 'bg-green-500' : 'bg-gray-600'}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                  ${useAllTiles ? 'translate-x-7' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        )}
      </div>

      {/* Warning if not enough tiles */}
      {!hasEnoughTiles && (
        <div className="text-yellow-400 text-sm bg-yellow-400/10 rounded-lg px-3 py-2">
          Not enough tiles for {selectedResolution} quality without duplicates.
          Enable duplicates or upload more images.
        </div>
      )}

      {/* Info about auto mode behavior */}
      {!manualMode && selectedResolution === 'high' && tileCount > requiredCount && (
        <div className="text-green-400 text-sm bg-green-400/10 rounded-lg px-3 py-2">
          You have {tileCount - requiredCount} extra tiles! All {tileCount} tiles will be used for maximum quality.
        </div>
      )}
    </div>
  );
}
