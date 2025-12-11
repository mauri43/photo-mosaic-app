import axios from 'axios';
import type { ResolutionRequirements, SessionStatus, DziMetadata, Resolution, ImageAnalysis } from '../types';

// Use the production backend URL, or fall back to local proxy for development
const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://photo-mosaic-app.onrender.com/api';

export async function createSession(): Promise<string> {
  const response = await axios.post(`${API_BASE}/session`);
  return response.data.sessionId;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await axios.delete(`${API_BASE}/session/${sessionId}`);
}

export async function uploadTargetImage(
  sessionId: string,
  file: File
): Promise<{ width: number; height: number; analysis: ImageAnalysis }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post(
    `${API_BASE}/session/${sessionId}/target`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );

  return {
    width: response.data.width,
    height: response.data.height,
    analysis: response.data.analysis
  };
}

export async function setDimensions(
  sessionId: string,
  width: number,
  height: number
): Promise<ResolutionRequirements> {
  const response = await axios.post(
    `${API_BASE}/session/${sessionId}/dimensions`,
    { width, height }
  );

  return response.data.requirements;
}

export async function uploadTileImages(
  sessionId: string,
  files: File[],
  onProgress?: (progress: number) => void
): Promise<number> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const response = await axios.post(
    `${API_BASE}/session/${sessionId}/tiles`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    }
  );

  return response.data.totalTiles;
}

export async function clearTiles(sessionId: string): Promise<void> {
  await axios.delete(`${API_BASE}/session/${sessionId}/tiles`);
}

export async function updateSettings(
  sessionId: string,
  settings: { allowDuplicates?: boolean; allowTinting?: boolean }
): Promise<void> {
  await axios.put(`${API_BASE}/session/${sessionId}/settings`, settings);
}

export async function generateMosaic(
  sessionId: string,
  options: {
    resolution: Resolution;
    useAllTiles?: boolean;
    exactTileCount?: number;
  }
): Promise<DziMetadata> {
  const response = await axios.post(
    `${API_BASE}/session/${sessionId}/generate`,
    options
  );

  return response.data.dziMetadata;
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  const response = await axios.get(`${API_BASE}/session/${sessionId}/status`);
  return response.data;
}

export function getDziUrl(sessionId: string): string {
  return `${API_BASE}/session/${sessionId}/mosaic.dzi`;
}

export function getDownloadUrl(sessionId: string): string {
  return `${API_BASE}/session/${sessionId}/download`;
}
