import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Video, 
  Scissors, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  Play
} from 'lucide-react';
import { analyzeVideo } from './lib/gemini';

interface Clip {
  id?: string;
  url?: string;
  start_time: number;
  end_time: number;
  title: string;
  hook: string;
  reason: string;
  subtitles: { text: string; start: number; end: number }[];
}

interface CalendarDay {
  day: number;
  theme: string;
  post_time: string;
  caption: string;
}

interface AnalysisResult {
  clips: Clip[];
  calendar: CalendarDay[];
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'clipping' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [processedClips, setProcessedClips] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const processVideo = async () => {
    if (!file) return;

    try {
      setStatus('analyzing');
      setErrorMessage('');

      // 1. Analyze with Gemini
      const base64 = await fileToBase64(file);
      const analysis = await analyzeVideo(base64, file.type);
      setResult(analysis);

      // 2. Send to backend for clipping
      setStatus('clipping');
      const formData = new FormData();
      formData.append('video', file);
      formData.append('clips', JSON.stringify(analysis.clips));

      const response = await fetch('/api/clip-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to clip video');

      const clipData = await response.json();
      setProcessedClips(clipData.clips);
      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans selection:bg-editorial-accent/20 border-[12px] border-editorial-ink flex flex-col">
      <header className="relative z-10 border-b border-editorial-ink px-10 py-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline">
            <h1 className="text-5xl font-serif font-black tracking-tighter uppercase leading-none">
              CLARIO<span className="text-editorial-accent">.</span>AI
            </h1>
          </div>
          <div className="h-10 w-[1px] bg-editorial-ink/20 mx-2 hidden sm:block" />
          <div className="hidden sm:flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-ink/40">
              Repurposing Engine
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-ink/40">
              V.01 / 2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-editorial-accent">Status: {status === 'idle' ? 'Ready' : status.toUpperCase()}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-10 py-12">
        <AnimatePresence mode="wait">
          {status === 'idle' || status === 'error' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl"
            >
              <div className="mb-16">
                <h2 className="text-7xl font-serif font-bold mb-6 tracking-tight leading-[0.9] max-w-2xl">
                  Transform Your <span className="italic font-normal">Long-Form</span> Video Assets.
                </h2>
                <div className="h-1 w-24 bg-editorial-accent mb-6" />
                <p className="text-lg text-editorial-ink/60 max-w-xl font-medium leading-relaxed">
                  Automatically identify, transcribe, and extract viral-worthy moments from your master files using advanced visual intelligence.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      group relative border border-editorial-ink p-16 transition-all cursor-pointer bg-white
                      ${file ? 'border-editorial-accent' : 'hover:bg-editorial-sidebar'}
                    `}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="video/*"
                    />
                    <div className="flex flex-col items-center text-center">
                      <Upload className={`w-12 h-12 mb-6 ${file ? 'text-editorial-accent' : 'text-editorial-ink/20'}`} />
                      <p className="text-2xl font-serif font-bold mb-2">
                        {file ? file.name : 'Select Video File'}
                      </p>
                      <p className="text-editorial-ink/40 text-xs font-bold uppercase tracking-widest">
                        MP4, MOV, WebM &bull; Maximum 50MB
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="mt-6 p-6 bg-editorial-accent/5 border border-editorial-accent/20 flex items-center gap-4 text-editorial-accent">
                      <AlertCircle className="w-6 h-6 flex-shrink-0" />
                      <p className="font-bold text-sm uppercase tracking-tight">{errorMessage}</p>
                    </div>
                  )}

                  <button
                    disabled={!file}
                    onClick={processVideo}
                    className="w-full mt-10 py-6 bg-editorial-ink text-editorial-bg font-bold hover:bg-editorial-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xl uppercase tracking-widest flex items-center justify-center gap-3"
                  >
                    Start Repurposing Pipeline <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-editorial-sidebar p-10 border border-editorial-ink/10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6 text-editorial-ink/40 border-b border-editorial-ink/10 pb-4">
                      Extraction Specs
                    </h3>
                    <ul className="space-y-4 font-serif text-lg italic">
                      <li>&bull; Gemini 3 Vision Pulse</li>
                      <li>&bull; Whisper-X Timestamping</li>
                      <li>&bull; Viral Hook Generation</li>
                      <li>&bull; MoviePy Rendering</li>
                    </ul>
                  </div>
                  <div className="pt-10">
                    <p className="text-[10px] font-bold uppercase mb-2">Ready to play</p>
                    <Play className="w-8 h-8 text-editorial-accent" />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : status === 'analyzing' || status === 'clipping' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-xl mx-auto py-20"
            >
              <div className="mb-12">
                <div className="h-1 bg-editorial-ink/10 w-full mb-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: status === 'analyzing' ? '40%' : '80%' }}
                    className="h-full bg-editorial-accent"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-editorial-ink/40">Processing Pipeline</span>
                  <span className="text-[10px] font-bold text-editorial-accent uppercase tracking-widest">Active</span>
                </div>
              </div>

              <h2 className="text-4xl font-serif font-black italic mb-4 leading-tight">
                {status === 'analyzing' ? 'Decoding the visual narrative...' : 'Rendering high-intensity excerpts...'}
              </h2>
              <p className="text-editorial-ink/60 mb-12 font-medium">
                Identified moments are being extracted into social-first formats.
              </p>
              
              <div className="space-y-4">
                {[
                  { label: 'Vision Analysis', active: status === 'analyzing' || status === 'clipping', done: status === 'clipping' },
                  { label: 'Moment Identification', active: status === 'analyzing', done: status === 'clipping' },
                  { label: 'FFmpeg Extraction', active: status === 'clipping', done: false },
                  { label: 'Subtitle Overlay', active: status === 'clipping', done: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-editorial-ink/10 py-4">
                    <span className={`text-xs font-bold uppercase tracking-widest ${step.active ? 'text-editorial-ink' : 'text-editorial-ink/20'}`}>
                      {step.label}
                    </span>
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-editorial-accent" />
                    ) : step.active ? (
                      <Loader2 className="w-4 h-4 text-editorial-accent animate-spin" />
                    ) : (
                      <div className="w-4 h-4 border border-editorial-ink/10" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-16">
              <div className="flex-grow">
                <div className="mb-12 border-b border-editorial-ink pb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-5xl font-serif font-bold tracking-tight mb-2">Viral Clip Extracts</h2>
                    <p className="text-editorial-ink/50 font-medium uppercase text-[10px] tracking-widest italic">Inventory of high-potential content segments</p>
                  </div>
                  <button 
                    onClick={() => { setStatus('idle'); setResult(null); setFile(null); }}
                    className="text-[10px] font-bold uppercase border border-editorial-ink px-4 py-2 hover:bg-editorial-ink hover:text-white transition-all tracking-widest"
                  >
                    New Project
                  </button>
                </div>

                <div className="space-y-16">
                  {processedClips.map((clip, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={clip.id}
                      className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start"
                    >
                      <div className="aspect-video bg-editorial-sidebar border border-editorial-ink/20 relative group overflow-hidden">
                        <video 
                          src={clip.url} 
                          controls 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="relative pt-2">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-mono text-xs font-bold text-editorial-accent bg-editorial-accent/10 px-2 py-1">
                            {Math.floor(clip.start_time / 60)}:{(clip.start_time % 60).toString().padStart(2, '0')} &mdash; {Math.floor(clip.end_time / 60)}:{(clip.end_time % 60).toString().padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-editorial-ink/30">Clip {i + 1}</span>
                        </div>
                        <h3 className="text-2xl font-serif font-bold mb-4 leading-tight uppercase tracking-tighter">{clip.title}</h3>
                        <p className="text-editorial-accent font-serif italic text-lg mb-6 leading-relaxed">
                          "{clip.hook}"
                        </p>
                        <div className="p-4 bg-white border border-editorial-ink/10 mb-6">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-editorial-ink/30 mb-2">Strategic value</p>
                          <p className="text-sm text-editorial-ink/70 leading-relaxed font-medium">{clip.reason}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <a 
                            href={clip.url} 
                            download 
                            className="bg-editorial-ink text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-editorial-accent transition-all flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" /> Download Segment
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )) || (
                    <div className="text-center py-20 opacity-20 italic">No clips processed yet.</div>
                  )}
                </div>
              </div>

              <aside className="w-full lg:w-80 space-y-12">
                <div className="bg-editorial-sidebar border border-editorial-ink p-8">
                  <h2 className="text-xl font-serif font-bold italic border-b border-editorial-ink mb-6 pb-2">7-Day Strategy</h2>
                  <div className="space-y-4">
                    {result?.calendar.map((day, i) => (
                      <div key={i} className="flex justify-between items-baseline border-b border-editorial-ink/10 border-dashed pb-2">
                        <span className="text-[10px] font-bold uppercase text-editorial-ink/40">Day {day.day}</span>
                        <div className="text-right">
                          <p className="font-serif font-bold text-sm tracking-tight">{day.theme}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-editorial-accent mt-1">{day.post_time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-8 border-t border-editorial-ink/10">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-serif font-black">05</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-editorial-ink/40">Total Assets</span>
                    </div>
                    <div className="h-1.5 bg-editorial-ink/10 w-full rounded-full">
                      <div className="h-full bg-editorial-accent w-[85%] rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="p-8 border border-editorial-ink bg-white">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-editorial-ink pb-2">Export Metadata</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-xs text-editorial-ink/40 font-bold uppercase">Format</span>
                      <span className="text-xs font-bold uppercase">1080x1920 (9:16)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-editorial-ink/40 font-bold uppercase">Pipeline</span>
                      <span className="text-xs font-bold uppercase">V.01 Stable</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-editorial-ink px-10 py-12 flex flex-col md:flex-row items-center justify-between gap-8 bg-white mt-auto">
        <div className="flex items-center gap-12">
          <div className="text-center md:text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest text-editorial-ink/40 mb-1">Clips Proc</p>
            <p className="text-2xl font-serif font-bold leading-none">05</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest text-editorial-ink/40 mb-1">Captions</p>
            <p className="text-2xl font-serif font-bold leading-none">418</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest text-editorial-ink/40 mb-1">Hooks/Clip</p>
            <p className="text-2xl font-serif font-bold leading-none">03</p>
          </div>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-ink/30 italic">
          Ready for export &bull; Repurposing Engine &bull; AI Optimized
        </p>
      </footer>
    </div>
  );
}
