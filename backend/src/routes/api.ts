import { Router, Request, Response } from 'express';
import multer from 'multer';
import { sessionStore } from '../services/sessionStore.js';
import {
  processTileImage,
  calculateResolutionRequirements,
  getImageDimensions
} from '../services/imageProcessor.js';
import { generateMosaic } from '../services/mosaicGenerator.js';
import { generateDziPyramid, getDziTile, generateDziDescriptor } from '../services/dziGenerator.js';
import { analyzeImage } from '../services/imageAnalyzer.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 1000 // Max 1000 files per upload
  }
});

// Create new session
router.post('/session', (req: Request, res: Response) => {
  const session = sessionStore.createSession();
  res.json({ sessionId: session.id });
});

// Delete session
router.delete('/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const deleted = sessionStore.deleteSession(sessionId);
  res.json({ success: deleted });
});

// Upload target image
router.post('/session/:sessionId/target', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    session.targetImage = req.file.buffer;
    const dimensions = await getImageDimensions(req.file.buffer);

    // Also analyze the image for auto-mode recommendations
    const analysis = await analyzeImage(req.file.buffer);

    res.json({
      success: true,
      width: dimensions.width,
      height: dimensions.height,
      analysis
    });
  } catch (error) {
    console.error('Error uploading target image:', error);
    res.status(500).json({ error: 'Failed to process target image' });
  }
});

// Analyze target image (can be called separately)
router.get('/session/:sessionId/analyze', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (!session.targetImage) {
      res.status(400).json({ error: 'No target image uploaded' });
      return;
    }

    const analysis = await analyzeImage(session.targetImage);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

// Set mosaic dimensions and get requirements
router.post('/session/:sessionId/dimensions', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { width, height } = req.body;

    const session = sessionStore.getSession(sessionId);
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

    const requirements = calculateResolutionRequirements(width, height);

    res.json({
      success: true,
      requirements
    });
  } catch (error) {
    console.error('Error setting dimensions:', error);
    res.status(500).json({ error: 'Failed to calculate requirements' });
  }
});

// Upload tile images
router.post('/session/:sessionId/tiles', upload.array('images', 1000), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No image files provided' });
      return;
    }

    console.log(`Processing ${files.length} tile images...`);

    // Process tiles in parallel batches
    const batchSize = 20;
    let processed = 0;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const promises = batch.map(file => processTileImage(file.buffer));
      const tiles = await Promise.all(promises);

      for (const tile of tiles) {
        session.tileImages.set(tile.id, tile);
      }

      processed += batch.length;
      console.log(`Processed ${processed}/${files.length} tiles`);
    }

    res.json({
      success: true,
      totalTiles: session.tileImages.size
    });
  } catch (error) {
    console.error('Error uploading tile images:', error);
    res.status(500).json({ error: 'Failed to process tile images' });
  }
});

// Clear all tile images
router.delete('/session/:sessionId/tiles', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  session.tileImages.clear();
  res.json({ success: true });
});

// Update settings
router.put('/session/:sessionId/settings', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { allowDuplicates, allowTinting } = req.body;

  const session = sessionStore.getSession(sessionId);
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
router.post('/session/:sessionId/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const {
      resolution = 'medium',
      useAllTiles = false,
      exactTileCount
    } = req.body;

    const session = sessionStore.getSession(sessionId);
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

    if (useAllTiles) {
      logMessage += ` using ALL ${tileCount} tiles`;
    } else if (exactTileCount) {
      logMessage += ` with exact ${exactTileCount} tiles`;
    } else {
      logMessage += ` at ${resolution} resolution`;
    }
    console.log(logMessage);

    // Clear any existing mosaic
    sessionStore.clearSessionMosaic(sessionId);

    // Generate the mosaic
    const mosaic = await generateMosaic(session, {
      resolution,
      allowDuplicates: session.allowDuplicates,
      allowTinting: session.allowTinting,
      useAllTiles,
      exactTileCount
    });

    session.mosaic = mosaic;

    // Generate DZI pyramid for deep zoom
    await generateDziPyramid(session, mosaic);

    res.json({
      success: true,
      dziMetadata: session.dziMetadata,
      tilesUsed: exactTileCount || (useAllTiles ? tileCount : undefined)
    });
  } catch (error) {
    console.error('Error generating mosaic:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to generate mosaic' });
  }
});

// Get DZI descriptor
router.get('/session/:sessionId/mosaic.dzi', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (!session.dziMetadata) {
    res.status(404).json({ error: 'No mosaic generated' });
    return;
  }

  const descriptor = generateDziDescriptor(session.dziMetadata);
  res.type('application/xml').send(descriptor);
});

// Get DZI tile
router.get('/session/:sessionId/mosaic_files/:level/:tile', (req: Request, res: Response) => {
  const { sessionId, level, tile } = req.params;
  const session = sessionStore.getSession(sessionId);

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

  const tileBuffer = getDziTile(session, levelNum, tileX, tileY);

  if (!tileBuffer) {
    res.status(404).json({ error: 'Tile not found' });
    return;
  }

  res.type('image/jpeg').send(tileBuffer);
});

// Download mosaic
router.get('/session/:sessionId/download', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.getSession(sessionId);

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
router.get('/session/:sessionId/status', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.getSession(sessionId);

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
router.get('/stats', (req: Request, res: Response) => {
  res.json(sessionStore.getStats());
});

export default router;
