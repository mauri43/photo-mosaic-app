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
  // Upload in batches - larger batches are faster but use more memory
  const BATCH_SIZE = 30;
  const MAX_RETRIES = 3;
  let totalUploaded = 0;
  let consecutiveFailures = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const formData = new FormData();
    batch.forEach(file => {
      formData.append('images', file);
    });

    let success = false;

    for (let retry = 0; retry <= MAX_RETRIES && !success; retry++) {
      try {
        const response = await axios.post(
          `${API_BASE}/session/${sessionId}/tiles`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000, // 2 minute timeout per batch (server processing takes time)
            onUploadProgress: (progressEvent) => {
              if (onProgress && progressEvent.total) {
                const batchProgress = progressEvent.loaded / progressEvent.total;
                const overallProgress = Math.round(((i + batchProgress * batch.length) / files.length) * 100);
                onProgress(overallProgress);
              }
            }
          }
        );

        totalUploaded = response.data.totalTiles;
        success = true;
        consecutiveFailures = 0; // Reset on success
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
        console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed (attempt ${retry + 1}/${MAX_RETRIES + 1}):`, error);

        // Check if session was lost (404 error)
        if (axiosError.response?.status === 404) {
          throw new Error('Session expired. Please refresh the page and try again.');
        }

        // Wait before retry with exponential backoff
        if (retry < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
        }
      }
    }

    if (!success) {
      consecutiveFailures++;
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed after ${MAX_RETRIES + 1} attempts`);

      // If we have 2 consecutive failures, stop and report what we have
      if (consecutiveFailures >= 2) {
        console.error('Too many consecutive failures, stopping upload');
        break;
      }
    }
  }

  // If nothing uploaded at all, throw error
  if (totalUploaded === 0) {
    throw new Error('Failed to upload images. The server may be restarting - please wait a moment and try again.');
  }

  return totalUploaded;
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
    fourXDetail?: boolean;
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
