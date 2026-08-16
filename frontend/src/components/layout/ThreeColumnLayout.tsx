import React, { useState } from 'react';
import { Menu, X, FileText, Sparkles, Plus } from 'lucide-react';
import { LeftSidebar } from './LeftSidebar';
import { DocumentVault } from './DocumentVault';

interface ThreeColumnLayoutProps {
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  children: React.ReactNode; // Center pane (ChatPane)
}

export function ThreeColumnLayout({
  activeChatId,
  onChatSelect,
  onNewChat,
  children,
}: ThreeColumnLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {(leftOpen || rightOpen) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => { setLeftOpen(false); setRightOpen(false); }}
        />
      )}

      {/* ── Left Sidebar (Chat History) ────────────────────────── */}
      {/* Desktop: always visible */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-surface-900 border-r border-white/5">
        <LeftSidebar
          activeChatId={activeChatId}
          onChatSelect={onChatSelect}
          onNewChat={onNewChat}
        />
      </aside>

      {/* Mobile: drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[80vw] max-w-[300px] flex flex-col bg-surface-900 border-r border-white/8 transform transition-transform duration-300 ease-in-out lg:hidden ${
          leftOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary-500 flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              <Sparkles size={12} className="text-surface-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">FinX</span>
          </div>
          <button
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
            onClick={() => setLeftOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <LeftSidebar
          activeChatId={activeChatId}
          onChatSelect={(id) => { onChatSelect(id); setLeftOpen(false); }}
          onNewChat={() => { onNewChat(); setLeftOpen(false); }}
        />
      </aside>

      {/* ── Center Pane (Chat) ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-surface-900 border-b border-white/5 lg:hidden">
          {/* Left: Hamburger */}
          <button
            onClick={() => setLeftOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-surface-800 transition-all active:scale-95"
            aria-label="Open chat history"
          >
            <Menu size={20} />
          </button>

          {/* Center: Brand */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-primary-500 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.4)]">
              <Sparkles size={12} className="text-surface-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">FinX</span>
            <span className="text-[10px] text-primary-400 font-medium border border-primary-500/40 rounded-full px-1.5 py-0.5 ml-0.5">AI</span>
          </div>

          {/* Right: New chat + Documents */}
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-surface-800 transition-all active:scale-95"
              aria-label="New chat"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setRightOpen(true)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-surface-800 transition-all active:scale-95"
              aria-label="Open document vault"
            >
              <FileText size={20} />
            </button>
          </div>
        </div>

        {/* Chat content fills the rest */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>

      {/* ── Right Sidebar (Document Vault) ────────────────────── */}
      {/* Desktop: always visible */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col bg-surface-800 border-l border-surface-700">
        <DocumentVault />
      </aside>

      {/* Mobile: drawer from right */}
      <aside
        className={`fixed inset-y-0 right-0 z-30 w-[85vw] max-w-[320px] flex flex-col bg-surface-800 border-l border-surface-700 transform transition-transform duration-300 ease-in-out lg:hidden ${
          rightOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary-400" />
            <span className="text-sm font-semibold text-white">Document Vault</span>
          </div>
          <button
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
            onClick={() => setRightOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <DocumentVault />
      </aside>
    </div>
  );
}
