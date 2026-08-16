import { FileText, BarChart2, CheckSquare } from 'lucide-react';
import type { ActionButton } from '@shared/types';
import { ACTION_BUTTONS } from '@shared/types';
import type { ChatAction } from '../../hooks/useChat';

const ICONS = {
  '📋': FileText,
  '🧾': BarChart2,
  '💰': CheckSquare,
} as const;

interface ActionButtonsProps {
  activeAction: ChatAction;
  onActionSelect: (action: ChatAction) => void;
  disabled?: boolean;
}

export function ActionButtons({ activeAction, onActionSelect, disabled }: ActionButtonsProps) {
  const handleClick = (btn: ActionButton) => {
    // Toggle: clicking active action clears it
    onActionSelect(activeAction === btn.id ? null : btn.id);
  };

  return (
    <div className="flex gap-2 px-3 sm:px-4 py-2 overflow-x-auto scrollbar-none">
      {ACTION_BUTTONS.map((btn) => {
        const IconComponent = ICONS[btn.icon as keyof typeof ICONS] ?? FileText;
        const isActive = activeAction === btn.id;

        return (
          <button
            key={btn.id}
            onClick={() => handleClick(btn)}
            disabled={disabled}
            title={btn.description}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 active:scale-95 ${
              isActive
                ? 'bg-primary-500 text-surface-900 border-primary-500 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-surface-800 text-slate-300 border-surface-700 hover:border-primary-500 hover:text-primary-400 hover:bg-primary-500/10'
            }`}
          >
            <IconComponent size={12} />
            {btn.label}
            {isActive && (
              <span className="ml-0.5 opacity-70 text-xs">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
