import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Loader2,
  Video as VideoIcon,
  Image as ImageIcon,
  X,
  Settings2,
  Sparkles,
  Scissors,
  Trash2,
  ChevronRight,
  Plus,
  Upload,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateVideo } from '../lib/gemini';
import { cn } from '../lib/utils';
import { VIDEO_TEMPLATES } from '../constants/templates';

type TransitionType = 'none' | 'fade' | 'crossfade';

interface Clip {
  id: string;
  title: string;
  url: string;
  duration: number;
  start: number;
  end: number;
  transition: TransitionType;
  isObjectUrl?: boolean;
}

interface VideoStudioProps {
  searchQuery?: string;
  isOptionsOpen?: boolean;
  onOpenOptions?: () => void;
  onCloseOptions?: () => void;
  onResetProject?: () => void;
}

const TRANSITION_ORDER: TransitionType[] = ['none', 'fade', 'crossfade'];

export default function VideoStudio({
  searchQuery = '',
  isOptionsOpen = false,
  onOpenOptions,
  onCloseOptions,
  onResetProject,
}: VideoStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [transitionOpacity, setTransitionOpacity] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const activeClip = clips.find((c) => c.id === activeClipId) || clips[0] || null;

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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

  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);

    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = url;
    probe.onloadedmetadata = () => {
      const dur = Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 10;
      const newClip: Clip = {
        id: Math.random().toString(36).slice(2, 11),
        title: file.name.replace(/\.[^/.]+$/, ''),
        url,
        duration: Number(dur.toFixed(1)),
        start: 0,
        end: Number(dur.toFixed(1)),
        transition: 'none',
        isObjectUrl: true,
      };
      setClips((prev) => [...prev, newClip]);
      setActiveClipId(newClip.id);
      setErrorMsg(null);
    };
    probe.onerror = () => {
      setErrorMsg('Could not load that video file.');
    };
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const imageConfig = selectedImage
        ? {
            data: selectedImage.split(',')[1],
            mimeType: imageMimeType || 'image/png',
          }
        : undefined;

      const videoUrl = await generateVideo(
        prompt,
        { aspectRatio, resolution },
        imageConfig
      );

      const newClip: Clip = {
        id: Math.random().toString(36).slice(2, 11),
        title: prompt.slice(0, 24),
        url: videoUrl,
        duration: 8,
        start: 0,
        end: 8,
        transition: 'none',
      };

      setClips((prev) => [...prev, newClip]);
      setActiveClipId(newClip.id);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Video generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrim = (id: string, start: number, end: number) => {
    const safeStart = Math.max(0, Math.min(start, end - 0.5));
    const safeEnd = Math.max(safeStart + 0.5, end);
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, start: safeStart, end: safeEnd } : c))
    );
  };

  const handleSplit = (id: string, rawTime: number) => {
    const clipIndex = clips.findIndex((c) => c.id === id);
    if (clipIndex === -1) return;

    const clip = clips[clipIndex];
    if (clip.end - clip.start < 1.0) {
      setErrorMsg('Clip is too short to split (minimum 1.0s).');
      return;
    }

    let splitAt = rawTime;
    if (splitAt <= clip.start + 0.4 || splitAt >= clip.end - 0.4) {
      splitAt = Number(((clip.start + clip.end) / 2).toFixed(1));
    } else {
      splitAt = Number(splitAt.toFixed(1));
    }

    const clip1: Clip = {
      ...clip,
      id: Math.random().toString(36).slice(2, 11),
      title: `${clip.title} (1)`,
      end: splitAt,
    };
    const clip2: Clip = {
      ...clip,
      id: Math.random().toString(36).slice(2, 11),
      title: `${clip.title} (2)`,
      start: splitAt,
    };

    const newClips = [...clips];
    newClips.splice(clipIndex, 1, clip1, clip2);
    setClips(newClips);
    setActiveClipId(clip2.id);
    setErrorMsg(null);
  };

  const cycleTransition = (id: string) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextIndex = (TRANSITION_ORDER.indexOf(c.transition) + 1) % TRANSITION_ORDER.length;
        return { ...c, transition: TRANSITION_ORDER[nextIndex] };
      })
    );
  };

  const removeClip = (id: string) => {
    setClips((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeClipId === id) {
        setActiveClipId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !activeClip) return;
    if (video.paused) {
      if (video.currentTime < activeClip.start || video.currentTime >= activeClip.end) {
        video.currentTime = activeClip.start;
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const applyTemplate = (template: (typeof VIDEO_TEMPLATES)[0]) => {
    setPrompt(template.prompt);
    if (template.config?.aspectRatio) {
      setAspectRatio(template.config.aspectRatio);
    }
    setErrorMsg(null);
  };

  const filteredTemplates = searchQuery.trim()
    ? VIDEO_TEMPLATES.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : VIDEO_TEMPLATES;

  const renderInspectorContent = () => (
    <div className="space-y-6">
      {activeClip ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5" /> Trim Active Clip
            </h3>
            <div className="space-y-4 px-1">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-white/65 font-mono">
                  <span>Start</span>
                  <span>{activeClip.start.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, activeClip.end - 0.5)}
                  step={0.1}
                  value={activeClip.start}
                  onChange={(e) =>
                    handleTrim(activeClip.id, parseFloat(e.target.value), activeClip.end)
                  }
                  className="w-full accent-accent-blue h-6 cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-white/65 font-mono">
                  <span>End</span>
                  <span>{activeClip.end.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={activeClip.start + 0.5}
                  max={activeClip.duration}
                  step={0.1}
                  value={activeClip.end}
                  onChange={(e) =>
                    handleTrim(activeClip.id, activeClip.start, parseFloat(e.target.value))
                  }
                  className="w-full accent-accent-blue h-6 cursor-pointer"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5" /> Outro Transition
            </h3>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
              {TRANSITION_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setClips((prev) =>
                      prev.map((c) => (c.id === activeClip.id ? { ...c, transition: t } : c))
                    )
                  }
                  className={cn(
                    'min-h-[44px] py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center lg:justify-between capitalize',
                    activeClip.transition === t
                      ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                      : 'bg-white/5 text-white/65 border-white/10 hover:border-white/25'
                  )}
                >
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <Settings2 className="w-6 h-6 text-white/25" />
          <p className="text-xs text-white/45">
            Generate or upload a clip to trim and apply transitions
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-white/10 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
          <Settings2 className="w-3.5 h-3.5" /> Project Settings
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-white/45 uppercase font-bold">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['16:9', '9:16'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={cn(
                    'min-h-[44px] py-2 rounded-xl text-xs font-medium border transition-all',
                    aspectRatio === ratio
                      ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                      : 'bg-white/5 text-white/65 border-white/10 hover:border-white/25'
                  )}
                >
                  {ratio === '16:9' ? '16:9 Landscape' : '9:16 Portrait'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-white/45 uppercase font-bold">
              Resolution
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['720p', '1080p'].map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setResolution(res)}
                  className={cn(
                    'min-h-[44px] py-2 rounded-xl text-xs font-medium border transition-all',
                    resolution === res
                      ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                      : 'bg-white/5 text-white/65 border-white/10 hover:border-white/25'
                  )}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 sm:gap-8">
        {/* Main Editor Area */}
        <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
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

          {/* Player View */}
          <div className="glass-card rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden relative group min-h-[220px] sm:min-h-[300px] aspect-video max-h-[420px]">
            {activeClip ? (
              <div className="w-full h-full relative bg-black/50">
                <video
                  ref={videoRef}
                  src={activeClip.url}
                  playsInline
                  style={{ opacity: transitionOpacity }}
                  className="w-full h-full object-contain transition-opacity duration-200"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    const t = video.currentTime;
                    setCurrentTime(t);

                    if (activeClip.transition !== 'none' && activeClip.end - t <= 0.6) {
                      const ratio = Math.max(0.15, (activeClip.end - t) / 0.6);
                      setTransitionOpacity(ratio);
                    } else {
                      setTransitionOpacity(1);
                    }

                    if (t >= activeClip.end) {
                      const currentIdx = clips.findIndex((c) => c.id === activeClip.id);
                      if (currentIdx !== -1 && currentIdx < clips.length - 1) {
                        setActiveClipId(clips[currentIdx + 1].id);
                      } else {
                        video.currentTime = activeClip.start;
                      }
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    const dur = Number.isFinite(video.duration) ? video.duration : activeClip.duration;
                    if (dur > 0 && activeClip.end > dur) {
                      handleTrim(activeClip.id, Math.min(activeClip.start, dur - 0.5), dur);
                    }
                    video.currentTime = activeClip.start;
                    setCurrentTime(activeClip.start);
                    if (isPlaying) {
                      video.play().catch(() => {});
                    }
                  }}
                />

                {/* Touch-friendly playback & split controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full z-10">
                  <button
                    type="button"
                    aria-label={isPlaying ? 'Pause clip' : 'Play clip'}
                    onClick={togglePlay}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-white hover:text-accent-blue transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                  </button>
                  <span className="text-[11px] font-mono text-white/75 px-1 whitespace-nowrap">
                    {currentTime.toFixed(1)}s
                  </span>
                  <div className="w-px h-4 bg-white/20" />
                  <button
                    type="button"
                    onClick={() => handleSplit(activeClip.id, videoRef.current?.currentTime ?? 0)}
                    className="min-h-[40px] px-2 text-white hover:text-accent-blue transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Split</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 p-6">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
                  <VideoIcon className="w-7 h-7 text-white/25" />
                </div>
                <p className="text-white/45 text-xs sm:text-sm">
                  Generate a scene or upload a video clip to edit
                </p>
                <button
                  type="button"
                  onClick={() => videoUploadRef.current?.click()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-white hover:bg-white/15 inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-accent-blue" />
                  <span>Upload Local Video</span>
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-6 text-center z-20">
                <Loader2 className="w-10 h-10 text-accent-pink animate-spin" />
                <div className="space-y-1">
                  <p className="text-white font-medium text-base">Generating Video</p>
                  <p className="text-white/60 text-xs max-w-xs">
                    Veo is rendering your scene. This may take 1–2 minutes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Area */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                Timeline
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-white/55 font-mono">
                  Total: {clips.reduce((acc, c) => acc + (c.end - c.start), 0).toFixed(1)}s
                </span>
                <button
                  type="button"
                  onClick={() => videoUploadRef.current?.click()}
                  className="min-h-[36px] px-3 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-white/80 hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-accent-blue" />
                  <span>Import Clip</span>
                </button>
              </div>
            </div>
            <input
              type="file"
              ref={videoUploadRef}
              onChange={handleLocalVideoUpload}
              accept="video/*"
              className="hidden"
            />

            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide items-center min-h-[88px]">
              {clips.map((clip, idx) => (
                <div key={clip.id} className="flex items-center gap-2 shrink-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveClipId(clip.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveClipId(clip.id);
                      }
                    }}
                    className={cn(
                      'relative w-32 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer group',
                      activeClip?.id === clip.id
                        ? 'border-accent-blue shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                        : 'border-white/10 hover:border-white/25'
                    )}
                  >
                    <video
                      src={clip.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover opacity-65"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <span className="absolute bottom-1.5 left-2 text-[10px] font-mono text-white">
                      {(clip.end - clip.start).toFixed(1)}s
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${clip.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClip(clip.id);
                      }}
                      className="absolute top-1 right-1 w-7 h-7 bg-black/65 rounded-lg flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>

                  {idx < clips.length - 1 && (
                    <button
                      type="button"
                      aria-label="Cycle transition between clips"
                      onClick={() => cycleTransition(clip.id)}
                      className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center border transition-all',
                          clip.transition !== 'none'
                            ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                            : 'bg-white/5 border-white/15 text-white/40 hover:border-white/35'
                        )}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] uppercase font-bold text-white/50">
                        {clip.transition}
                      </span>
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => videoUploadRef.current?.click()}
                className="w-32 h-20 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1 text-white/45 hover:text-white/75 hover:border-white/30 transition-all shrink-0"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] uppercase font-bold">Add Clip</span>
              </button>
            </div>
          </div>

          {/* Template Gallery */}
          <div className="space-y-2">
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
                    className="flex-shrink-0 w-40 sm:w-44 group text-left space-y-1.5"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
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

          {/* Prompt + Bottom Action & Options Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene to generate and add to your timeline..."
              rows={3}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-accent-blue/40 transition-all resize-none text-white placeholder:text-white/35"
            />

            <div className="flex sm:flex-col gap-2 sm:w-44">
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
                        alt="Reference frame"
                        className="absolute inset-0 w-full h-full object-cover opacity-35"
                      />
                      <ImageIcon className="w-4 h-4 text-accent-pink relative z-10 shrink-0" />
                      <span className="text-[11px] text-accent-pink font-semibold relative z-10 whitespace-nowrap">
                        Ref Frame
                      </span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-white/40 shrink-0" />
                      <span className="text-[11px] text-white/55 font-medium whitespace-nowrap">
                        Ref Image
                      </span>
                    </>
                  )}
                </button>
                {selectedImage && (
                  <button
                    type="button"
                    aria-label="Remove reference image"
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
                <span>Edit</span>
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
                  <Plus className="w-4 h-4" />
                )}
                <span>Generate Clip</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Inspector Sidebar */}
        <div className="hidden lg:block">{renderInspectorContent()}</div>
      </div>

      {/* Mobile / Global Bottom Sheet Options Drawer */}
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
                <h3 className="text-base font-semibold text-white">Video Editor Options</h3>
                <button
                  type="button"
                  aria-label="Close options"
                  onClick={onCloseOptions}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderInspectorContent()}
              {onResetProject && (
                <button
                  type="button"
                  onClick={() => {
                    onResetProject();
                    onCloseOptions?.();
                  }}
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 text-xs font-semibold"
                >
                  Reset Video Timeline
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
