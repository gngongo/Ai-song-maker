/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  MessageSquare,
  Image as ImageIcon,
  Video,
  Music,
  Mic,
  SlidersHorizontal,
  Sparkles,
  Search,
  Plus,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

import ChatStudio from './components/ChatStudio';
import ImageStudio from './components/ImageStudio';
import VideoStudio from './components/VideoStudio';
import MusicStudio from './components/MusicStudio';
import VoiceStudio from './components/VoiceStudio';

type View = 'chat' | 'image' | 'video' | 'music' | 'voice';

export default function App() {
  const [activeView, setActiveView] = useState<View>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [sessionKeys, setSessionKeys] = useState<Record<View, number>>({
    chat: 0,
    image: 0,
    video: 0,
    music: 0,
    voice: 0,
  });

  const navItems: Array<{
    id: View;
    label: string;
    shortLabel: string;
    icon: typeof MessageSquare;
  }> = [
    { id: 'chat', label: 'Chat & Analyze', shortLabel: 'Chat', icon: MessageSquare },
    { id: 'image', label: 'Image Studio', shortLabel: 'Image', icon: ImageIcon },
    { id: 'video', label: 'Video Studio', shortLabel: 'Video', icon: Video },
    { id: 'music', label: 'Music Studio', shortLabel: 'Music', icon: Music },
    { id: 'voice', label: 'Voice Live', shortLabel: 'Voice', icon: Mic },
  ];

  const handleSelectView = (view: View) => {
    setActiveView(view);
    setIsOptionsOpen(false);
  };

  const handleNewProject = () => {
    setSessionKeys((prev) => ({ ...prev, [activeView]: prev[activeView] + 1 }));
    setSearchQuery('');
    setIsOptionsOpen(false);
  };

  const activeNav = navItems.find((i) => i.id === activeView);

  return (
    <div className="h-[100dvh] w-full overflow-hidden font-sans flex flex-col lg:flex-row sm:p-3 lg:p-5 gap-0 sm:gap-3 lg:gap-4">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 glass-panel rounded-3xl flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-pink to-accent-blue rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.3)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-semibold text-lg tracking-tight">Studio AI</h1>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectView(item.id)}
              className={cn(
                'w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                activeView === item.id
                  ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  activeView === item.id ? 'text-accent-blue' : 'text-current'
                )}
              />
              <span className="text-sm font-medium truncate">{item.label}</span>
              {activeView === item.id && (
                <motion.div
                  layoutId="active-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue shadow-[0_0_8px_#00d2ff]"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsOptionsOpen(true)}
            className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-accent-blue" />
            <span className="text-sm font-medium">Studio Options</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden glass-panel sm:rounded-3xl">
        {/* Header */}
        <header className="shrink-0 border-b border-white/10 bg-white/5 backdrop-blur-md z-10">
          <div className="h-12 sm:h-14 lg:h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="lg:hidden w-7 h-7 bg-gradient-to-br from-accent-pink to-accent-blue rounded-lg flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold text-white/90 truncate">
                {activeNav?.label}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Search */}
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates & chat..."
                  className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-8 text-xs focus:outline-none focus:border-white/25 w-48 lg:w-56 transition-all text-white placeholder:text-white/35"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Search Toggle */}
              <button
                type="button"
                aria-label="Toggle search"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                className={cn(
                  'md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors',
                  isMobileSearchOpen || searchQuery
                    ? 'text-accent-blue bg-white/10'
                    : 'text-white/65 hover:text-white'
                )}
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNewProject}
                className="min-h-[38px] sm:min-h-[40px] bg-gradient-to-r from-accent-pink to-[#8000ff] text-white px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-lg whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Expandable Mobile Search Bar */}
          {isMobileSearchOpen && (
            <div className="md:hidden px-3 pb-2.5">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter templates or messages..."
                  className="w-full bg-white/5 border border-white/15 rounded-xl py-2 pl-9 pr-9 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-accent-blue/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 min-h-[32px] min-w-[32px] flex items-center justify-center text-white/50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* View Container */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeView}-${sessionKeys[activeView]}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="h-full"
            >
              {activeView === 'chat' && (
                <ChatStudio
                  searchQuery={searchQuery}
                  isOptionsOpen={isOptionsOpen}
                  onCloseOptions={() => setIsOptionsOpen(false)}
                  onResetProject={handleNewProject}
                />
              )}
              {activeView === 'image' && (
                <ImageStudio
                  searchQuery={searchQuery}
                  isOptionsOpen={isOptionsOpen}
                  onOpenOptions={() => setIsOptionsOpen(true)}
                  onCloseOptions={() => setIsOptionsOpen(false)}
                  onResetProject={handleNewProject}
                />
              )}
              {activeView === 'video' && (
                <VideoStudio
                  searchQuery={searchQuery}
                  isOptionsOpen={isOptionsOpen}
                  onOpenOptions={() => setIsOptionsOpen(true)}
                  onCloseOptions={() => setIsOptionsOpen(false)}
                  onResetProject={handleNewProject}
                />
              )}
              {activeView === 'music' && (
                <MusicStudio
                  searchQuery={searchQuery}
                  isOptionsOpen={isOptionsOpen}
                  onOpenOptions={() => setIsOptionsOpen(true)}
                  onCloseOptions={() => setIsOptionsOpen(false)}
                  onResetProject={handleNewProject}
                />
              )}
              {activeView === 'voice' && (
                <VoiceStudio
                  isOptionsOpen={isOptionsOpen}
                  onOpenOptions={() => setIsOptionsOpen(true)}
                  onCloseOptions={() => setIsOptionsOpen(false)}
                  onResetProject={handleNewProject}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Android / Mobile Bottom Studio & Options Bar */}
        <nav
          aria-label="Studio navigation and options"
          className="lg:hidden shrink-0 bg-[#141029]/90 backdrop-blur-2xl border-t border-white/15 pb-safe z-30"
        >
          <div className="grid grid-cols-6 items-center h-14 px-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  className={cn(
                    'min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors px-0.5',
                    isActive ? 'text-accent-blue' : 'text-white/50 hover:text-white/80'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-medium tracking-tight leading-none truncate max-w-full">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsOptionsOpen(true)}
              className={cn(
                'min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors px-0.5',
                isOptionsOpen ? 'text-accent-pink' : 'text-white/60 hover:text-white'
              )}
            >
              <SlidersHorizontal className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium tracking-tight leading-none truncate max-w-full">
                Options
              </span>
            </button>
          </div>
        </nav>
      </main>
    </div>
  );
}
