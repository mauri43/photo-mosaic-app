import { Sparkles, Loader2 } from 'lucide-react';
import type { Resolution } from '../types';

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled: boolean;
  tileCount: number;
  selectedResolution: Resolution;
  recommendedCount: number;
  allowDuplicates: boolean;
  useAllTiles: boolean;
  manualMode: boolean;
}

export function GenerateButton({
  onClick,
  isGenerating,
  disabled,
  tileCount,
  selectedResolution,
  recommendedCount,
  allowDuplicates,
  useAllTiles,
  manualMode
}: GenerateButtonProps) {
  const hasEnoughTiles = allowDuplicates || tileCount >= recommendedCount;
  const willUseAllTiles = selectedResolution === 'high' && tileCount > recommendedCount;

  let statusMessage = '';
  if (tileCount === 0) {
    statusMessage = 'Upload tile images first';
  } else if (!hasEnoughTiles) {
    statusMessage = `Need ${recommendedCount - tileCount} more tiles (or enable duplicates)`;
  }

  const isDisabled = disabled || !hasEnoughTiles || tileCount === 0;

  // Calculate how many tiles will be used
  let tilesToUse = recommendedCount;
  if (willUseAllTiles && (!manualMode || useAllTiles)) {
    tilesToUse = tileCount;
  } else {
    tilesToUse = Math.min(recommendedCount, tileCount);
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={isDisabled || isGenerating}
        className={`
          w-full py-4 px-6 rounded-lg font-medium text-lg transition-all
          flex items-center justify-center gap-3
          ${isDisabled || isGenerating
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
          }
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Generating Mosaic...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Generate {selectedResolution.charAt(0).toUpperCase() + selectedResolution.slice(1)} Quality Mosaic
          </>
        )}
      </button>

      {statusMessage && !isGenerating && (
        <p className="text-center text-sm text-gray-500">{statusMessage}</p>
      )}

      {!statusMessage && !isGenerating && !isDisabled && (
        <p className="text-center text-sm text-gray-400">
          Will use <span className="text-blue-400 font-medium">{tilesToUse}</span> tiles
          {willUseAllTiles && (!manualMode || useAllTiles) && (
            <span className="text-green-400"> (all uploaded images!)</span>
          )}
        </p>
      )}

      {isGenerating && (
        <p className="text-center text-sm text-blue-400">
          This may take a minute for high-resolution mosaics...
        </p>
      )}
    </div>
  );
}
