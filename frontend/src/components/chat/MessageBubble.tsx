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
      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-slate-500 hover:bg-slate-50 transition-all"
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
      <div className="flex justify-end px-4 md:px-6 animate-fadeSlideUp">
        <div className="flex items-end gap-2 max-w-[75%]">
          <div className="bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-message">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mb-0.5">
            <User size={14} className="text-primary-600" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start px-4 md:px-6 animate-fadeSlideUp">
      <div className="flex items-start gap-2.5 max-w-[85%]">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
          <Sparkles size={13} className="text-white" />
        </div>

        <div className="group flex-1 min-w-0">
          {/* Message card */}
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-message">
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
                      className="text-primary-600 underline hover:text-primary-600"
                    >
                      {children}
                    </a>
                  ),
                  // Styled table wrapper for overflow
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
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
              <div className="flex flex-wrap gap-1.5">
                {message.sources.map((source, i) => (
                  <CitationChip key={source.chunkId} source={source} index={i} />
                ))}
              </div>
            )}
            <CopyButton content={message.content} />
          </div>

          {/* Timestamp */}
          <p className="text-xs text-slate-500 mt-1 ml-1">
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
    <div className="flex justify-start px-4 md:px-6 animate-fadeSlideUp">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
          <Sparkles size={13} className="text-white" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-message">
          <div className="flex items-center gap-1 h-5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}
