import { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Loader2, User, Bot, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { generateChat, analyzeImage } from '../lib/gemini';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  isError?: boolean;
}

interface ChatStudioProps {
  searchQuery?: string;
  isOptionsOpen?: boolean;
  onCloseOptions?: () => void;
  onResetProject?: () => void;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hello! I'm your Studio AI assistant. Ask me to brainstorm scripts, analyze reference images, or refine your creative prompts.",
};

const QUICK_PROMPTS = [
  'Write a 30s YouTube Shorts hook',
  'Suggest lighting for a neon portrait',
  'Outline a product launch reel',
];

export default function ChatStudio({
  searchQuery = '',
  isOptionsOpen = false,
  onCloseOptions,
  onResetProject,
}: ChatStudioProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText ?? input).trim();
    if ((!textToSend && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;
    const currentMime = imageMimeType;

    const userMessage: Message = {
      role: 'user',
      content: textToSend || 'Analyze this image',
      image: currentImage || undefined,
    };

    const historySnapshot = messages.filter((m) => !m.isError);
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput('');
    setSelectedImage(null);
    setImageMimeType(null);
    setIsLoading(true);

    try {
      let responseText = '';
      if (currentImage) {
        const base64Data = currentImage.split(',')[1];
        responseText = await analyzeImage(
          textToSend || 'Analyze this image in detail.',
          base64Data,
          currentMime || 'image/png'
        );
      } else {
        const history = historySnapshot.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        responseText = await generateChat(textToSend, history);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach Studio AI right now.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message, isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : messages;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full relative">
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-6 space-y-4 sm:space-y-6">
        {visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40 text-sm">
            No messages match "{searchQuery}".
          </div>
        ) : (
          visibleMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-2.5 sm:gap-4',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
                  msg.role === 'user'
                    ? 'bg-white/10'
                    : msg.isError
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>

              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[78%] min-w-0 space-y-2 flex flex-col',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Uploaded reference"
                    className="rounded-2xl max-h-56 sm:max-h-64 object-cover border border-white/10 shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div
                  className={cn(
                    'px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm leading-relaxed shadow-sm break-words overflow-hidden max-w-full',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-accent-pink to-[#8000ff] text-white font-medium rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-500/15 text-red-200 border border-red-400/30 backdrop-blur-sm'
                        : 'bg-white/10 text-white/90 border border-white/10 backdrop-blur-sm rounded-bl-sm'
                  )}
                >
                  <div className="space-y-2 [&_pre]:overflow-x-auto [&_pre]:p-2.5 [&_pre]:rounded-xl [&_pre]:bg-black/40 [&_pre]:text-xs [&_code]:font-mono [&_code]:text-xs [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 sm:gap-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-sm text-xs text-white/60 flex items-center gap-2">
              <span>Thinking</span>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Dock */}
      <div className="p-3 sm:p-5 border-t border-white/10 bg-white/5 backdrop-blur-md space-y-2.5">
        {messages.length <= 1 && !selectedImage && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => handleSend(qp)}
                className="shrink-0 min-h-[36px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:border-accent-blue/40 transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-accent-blue shrink-0" />
                <span>{qp}</span>
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative inline-block"
            >
              <img
                src={selectedImage}
                alt="Upload preview"
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-white/20 shadow-xl"
              />
              <button
                type="button"
                aria-label="Remove uploaded image"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-accent-pink text-white rounded-full w-7 h-7 flex items-center justify-center hover:opacity-90 transition-all shadow-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5 focus-within:border-accent-blue/40 transition-all">
          <button
            type="button"
            aria-label="Upload image to analyze"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/50 hover:text-accent-blue hover:bg-white/5 transition-colors shrink-0"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything or upload an image..."
            className="flex-1 min-w-0 bg-transparent py-2.5 px-1 text-sm focus:outline-none text-white placeholder:text-white/35"
          />

          <button
            type="button"
            aria-label="Send message"
            onClick={() => handleSend()}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-gradient-to-r from-accent-pink to-[#8000ff] text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Sheet Options Drawer */}
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
              className="relative w-full max-w-lg bg-[#181330]/95 backdrop-blur-2xl border-t lg:border border-white/15 rounded-t-3xl lg:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto lg:hidden" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Chat Options</h3>
                <button
                  type="button"
                  aria-label="Close options"
                  onClick={onCloseOptions}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([INITIAL_MESSAGE]);
                    onCloseOptions?.();
                  }}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex items-center justify-between text-sm font-medium"
                >
                  <span>Clear Conversation</span>
                  <Trash2 className="w-4 h-4 text-accent-pink" />
                </button>

                {onResetProject && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetProject();
                      onCloseOptions?.();
                    }}
                    className="w-full min-h-[48px] px-4 rounded-2xl bg-accent-blue/15 border border-accent-blue/30 text-accent-blue flex items-center justify-center text-sm font-semibold"
                  >
                    Start Fresh Chat Session
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
