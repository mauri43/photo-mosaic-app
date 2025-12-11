"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImage = analyzeImage;
const sharp_1 = __importDefault(require("sharp"));
const colorUtils_js_1 = require("../utils/colorUtils.js");
// Analyze image complexity to recommend tile counts
async function analyzeImage(imageBuffer) {
    const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    // Downsample for analysis (faster processing)
    const analysisSize = 200;
    const { data, info } = await (0, sharp_1.default)(imageBuffer)
        .resize(analysisSize, analysisSize, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });
    const pixels = [];
    const channels = info.channels;
    // Convert all pixels to LAB
    for (let i = 0; i < data.length; i += channels) {
        const lab = (0, colorUtils_js_1.rgbToLab)(data[i], data[i + 1], data[i + 2]);
        pixels.push(lab);
    }
    // Calculate color variance (standard deviation in LAB space)
    const colorVariance = calculateColorVariance(pixels);
    // Calculate edge density using Sobel-like approximation
    const edgeDensity = calculateEdgeDensity(data, info.width, info.height, channels);
    // Calculate overall complexity score (0-100)
    const complexity = calculateComplexityScore(colorVariance, edgeDensity);
    // Calculate recommended tile counts based on complexity
    const recommendedTiles = calculateRecommendedTiles(complexity, width, height);
    return {
        width,
        height,
        complexity,
        colorVariance,
        edgeDensity,
        recommendedTiles
    };
}
function calculateColorVariance(pixels) {
    const n = pixels.length;
    if (n === 0)
        return 0;
    // Calculate mean
    let sumL = 0, sumA = 0, sumB = 0;
    for (const p of pixels) {
        sumL += p.L;
        sumA += p.a;
        sumB += p.b;
    }
    const meanL = sumL / n;
    const meanA = sumA / n;
    const meanB = sumB / n;
    // Calculate variance
    let varL = 0, varA = 0, varB = 0;
    for (const p of pixels) {
        varL += (p.L - meanL) ** 2;
        varA += (p.a - meanA) ** 2;
        varB += (p.b - meanB) ** 2;
    }
    // Combined variance (weighted towards luminance as it's most perceptually important)
    const totalVar = (varL * 0.5 + varA * 0.25 + varB * 0.25) / n;
    return Math.sqrt(totalVar);
}
function calculateEdgeDensity(data, width, height, channels) {
    let edgeSum = 0;
    let count = 0;
    // Simple gradient-based edge detection
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * channels;
            const idxLeft = idx - channels;
            const idxRight = idx + channels;
            const idxUp = idx - width * channels;
            const idxDown = idx + width * channels;
            // Calculate gradient magnitude for each channel
            for (let c = 0; c < 3; c++) {
                const gx = Math.abs(data[idxRight + c] - data[idxLeft + c]);
                const gy = Math.abs(data[idxDown + c] - data[idxUp + c]);
                edgeSum += Math.sqrt(gx * gx + gy * gy);
            }
            count++;
        }
    }
    // Normalize to 0-100 range
    const avgEdge = count > 0 ? edgeSum / (count * 3) : 0;
    return Math.min(100, avgEdge / 2.55); // Max gradient is 255, normalize
}
function calculateComplexityScore(colorVariance, edgeDensity) {
    // Combine color variance and edge density
    // Color variance typically ranges 0-50, edge density 0-100
    const normalizedColorVar = Math.min(100, colorVariance * 2);
    // Weighted combination
    const score = normalizedColorVar * 0.6 + edgeDensity * 0.4;
    return Math.round(Math.min(100, Math.max(0, score)));
}
function calculateRecommendedTiles(complexity, width, height) {
    // Base recommendations on image complexity
    // Higher complexity = more tiles needed to capture detail
    const aspectRatio = width / height;
    // Minimum tiles for each quality level
    const baseMinLow = 100;
    const baseMinMedium = 300;
    const baseMinHigh = 800;
    // Scale factors based on complexity (0-100)
    // Low complexity (< 30): fewer tiles needed
    // Medium complexity (30-60): moderate tiles
    // High complexity (> 60): many tiles needed
    let complexityMultiplier;
    if (complexity < 30) {
        complexityMultiplier = 0.7 + (complexity / 30) * 0.3; // 0.7 - 1.0
    }
    else if (complexity < 60) {
        complexityMultiplier = 1.0 + ((complexity - 30) / 30) * 0.5; // 1.0 - 1.5
    }
    else {
        complexityMultiplier = 1.5 + ((complexity - 60) / 40) * 1.0; // 1.5 - 2.5
    }
    // Also consider aspect ratio - very wide/tall images need more tiles
    const aspectMultiplier = Math.max(1, Math.sqrt(Math.max(aspectRatio, 1 / aspectRatio)));
    const finalMultiplier = complexityMultiplier * aspectMultiplier;
    return {
        low: Math.round(baseMinLow * finalMultiplier),
        medium: Math.round(baseMinMedium * finalMultiplier),
        high: Math.round(baseMinHigh * finalMultiplier)
    };
}
//# sourceMappingURL=imageAnalyzer.js.map