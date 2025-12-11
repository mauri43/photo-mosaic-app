import sharp from 'sharp';
import type { LabColor, TileImage, ResolutionRequirements } from '../types/index.js';
import { rgbToLab } from '../utils/colorUtils.js';
import { v4 as uuidv4 } from 'uuid';

// Normalize image buffer - convert HEIC/HEIF and rotate based on EXIF
async function normalizeImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Sharp automatically handles HEIC/HEIF if libheif is available
    // It also auto-rotates based on EXIF orientation
    return await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .toBuffer();
  } catch (error) {
    console.error('Error normalizing image:', error);
    // Return original buffer if normalization fails
    return imageBuffer;
  }
}

// Calculate average LAB color from image buffer
export async function calculateAverageColor(imageBuffer: Buffer): Promise<LabColor> {
  const { data, info } = await sharp(imageBuffer)
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

  return rgbToLab(avgR, avgG, avgB);
}

// Process uploaded tile image - optimized for low memory usage
export async function processTileImage(imageBuffer: Buffer): Promise<TileImage> {
  try {
    // Calculate average color from original (small sample)
    const averageColor = await calculateAverageColor(imageBuffer);

    // Store as small thumbnail to save memory - we'll resize when compositing
    // Max 200x200 with quality 70 drastically reduces memory
    const processedBuffer = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    return {
      id: uuidv4(),
      buffer: processedBuffer,
      averageColor,
      width: 200,
      height: 200
    };
  } catch (error) {
    console.error('Error processing tile image:', error);
    throw new Error('Failed to process image. The format may not be supported.');
  }
}

// Calculate resolution requirements
export function calculateResolutionRequirements(
  width: number,
  height: number
): ResolutionRequirements {
  const totalPixels = width * height;

  // Calculate tile counts based on formulas
  const lowTiles = Math.ceil(totalPixels / 2500);
  const mediumTiles = Math.ceil(totalPixels / 1200);
  const highTiles = Math.ceil(totalPixels / 400);

  // Calculate grid dimensions (approximately square aspect ratio for tiles)
  const aspectRatio = width / height;

  const calcGrid = (tileCount: number) => {
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
export async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    // Get dimensions after auto-rotation
    const { width, height } = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .metadata();

    return {
      width: width || 0,
      height: height || 0
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    // Fallback to raw metadata
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }
}

// Calculate average color for a region of an image
export async function calculateRegionAverageColor(
  imageBuffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<LabColor> {
  const { data, info } = await sharp(imageBuffer)
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

  return rgbToLab(avgR, avgG, avgB);
}

// Resize tile to target dimensions
export async function resizeTile(
  tileBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  return sharp(tileBuffer)
    .resize(Math.floor(targetWidth), Math.floor(targetHeight), { fit: 'cover' })
    .toBuffer();
}

// Apply tint to an image (subtle LAB color shift)
export async function applyTint(
  imageBuffer: Buffer,
  targetColor: LabColor,
  currentColor: LabColor,
  intensity: number = 0.20 // 20% tint by default
): Promise<Buffer> {
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
  const tintRgb = labToRgb(
    50 + deltaL * 2,
    deltaA * 2,
    deltaB * 2
  );

  // Apply the tint using Sharp's modulate and tint capabilities
  let pipeline = sharp(imageBuffer);

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
export async function createCanvas(width: number, height: number): Promise<sharp.Sharp> {
  return sharp({
    create: {
      width: Math.floor(width),
      height: Math.floor(height),
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  });
}
