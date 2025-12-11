import { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Loader2 } from 'lucide-react';

interface DeepZoomViewerProps {
  dziUrl: string;
  downloadUrl: string;
  onReset?: () => void;
}

export function DeepZoomViewer({ dziUrl, downloadUrl, onReset }: DeepZoomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(0);

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

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-hidden">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            <p className="text-gray-400">Loading mosaic...</p>
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
      </div>

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

      {/* New mosaic button */}
      {onReset && (
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
          >
            Start New Mosaic
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800/80 rounded-lg px-3 py-1 text-xs text-gray-400 z-20">
        Scroll to zoom • Drag to pan • Double-click to zoom in
      </div>
    </div>
  );
}
