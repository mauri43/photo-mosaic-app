"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sessionStore_js_1 = require("../services/sessionStore.js");
const imageProcessor_js_1 = require("../services/imageProcessor.js");
const mosaicGenerator_js_1 = require("../services/mosaicGenerator.js");
const dziGenerator_js_1 = require("../services/dziGenerator.js");
const imageAnalyzer_js_1 = require("../services/imageAnalyzer.js");
const router = (0, express_1.Router)();
// Configure multer for memory storage - optimized for free tier
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file (reduced from 50MB)
        files: 500 // Max 200 files per upload
    }
});
// Create new session
router.post('/session', (req, res) => {
    const session = sessionStore_js_1.sessionStore.createSession();
    res.json({ sessionId: session.id });
});
// Delete session
router.delete('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const deleted = sessionStore_js_1.sessionStore.deleteSession(sessionId);
    res.json({ success: deleted });
});
// Upload target image
router.post('/session/:sessionId/target', upload.single('image'), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessionStore_js_1.sessionStore.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ error: 'No image file provided' });
            return;
        }
        session.targetImage = req.file.buffer;
        const dimensions = await (0, imageProcessor_js_1.getImageDimensions)(req.file.buffer);
        // Also analyze the image for auto-mode recommendations
        const analysis = await (0, imageAnalyzer_js_1.analyzeImage)(req.file.buffer);
        res.json({
            success: true,
            width: dimensions.width,
            height: dimensions.height,
            analysis
        });
    }
    catch (error) {
        console.error('Error uploading target image:', error);
        res.status(500).json({ error: 'Failed to process target image' });
    }
});
// Analyze target image (can be called separately)
router.get('/session/:sessionId/analyze', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessionStore_js_1.sessionStore.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (!session.targetImage) {
            res.status(400).json({ error: 'No target image uploaded' });
            return;
        }
        const analysis = await (0, imageAnalyzer_js_1.analyzeImage)(session.targetImage);
        res.json({
            success: true,
            analysis
        });
    }
    catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});
