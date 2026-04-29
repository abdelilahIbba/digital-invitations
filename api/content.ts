import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const BLOB_KEY = 'invitation-content.json';

/** Try to read content from Vercel Blob (updated via CRUD). Falls back to the bundled data.json. */
async function getContent(): Promise<any> {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length > 0) {
      // Pass auth token — required for private blob stores
      const resp = await fetch(blobs[0].url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      return await resp.json();
    }
  } catch {}

  // Fallback: read the bundled src/data.json (read-only, from the deployment)
  const dataPath = path.join(process.cwd(), 'src', 'data.json');
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

// Increase body limit for large payloads
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — serve current content
  if (req.method === 'GET') {
    try {
      const data = await getContent();
      return res.json(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('GET /api/content error:', msg);
      return res.status(500).json({ error: 'Failed to read content', details: msg });
    }
  }

  // POST — persist new content to Vercel Blob
  if (req.method === 'POST') {
    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not set in environment variables' });
      }

      // Remove the previous blob so we don't accumulate versions
      const { blobs } = await list({ prefix: BLOB_KEY });
      if (blobs.length > 0) {
        await del(blobs.map(b => b.url));
      }

      await put(BLOB_KEY, JSON.stringify(req.body, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });

      return res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('POST /api/content error:', msg);
      return res.status(500).json({ error: 'Failed to save content', details: msg });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
