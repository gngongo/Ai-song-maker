export interface Template {
  id: string;
  title: string;
  description: string;
  prompt: string;
  thumbnail: string;
  config?: Record<string, any>;
}

export const IMAGE_TEMPLATES: Template[] = [
  {
    id: 'cyberpunk',
    title: 'Cyberpunk City',
    description: 'Neon-lit futuristic metropolis',
    prompt: 'A sprawling cyberpunk metropolis at night, neon signs in pink and blue, rain-slicked streets, cinematic lighting, 8k resolution, highly detailed.',
    thumbnail: 'https://picsum.photos/seed/cyberpunk/400/300',
    config: { aspectRatio: '16:9' }
  },
  {
    id: 'minimalist',
    title: 'Minimalist Product',
    description: 'Clean, high-end commercial style',
    prompt: 'A minimalist product photograph of a sleek glass perfume bottle on a marble surface, soft natural lighting, pastel background, high-end commercial style, sharp focus.',
    thumbnail: 'https://picsum.photos/seed/minimalist/400/300',
    config: { aspectRatio: '1:1' }
  },
  {
    id: 'ethereal',
    title: 'Ethereal Portrait',
    description: 'Dreamlike and bioluminescent',
    prompt: 'An ethereal portrait of a person with glowing skin, surrounded by floating bioluminescent flowers, soft focus, dreamlike atmosphere, pastel colors, magical lighting.',
    thumbnail: 'https://picsum.photos/seed/ethereal/400/300',
    config: { aspectRatio: '3:4' }
  }
];

export const VIDEO_TEMPLATES: Template[] = [
  {
    id: 'drone-shot',
    title: 'Cinematic Drone',
    description: 'Epic mountain sunrise flyover',
    prompt: 'A cinematic drone shot flying over a rugged mountain range at sunrise, golden hour lighting, 4k, smooth camera motion, majestic atmosphere.',
    thumbnail: 'https://picsum.photos/seed/mountains/400/300',
    config: { aspectRatio: '16:9' }
  },
  {
    id: 'social-teaser',
    title: 'Social Teaser',
    description: 'High-energy product promo',
    prompt: 'A fast-paced, high-energy teaser for a new tech product, quick cuts, glitch effects, vibrant colors, modern aesthetic, dynamic camera movements.',
    thumbnail: 'https://picsum.photos/seed/tech/400/300',
    config: { aspectRatio: '9:16' }
  },
  {
    id: 'nature-timelapse',
    title: 'Nature Timelapse',
    description: 'Macro flower blooming',
    prompt: 'A beautiful time-lapse of a flower blooming in a forest, soft sunlight filtering through trees, macro lens, high detail, organic growth.',
    thumbnail: 'https://picsum.photos/seed/flower/400/300',
    config: { aspectRatio: '16:9' }
  }
];

export const MUSIC_TEMPLATES: Template[] = [
  {
    id: 'lofi',
    title: 'Lo-fi Study',
    description: 'Chill beats for focus',
    prompt: 'Chill lo-fi hip hop beats, melancholic piano melody, dusty vinyl crackle, relaxed atmosphere, 80bpm, perfect for studying.',
    thumbnail: 'https://picsum.photos/seed/lofi/400/300'
  },
  {
    id: 'epic',
    title: 'Epic Trailer',
    description: 'Powerful orchestral build',
    prompt: 'Epic cinematic trailer music, powerful orchestral strings, deep percussion, building intensity, heroic mood, high stakes.',
    thumbnail: 'https://picsum.photos/seed/epic/400/300'
  },
  {
    id: 'corporate',
    title: 'Upbeat Corporate',
    description: 'Inspiring and professional',
    prompt: 'Upbeat and inspiring corporate pop, acoustic guitar, bright synths, positive energy, professional feel, motivational.',
    thumbnail: 'https://picsum.photos/seed/corporate/400/300'
  }
];
