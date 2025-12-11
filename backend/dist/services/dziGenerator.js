"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDziPyramid = generateDziPyramid;
exports.getDziTile = getDziTile;
exports.generateDziDescriptor = generateDziDescriptor;
const sharp_1 = __importDefault(require("sharp"));
// Configure Sharp for minimal memory
sharp_1.default.cache(false);
sharp_1.default.concurrency(1);
const TILE_SIZE = 256;
const TILE_OVERLAP = 1;
// OPTIMIZED: Only generate top few levels, rest on-demand
async function generateDziPyramid(session, mosaicBuffer) {
    console.log('Generating DZI pyramid...');
    const metadata = await (0, sharp_1.default)(mosaicBuffer).metadata();
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
    // OPTIMIZATION: Only pre-generate the top 3 zoom levels to save memory
    const minPregenLevel = Math.max(0, maxLevel - 2);
    for (let level = maxLevel; level >= minPregenLevel; level--) {
        await generateLevelTiles(session, mosaicBuffer, level, width, height, maxLevel);
    }
    console.log(`DZI pyramid generated: ${session.dziTiles.size} tiles (levels ${minPregenLevel}-${maxLevel})`);
}
async function generateLevelTiles(session, mosaicBuffer, level, originalWidth, originalHeight, maxLevel) {
    // Calculate dimensions at this level
    const scale = Math.pow(2, maxLevel - level);
    const levelWidth = Math.ceil(originalWidth / scale);
    const levelHeight = Math.ceil(originalHeight / scale);
    // Skip if too small
    if (levelWidth < 1 || levelHeight < 1)
        return;
    // Resize image to this level's dimensions
    const levelImage = await (0, sharp_1.default)(mosaicBuffer)
        .resize(levelWidth, levelHeight, { fit: 'fill' })
        .jpeg({ quality: 80 })
        .toBuffer();
    // Calculate number of tiles
    const tilesX = Math.ceil(levelWidth / TILE_SIZE);
    const tilesY = Math.ceil(levelHeight / TILE_SIZE);
    console.log(`Level ${level}: ${levelWidth}x${levelHeight}, ${tilesX}x${tilesY} tiles`);
    // Generate tiles SEQUENTIALLY to save memory
    for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
            await generateTile(session, levelImage, level, x, y, levelWidth, levelHeight);
        }
    }
}
async function generateTile(session, levelImage, level, tileX, tileY, levelWidth, levelHeight) {
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
    if (tileWidth <= 0 || tileHeight <= 0)
        return;
    try {
        const tileBuffer = await (0, sharp_1.default)(levelImage)
            .extract({
            left: extractLeft,
            top: extractTop,
            width: tileWidth,
            height: tileHeight
        })
            .jpeg({ quality: 75 }) // Reduced quality for memory savings
            .toBuffer();
        const tileKey = `${level}/${tileX}_${tileY}`;
        session.dziTiles.set(tileKey, tileBuffer);
    }
    catch (error) {
        console.error(`Failed to generate tile ${level}/${tileX}_${tileY}:`, error);
    }
}
// Get tile from session
function getDziTile(session, level, x, y) {
    const tileKey = `${level}/${x}_${y}`;
    return session.dziTiles.get(tileKey);
}
// Generate DZI XML descriptor
function generateDziDescriptor(metadata) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
  Format="${metadata.format}"
  Overlap="${metadata.overlap}"
  TileSize="${metadata.tileSize}">
  <Size Width="${metadata.width}" Height="${metadata.height}"/>
</Image>`;
}
//# sourceMappingURL=dziGenerator.js.map