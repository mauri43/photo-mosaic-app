"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAverageColor = calculateAverageColor;
exports.processTileImage = processTileImage;
exports.calculateResolutionRequirements = calculateResolutionRequirements;
exports.getImageDimensions = getImageDimensions;
exports.calculateRegionAverageColor = calculateRegionAverageColor;
exports.resizeTile = resizeTile;
exports.applyTint = applyTint;
exports.createCanvas = createCanvas;
const sharp_1 = __importDefault(require("sharp"));
const colorUtils_js_1 = require("../utils/colorUtils.js");
const uuid_1 = require("uuid");
// Configure Sharp for minimal memory usage
sharp_1.default.cache(false);
sharp_1.default.concurrency(1);
// Normalize image buffer - convert HEIC/HEIF and rotate based on EXIF
async function normalizeImage(imageBuffer) {
    try {
        // Sharp automatically handles HEIC/HEIF if libheif is available
        // It also auto-rotates based on EXIF orientation
        return await (0, sharp_1.default)(imageBuffer)
            .rotate() // Auto-rotate based on EXIF
            .toBuffer();
    }
    catch (error) {
        console.error('Error normalizing image:', error);
        // Return original buffer if normalization fails
        return imageBuffer;
    }
}
// Calculate average LAB color from image buffer
async function calculateAverageColor(imageBuffer) {
    const { data, info } = await (0, sharp_1.default)(imageBuffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(50, 50, { fit: 'fill' })
        .removeAlpha() // Ensure RGB only
        .raw()
        .toBuffer({ resolveWithObject: true });
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = info.width * info.height;
    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
    }
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    return (0, colorUtils_js_1.rgbToLab)(avgR, avgG, avgB);
}
// Process uploaded tile image - aggressively optimized for low memory usage
async function processTileImage(imageBuffer) {
    try {
        // Calculate average color from original (small sample)
        const averageColor = await calculateAverageColor(imageBuffer);
        // Store as tiny thumbnail - 100x100 at quality 60
        // This keeps each tile under 3KB typically
        const processedBuffer = await (0, sharp_1.default)(imageBuffer)
            .rotate() // Auto-rotate based on EXIF
            .resize(64, 64, { fit: 'cover' })
            .jpeg({ quality: 50 })
            .toBuffer();
        return {
            id: (0, uuid_1.v4)(),
            buffer: processedBuffer,
            averageColor,
            width: 64,
            height: 64
        };
    }
    catch (error) {
        console.error('Error processing tile image:', error);
        throw new Error('Failed to process image. The format may not be supported.');
    }
}
// Calculate resolution requirements
function calculateResolutionRequirements(width, height) {
    const totalPixels = width * height;
    // Calculate tile counts based on formulas
    const lowTiles = Math.ceil(totalPixels / 2500);
    const mediumTiles = Math.ceil(totalPixels / 1200);
    const highTiles = Math.ceil(totalPixels / 400);
    // Calculate grid dimensions (approximately square aspect ratio for tiles)
    const aspectRatio = width / height;
    const calcGrid = (tileCount) => {
        const cols = Math.ceil(Math.sqrt(tileCount * aspectRatio));
        const rows = Math.ceil(tileCount / cols);
        return { cols, rows };
    };
    return {
        low: lowTiles,
        medium: mediumTiles,
        high: highTiles,
        gridLow: calcGrid(lowTiles),
        gridMedium: calcGrid(mediumTiles),
        gridHigh: calcGrid(highTiles)
    };
}
// Get image dimensions (after rotation correction)
async function getImageDimensions(imageBuffer) {
    try {
        // Get dimensions after auto-rotation
        const { width, height } = await (0, sharp_1.default)(imageBuffer)
            .rotate() // Auto-rotate based on EXIF
            .metadata();
        return {
            width: width || 0,
            height: height || 0
        };
    }
    catch (error) {
        console.error('Error getting image dimensions:', error);
        // Fallback to raw metadata
        const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0
        };
    }
}
// Calculate average color for a region of an image
async function calculateRegionAverageColor(imageBuffer, x, y, width, height) {
    const { data, info } = await (0, sharp_1.default)(imageBuffer)
        .extract({ left: Math.floor(x), top: Math.floor(y), width: Math.floor(width), height: Math.floor(height) })
        .resize(10, 10, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = info.width * info.height;
    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
    }
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    return (0, colorUtils_js_1.rgbToLab)(avgR, avgG, avgB);
}
// Resize tile to target dimensions
async function resizeTile(tileBuffer, targetWidth, targetHeight) {
    return (0, sharp_1.default)(tileBuffer)
        .resize(Math.floor(targetWidth), Math.floor(targetHeight), { fit: 'cover' })
        .toBuffer();
}
// Apply tint to an image (subtle LAB color shift)
async function applyTint(imageBuffer, targetColor, currentColor, intensity = 0.20 // 20% tint by default
) {
    // Calculate the color shift needed
    const deltaL = (targetColor.L - currentColor.L) * intensity;
    const deltaA = (targetColor.a - currentColor.a) * intensity;
    const deltaB = (targetColor.b - currentColor.b) * intensity;
    // Convert LAB delta to approximate RGB adjustments
    // This is a simplification - for perfect results we'd process pixel by pixel
    // but for subtle tints, adjusting brightness and applying a color overlay works well
    const brightnessAdjust = deltaL / 100; // -1 to 1 range
    // Create a tint overlay based on the LAB delta
    const { labToRgb } = await import('../utils/colorUtils.js');
    const tintRgb = labToRgb(50 + deltaL * 2, deltaA * 2, deltaB * 2);
    // Apply the tint using Sharp's modulate and tint capabilities
    let pipeline = (0, sharp_1.default)(imageBuffer);
    // Adjust brightness
    if (Math.abs(brightnessAdjust) > 0.01) {
        pipeline = pipeline.modulate({
            brightness: 1 + brightnessAdjust * 0.5
        });
    }
    // Apply subtle color tint using linear transformation
    if (Math.abs(deltaA) > 1 || Math.abs(deltaB) > 1) {
        pipeline = pipeline.tint({
            r: tintRgb.r,
            g: tintRgb.g,
            b: tintRgb.b
        });
    }
    return pipeline.toBuffer();
}
// Create a blank canvas
async function createCanvas(width, height) {
    return (0, sharp_1.default)({
        create: {
            width: Math.floor(width),
            height: Math.floor(height),
            channels: 3,
            background: { r: 0, g: 0, b: 0 }
        }
    });
}
//# sourceMappingURL=imageProcessor.js.map