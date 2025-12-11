import sharp from 'sharp';
import type { DziMetadata, SessionData } from '../types/index.js';

const TILE_SIZE = 256;
const TILE_OVERLAP = 1;

// Generate DZI pyramid tiles in memory
export async function generateDziPyramid(
  session: SessionData,
  mosaicBuffer: Buffer
): Promise<void> {
  console.log('Generating DZI pyramid...');

  const metadata = await sharp(mosaicBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Calculate max level (log2 of max dimension)
  const maxDimension = Math.max(width, height);
  const maxLevel = Math.ceil(Math.log2(maxDimension));

  // Store metadata
  session.dziMetadata = {
    width,
    height,
    tileSize: TILE_SIZE,
    overlap: TILE_OVERLAP,
    format: 'jpeg',
    maxLevel
  };

  // Clear existing tiles
  session.dziTiles.clear();

  // Generate tiles for each level
  for (let level = maxLevel; level >= 0; level--) {
    await generateLevelTiles(session, mosaicBuffer, level, width, height, maxLevel);
  }

  console.log(`DZI pyramid generated: ${session.dziTiles.size} tiles`);
}

async function generateLevelTiles(
  session: SessionData,
  mosaicBuffer: Buffer,
  level: number,
  originalWidth: number,
  originalHeight: number,
  maxLevel: number
): Promise<void> {
  // Calculate dimensions at this level
  const scale = Math.pow(2, maxLevel - level);
  const levelWidth = Math.ceil(originalWidth / scale);
  const levelHeight = Math.ceil(originalHeight / scale);

  // Skip if too small
  if (levelWidth < 1 || levelHeight < 1) return;

  // Resize image to this level's dimensions
  const levelImage = await sharp(mosaicBuffer)
    .resize(levelWidth, levelHeight, { fit: 'fill' })
    .toBuffer();

  // Calculate number of tiles
  const tilesX = Math.ceil(levelWidth / TILE_SIZE);
  const tilesY = Math.ceil(levelHeight / TILE_SIZE);

  console.log(`Level ${level}: ${levelWidth}x${levelHeight}, ${tilesX}x${tilesY} tiles`);

  // Generate tiles
  const tilePromises: Promise<void>[] = [];

  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      tilePromises.push(
        generateTile(session, levelImage, level, x, y, levelWidth, levelHeight)
      );
    }
  }

  await Promise.all(tilePromises);
}

async function generateTile(
  session: SessionData,
  levelImage: Buffer,
  level: number,
  tileX: number,
  tileY: number,
  levelWidth: number,
  levelHeight: number
): Promise<void> {
  // Calculate tile boundaries with overlap
  const left = Math.max(0, tileX * TILE_SIZE - TILE_OVERLAP);
  const top = Math.max(0, tileY * TILE_SIZE - TILE_OVERLAP);

  // Calculate right and bottom with overlap
  let right = Math.min(levelWidth, (tileX + 1) * TILE_SIZE + TILE_OVERLAP);
  let bottom = Math.min(levelHeight, (tileY + 1) * TILE_SIZE + TILE_OVERLAP);

  // Adjust for first tile (no left/top overlap)
  const extractLeft = tileX === 0 ? 0 : left;
  const extractTop = tileY === 0 ? 0 : top;

  const tileWidth = right - extractLeft;
  const tileHeight = bottom - extractTop;

  if (tileWidth <= 0 || tileHeight <= 0) return;

  try {
    const tileBuffer = await sharp(levelImage)
      .extract({
        left: extractLeft,
        top: extractTop,
        width: tileWidth,
        height: tileHeight
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    const tileKey = `${level}/${tileX}_${tileY}`;
    session.dziTiles.set(tileKey, tileBuffer);
  } catch (error) {
    console.error(`Failed to generate tile ${level}/${tileX}_${tileY}:`, error);
  }
}

// Get tile from session
export function getDziTile(
  session: SessionData,
  level: number,
  x: number,
  y: number
): Buffer | undefined {
  const tileKey = `${level}/${x}_${y}`;
  return session.dziTiles.get(tileKey);
}

// Generate DZI XML descriptor
export function generateDziDescriptor(metadata: DziMetadata): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
  Format="${metadata.format}"
  Overlap="${metadata.overlap}"
  TileSize="${metadata.tileSize}">
  <Size Width="${metadata.width}" Height="${metadata.height}"/>
</Image>`;
}
