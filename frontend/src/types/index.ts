export interface ResolutionRequirements {
  low: number;
  medium: number;
  high: number;
  gridLow: { cols: number; rows: number };
  gridMedium: { cols: number; rows: number };
  gridHigh: { cols: number; rows: number };
}

export interface DziMetadata {
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  format: string;
  maxLevel: number;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  complexity: number;
  colorVariance: number;
  edgeDensity: number;
  recommendedTiles: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface SessionStatus {
  hasTargetImage: boolean;
  targetWidth: number;
  targetHeight: number;
  tileCount: number;
  allowDuplicates: boolean;
  allowTinting: boolean;
  hasMosaic: boolean;
  dziMetadata: DziMetadata | null;
}

export type Resolution = 'low' | 'medium' | 'high';

export interface AppState {
  sessionId: string | null;
  step: number;
  targetImagePreview: string | null;
  targetImageDimensions: { width: number; height: number } | null;
  imageAnalysis: ImageAnalysis | null;
  isUploadingTarget: boolean;
  manualMode: boolean;
  desiredWidth: number;
  desiredHeight: number;
  requirements: ResolutionRequirements | null;
  tileCount: number;
  tilePreviews: string[];
  allowDuplicates: boolean;
  allowTinting: boolean;
  fourXDetail: boolean; // Each tile becomes 4 sub-tiles for higher detail
  selectedResolution: Resolution;
  useAllTiles: boolean;
  isGenerating: boolean;
  hasMosaic: boolean;
  dziMetadata: DziMetadata | null;
  error: string | null;
}
