import sharp from 'sharp';
import type {
  SessionData,
  TileImage,
  LabColor,
  GridCell,
  MosaicGenerationOptions
} from '../types/index.js';
import {
  calculateRegionAverageColor,
  resizeTile,
  applyTint
} from './imageProcessor.js';
import { deltaE2000 } from '../utils/colorUtils.js';

interface TileAssignment {
  cell: GridCell;
  tile: TileImage;
  tintedBuffer?: Buffer;
}

// Generate the mosaic
export async function generateMosaic(
  session: SessionData,
  options: MosaicGenerationOptions
): Promise<Buffer> {
  if (!session.targetImage) {
    throw new Error('No target image uploaded');
  }

  if (session.tileImages.size === 0) {
    throw new Error('No tile images uploaded');
  }

  const targetMetadata = await sharp(session.targetImage).metadata();
  const targetWidth = targetMetadata.width || 0;
  const targetHeight = targetMetadata.height || 0;
  const aspectRatio = targetWidth / targetHeight;

  const tiles = Array.from(session.tileImages.values());
  const tileCount = tiles.length;

  // Calculate grid dimensions based on resolution and available tiles
  let grid: { cols: number; rows: number };

  if (options.useAllTiles && options.resolution === 'high') {
    // Use ALL available tiles for maximum quality
    grid = calculateGridFromTileCount(tileCount, aspectRatio);
    console.log(`Using ALL ${tileCount} tiles for maximum quality: ${grid.cols}x${grid.rows} grid`);
  } else if (options.exactTileCount) {
    // Use exact tile count specified (for auto mode)
    grid = calculateGridFromTileCount(options.exactTileCount, aspectRatio);
    console.log(`Using exact tile count ${options.exactTileCount}: ${grid.cols}x${grid.rows} grid`);
  } else {
    // Use resolution-based calculation
    grid = calculateGridFromResolution(
      session.targetWidth || targetWidth,
      session.targetHeight || targetHeight,
      options.resolution,
      aspectRatio
    );
    console.log(`Generating ${options.resolution} mosaic: ${grid.cols}x${grid.rows} grid (${grid.cols * grid.rows} tiles)`);
  }

  const totalCellCount = grid.cols * grid.rows;

  // Validate tile count
  if (!options.allowDuplicates && tileCount < totalCellCount) {
    throw new Error(
      `Not enough unique tiles. Need ${totalCellCount} tiles but only have ${tileCount}. ` +
      `Enable duplicates or upload more tile images.`
    );
  }

  // Calculate cell dimensions based on actual image size
  const cellWidth = targetWidth / grid.cols;
  const cellHeight = targetHeight / grid.rows;

  // Analyze target image cells
  const cells = await analyzeTargetCells(
    session.targetImage,
    grid.cols,
    grid.rows,
    cellWidth,
    cellHeight
  );

  // Match tiles to cells
  const assignments = await matchTilesToCells(
    cells,
    tiles,
    options.allowDuplicates
  );

  // Generate final mosaic
  const mosaic = await compositeMosaic(
    assignments,
    targetWidth,
    targetHeight,
    cellWidth,
    cellHeight,
    options.allowTinting
  );

  return mosaic;
}

// Calculate grid from a specific tile count
function calculateGridFromTileCount(
  tileCount: number,
  aspectRatio: number
): { cols: number; rows: number } {
  // Calculate grid that best matches the aspect ratio
  const cols = Math.round(Math.sqrt(tileCount * aspectRatio));
  const rows = Math.round(tileCount / cols);

  // Adjust to get closest to desired tile count
  let bestCols = cols;
  let bestRows = rows;
  let bestDiff = Math.abs(cols * rows - tileCount);

  // Try nearby values
  for (let c = Math.max(1, cols - 2); c <= cols + 2; c++) {
    for (let r = Math.max(1, rows - 2); r <= rows + 2; r++) {
      const diff = Math.abs(c * r - tileCount);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestCols = c;
        bestRows = r;
      }
    }
  }

  return { cols: bestCols, rows: bestRows };
}

// Calculate grid from resolution setting
function calculateGridFromResolution(
  desiredWidth: number,
  desiredHeight: number,
  resolution: 'low' | 'medium' | 'high',
  aspectRatio: number
): { cols: number; rows: number } {
  const totalPixels = desiredWidth * desiredHeight;

  let tileCount: number;
  switch (resolution) {
    case 'low':
      tileCount = Math.ceil(totalPixels / 2500);
      break;
    case 'medium':
      tileCount = Math.ceil(totalPixels / 1200);
      break;
    case 'high':
      tileCount = Math.ceil(totalPixels / 400);
      break;
  }

  return calculateGridFromTileCount(tileCount, aspectRatio);
}

