import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies
  app.use(express.json());

  // Set up multer for file uploads
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = path.join(process.cwd(), 'public', 'images');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  const upload = multer({ storage: storage });

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

  // API Route: Upload image
  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return relative path for src
    res.json({ filePath: `/images/${req.file.filename}` });
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
