import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

// Disable Vercel's default body parser so formidable can parse the multipart stream
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });

  try {
    const [, files] = await form.parse(req as any);
    const fileArr = files.image;

    if (!fileArr || fileArr.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = fileArr[0];
    const buffer = fs.readFileSync(file.filepath);

    const blob = await put(
      `images/${Date.now()}-${file.originalFilename ?? 'upload'}`,
      buffer,
      {
        access: 'public',
        contentType: file.mimetype ?? 'image/jpeg',
      }
    );

    // Clean up the temp file from /tmp
    try { fs.unlinkSync(file.filepath); } catch {}

    return res.json({ filePath: blob.url });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
