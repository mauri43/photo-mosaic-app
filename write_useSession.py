content = """import { useState, useEffect, useCallback } from 'react';
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
    return () => {
      if (state.sessionId) {
        api.deleteSession(state.sessionId).catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.sessionId) {
        navigator.sendBeacon(`/api/session/${state.sessionId}`, '');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.sessionId]);

  const uploadTarget = useCallback(async (file: File) => {
    if (!state.sessionId) return;
    setState(prev => ({ ...prev, error: null, isUploadingTarget: true }));
    try {
      let preview: string;
      try { preview = URL.createObjectURL(file); } catch { preview = ''; }
      const { width, height, analysis } = await api.uploadTargetImage(state.sessionId, file);
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
      setState(prev => ({ ...prev, error: 'Failed to set dimensions' }));
    }
  }, [state.sessionId]);

  const uploadTiles = useCallback(async (files: File[], onProgress?: (progress: number) => void) => {
    if (!state.sessionId) return;
    setState(prev => ({ ...prev, error: null }));
    try {
      const previews = files.slice(0, 50).map(f => URL.createObjectURL(f));
      const totalTiles = await api.uploadTileImages(state.sessionId, files, onProgress);
      setState(prev => ({
        ...prev,
        tileCount: totalTiles,
        tilePreviews: [...prev.tilePreviews, ...previews].slice(0, 50),
        step: Math.max(prev.step, 3)
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to upload tile images' }));
    }
  }, [state.sessionId]);

  const clearTiles = useCallback(async () => {
    if (!state.sessionId) return;
    try {
      await api.clearTiles(state.sessionId);
      state.tilePreviews.forEach(URL.revokeObjectURL);
      setState(prev => ({ ...prev, tileCount: 0, tilePreviews: [] }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to clear tiles' }));
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
      const { nineXDetail, ...backendSettings } = settings;
      if (Object.keys(backendSettings).length > 0) {
        await api.updateSettings(state.sessionId, backendSettings);
      }
      setState(prev => ({
        ...prev,
        ...settings,
        allowDuplicates: settings.nineXDetail ? true : (settings.allowDuplicates ?? prev.allowDuplicates)
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to update settings' }));
    }
  }, [state.sessionId]);

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

  const setNineXDetail = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      nineXDetail: enabled,
      allowDuplicates: enabled ? true : prev.allowDuplicates
    }));
  }, []);

  const setResolution = useCallback((resolution: Resolution) => {
    setState(prev => ({ ...prev, selectedResolution: resolution }));
  }, []);

  const setUseAllTiles = useCallback((useAll: boolean) => {
    setState(prev => ({ ...prev, useAllTiles: useAll }));
  }, []);

  const generateMosaic = useCallback(async () => {
    if (!state.sessionId) return;
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
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
        if (state.imageAnalysis) {
          const recommended = state.imageAnalysis.recommendedTiles[state.selectedResolution];
          if (state.selectedResolution === 'high' && state.tileCount > recommended) {
            options.useAllTiles = true;
          } else {
            options.exactTileCount = Math.min(recommended, state.tileCount);
          }
        }
      } else if (state.useAllTiles && state.selectedResolution === 'high') {
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
        : (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to generate mosaic
