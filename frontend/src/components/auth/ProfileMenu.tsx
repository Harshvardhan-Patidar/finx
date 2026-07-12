import { useState, useRef, useEffect } from 'react';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User';
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-800/8 transition-colors text-slate-300"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
            <User size={12} className="text-white" />
          </div>
        )}
        <span className="text-sm font-medium truncate max-w-[120px]">{name}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-surface-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-white/8">
            <p className="text-xs font-semibold text-slate-300 truncate">{name}</p>
            <p className="text-xs text-slate-300 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-surface-800/8 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
