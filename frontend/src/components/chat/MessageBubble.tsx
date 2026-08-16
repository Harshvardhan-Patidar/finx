import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, User, Copy, Check } from 'lucide-react';
import { CitationChip } from './CitationChip';
import type { Message } from '@shared/types';

interface MessageBubbleProps {
  message: Message;
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      // On mobile, always visible (no hover needed); on desktop hover-only
      className="sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-700 transition-all active:scale-95"
      title="Copy response"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-3 sm:px-6 animate-fadeSlideUp">
        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
          <div className="bg-primary-600 text-white rounded-2xl rounded-br-sm px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-message">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mb-0.5">
            <User size={12} className="text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start px-3 sm:px-6 animate-fadeSlideUp">
      <div className="flex items-start gap-2 sm:gap-2.5 max-w-[92%] sm:max-w-[85%]">
        {/* Avatar */}
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
          <Sparkles size={12} className="text-white" />
        </div>

        <div className="group flex-1 min-w-0">
          {/* Message card */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl rounded-tl-sm px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-message">
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Open links in new tab
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 underline hover:text-primary-300"
                    >
                      {children}
                    </a>
                  ),
                  // Styled table wrapper for overflow
                  table: ({ children }) => (
                    <div className="overflow-x-auto -mx-1">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Sources + copy row */}
          <div className="flex items-start justify-between mt-1.5 gap-2">
            {/* Citation chips */}
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 flex-1">
                {message.sources.map((source, i) => (
                  <CitationChip key={source.chunkId} source={source} index={i} />
                ))}
              </div>
            )}
            <CopyButton content={message.content} />
          </div>

          {/* Timestamp */}
          <p className="text-[11px] text-slate-600 mt-1 ml-1">
            {new Date(message.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

// Typing indicator shown while awaiting assistant response
export function TypingIndicator() {
  return (
    <div className="flex justify-start px-3 sm:px-6 animate-fadeSlideUp">
      <div className="flex items-start gap-2 sm:gap-2.5">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
          <Sparkles size={12} className="text-white" />
        </div>
        <div className="bg-surface-800 border border-surface-700 rounded-2xl rounded-tl-sm px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-message">
          <div className="flex items-center gap-2 h-5">
            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            <span className="text-sm text-primary-400 font-medium animate-pulse">FinX is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
