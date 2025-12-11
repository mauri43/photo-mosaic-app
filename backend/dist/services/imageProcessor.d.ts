import sharp from 'sharp';
import type { LabColor, TileImage, ResolutionRequirements } from '../types/index.js';
export declare function calculateAverageColor(imageBuffer: Buffer): Promise<LabColor>;
export declare function processTileImage(imageBuffer: Buffer): Promise<TileImage>;
export declare function calculateResolutionRequirements(width: number, height: number): ResolutionRequirements;
export declare function getImageDimensions(imageBuffer: Buffer): Promise<{
    width: number;
    height: number;
}>;
export declare function calculateRegionAverageColor(imageBuffer: Buffer, x: number, y: number, width: number, height: number): Promise<LabColor>;
export declare function resizeTile(tileBuffer: Buffer, targetWidth: number, targetHeight: number): Promise<Buffer>;
export declare function applyTint(imageBuffer: Buffer, targetColor: LabColor, currentColor: LabColor, intensity?: number): Promise<Buffer>;
export declare function createCanvas(width: number, height: number): Promise<sharp.Sharp>;
//# sourceMappingURL=imageProcessor.d.ts.map