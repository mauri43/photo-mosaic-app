export interface LabColor {
    L: number;
    a: number;
    b: number;
}
export interface TileImage {
    id: string;
    buffer: Buffer;
    averageColor: LabColor;
    width: number;
    height: number;
}
export interface SessionData {
    id: string;
    targetImage: Buffer | null;
    targetWidth: number;
    targetHeight: number;
    tileImages: Map<string, TileImage>;
    allowDuplicates: boolean;
    allowTinting: boolean;
    tintPercentage: number;
    maxRepeatsPerTile: number;
    colorMode: 'blend' | 'vibrant' | 'muted';
    mosaic: Buffer | null;
    dziTiles: Map<string, Buffer>;
    dziMetadata: DziMetadata | null;
    createdAt: number;
}
export interface DziMetadata {
    width: number;
    height: number;
    tileSize: number;
    overlap: number;
    format: string;
    maxLevel: number;
}
export interface ResolutionRequirements {
    low: number;
    medium: number;
    high: number;
    gridLow: {
        cols: number;
        rows: number;
    };
    gridMedium: {
        cols: number;
        rows: number;
    };
    gridHigh: {
        cols: number;
        rows: number;
    };
}
export interface MosaicGenerationOptions {
    resolution: 'low' | 'medium' | 'high';
    allowDuplicates: boolean;
    allowTinting: boolean;
    tintPercentage?: number;
    maxRepeatsPerTile?: number;
    colorMode?: 'blend' | 'vibrant' | 'muted';
    useAllTiles?: boolean;
    exactTileCount?: number;
    nineXDetail?: boolean;
    tileSize?: number;
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
export interface GridCell {
    x: number;
    y: number;
    width: number;
    height: number;
    averageColor: LabColor;
}
//# sourceMappingURL=index.d.ts.map