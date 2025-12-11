import { useState, useEffect, useCallback } from 'react';
import type { AppState, Resolution, ColorMode } from '../types';
import * as api from '../services/api';

const initialState: AppState = {
  sessionId: null,
  step: 1,
  targetImagePreview: null,
  targetImageDimensions: null,
  imageAnalysis: null,
  isUploadingTarget: false,
  manualMode: false,
  desiredWidth: 3000,
  desiredHeight: 2000,
  requirements: null,
  tileCount: 0,
  tilePreviews: [],
  allowDuplicates: true,
  allowTinting: true,
  tintPercentage: 50,
  tileSize: 12,
  maxRepeatsPerTile: 5,
  colorMode: 'blend',
  nineXDetail: false,
  selectedResolution: 'low',
  useAllTiles: false,
  isGenerating: false,
  hasMosaic: false,
  dziMetadata: null,
  error: null
};

export function useSession() {
  const [state, setState] = useState<AppState>(initialState);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const sessionId = await api.createSession();
        setState(prev => ({ ...prev, sessionId }));
      } catch (error) {
        setState(prev => ({ ...prev, error: 'Failed to create session' }));
      }
    };

    initSession();

    // Cleanup on unmount or page unload
    return () => {
      if (state.sessionId) {
        api.deleteSession(state.sessionId).catch(console.error);
      }
    };
  }, []);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.sessionId) {
        // Use sendBeacon for reliable cleanup
        navigator.sendBeacon(`/api/session/${state.sessionId}`, '');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.sessionId]);

  const uploadTarget = useCallback(async (file: File) => {
    if (!state.sessionId) return;

    console.log('Starting target upload:', file.name, file.type, file.size);
    setState(prev => ({ ...prev, error: null, isUploadingTarget: true }));

    try {
      // Create preview - for HEIC we might not be able to preview directly
      let preview: string;
      try {
        preview = URL.createObjectURL(file);
      } catch {
        preview = ''; // Will show loading state
      }

      const { width, height, analysis } = await api.uploadTargetImage(state.sessionId, file);
      console.log('Target upload successful:', width, height);

      setState(prev => ({
        ...prev,
        targetImagePreview: preview,
        targetImageDimensions: { width, height },
        imageAnalysis: analysis,
        desiredWidth: width,
        desiredHeight: height,
        step: 2,
        isUploadingTarget: false
      }));
    } catch (error) {
      console.error('Target upload failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to upload target image. Please try a different image format.',
        isUploadingTarget: false
      }));
    }
  }, [state.sessionId]);

  const setManualMode = useCallback((manual: boolean) => {
    setState(prev => ({ ...prev, manualMode: manual }));
  }, []);

  const setDimensions = useCallback(async (width: number, height: number) => {
    if (!state.sessionId) return;

    setState(prev => ({ ...prev, error: null }));

    try {
      const requirements = await api.setDimensions(state.sessionId, width, height);

      setState(prev => ({
        ...prev,
        desiredWidth: width,
        desiredHeight: height,
        requirements,
        step: Math.max(prev.step, 3)
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to set dimensions'
      }));
    }
  }, [state.sessionId]);

  const uploadTiles = useCallback(async (
    files: File[],
    onProgress?: (progress: number) => void
  ) => {
    if (!state.sessionId) return;

    setState(prev => ({ ...prev, error: null }));

    try {
      // Create previews (limit to first 50 for performance)
      const previews = files.slice(0, 50).map(f => URL.createObjectURL(f));

      const totalTiles = await api.uploadTileImages(
        state.sessionId,
        files,
        onProgress
      );

      if (totalTiles === 0) {
        setState(prev => ({
          ...prev,
          error: 'No images could be processed. Please try different images.'
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        tileCount: totalTiles,
        tilePreviews: [...prev.tilePreviews, ...previews].slice(0, 50),
        step: Math.max(prev.step, 3)
      }));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to upload tile images. Please try again with fewer images.';
      setState(prev => ({
        ...prev,
        error: message
      }));
    }
  }, [state.sessionId]);

  const clearTiles = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await api.clearTiles(state.sessionId);

      // Revoke preview URLs
      state.tilePreviews.forEach(URL.revokeObjectURL);

      setState(prev => ({
        ...prev,
        tileCount: 0,
        tilePreviews: []
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to clear tiles'
      }));
    }
  }, [state.sessionId, state.tilePreviews]);

  const updateSettings = useCallback(async (settings: {
    allowDuplicates?: boolean;
    allowTinting?: boolean;
    tintPercentage?: number;
    tileSize?: number;
    maxRepeatsPerTile?: number;
    colorMode?: ColorMode;
    nineXDetail?: boolean;
  }) => {
    if (!state.sessionId) return;

    try {
      // nineXDetail is frontend-only, don't send to backend
      const { nineXDetail, ...backendSettings } = settings;

      if (Object.keys(backendSettings).length > 0) {
        await api.updateSettings(state.sessionId, backendSettings);
      }

      setState(prev => ({
        ...prev,
        ...settings,
        // If enabling 4x detail, force duplicates on
        allowDuplicates: settings.nineXDetail ? true : (settings.allowDuplicates ?? prev.allowDuplicates)
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update settings'
      }));
    }
  }, [state.sessionId]);

  const setNineXDetail = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      nineXDetail: enabled,
      // 4x detail requires duplicates
      allowDuplicates: enabled ? true : prev.allowDuplicates
    }));
  }, []);

  const setResolution = useCallback((resolution: Resolution) => {
    setState(prev => ({ ...prev, selectedResolution: resolution }));
  }, []);

  const setUseAllTiles = useCallback((useAll: boolean) => {
    setState(prev => ({ ...prev, useAllTiles: useAll }));
  }, []);

  const setTintPercentage = useCallback((value: number) => {
    setState(prev => ({ ...prev, tintPercentage: value }));
  }, []);

  const setTileSize = useCallback((value: number) => {
    setState(prev => ({ ...prev, tileSize: value }));
  }, []);

  const setMaxRepeatsPerTile = useCallback((value: number) => {
    setState(prev => ({ ...prev, maxRepeatsPerTile: value }));
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setState(prev => ({ ...prev, colorMode: mode }));
  }, []);

  const generateMosaic = useCallback(async () => {
    if (!state.sessionId) return;

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Determine how to generate based on mode
      const options: {
        resolution: Resolution;
        useAllTiles?: boolean;
        exactTileCount?: number;
        nineXDetail?: boolean;
        tintPercentage?: number;
        tileSize?: number;
        maxRepeatsPerTile?: number;
        colorMode?: ColorMode;
      } = {
        resolution: state.selectedResolution,
        nineXDetail: state.nineXDetail,
        tintPercentage: state.tintPercentage,
        tileSize: state.tileSize,
        maxRepeatsPerTile: state.maxRepeatsPerTile,
        colorMode: state.colorMode
      };

      if (!state.manualMode) {
        // Auto mode: use recommended tile count from analysis
        if (state.imageAnalysis) {
          const recommended = state.imageAnalysis.recommendedTiles[state.selectedResolution];
          // If user has more tiles than recommended for high quality, use all of them
          if (state.selectedResolution === 'high' && state.tileCount > recommended) {
            options.useAllTiles = true;
          } else {
            options.exactTileCount = Math.min(recommended, state.tileCount);
          }
        }
      } else if (state.useAllTiles && state.selectedResolution === 'high') {
        // Manual mode with use all tiles enabled
        options.useAllTiles = true;
      }

      const dziMetadata = await api.generateMosaic(state.sessionId, options);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        hasMosaic: true,
        dziMetadata,
        step: 5
      }));
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to generate mosaic';

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: message
      }));
    }
  }, [state.sessionId, state.selectedResolution, state.manualMode, state.imageAnalysis, state.tileCount, state.useAllTiles, state.nineXDetail, state.tintPercentage, state.tileSize, state.maxRepeatsPerTile, state.colorMode]);

  const getDziUrl = useCallback(() => {
    if (!state.sessionId) return '';
    return api.getDziUrl(state.sessionId);
  }, [state.sessionId]);

  const getDownloadUrl = useCallback(() => {
    if (!state.sessionId) return '';
    return api.getDownloadUrl(state.sessionId);
  }, [state.sessionId]);

  const reset = useCallback(async () => {
    // Revoke preview URLs
    if (state.targetImagePreview) {
      URL.revokeObjectURL(state.targetImagePreview);
    }
    state.tilePreviews.forEach(URL.revokeObjectURL);

    // Delete current session and create new one
    if (state.sessionId) {
      await api.deleteSession(state.sessionId).catch(console.error);
    }

    const newSessionId = await api.createSession();

    setState({
      ...initialState,
      sessionId: newSessionId
    });
  }, [state.sessionId, state.targetImagePreview, state.tilePreviews]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Change target image while keeping tiles - allows reusing uploaded tiles
  const changeTarget = useCallback(() => {
    // Revoke target preview URL
    if (state.targetImagePreview) {
      URL.revokeObjectURL(state.targetImagePreview);
    }

    // Keep session, tiles, and settings - just clear target and mosaic
    setState(prev => ({
      ...prev,
      step: prev.tileCount > 0 ? 2 : 1,
      targetImagePreview: null,
      targetImageDimensions: null,
      imageAnalysis: null,
      requirements: null,
      hasMosaic: false,
      dziMetadata: null
    }));
  }, [state.targetImagePreview]);

  // Calculate effective tile count (actual tiles × max repeats when duplicates allowed)
  const effectiveTileCount = state.allowDuplicates
    ? state.tileCount * state.maxRepeatsPerTile
    : state.tileCount;

  return {
    state,
    effectiveTileCount,
    uploadTarget,
    setManualMode,
    setDimensions,
    uploadTiles,
    clearTiles,
    updateSettings,
    setResolution,
    setUseAllTiles,
    setNineXDetail,
    setTintPercentage,
    setTileSize,
    setMaxRepeatsPerTile,
    setColorMode,
    generateMosaic,
    getDziUrl,
    getDownloadUrl,
    reset,
    changeTarget,
    clearError
  };
}
