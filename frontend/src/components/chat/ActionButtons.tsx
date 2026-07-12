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
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {ACTION_BUTTONS.map((btn) => {
        const IconComponent = ICONS[btn.icon as keyof typeof ICONS] ?? FileText;
        const isActive = activeAction === btn.id;

        return (
          <button
            key={btn.id}
            onClick={() => handleClick(btn)}
            disabled={disabled}
            title={btn.description}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-primary-600 hover:text-primary-600 hover:bg-primary-600'
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
