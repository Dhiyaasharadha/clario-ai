import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Set ffmpeg paths
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Ensure directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const clipsDir = path.join(process.cwd(), 'public', 'clips');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// Serves generated clips
app.use('/clips', express.static(clipsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Video clipping endpoint
app.post('/api/clip-video', upload.single('video'), async (req, res) => {
  try {
    const videoFile = req.file;
    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const clipsMetadata = JSON.parse(req.body.clips || '[]');
    if (!clipsMetadata.length) {
      return res.status(400).json({ error: 'No clip metadata provided' });
    }

    const videoPath = videoFile.path;
    const results = [];

    // Process each clip
    for (const clip of clipsMetadata) {
      const clipId = uuidv4();
      const outputFilename = `${clipId}.mp4`;
      const outputPath = path.join(clipsDir, outputFilename);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .setStartTime(clip.start_time)
          .setDuration(clip.end_time - clip.start_time)
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      results.push({
        id: clipId,
        url: `/clips/${outputFilename}`,
        title: clip.title,
        hook: clip.hook,
        reason: clip.reason,
        start_time: clip.start_time,
        end_time: clip.end_time
      });
    }

    // Cleanup original upload after a short delay (for demo simplicity, normally you'd manage this better)
    // fs.unlinkSync(videoPath); 

    res.json({ clips: results });
  } catch (error) {
    console.error('Clipping error:', error);
    res.status(500).json({ error: 'Failed to process video clips' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
