import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    // ── Drive OAuth callback ────────────────────────────────────────
    // The /auth/callback route is also used by Google Drive OAuth.
    // Drive tokens carry a `scope` param; handle them separately.
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const isFromDrive = params.get('scope')?.includes('drive') ?? false;

    if (code && isFromDrive) {
      const handleDriveCallback = async () => {
        setMessage('Connecting Google Drive…');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('error');
          setMessage('You must be signed in to connect Google Drive.');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }
        try {
          const res = await fetch('/api/auth/drive/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code }),
          });
          if (!res.ok) throw new Error('Drive connect failed');
          setStatus('success');
          setMessage('Google Drive connected!');
          setTimeout(() => navigate('/', { replace: true }), 1500);
        } catch {
          setStatus('error');
          setMessage('Failed to connect Google Drive. Please try again.');
          setTimeout(() => navigate('/', { replace: true }), 3000);
        }
      };
      handleDriveCallback();
      return;
    }

    // ── Supabase Google OAuth callback ──────────────────────────────
    // The Supabase client is created with detectSessionInUrl: true, so it
    // automatically calls exchangeCodeForSession() as soon as the ?code=
    // param is detected. We must NOT call it a second time manually.
    // Instead, just listen for the SIGNED_IN event which fires once the
    // automatic exchange completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setStatus('success');
          setMessage('Signed in successfully!');
          setTimeout(() => navigate('/', { replace: true }), 800);
        } else if (event === 'INITIAL_SESSION' && !session && !code) {
          // No code in URL and no session — nothing to exchange
          navigate('/login', { replace: true });
        }
      }
    );

    // Safety timeout: if no auth event fires within 10 s, bail out
    const timeout = setTimeout(() => {
      setStatus('error');
      setMessage('Sign-in timed out. Please try again.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg">
          <Sparkles size={22} className="text-white" />
        </div>

        {status === 'loading' && (
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mt-2" />
        )}
        {status === 'success' && (
          <CheckCircle2 size={28} className="text-emerald-400 mt-2" />
        )}
        {status === 'error' && (
          <AlertCircle size={28} className="text-red-400 mt-2" />
        )}

        <div>
          <p className="text-white font-medium">{message}</p>
          {status === 'error' && (
            <p className="text-slate-500 text-sm mt-1">Redirecting…</p>
          )}
        </div>
      </div>
    </div>
  );
}

