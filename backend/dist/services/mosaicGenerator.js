"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMosaic = generateMosaic;
const sharp_1 = __importDefault(require("sharp"));
const imageProcessor_js_1 = require("./imageProcessor.js");
const colorUtils_js_1 = require("../utils/colorUtils.js");
// Configure Sharp for minimal memory usage on free tier
sharp_1.default.cache(false); // Disable cache entirely
sharp_1.default.concurrency(1); // Process one image at a time to reduce peak memory
// Maximum output dimensions to prevent memory issues (reduced for free tier)
const MAX_OUTPUT_DIMENSION = 1200; // Further reduced for 512MB limit
// Generate the mosaic
async function generateMosaic(session, options) {
    if (!session.targetImage) {
        throw new Error('No target image uploaded');
    }
    if (session.tileImages.size === 0) {
        throw new Error('No tile images uploaded');
    }
    const targetMetadata = await (0, sharp_1.default)(session.targetImage).metadata();
    let targetWidth = targetMetadata.width || 0;
    let targetHeight = targetMetadata.height || 0;
    const aspectRatio = targetWidth / targetHeight;
    // Limit output dimensions to prevent memory issues
    if (targetWidth > MAX_OUTPUT_DIMENSION || targetHeight > MAX_OUTPUT_DIMENSION) {
        if (targetWidth > targetHeight) {
            targetWidth = MAX_OUTPUT_DIMENSION;
            targetHeight = Math.round(MAX_OUTPUT_DIMENSION / aspectRatio);
        }
        else {
            targetHeight = MAX_OUTPUT_DIMENSION;
            targetWidth = Math.round(MAX_OUTPUT_DIMENSION * aspectRatio);
        }
        console.log(`Limiting output to ${targetWidth}x${targetHeight} to save memory`);
    }
    const tiles = Array.from(session.tileImages.values());
    const tileCount = tiles.length;
    // Calculate grid dimensions based on resolution and available tiles
    let grid;
    if (options.useAllTiles && options.resolution === 'high') {
        // Use ALL available tiles for maximum quality
        grid = calculateGridFromTileCount(tileCount, aspectRatio);
        console.log(`Using ALL ${tileCount} tiles for maximum quality: ${grid.cols}x${grid.rows} grid`);
    }
    else if (options.exactTileCount) {
        // Use exact tile count specified (for auto mode)
        grid = calculateGridFromTileCount(options.exactTileCount, aspectRatio);
        console.log(`Using exact tile count ${options.exactTileCount}: ${grid.cols}x${grid.rows} grid`);
    }
    else {
        // Use resolution-based calculation
        grid = calculateGridFromResolution(session.targetWidth || targetWidth, session.targetHeight || targetHeight, options.resolution, aspectRatio);
        console.log(`Generating ${options.resolution} mosaic: ${grid.cols}x${grid.rows} grid (${grid.cols * grid.rows} tiles)`);
    }
    // Auto-apply 4x detail for low quality to improve appearance
    // Low quality always gets 2x2 subdivision for better results
    if (options.resolution === 'low') {
        grid.cols *= 2;
        grid.rows *= 2;
        console.log(`Low quality auto-4x: expanded to ${grid.cols}x${grid.rows} grid (${grid.cols * grid.rows} tiles)`);
    }
    // Apply 9x detail mode - triple the grid dimensions
    // Each original tile position becomes a 3x3 grid of 9 sub-tiles
    if (options.nineXDetail) {
        grid.cols *= 3;
        grid.rows *= 3;
        console.log(`9x Detail mode: expanded to ${grid.cols}x${grid.rows} grid (${grid.cols * grid.rows} tiles)`);
    }
    const totalCellCount = grid.cols * grid.rows;
    // Validate tile count (detail modes always use duplicates)
    const usesDetailMode = options.resolution === 'low' || options.nineXDetail;
    if (!options.allowDuplicates && !usesDetailMode && tileCount < totalCellCount) {
        throw new Error(`Not enough unique tiles. Need ${totalCellCount} tiles but only have ${tileCount}. ` +
            `Enable duplicates or upload more tile images.`);
    }
    // Calculate cell dimensions based on actual image size
    const cellWidth = targetWidth / grid.cols;
    const cellHeight = targetHeight / grid.rows;
    // Analyze target image cells
    const cells = await analyzeTargetCells(session.targetImage, grid.cols, grid.rows, cellWidth, cellHeight);
    // Match tiles to cells
    const assignments = await matchTilesToCells(cells, tiles, options.allowDuplicates);
    // Generate final mosaic
    const mosaic = await compositeMosaic(assignments, targetWidth, targetHeight, cellWidth, cellHeight, options.allowTinting);
    return mosaic;
}
// Calculate grid from a specific tile count
function calculateGridFromTileCount(tileCount, aspectRatio) {
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
function calculateGridFromResolution(desiredWidth, desiredHeight, resolution, aspectRatio) {
    const totalPixels = desiredWidth * desiredHeight;
    let tileCount;
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
// OPTIMIZED: Analyze all cells from a single downscaled image
async function analyzeTargetCells(targetImage, cols, rows, cellWidth, cellHeight) {
    const cells = [];
    const totalCells = cols * rows;
    console.log(`Analyzing ${totalCells} cells (optimized single-pass)...`);
    const sampleWidth = cols * 10;
    const sampleHeight = rows * 10;
    const { data, info } = await (0, sharp_1.default)(targetImage)
        .resize(sampleWidth, sampleHeight, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let totalR = 0, totalG = 0, totalB = 0;
            let pixelCount = 0;
            for (let py = 0; py < 10; py++) {
                for (let px = 0; px < 10; px++) {
                    const imgX = col * 10 + px;
                    const imgY = row * 10 + py;
                    const idx = (imgY * sampleWidth + imgX) * channels;
                    totalR += data[idx];
                    totalG += data[idx + 1];
                    totalB += data[idx + 2];
                    pixelCount++;
                }
            }
            const averageColor = (0, colorUtils_js_1.rgbToLab)(totalR / pixelCount, totalG / pixelCount, totalB / pixelCount);
            cells.push({
                x: col * cellWidth,
                y: row * cellHeight,
                width: cellWidth,
                height: cellHeight,
                averageColor
            });
        }
        if ((row + 1) % 20 === 0) {
            console.log(`Analyzed ${(row + 1) * cols}/${totalCells} cells`);
        }
    }
    console.log(`Cell analysis complete: ${cells.length} cells`);
    return cells;
}
async function matchTilesToCells(cells, tiles, allowDuplicates) {
    const assignments = [];
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
    const tileUsageCount = new Map();
    const maxUsagePerTile = allowDuplicates
        ? Math.ceil(cells.length / tiles.length) + 1
        : 1;
    for (const cell of sortedCells) {
        let bestTile = null;
        let bestDelta = Infinity;
        for (const tile of availableTiles) {
            const currentUsage = tileUsageCount.get(tile.id) || 0;
            if (currentUsage >= maxUsagePerTile)
                continue;
            const delta = (0, colorUtils_js_1.deltaE2000)(cell.averageColor, tile.averageColor);
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
                    const delta = (0, colorUtils_js_1.deltaE2000)(cell.averageColor, tile.averageColor);
                    if (delta < bestDelta) {
                        bestDelta = delta;
                        bestTile = tile;
                    }
                }
            }
            else {
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
            availableTiles = availableTiles.filter(t => t.id !== bestTile.id);
        }
        else if (newUsage >= maxUsagePerTile) {
            // Remove tile if it has reached max usage
            availableTiles = availableTiles.filter(t => t.id !== bestTile.id);
        }
    }
    return assignments;
}
async function compositeMosaic(assignments, width, height, cellWidth, cellHeight, allowTinting) {
    console.log(`Compositing ${assignments.length} tiles into ${width}x${height} mosaic`);
    // Process in small batches to avoid memory spikes
    // Composite 20 tiles at a time onto the canvas
    const BATCH_SIZE = 20;
    // Start with a blank canvas
    let currentCanvas = await (0, sharp_1.default)({
        create: {
            width: Math.floor(width),
            height: Math.floor(height),
            channels: 3,
            background: { r: 0, g: 0, b: 0 }
        }
    }).jpeg({ quality: 80 }).toBuffer();
    for (let batchStart = 0; batchStart < assignments.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, assignments.length);
        const batchInputs = [];
        // Prepare batch of tiles
        for (let i = batchStart; i < batchEnd; i++) {
            const assignment = assignments[i];
            let tileBuffer = await (0, imageProcessor_js_1.resizeTile)(assignment.tile.buffer, cellWidth, cellHeight);
            // Apply tinting if enabled
            if (allowTinting) {
                tileBuffer = await (0, imageProcessor_js_1.applyTint)(tileBuffer, assignment.cell.averageColor, assignment.tile.averageColor, 0.45);
            }
            batchInputs.push({
                input: tileBuffer,
                left: Math.floor(assignment.cell.x),
                top: Math.floor(assignment.cell.y)
            });
        }
        // Composite this batch onto the canvas
        currentCanvas = await (0, sharp_1.default)(currentCanvas)
            .composite(batchInputs)
            .jpeg({ quality: 80 })
            .toBuffer();
        console.log(`Composited ${batchEnd}/${assignments.length} tiles`);
    }
    console.log(`Mosaic generated: ${currentCanvas.length} bytes`);
    return currentCanvas;
}
//# sourceMappingURL=mosaicGenerator.js.map