import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  Square,
  Settings2,
  Send,
  X,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendVoiceTurn, ChatHistoryItem } from '../lib/gemini';
import { cn } from '../lib/utils';

interface VoiceStudioProps {
  isOptionsOpen?: boolean;
  onOpenOptions?: () => void;
  onCloseOptions?: () => void;
  onResetProject?: () => void;
}

const VOICE_STYLES = [
  'friendly creative director',
  'concise script editor',
  'energetic social strategist',
];

export default function VoiceStudio({
  isOptionsOpen = false,
  onOpenOptions,
  onCloseOptions,
  onResetProject,
}: VoiceStudioProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceStyle, setVoiceStyle] = useState(VOICE_STYLES[0]);
  const [transcript, setTranscript] = useState<ChatHistoryItem[]>([]);
  const [fallbackInput, setFallbackInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = status === 'recording' ? '#00d2ff' : 'rgba(255,255,255,0.2)';

      if (status === 'recording' && analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);
        const sliceWidth = width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
      } else {
        for (let x = 0; x < width; x++) {
          const amp = status === 'processing' ? 14 : 5;
          const speed = status === 'processing' ? 0.14 : 0.04;
          const y = height / 2 + Math.sin(x * 0.03 + frame * speed) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      frame++;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (isMuted || !autoSpeak || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close().catch(() => {});
    analyserRef.current = null;
  };

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Microphone recording is unavailable in this browser. Use the quick prompt box below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          setStatus('idle');
          return;
        }
        setStatus('processing');

        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const userEntry: ChatHistoryItem = { role: 'user', content: '[Voice message]' };
          const { reply } = await sendVoiceTurn({
            audio: { data: base64Data, mimeType: blob.type || 'audio/webm' },
            history: transcript,
            style: voiceStyle,
          });
          setTranscript((prev) => [...prev, userEntry, { role: 'assistant', content: reply }]);
          speakText(reply);
        } catch (error) {
          setErrorMsg(error instanceof Error ? error.message : 'Voice processing failed.');
        } finally {
          setStatus('idle');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch {
      setErrorMsg('Microphone permission was denied. Allow access or type a prompt below.');
      setStatus('idle');
    }
  };

  const handleTextVoiceSend = async () => {
    const clean = fallbackInput.trim();
    if (!clean || status === 'processing') return;
    setFallbackInput('');
    setErrorMsg(null);
    setStatus('processing');

    try {
      const { reply } = await sendVoiceTurn({
        text: clean,
        history: transcript,
        style: voiceStyle,
      });
      setTranscript((prev) => [
        ...prev,
        { role: 'user', content: clean },
        { role: 'assistant', content: reply },
      ]);
      speakText(reply);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Voice request failed.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-5 sm:gap-8 min-h-full justify-between">
        {errorMsg && (
          <div className="w-full flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/15 border border-red-400/30 text-red-200 text-xs">
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

        {/* Header Status */}
        <div className="flex flex-col items-center gap-2 text-center pt-1">
          <span
            className={cn(
              'text-[11px] font-bold uppercase tracking-[0.2em]',
              status === 'recording'
                ? 'text-accent-blue'
                : status === 'processing'
                  ? 'text-accent-pink'
                  : 'text-white/45'
            )}
          >
            {status === 'recording'
              ? 'Listening · Tap Stop to Send'
              : status === 'processing'
                ? 'Thinking...'
                : 'Voice Assistant Ready'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white/95">
            AI Voice Studio
          </h2>
        </div>

        {/* Real Waveform Visualizer */}
        <div className="relative w-full h-36 sm:h-48 glass-card rounded-3xl flex flex-col items-center justify-center overflow-hidden px-4">
          <canvas
            ref={canvasRef}
            width={560}
            height={140}
            className="w-full h-28 sm:h-36"
          />
          <p className="text-[11px] text-white/45 capitalize">
            Persona: {voiceStyle}
          </p>
        </div>

        {/* Transcript */}
        <div className="w-full glass-card rounded-2xl p-4 min-h-[110px] max-h-[200px] overflow-y-auto space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              Session Transcript
            </span>
          </div>
          {transcript.length === 0 ? (
            <p className="text-xs text-white/35">
              Tap the microphone to record a creative prompt, or type below.
            </p>
          ) : (
            <div className="space-y-2">
              {transcript.map((item, idx) => (
                <p
                  key={idx}
                  className={cn(
                    'text-xs sm:text-sm leading-relaxed',
                    item.role === 'user' ? 'text-white/60' : 'text-white/90'
                  )}
                >
                  <span className="font-semibold text-accent-blue mr-1.5">
                    {item.role === 'user' ? 'You:' : 'Studio AI:'}
                  </span>
                  {item.content}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Controls + Quick Text Fallback */}
        <div className="w-full space-y-4 pb-1">
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              aria-label={isMuted ? 'Unmute speech output' : 'Mute speech output'}
              onClick={() => {
                if (!isMuted && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setIsMuted(!isMuted);
              }}
              className={cn(
                'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg',
                isMuted
                  ? 'bg-accent-pink/20 text-accent-pink border border-accent-pink/30'
                  : 'bg-white/5 text-white/75 border border-white/15 hover:bg-white/10'
              )}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              type="button"
              aria-label={status === 'recording' ? 'Stop and send recording' : 'Start recording'}
              disabled={status === 'processing'}
              onClick={() => {
                if (status === 'recording') stopRecordingAndSend();
                else startRecording();
              }}
              className={cn(
                'w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-2xl disabled:opacity-50',
                status === 'recording'
                  ? 'bg-red-500 text-white hover:bg-red-600 scale-105'
                  : 'bg-gradient-to-r from-accent-pink to-[#8000ff] text-white hover:opacity-90'
              )}
            >
              {status === 'processing' ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : status === 'recording' ? (
                <Square className="w-6 h-6 fill-current" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </button>

            <button
              type="button"
              aria-label="Open voice options"
              onClick={onOpenOptions}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 text-white/75 border border-white/15 flex items-center justify-center hover:bg-white/10 shadow-lg"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5">
            <input
              type="text"
              value={fallbackInput}
              onChange={(e) => setFallbackInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTextVoiceSend();
                }
              }}
              placeholder="Or type a quick voice prompt..."
              className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none"
            />
            <button
              type="button"
              aria-label="Send voice prompt"
              disabled={!fallbackInput.trim() || status === 'processing'}
              onClick={handleTextVoiceSend}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 text-white flex items-center justify-center disabled:opacity-40 hover:bg-white/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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
              className="relative w-full max-w-lg max-h-[82dvh] overflow-y-auto bg-[#181330]/95 backdrop-blur-2xl border-t lg:border border-white/15 rounded-t-3xl lg:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5 shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto lg:hidden" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Voice Studio Options</h3>
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
                <label className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Assistant Persona
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {VOICE_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setVoiceStyle(style)}
                      className={cn(
                        'min-h-[44px] px-4 rounded-xl text-xs font-medium border text-left capitalize transition-all',
                        voiceStyle === style
                          ? 'bg-accent-blue text-white border-accent-blue'
                          : 'bg-white/5 text-white/70 border-white/10 hover:border-white/25'
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoSpeak(!autoSpeak)}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-sm text-white/85"
              >
                <span>Speak Replies Aloud</span>
                <span className={autoSpeak ? 'text-accent-blue font-semibold' : 'text-white/40'}>
                  {autoSpeak ? 'On' : 'Off'}
                </span>
              </button>

              {onResetProject && (
                <button
                  type="button"
                  onClick={() => {
                    onResetProject();
                    onCloseOptions?.();
                  }}
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 text-xs font-semibold"
                >
                  Clear Voice Session
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
