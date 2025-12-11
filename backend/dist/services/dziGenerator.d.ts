import type { DziMetadata, SessionData } from '../types/index.js';
export declare function generateDziPyramid(session: SessionData, mosaicBuffer: Buffer): Promise<void>;
export declare function getDziTile(session: SessionData, level: number, x: number, y: number): Buffer | undefined;
export declare function generateDziDescriptor(metadata: DziMetadata): string;
//# sourceMappingURL=dziGenerator.d.ts.map