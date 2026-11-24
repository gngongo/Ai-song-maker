import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS = {
  CHAT: 'gemini-3.1-pro-preview',
  FAST: 'gemini-3.1-flash-lite-preview',
  IMAGE: 'gemini-3-pro-image-preview',
  VIDEO: 'veo-3.1-fast-generate-preview',
  MUSIC: 'lyria-3-pro-preview',
};

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getErrorMessage(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    const msg = error.message || 'Unknown error occurred';
    if (msg.includes('GEMINI_API_KEY is missing')) {
      return { status: 400, message: msg };
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return { status: 429, message: 'Rate limit or quota reached. Check your API tier in Settings > Secrets.' };
    }
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
      return { status: 403, message: 'API key unauthorized or invalid. Please check Settings > Secrets.' };
    }
    return { status: 500, message: msg };
  }
  return { status: 500, message: 'Unexpected server error.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { prompt, history = [], image } = req.body ?? {};
      if (!prompt && !image) {
        res.status(400).json({ error: 'Prompt or image is required.' });
        return;
      }

      const ai = getAI();

      if (image?.data) {
        const response = await ai.models.generateContent({
          model: MODELS.CHAT,
          contents: {
            parts: [
              { text: typeof prompt === 'string' && prompt.trim() ? prompt : 'Analyze this image in detail.' },
              {
                inlineData: {
                  data: image.data,
                  mimeType: image.mimeType || 'image/png',
                },
              },
            ],
          },
          config: {
            systemInstruction:
              'You are a creative assistant in Studio AI. Help users with content creation, brainstorming, image analysis, and technical tasks.',
          },
        });
        res.json({ text: response.text || 'No response returned.' });
        return;
      }

      const safeHistory = Array.isArray(history)
        ? history
            .filter((h) => h && typeof h.content === 'string' && h.content.trim().length > 0)
            .map((h) => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }],
            }))
        : [];

      const response = await ai.models.generateContent({
        model: MODELS.CHAT,
        contents: [
          ...safeHistory,
          { role: 'user', parts: [{ text: String(prompt) }] },
        ],
        config: {
          systemInstruction:
            'You are a creative assistant in Studio AI. Help users with content creation, brainstorming, and technical tasks.',
        },
      });

      res.json({ text: response.text || 'No response returned.' });
    } catch (error) {
      const { status, message } = getErrorMessage(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/image', async (req: Request, res: Response) => {
    try {
      const { prompt, aspectRatio = '1:1', imageSize = '1K' } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Image prompt is required.' });
        return;
      }

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODELS.IMAGE,
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          res.json({ imageUrl: `data:${mime};base64,${part.inlineData.data}` });
          return;
        }
      }

      res.status(502).json({ error: 'The model did not return an image. Try adjusting your prompt.' });
    } catch (error) {
      const { status, message } = getErrorMessage(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/video', async (req: Request, res: Response) => {
    try {
      const { prompt, aspectRatio = '16:9', resolution = '720p', image } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Video prompt is required.' });
        return;
      }

      const ai = getAI();
      let operation = await ai.models.generateVideos({
        model: MODELS.VIDEO,
        prompt,
        ...(image?.data
          ? {
              image: {
                imageBytes: image.data,
                mimeType: image.mimeType || 'image/png',
              },
            }
          : {}),
        config: {
          numberOfVideos: 1,
          resolution,
          aspectRatio,
        },
      });

      const maxPolls = 24;
      let polls = 0;
      while (!operation.done && polls < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
        polls++;
      }

      if (!operation.done) {
        res.status(504).json({ error: 'Video generation timed out. Please try again with a shorter prompt.' });
        return;
      }

      const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
      if (generatedVideo?.videoBytes) {
        const mime = generatedVideo.mimeType || 'video/mp4';
        res.json({ videoUrl: `data:${mime};base64,${generatedVideo.videoBytes}` });
        return;
      }

      if (generatedVideo?.uri) {
        const apiKey = process.env.GEMINI_API_KEY || '';
        const videoResp = await fetch(generatedVideo.uri, {
          headers: {
            'x-goog-api-key': apiKey,
          },
        });
        if (!videoResp.ok) {
          res.status(502).json({ error: 'Failed to retrieve generated video stream.' });
          return;
        }
        const arrayBuffer = await videoResp.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mime = videoResp.headers.get('content-type') || 'video/mp4';
        res.json({ videoUrl: `data:${mime};base64,${base64}` });
        return;
      }

      res.status(502).json({ error: 'No video was returned by the model.' });
    } catch (error) {
      const { status, message } = getErrorMessage(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/music', async (req: Request, res: Response) => {
    try {
      const { prompt, image } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Music prompt is required.' });
        return;
      }

      const ai = getAI();
      const contents = image?.data
        ? {
            parts: [
              { text: prompt },
              { inlineData: { data: image.data, mimeType: image.mimeType || 'image/png' } },
            ],
          }
        : prompt;

      const stream = await ai.models.generateContentStream({
        model: MODELS.MUSIC,
        contents,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(502).json({ error: 'The model did not return audio. Try another prompt.' });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      res.json({
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        lyrics: lyrics.trim() || null,
      });
    } catch (error) {
      const { status, message } = getErrorMessage(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/voice', async (req: Request, res: Response) => {
    try {
      const { audio, text, history = [], style = 'friendly creative director' } = req.body ?? {};
      if (!audio?.data && (!text || !String(text).trim())) {
        res.status(400).json({ error: 'Audio recording or text message is required.' });
        return;
      }

      const ai = getAI();
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

      if (audio?.data) {
        parts.push({
          inlineData: {
            data: audio.data,
            mimeType: audio.mimeType || 'audio/webm',
          },
        });
        parts.push({
          text: 'Listen to the user audio, understand their creative request, and respond concisely in 1-3 natural spoken sentences without markdown formatting.',
        });
      } else {
        parts.push({ text: String(text) });
      }

      const safeHistory = Array.isArray(history)
        ? history.slice(-6).map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(h.content || '') }],
          }))
        : [];

      const response = await ai.models.generateContent({
        model: MODELS.FAST,
        contents: [
          ...safeHistory,
          { role: 'user', parts },
        ],
        config: {
          systemInstruction: `You are Studio AI Voice Assistant acting as a ${style}. Keep replies concise, natural for speech playback, and free of markdown bullets or asterisks.`,
        },
      });

      res.json({ reply: response.text || "I didn't catch that. Could you repeat it?" });
    } catch (error) {
      const { status, message } = getErrorMessage(error);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Studio AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
