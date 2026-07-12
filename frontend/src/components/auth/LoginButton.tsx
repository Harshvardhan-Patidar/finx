import { useAuth } from '../../hooks/useAuth';
import { LogIn, Loader2 } from 'lucide-react';

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className = '' }: LoginButtonProps) {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-500 font-medium text-sm border border-slate-200 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <LogIn size={16} />
      )}
      Sign in with Google
    </button>
  );
}
