import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { sessionStore } from './services/sessionStore.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Allow CORS from localhost and production Vercel domain
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://photo-mosaic-app-sigma.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ...sessionStore.getStats() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  sessionStore.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  sessionStore.shutdown();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Photo Mosaic Backend running on http://localhost:${PORT}`);
  console.log('All data is stored in memory only - will be cleared on restart');
});
