import React, { useState, useRef, useCallback } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import type { ChatAction } from '../../hooks/useChat';

interface ChatInputProps {
  onSend: (message: string, action: ChatAction) => void;
  loading: boolean;
  error?: Error | null;
  activeAction: ChatAction;
  disabled?: boolean;
  placeholder?: string;
}

const ACTION_LABELS: Record<NonNullable<ChatAction>, string> = {
  draft_rti: 'Draft RTI Application',
  gst_summary: 'GST Summary',
  tax_deductions: 'Section 80C/80D Check',
};

export function ChatInput({
  onSend,
  loading,
  error,
  activeAction,
  disabled,
  placeholder,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    adjustHeight();
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading || disabled) return;
    onSend(trimmed, activeAction);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const effectivePlaceholder =
    placeholder ??
    (activeAction
      ? `Ask about ${ACTION_LABELS[activeAction]}… (based on your documents)`
      : 'Ask FinX about your financial documents…');

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Active action badge */}
      {activeAction && (
        <div className="mb-2 flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 bg-primary-500/10 text-primary-400 border border-primary-500/30 rounded-full px-2 py-0.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            {ACTION_LABELS[activeAction]} mode active
          </span>
          <span className="text-slate-300">— click button above to cancel</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-2 flex items-center gap-2 text-xs text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
          <AlertCircle size={13} />
          {error.message}
        </div>
      )}

      {/* Input area */}
      <div
        className={`flex items-end gap-2 bg-surface-900 border rounded-2xl shadow-sm transition-all ${
            disabled ? 'border-surface-700 opacity-60' : 'border-surface-700 focus-within:border-primary-500 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.1)]'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={loading || disabled}
          placeholder={effectivePlaceholder}
          rows={1}
          className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed leading-relaxed"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || loading || disabled}
          className="m-2 w-9 h-9 rounded-xl bg-primary-500 hover:bg-primary-400 text-surface-900 flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]"
          title="Send message (Enter)"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      <p className="mt-1.5 text-center text-xs text-slate-300">
        FinX answers only from your uploaded documents ·{' '}
        <span className="font-medium">Enter</span> to send, <span className="font-medium">Shift+Enter</span> for newline
      </p>
    </div>
  );
}
