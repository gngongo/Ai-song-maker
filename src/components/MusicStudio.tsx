import { useState, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  Loader2,
  Download,
  Volume2,
  VolumeX,
  Disc,
  Image as ImageIcon,
  X,
  Sparkles,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateMusic } from '../lib/gemini';
import { cn } from '../lib/utils';
import { MUSIC_TEMPLATES } from '../constants/templates';

interface MusicStudioProps {
  searchQuery?: string;
  isOptionsOpen?: boolean;
  onOpenOptions?: () => void;
  onCloseOptions?: () => void;
  onResetProject?: () => void;
}

export default function MusicStudio({
  searchQuery = '',
  isOptionsOpen = false,
  onOpenOptions,
  onCloseOptions,
  onResetProject,
}: MusicStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setIsPlaying(false);
    setAudioUrl(null);
    setLyrics(null);

    try {
      const imageConfig = selectedImage
        ? {
            data: selectedImage.split(',')[1],
            mimeType: imageMimeType || 'image/png',
          }
        : undefined;

      const result = await generateMusic(prompt, imageConfig);
      setAudioUrl(result.audioDataUrl);
      setLyrics(result.lyrics);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Music generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `studio-ai-track-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyTemplate = (template: (typeof MUSIC_TEMPLATES)[0]) => {
    setPrompt(template.prompt);
    setErrorMsg(null);
  };

  const filteredTemplates = searchQuery.trim()
    ? MUSIC_TEMPLATES.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : MUSIC_TEMPLATES;

  const renderLyricsPanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/45">
          Generated Lyrics & Notes
        </h3>
        <div className="bg-black/25 rounded-2xl p-4 min-h-[200px] lg:min-h-[280px] max-h-[360px] overflow-y-auto border border-white/5">
          {lyrics ? (
            <pre className="text-xs text-white/85 whitespace-pre-wrap font-sans leading-relaxed">
              {lyrics}
            </pre>
          ) : (
            <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6">
              <Disc className="w-8 h-8 text-white/15 mb-3" />
              <p className="text-xs text-white/35">
                Lyrics and arrangement notes will appear here after generation
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-accent-pink/10 rounded-2xl border border-accent-pink/20 backdrop-blur-sm">
        <h4 className="text-xs font-bold text-accent-pink mb-1">Lyria 3 Pro</h4>
        <p className="text-xs text-white/65 leading-relaxed">
          Full-length music generation supporting instrumentals, mood images, and vocals.
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 sm:gap-8 min-h-full">
        {/* Main Player & Controls */}
        <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
          {errorMsg && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/15 border border-red-400/30 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <p className="flex-1 leading-relaxed">{errorMsg}</p>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setErrorMsg(null)}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Player Card */}
          <div className="min-h-[230px] sm:min-h-[300px] lg:flex-1 bg-gradient-to-br from-accent-pink/10 to-accent-blue/10 rounded-2xl sm:rounded-3xl border border-white/10 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden backdrop-blur-md">
            <AnimatePresence mode="wait">
              {audioUrl ? (
                <motion.div
                  key="player"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-md space-y-6 relative z-10"
                >
                  <div className="w-40 h-40 sm:w-52 sm:h-52 mx-auto bg-white/5 rounded-full border-4 border-white/10 flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(255,0,128,0.2)]">
                    <motion.div
                      animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                      transition={
                        isPlaying
                          ? { duration: 8, repeat: Infinity, ease: 'linear' }
                          : { duration: 0.3 }
                      }
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Disc className="w-32 h-32 sm:w-44 sm:h-44 text-accent-pink/20" />
                    </motion.div>
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center z-20 shadow-2xl">
                      <Music className="w-7 h-7 text-black" />
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  <div className="flex items-center justify-center gap-5">
                    <button
                      type="button"
                      aria-label={isMuted ? 'Unmute track' : 'Mute track'}
                      onClick={toggleMute}
                      className="min-h-[44px] min-w-[44px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <button
                      type="button"
                      aria-label={isPlaying ? 'Pause track' : 'Play track'}
                      onClick={togglePlay}
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl"
                    >
                      {isPlaying ? (
                        <Pause className="w-7 h-7 fill-current" />
                      ) : (
                        <Play className="w-7 h-7 fill-current translate-x-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      aria-label="Download track"
                      onClick={handleDownload}
                      className="min-h-[44px] min-w-[44px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center space-y-3 relative z-10">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                    <Music className="w-8 h-8 text-white/25" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-semibold text-white/85">
                      Lyria Pro Studio
                    </h3>
                    <p className="text-white/45 text-xs sm:text-sm">
                      Compose tracks from a prompt or mood image
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {isGenerating && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-30 p-4 text-center">
                <div className="relative">
                  <Loader2 className="w-14 h-14 text-accent-pink animate-spin" />
                  <Music className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-medium text-base">Composing Music...</p>
                  <p className="text-white/60 text-xs">
                    Generating melodies, harmonies, and lyrics
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Template Gallery */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/45">
                Quick Templates
              </h3>
            </div>
            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-white/40 px-1">No templates match "{searchQuery}".</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="flex-shrink-0 w-40 sm:w-48 group text-left space-y-1.5"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10 relative">
                      <img
                        src={template.thumbnail}
                        alt={template.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white/85 group-hover:text-accent-blue transition-colors truncate">
                        {template.title}
                      </h4>
                      <p className="text-[11px] text-white/45 line-clamp-1">
                        {template.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prompt & Bottom Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe mood, genre, and instruments (e.g. 'Chill lo-fi hip hop with warm piano')..."
              rows={3}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-accent-blue/40 transition-all resize-none text-white placeholder:text-white/35"
            />
            <div className="flex sm:flex-col gap-2 sm:w-40">
              <div className="relative flex-1 min-h-[48px]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'w-full h-full min-h-[48px] px-3 border border-dashed rounded-xl flex items-center sm:flex-col justify-center gap-2 transition-all overflow-hidden relative',
                    selectedImage
                      ? 'border-accent-pink/50 bg-accent-pink/10'
                      : 'border-white/15 hover:border-white/30 bg-white/5'
                  )}
                >
                  {selectedImage ? (
                    <>
                      <img
                        src={selectedImage}
                        alt="Mood reference"
                        className="absolute inset-0 w-full h-full object-cover opacity-35"
                      />
                      <ImageIcon className="w-4 h-4 text-accent-pink relative z-10 shrink-0" />
                      <span className="text-[11px] text-accent-pink font-semibold relative z-10 whitespace-nowrap">
                        Mood Image
                      </span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-white/40 shrink-0" />
                      <span className="text-[11px] text-white/55 font-medium whitespace-nowrap">
                        Mood Image
                      </span>
                    </>
                  )}
                </button>
                {selectedImage && (
                  <button
                    type="button"
                    aria-label="Remove mood image"
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-1.5 -right-1.5 z-20 bg-black/80 border border-white/20 rounded-full w-6 h-6 flex items-center justify-center text-white hover:bg-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={onOpenOptions}
                className="lg:hidden min-h-[48px] px-3 rounded-xl bg-white/5 border border-white/15 text-white/80 flex items-center justify-center gap-1.5 text-xs font-medium shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-accent-blue" />
                <span>Lyrics</span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 sm:flex-none min-h-[48px] px-4 bg-gradient-to-r from-accent-pink to-[#8000ff] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-45 transition-all shadow-lg whitespace-nowrap"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Music className="w-4 h-4" />
                )}
                <span>Compose</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Lyrics Sidebar */}
        <div className="hidden lg:flex glass-card rounded-3xl p-6 flex-col justify-between">
          {renderLyricsPanel()}
        </div>
      </div>

      {/* Bottom Sheet Lyrics & Options Drawer */}
      <AnimatePresence>
        {isOptionsOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseOptions}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[82dvh] overflow-y-auto bg-[#181330]/95 backdrop-blur-2xl border-t lg:border border-white/15 rounded-t-3xl lg:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5 shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto lg:hidden" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Music Studio Options</h3>
                <button
                  type="button"
                  aria-label="Close options"
                  onClick={onCloseOptions}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderLyricsPanel()}
              {onResetProject && (
                <button
                  type="button"
                  onClick={() => {
                    onResetProject();
                    onCloseOptions?.();
                  }}
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 text-xs font-semibold"
                >
                  Reset Music Studio
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