// Set mosaic dimensions and get requirements
router.post('/session/:sessionId/dimensions', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { width, height } = req.body;
        const session = sessionStore_js_1.sessionStore.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (!width || !height || width < 100 || height < 100) {
            res.status(400).json({ error: 'Invalid dimensions. Minimum 100x100.' });
            return;
        }
        session.targetWidth = width;
        session.targetHeight = height;
        const requirements = (0, imageProcessor_js_1.calculateResolutionRequirements)(width, height);
        res.json({
            success: true,
            requirements
        });
    }
    catch (error) {
        console.error('Error setting dimensions:', error);
        res.status(500).json({ error: 'Failed to calculate requirements' });
    }
});
// Upload tile images - memory optimized for Render free tier (512MB)
const MAX_TILES = 150; // Reduced limit for free tier
router.post('/session/:sessionId/tiles', upload.array('images', 200), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessionStore_js_1.sessionStore.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No image files provided' });
            return;
        }
        // Check if adding these would exceed limit
        const currentCount = session.tileImages.size;
        const availableSlots = MAX_TILES - currentCount;
        if (availableSlots <= 0) {
            res.status(400).json({ error: `Maximum ${MAX_TILES} tiles allowed. Please clear existing tiles first.` });
            return;
        }
        // Only process up to available slots
        const filesToProcess = files.slice(0, availableSlots);
        console.log(`Processing ${filesToProcess.length} tile images (limit: ${MAX_TILES})...`);
        // Process tiles SEQUENTIALLY to reduce peak memory usage
        let processed = 0;
        for (const file of filesToProcess) {
            try {
                const tile = await (0, imageProcessor_js_1.processTileImage)(file.buffer);
                session.tileImages.set(tile.id, tile);
                processed++;
                // Log progress every 10 tiles
                if (processed % 10 === 0) {
                    console.log(`Processed ${processed}/${filesToProcess.length} tiles`);
                }
            }
            catch (err) {
                console.error('Error processing single tile:', err);
                // Continue with other tiles
            }
        }
        console.log(`Finished processing ${processed} tiles`);
        res.json({
            success: true,
            totalTiles: session.tileImages.size,
            skipped: files.length - filesToProcess.length
        });
    }
    catch (error) {
        console.error('Error uploading tile images:', error);
        res.status(500).json({ error: 'Failed to process tile images' });
    }
});
// Clear all tile images
router.delete('/session/:sessionId/tiles', (req, res) => {
    const { sessionId } = req.params;
    const session = sessionStore_js_1.sessionStore.getSession(sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    session.tileImages.clear();
    res.json({ success: true });
});
// Update settings
router.put('/session/:sessionId/settings', (req, res) => {
    const { sessionId } = req.params;
    const { allowDuplicates, allowTinting } = req.body;
    const session = sessionStore_js_1.sessionStore.getSession(sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    if (typeof allowDuplicates === 'boolean') {
        session.allowDuplicates = allowDuplicates;
    }
    if (typeof allowTinting === 'boolean') {
        session.allowTinting = allowTinting;
    }
    res.json({
        success: true,
        allowDuplicates: session.allowDuplicates,
        allowTinting: session.allowTinting
    });
});
// Generate mosaic
router.post('/session/:sessionId/generate', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { resolution = 'medium', useAllTiles = false, exactTileCount, nineXDetail = false } = req.body;
        const session = sessionStore_js_1.sessionStore.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (!session.targetImage) {
            res.status(400).json({ error: 'No target image uploaded' });
            return;
        }
        if (session.tileImages.size === 0) {
            res.status(400).json({ error: 'No tile images uploaded' });
            return;
        }
        const tileCount = session.tileImages.size;
        let logMessage = `Generating mosaic for session ${sessionId}`;
        if (nineXDetail) {
            logMessage += ` with 4x detail mode`;
        }
        if (useAllTiles) {
            logMessage += ` using ALL ${tileCount} tiles`;
        }
        else if (exactTileCount) {
            logMessage += ` with exact ${exactTileCount} tiles`;
        }
        else {
            logMessage += ` at ${resolution} resolution`;
        }
        console.log(logMessage);
        // Clear any existing mosaic
        sessionStore_js_1.sessionStore.clearSessionMosaic(sessionId);
        // Generate the mosaic
        const mosaic = await (0, mosaicGenerator_js_1.generateMosaic)(session, {
            resolution,
            allowDuplicates: nineXDetail ? true : session.allowDuplicates, // 4x detail forces duplicates
            allowTinting: session.allowTinting,
            useAllTiles,
            exactTileCount,
            nineXDetail
        });
        session.mosaic = mosaic;
        // Generate DZI pyramid for deep zoom
        await (0, dziGenerator_js_1.generateDziPyramid)(session, mosaic);
        res.json({
            success: true,
            dziMetadata: session.dziMetadata,
            tilesUsed: exactTileCount || (useAllTiles ? tileCount : undefined)
        });
    }
    catch (error) {
        console.error('Error generating mosaic:', error);
        res.status(500).json({ error: error.message || 'Failed to generate mosaic' });
    }
});
// Get DZI descriptor
router.get('/session/:sessionId/mosaic.dzi', (req, res) => {
    const { sessionId } = req.params;
    const session = sessionStore_js_1.sessionStore.getSession(sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    if (!session.dziMetadata) {
        res.status(404).json({ error: 'No mosaic generated' });
        return;
    }
    const descriptor = (0, dziGenerator_js_1.generateDziDescriptor)(session.dziMetadata);
    res.type('application/xml').send(descriptor);
});
// Get DZI tile
router.get('/session/:sessionId/mosaic_files/:level/:tile', (req, res) => {
    const { sessionId, level, tile } = req.params;
    const session = sessionStore_js_1.sessionStore.getSession(sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    // Parse tile coordinates from filename (e.g., "0_0.jpeg")
    const match = tile.match(/^(\d+)_(\d+)\./);
    if (!match) {
        res.status(400).json({ error: 'Invalid tile format' });
        return;
    }
    const tileX = parseInt(match[1], 10);
    const tileY = parseInt(match[2], 10);
    const levelNum = parseInt(level, 10);
    const tileBuffer = (0, dziGenerator_js_1.getDziTile)(session, levelNum, tileX, tileY);
    if (!tileBuffer) {
        res.status(404).json({ error: 'Tile not found' });
        return;
    }
    res.type('image/jpeg').send(tileBuffer);
});
// Download mosaic
router.get('/session/:sessionId/download', (req, res) => {
    const { sessionId } = req.params;
    const session = sessionStore_js_1.sessionStore.getSession(sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    if (!session.mosaic) {
        res.status(404).json({ error: 'No mosaic generated' });
        return;
    }
    res.set({
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'attachment; filename="mosaic.jpg"',
        'Content-Length': session.mosaic.length
    });
    res.send(session.mosaic);
});
// Get session status
router.get('/session/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    const session = sessionStore_js_1.sessionStore.getSession(sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json({
        hasTargetImage: !!session.targetImage,
        targetWidth: session.targetWidth,
        targetHeight: session.targetHeight,
        tileCount: session.tileImages.size,
        allowDuplicates: session.allowDuplicates,
        allowTinting: session.allowTinting,
        hasMosaic: !!session.mosaic,
        dziMetadata: session.dziMetadata
    });
});
// Get server stats
router.get('/stats', (req, res) => {
    res.json(sessionStore_js_1.sessionStore.getStats());
});
exports.default = router;
//# sourceMappingURL=api.js.map