import { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Loader2, Settings, RefreshCw, ImagePlus } from 'lucide-react';

interface DeepZoomViewerProps {
  dziUrl: string;
  downloadUrl: string;
  onReset?: () => void;
  onChangeTarget?: () => void;
  allowDuplicates: boolean;
  allowTinting: boolean;
  fourXDetail: boolean;
  onRegenerateWithSettings?: (settings: { allowDuplicates: boolean; allowTinting: boolean; fourXDetail: boolean }) => void;
  isRegenerating?: boolean;
  tileCount?: number;
}

export function DeepZoomViewer({
  dziUrl,
  downloadUrl,
  onReset,
  onChangeTarget,
  allowDuplicates,
  allowTinting,
  fourXDetail,
  onRegenerateWithSettings,
  isRegenerating,
  tileCount = 0
}: DeepZoomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingDuplicates, setPendingDuplicates] = useState(allowDuplicates);
  const [pendingTinting, setPendingTinting] = useState(allowTinting);
  const [pendingFourXDetail, setPendingFourXDetail] = useState(fourXDetail);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Track if settings have changed
  const settingsChanged = pendingDuplicates !== allowDuplicates || pendingTinting !== allowTinting || pendingFourXDetail !== fourXDetail;

  useEffect(() => {
    if (!containerRef.current || !dziUrl) return;

    // Destroy existing viewer
    if (viewerRef.current) {
      viewerRef.current.destroy();
    }

    setIsLoading(true);

    // Create new viewer
    const viewer = OpenSeadragon({
      element: containerRef.current,
      tileSources: dziUrl,
      prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      navigatorSizeRatio: 0.15,
      navigatorMaintainSizeRatio: true,
      navigatorAutoFade: true,
      showNavigationControl: false,
      animationTime: 0.3,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 4,
      minZoomImageRatio: 0.8,
      visibilityRatio: 0.5,
      springStiffness: 10,
      gestureSettingsMouse: {
        scrollToZoom: true,
        clickToZoom: true,
        dblClickToZoom: true,
        pinchToZoom: true,
        flickEnabled: true,
        flickMinSpeed: 120,
        flickMomentum: 0.25
      },
      gestureSettingsTouch: {
        pinchToZoom: true,
        flickEnabled: true,
        flickMinSpeed: 120,
        flickMomentum: 0.25
      }
    });

    viewer.addHandler('open', () => {
      setIsLoading(false);
    });

    viewer.addHandler('open-failed', () => {
      setIsLoading(false);
      console.error('Failed to load DZI');
    });

    viewer.addHandler('zoom', (event) => {
      const zoom = event.zoom;
      const minZoom = viewer.viewport.getMinZoom();
      const maxZoom = viewer.viewport.getMaxZoom();
      const normalizedZoom = (zoom - minZoom) / (maxZoom - minZoom);
      setZoomLevel(Math.round(normalizedZoom * 100));
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
    };
  }, [dziUrl]);

  const handleZoomIn = () => {
    if (viewerRef.current) {
      const currentZoom = viewerRef.current.viewport.getZoom();
      viewerRef.current.viewport.zoomTo(currentZoom * 1.5);
    }
  };

  const handleZoomOut = () => {
    if (viewerRef.current) {
      const currentZoom = viewerRef.current.viewport.getZoom();
      viewerRef.current.viewport.zoomTo(currentZoom / 1.5);
    }
  };

  const handleResetView = () => {
    if (viewerRef.current) {
      viewerRef.current.viewport.goHome();
    }
  };

  const handleFullscreen = () => {
    if (viewerRef.current) {
      viewerRef.current.setFullScreen(!viewerRef.current.isFullPage());
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'mosaic.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerateClick = () => {
    if (settingsChanged) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmRegenerate = () => {
    setShowConfirmDialog(false);
    if (onRegenerateWithSettings) {
      onRegenerateWithSettings({
        allowDuplicates: pendingFourXDetail ? true : pendingDuplicates, // 4x detail forces duplicates
        allowTinting: pendingTinting,
        fourXDetail: pendingFourXDetail
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-hidden">
      {/* Loading/Regenerating overlay */}
      {(isLoading || isRegenerating) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-30">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            <p className="text-gray-400">
              {isRegenerating ? 'Regenerating mosaic...' : 'Loading mosaic...'}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-40">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Regenerate Mosaic?</h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to generate a new mosaic? Your current mosaic will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                Yes, Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OpenSeadragon container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white transition-colors"
          title="Reset view"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={handleFullscreen}
          className="p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <div className="w-full h-px bg-gray-600 my-1" />
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg text-white transition-colors ${
            showSettings ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800/90 hover:bg-gray-700'
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-4 left-16 bg-gray-800/95 rounded-lg p-4 z-20 min-w-[250px] shadow-xl">
          <h3 className="text-sm font-semibold text-white mb-3">Mosaic Settings</h3>

          <div className="space-y-3">
            <label className={`flex items-center justify-between cursor-pointer ${pendingFourXDetail ? 'opacity-50' : ''}`}>
              <span className="text-sm text-gray-300">Allow Duplicate Tiles</span>
              <input
                type="checkbox"
                checked={pendingFourXDetail ? true : pendingDuplicates}
                onChange={(e) => setPendingDuplicates(e.target.checked)}
                disabled={pendingFourXDetail}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">Color Tinting</span>
              <input
                type="checkbox"
                checked={pendingTinting}
                onChange={(e) => setPendingTinting(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm text-purple-300">4x Detail Mode</span>
                <p className="text-xs text-purple-400">Each tile becomes 4 sub-tiles</p>
              </div>
              <input
                type="checkbox"
                checked={pendingFourXDetail}
                onChange={(e) => {
                  setPendingFourXDetail(e.target.checked);
                  if (e.target.checked) setPendingDuplicates(true);
                }}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
              />
            </label>

            {settingsChanged && (
              <button
                onClick={handleRegenerateClick}
                disabled={isRegenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors mt-2"
              >
                <RefreshCw className="w-4 h-4" />
                Apply & Regenerate
              </button>
            )}
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 bg-gray-800/90 rounded-lg px-3 py-1 text-sm text-gray-300 z-20">
        Zoom: {zoomLevel}%
      </div>

      {/* Download button */}
      <div className="absolute bottom-4 left-4 z-20">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Mosaic
        </button>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
        {onChangeTarget && tileCount > 0 && (
          <button
            onClick={onChangeTarget}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            title="Keep your uploaded tiles and change just the target image"
          >
            <ImagePlus className="w-4 h-4" />
            Change Target
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
          >
            Start New Mosaic
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800/80 rounded-lg px-3 py-1 text-xs text-gray-400 z-20">
        Scroll to zoom • Drag to pan • Double-click to zoom in
      </div>
    </div>
  );
}
