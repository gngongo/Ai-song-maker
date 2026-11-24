import { useState } from 'react';
import {
  Download,
  Loader2,
  Wand2,
  Maximize2,
  Layers,
  Image as ImageIcon,
  Sparkles,
  SlidersHorizontal,
  X,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateImage } from '../lib/gemini';
import { cn } from '../lib/utils';
import { IMAGE_TEMPLATES } from '../constants/templates';

interface ImageStudioProps {
  searchQuery?: string;
  isOptionsOpen?: boolean;
  onOpenOptions?: () => void;
  onCloseOptions?: () => void;
  onResetProject?: () => void;
}

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
];

const SIZES = [
  { label: '1K', value: '1K', dims: '1024px' },
  { label: '2K', value: '2K', dims: '2048px' },
  { label: '4K', value: '4K', dims: '4096px' },
];

export default function ImageStudio({
  searchQuery = '',
  isOptionsOpen = false,
  onOpenOptions,
  onCloseOptions,
  onResetProject,
}: ImageStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const url = await generateImage(prompt, { aspectRatio, imageSize });
      setGeneratedImage(url);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Image generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `studio-ai-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyTemplate = (template: (typeof IMAGE_TEMPLATES)[0]) => {
    setPrompt(template.prompt);
    if (template.config?.aspectRatio) {
      setAspectRatio(template.config.aspectRatio);
    }
    setErrorMsg(null);
  };

  const filteredTemplates = searchQuery.trim()
    ? IMAGE_TEMPLATES.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : IMAGE_TEMPLATES;

  const renderOptionsContent = () => (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" /> Aspect Ratio
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              type="button"
              onClick={() => setAspectRatio(ratio.value)}
              className={cn(
                'min-h-[44px] py-2 px-3 rounded-xl text-xs font-medium border transition-all whitespace-nowrap',
                aspectRatio === ratio.value
                  ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                  : 'bg-white/5 text-white/70 border-white/10 hover:border-white/25'
              )}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5" /> Resolution
        </h3>
        <div className="flex flex-col gap-2">
          {SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => setImageSize(size.value)}
              className={cn(
                'w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-medium border transition-all flex items-center justify-between',
                imageSize === size.value
                  ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                  : 'bg-white/5 text-white/70 border-white/10 hover:border-white/25'
              )}
            >
              <span>{size.label}</span>
              <span className="opacity-50 font-mono">{size.dims}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-2xl p-4 backdrop-blur-sm">
        <p className="text-xs text-accent-blue/90 leading-relaxed">
          <strong>Tip:</strong> Specify lighting styles such as "cinematic volumetric fog" or "soft studio rim light" for sharper depth.
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 sm:gap-8 min-h-full">
        {/* Canvas + Bottom Controls Area */}
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

          {/* Canvas */}
          <div className="min-h-[240px] sm:min-h-[340px] lg:flex-1 glass-card rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden relative group">
            {generatedImage ? (
              <>
                <img
                  src={generatedImage}
                  alt="Generated artwork"
                  className="w-full h-full max-h-[460px] object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    aria-label="Download image"
                    onClick={handleDownload}
                    className="min-h-[44px] min-w-[44px] bg-black/65 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all shadow-xl"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Fullscreen preview"
                    onClick={() => setIsPreviewOpen(true)}
                    className="min-h-[44px] min-w-[44px] bg-black/65 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all shadow-xl"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 p-6">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
                  <ImageIcon className="w-7 h-7 text-white/25" />
                </div>
                <p className="text-white/45 text-sm">Your masterpiece will appear here</p>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-20 p-4 text-center">
                <Loader2 className="w-10 h-10 text-accent-blue animate-spin" />
                <p className="text-white text-sm font-medium">Crafting your vision...</p>
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
                      <p className="text-[11px] text-white/45 line-clamp-1">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prompt + Bottom Action & Options Bar */}
          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create in detail..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-accent-blue/40 transition-all resize-none text-white placeholder:text-white/35"
            />

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenOptions}
                className="lg:hidden min-h-[46px] px-3.5 rounded-xl bg-white/5 border border-white/15 text-xs font-medium text-white/80 hover:bg-white/10 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-accent-blue" />
                <span>
                  {aspectRatio} · {imageSize}
                </span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 lg:flex-none lg:ml-auto min-h-[46px] bg-gradient-to-r from-accent-pink to-[#8000ff] text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-45 transition-all shadow-lg whitespace-nowrap"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>Generate Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Inspector Sidebar */}
        <div className="hidden lg:block">{renderOptionsContent()}</div>
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
                <h3 className="text-base font-semibold text-white">Image Studio Options</h3>
                <button
                  type="button"
                  aria-label="Close options"
                  onClick={onCloseOptions}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderOptionsContent()}
              {onResetProject && (
                <button
                  type="button"
                  onClick={() => {
                    onResetProject();
                    onCloseOptions?.();
                  }}
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 text-xs font-semibold"
                >
                  Reset Image Studio
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isPreviewOpen && generatedImage && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close fullscreen preview"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={generatedImage}
              alt="Generated full preview"
              className="max-w-full max-h-[88dvh] object-contain rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
