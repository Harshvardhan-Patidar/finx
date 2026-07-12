import React, { useState } from 'react';
import { Menu, X, FileText } from 'lucide-react';
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {(leftOpen || rightOpen) && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
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
        className={`fixed inset-y-0 left-0 z-30 w-72 flex flex-col bg-surface-900 border-r border-white/5 transform transition-transform duration-300 ease-in-out lg:hidden ${
          leftOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-500"
          onClick={() => setLeftOpen(false)}
        >
          <X size={20} />
        </button>
        <LeftSidebar
          activeChatId={activeChatId}
          onChatSelect={(id) => { onChatSelect(id); setLeftOpen(false); }}
          onNewChat={() => { onNewChat(); setLeftOpen(false); }}
        />
      </aside>

      {/* ── Center Pane (Chat) ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 lg:hidden">
          <button
            onClick={() => setLeftOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-50"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-slate-500">FinX</span>
          <button
            onClick={() => setRightOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-50"
          >
            <FileText size={20} />
          </button>
        </div>

        {/* Chat content fills the rest */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>

      {/* ── Right Sidebar (Document Vault) ────────────────────── */}
      {/* Desktop: always visible */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col bg-white border-l border-slate-200">
        <DocumentVault />
      </aside>

      {/* Mobile: drawer from right */}
      <aside
        className={`fixed inset-y-0 right-0 z-30 w-80 flex flex-col bg-white border-l border-slate-200 transform transition-transform duration-300 ease-in-out lg:hidden ${
          rightOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 left-4 text-slate-500 hover:text-slate-500"
          onClick={() => setRightOpen(false)}
        >
          <X size={20} />
        </button>
        <DocumentVault />
      </aside>
    </div>
  );
}
