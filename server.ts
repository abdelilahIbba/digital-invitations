import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3010;

  // Middleware for parsing JSON bodies
  app.use(express.json());

  // API Route: Get content data
  app.get('/api/content', (req, res) => {
    try {
      const dataPath = path.join(process.cwd(), 'src', 'data.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  // API Route: Update content data
  app.post('/api/content', (req, res) => {
    try {
      const dataPath = path.join(process.cwd(), 'src', 'data.json');
      fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2), 'utf8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to write data' });
    }
  });

  // API Route: Upload image (emulating Vercel's raw body upload)
  app.post('/api/upload', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const rawFilename = req.headers['x-filename'] as string | undefined;
    const filename = rawFilename ? decodeURIComponent(rawFilename) : `upload-${Date.now()}.jpg`;
    
    // Local uploads go to public/images/
    const safeFilename = Date.now() + '-' + filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const dest = path.join(dir, safeFilename);
    
    try {
      fs.writeFileSync(dest, req.body);
      res.json({ filePath: `/images/${safeFilename}` });
    } catch (err) {
      res.status(500).json({ error: 'Local upload failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');
    app.use(express.static(distPath));
    app.use(express.static(publicPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
