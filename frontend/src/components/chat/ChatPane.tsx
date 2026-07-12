import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ActionButtons } from './ActionButtons';
import { useChatMessages, useSendMessage } from '../../hooks/useChat';
import type { ChatAction } from '../../hooks/useChat';
import type { Message } from '@shared/types';

interface ChatPaneProps {
  chatId: string | null;
  onNewChatCreated: (chatId: string) => void;
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)] mb-5">
        <Sparkles size={24} className="text-surface-900" />
      </div>
      <h2 className="text-xl font-bold text-slate-300 mb-2">
        Ask FinX anything about your finances
      </h2>
      <p className="text-slate-300 text-sm max-w-md leading-relaxed mb-6">
        Upload your GST returns, invoices, or financial statements first, then ask questions
        and get answers with exact citations from your documents.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {[
          { q: 'What was my total GST liability in Q1 FY2024?', icon: '🧾' },
          { q: 'List all eligible deductions under Section 80C', icon: '💰' },
          { q: 'What invoices are pending payment from March?', icon: '📋' },
          { q: 'Summarize my GSTR-3B filing for last quarter', icon: '📊' },
        ].map(({ q, icon }) => (
          <div
            key={q}
            className="flex items-start gap-2 p-3 rounded-xl bg-surface-800 border border-surface-700 text-left hover:border-primary-500 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] cursor-default transition-all"
          >
            <span className="text-lg leading-none mt-0.5 flex-shrink-0">{icon}</span>
            <p className="text-xs text-slate-300 leading-relaxed">{q}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-6 text-xs text-slate-300">
        <MessageSquare size={13} />
        <span>Select an action button or type your own question below</span>
      </div>
    </div>
  );
}

export function ChatPane({ chatId, onNewChatCreated }: ChatPaneProps) {
  const [activeAction, setActiveAction] = useState<ChatAction>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data: messages,
    isLoading: messagesLoading,
  } = useChatMessages(chatId);

  const {
    mutate: sendMessage,
    isPending: isSending,
    error: sendError,
    isStreaming,
  } = useSendMessage(onNewChatCreated);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isSending]);

  const handleSend = (message: string, action: ChatAction) => {
    sendMessage({ chatId, message, action });
    setActiveAction(null); // Clear action after send
  };

  const displayMessages: Message[] = messages ?? [];
  const showEmpty = !chatId || (!messagesLoading && displayMessages.length === 0);
  const showTyping = isSending || isStreaming;

  return (
    <div className="flex flex-col h-full bg-surface-900">
      {/* ── Messages area ─────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-chat py-4 space-y-4"
      >
        {showEmpty ? (
          <EmptyState />
        ) : messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {displayMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {showTyping && <TypingIndicator />}
            <div ref={bottomRef} className="h-4" />
          </>
        )}
      </div>

      {/* ── Action buttons ─────────────────────────────────────── */}
      <div className="border-t border-surface-700 bg-surface-800">
        <ActionButtons
          activeAction={activeAction}
          onActionSelect={setActiveAction}
          disabled={isSending}
        />

        {/* ── Chat input ────────────────────────────────────────── */}
        <ChatInput
          onSend={handleSend}
          loading={isSending}
          error={sendError}
          activeAction={activeAction}
        />
      </div>
    </div>
  );
}