async function analyzeTargetCells(
  targetImage: Buffer,
  cols: number,
  rows: number,
  cellWidth: number,
  cellHeight: number
): Promise<GridCell[]> {
  const cells: GridCell[] = [];

  // Process cells in batches for better performance
  const batchSize = 50;
  const totalCells = cols * rows;

  for (let i = 0; i < totalCells; i += batchSize) {
    const batchPromises: Promise<GridCell>[] = [];

    for (let j = i; j < Math.min(i + batchSize, totalCells); j++) {
      const col = j % cols;
      const row = Math.floor(j / cols);
      const x = col * cellWidth;
      const y = row * cellHeight;

      batchPromises.push(
        calculateRegionAverageColor(
          targetImage,
          x,
          y,
          Math.max(1, Math.floor(cellWidth)),
          Math.max(1, Math.floor(cellHeight))
        ).then(averageColor => ({
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          averageColor
        }))
      );
    }

    const batchResults = await Promise.all(batchPromises);
    cells.push(...batchResults);
  }

  return cells;
}

async function matchTilesToCells(
  cells: GridCell[],
  tiles: TileImage[],
  allowDuplicates: boolean
): Promise<TileAssignment[]> {
  const assignments: TileAssignment[] = [];

  if (tiles.length === 0) {
    throw new Error('No tiles available for matching');
  }

  // Create a pool of available tiles
  let availableTiles = [...tiles];

  // Sort cells by how "difficult" they are (extreme colors first)
  // This ensures unique colors get matched first when duplicates are off
  const sortedCells = [...cells].sort((a, b) => {
    const aExtreme = Math.abs(a.averageColor.L - 50) +
                     Math.abs(a.averageColor.a) +
                     Math.abs(a.averageColor.b);
    const bExtreme = Math.abs(b.averageColor.L - 50) +
                     Math.abs(b.averageColor.a) +
                     Math.abs(b.averageColor.b);
    return bExtreme - aExtreme;
  });

  // Track tile usage for duplicates mode
  const tileUsageCount = new Map<string, number>();
  const maxUsagePerTile = allowDuplicates
    ? Math.ceil(cells.length / tiles.length) + 1
    : 1;

  for (const cell of sortedCells) {
    let bestTile: TileImage | null = null;
    let bestDelta = Infinity;

    for (const tile of availableTiles) {
      const currentUsage = tileUsageCount.get(tile.id) || 0;
      if (currentUsage >= maxUsagePerTile) continue;

      const delta = deltaE2000(cell.averageColor, tile.averageColor);

      if (delta < bestDelta) {
        bestDelta = delta;
        bestTile = tile;
      }
    }

    if (!bestTile) {
      // Reset available tiles if we run out (with duplicates)
      if (allowDuplicates) {
        availableTiles = [...tiles];
        tileUsageCount.clear();
        bestTile = tiles[0];
        for (const tile of availableTiles) {
          const delta = deltaE2000(cell.averageColor, tile.averageColor);
          if (delta < bestDelta) {
            bestDelta = delta;
            bestTile = tile;
          }
        }
      } else {
        bestTile = tiles[0];
      }
    }

    assignments.push({
      cell,
      tile: bestTile
    });

    // Update usage tracking
    const newUsage = (tileUsageCount.get(bestTile.id) || 0) + 1;
    tileUsageCount.set(bestTile.id, newUsage);

    if (!allowDuplicates) {
      // Remove used tile from pool
      availableTiles = availableTiles.filter(t => t.id !== bestTile!.id);
    } else if (newUsage >= maxUsagePerTile) {
      // Remove tile if it has reached max usage
      availableTiles = availableTiles.filter(t => t.id !== bestTile!.id);
    }
  }

  return assignments;
}

async function compositeMosaic(
  assignments: TileAssignment[],
  width: number,
  height: number,
  cellWidth: number,
  cellHeight: number,
  allowTinting: boolean
): Promise<Buffer> {
  console.log(`Compositing ${assignments.length} tiles into ${width}x${height} mosaic`);

  // Process tiles in batches
  const batchSize = 100;
  const compositeInputs: sharp.OverlayOptions[] = [];

  for (let i = 0; i < assignments.length; i += batchSize) {
    const batch = assignments.slice(i, i + batchSize);

    const batchPromises = batch.map(async (assignment) => {
      let tileBuffer = await resizeTile(
        assignment.tile.buffer,
        cellWidth,
        cellHeight
      );

      // Apply tinting if enabled
      if (allowTinting) {
        tileBuffer = await applyTint(
          tileBuffer,
          assignment.cell.averageColor,
          assignment.tile.averageColor,
          0.20 // 20% tint intensity
        );
      }

      return {
        input: tileBuffer,
        left: Math.floor(assignment.cell.x),
        top: Math.floor(assignment.cell.y)
      };
    });

    const batchResults = await Promise.all(batchPromises);
    compositeInputs.push(...batchResults);

    console.log(`Processed ${Math.min(i + batchSize, assignments.length)}/${assignments.length} tiles`);
  }

  // Create the final composite
  const mosaic = await sharp({
    create: {
      width: Math.floor(width),
      height: Math.floor(height),
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .composite(compositeInputs)
    .jpeg({ quality: 95 })
    .toBuffer();

  console.log(`Mosaic generated: ${mosaic.length} bytes`);

  return mosaic;
}
