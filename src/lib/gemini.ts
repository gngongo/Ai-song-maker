export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function generateChat(prompt: string, history: ChatHistoryItem[] = []): Promise<string> {
  const data = await postJson<{ text: string }>('/api/chat', { prompt, history });
  return data.text;
}

export async function analyzeImage(
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  const data = await postJson<{ text: string }>('/api/chat', {
    prompt,
    image: { data: base64Image, mimeType },
  });
  return data.text;
}

export async function generateImage(
  prompt: string,
  config: { aspectRatio: string; imageSize: string }
): Promise<string> {
  const data = await postJson<{ imageUrl: string }>('/api/image', {
    prompt,
    aspectRatio: config.aspectRatio,
    imageSize: config.imageSize,
  });
  return data.imageUrl;
}

export async function generateVideo(
  prompt: string,
  config: { aspectRatio: string; resolution: string },
  image?: { data: string; mimeType: string }
): Promise<string> {
  const data = await postJson<{ videoUrl: string }>('/api/video', {
    prompt,
    aspectRatio: config.aspectRatio,
    resolution: config.resolution,
    image,
  });
  return data.videoUrl;
}

export async function generateMusic(
  prompt: string,
  image?: { data: string; mimeType: string }
): Promise<{ audioDataUrl: string; lyrics: string | null }> {
  return postJson<{ audioDataUrl: string; lyrics: string | null }>('/api/music', {
    prompt,
    image,
  });
}

export async function sendVoiceTurn(payload: {
  audio?: { data: string; mimeType: string };
  text?: string;
  history?: ChatHistoryItem[];
  style?: string;
}): Promise<{ reply: string }> {
  return postJson<{ reply: string }>('/api/voice', payload);
}
