import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  ChevronRight,
  Sparkles,
  LogOut,
  User,
} from 'lucide-react';
import { useChatList, useDeleteChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { SettingsModal } from './SettingsModal';

interface LeftSidebarProps {
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

export function LeftSidebar({ activeChatId, onChatSelect, onNewChat }: LeftSidebarProps) {
  const { data: chats, isLoading } = useChatList();
  const deleteChat = useDeleteChat();
  const { user, signOut } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setDeletingId(chatId);
    try {
      await deleteChat.mutateAsync(chatId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-IN', { weekday: 'short' });
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Group chats by date
  const groupedChats = React.useMemo(() => {
    if (!chats) return [];
    const groups = new Map<string, typeof chats>();
    for (const chat of chats) {
      const label = formatDate(chat.created_at);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(chat);
    }
    return Array.from(groups.entries());
  }, [chats]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo + New Chat ─────────────────────────────────────── */}
      <div className="p-4 border-b border-white/8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.4)]">
            <Sparkles size={14} className="text-surface-900" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">FinX</span>
          <span className="text-xs text-slate-300 ml-auto">AI Consultant</span>
        </div>

        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-400 text-surface-900 text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* ── Chat List ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {isLoading ? (
          <div className="px-4 py-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-surface-800/5 rounded-lg mb-2 animate-pulse" />
            ))}
          </div>
        ) : groupedChats.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <MessageSquare size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-300">No conversations yet</p>
            <p className="text-xs text-slate-300 mt-1">Ask FinX a question to get started</p>
          </div>
        ) : (
          groupedChats.map(([label, group]) => (
            <div key={label} className="mb-2">
              <p className="px-3 py-1 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {label}
              </p>
              {group.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={`group w-full flex items-center gap-2 px-3 py-2 rounded-lg mx-1 text-left transition-colors ${
                    activeChatId === chat.id
                      ? 'bg-surface-800/10 text-white'
                      : 'text-slate-300 hover:bg-surface-800/6 hover:text-slate-300'
                  }`}
                >
                  <MessageSquare size={14} className="flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{chat.title}</span>
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    disabled={deletingId === chat.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-800/10 text-slate-300 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Bottom: Profile + Settings ─────────────────────────── */}
      <div className="border-t border-white/8 p-3 space-y-1">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-surface-800/6 hover:text-slate-300 text-sm transition-colors"
        >
          <Settings size={15} />
          Settings
          <ChevronRight size={14} className="ml-auto" />
        </button>

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-surface-800/6 hover:text-slate-300 transition-colors"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <User size={12} className="text-white" />
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">
                  {user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User'}
                </p>
                <p className="text-xs text-slate-300 truncate">{user.email}</p>
              </div>
            </button>

            {showProfile && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-900 border border-white/10 rounded-lg shadow-xl p-1">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-surface-800/8 hover:text-red-400 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
