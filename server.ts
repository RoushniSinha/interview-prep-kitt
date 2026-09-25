import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes';
import { connectDB } from './src/config/db';
import { env } from './src/config/env';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Connect to MongoDB
  try {
    await connectDB();
  } catch (dbErr) {
    console.warn('[MongoDB] Initial connection error on boot (will retry in background):', dbErr instanceof Error ? dbErr.message : dbErr);
  }

  const app = express();
  const PORT = parseInt(process.env.PORT || String(env.PORT) || '3000', 10);

  // Parse JSON bodies with up to 10mb payload (for batch file uploads)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Strict JSON 404 handler for /api to prevent unmatched routes falling through to Vite SPA html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `API route ${req.method} ${req.originalUrl} not found` },
    });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In dev: mount Vite in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[InterviewPrepKit] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[InterviewPrepKit] Failed to start server:', err);
  process.exit(1);
});
