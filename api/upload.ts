import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

// Disable Vercel's default body parser — we stream the raw file body directly to blob
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = (req.headers['content-type'] as string) || 'image/jpeg';
    const rawFilename = req.headers['x-filename'] as string | undefined;
    const filename = rawFilename ? decodeURIComponent(rawFilename) : `upload-${Date.now()}`;

    const blob = await put(
      `images/${Date.now()}-${filename}`,
      req, // IncomingMessage is a Readable stream — accepted directly by @vercel/blob
      {
        access: 'public',
        contentType,
      }
    );

    return res.json({ filePath: blob.url });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Upload failed', details: msg });
  }
}
