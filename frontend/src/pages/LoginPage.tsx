import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, Shield, FileSearch, BarChart2, TrendingUp } from 'lucide-react';

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Document-Grounded AI',
    desc: 'Ask questions answered strictly from your uploaded financial documents — no hallucinations.',
  },
  {
    icon: BarChart2,
    title: 'GST & Tax Analysis',
    desc: 'Instant GST summaries, Section 80C/80D checks, and ITR support from your own returns.',
  },
  {
    icon: Shield,
    title: 'Complete Data Privacy',
    desc: 'Your documents are isolated at every layer. Zero cross-tenant data leakage.',
  },
  {
    icon: TrendingUp,
    title: 'Draft RTI Applications',
    desc: 'Auto-generate RTI applications per the RTI Act 2005 using details from your files.',
  },
];

export function LoginPage() {
  const { user, loading, signInWithGoogle, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-slate-900 flex">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">FinX</span>
          <span className="ml-2 text-xs font-medium text-primary-600 border border-primary-600 rounded-full px-2 py-0.5">
            AI Consultant
          </span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your AI-powered financial advisor — built on{' '}
            <span className="text-primary-600">your documents</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Upload your GST returns, invoices, and financial statements. FinX reads them and
            answers every question with exact citations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/4 border border-white/6">
              <div className="w-8 h-8 rounded-lg bg-primary-600/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={15} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-0.5">{title}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login (full screen on mobile) */}
      <div className="flex-1 flex flex-col min-h-screen lg:items-center lg:justify-center">

        {/* ── Mobile: full-page branded layout ─────────────────── */}
        <div className="flex flex-col flex-1 lg:hidden">

          {/* Mobile hero section */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 overflow-hidden">
            {/* Glow blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-primary-500/5 blur-3xl pointer-events-none" />

            {/* Logo */}
            <div className="relative flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center shadow-[0_0_40px_rgba(0,240,255,0.5)] mb-4">
                <Sparkles size={28} className="text-surface-900" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">FinX</span>
                <span className="text-xs font-medium text-primary-400 border border-primary-500/40 rounded-full px-2 py-0.5">
                  AI Consultant
                </span>
              </div>
            </div>

            {/* Tagline */}
            <div className="text-center mb-8 max-w-xs">
              <h1 className="text-2xl font-bold text-white leading-snug mb-3">
                Your AI-powered{' '}
                <span className="text-primary-400">financial advisor</span>
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Upload GST returns, invoices & statements. Get answers with exact citations from your documents.
              </p>
            </div>

            {/* Feature chips row */}
            <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-xs">
              {['GST Analysis', 'Tax Deductions', 'RTI Drafts', 'Private & Secure'].map((chip) => (
                <span
                  key={chip}
                  className="text-[11px] font-medium text-primary-400 bg-primary-500/10 border border-primary-500/25 rounded-full px-3 py-1"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Mobile login card — fixed at bottom */}
          <div className="px-5 pb-8 pt-4">
            <div className="bg-surface-800/90 backdrop-blur-sm border border-white/8 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-1">Sign in to continue</h2>
              <p className="text-slate-400 text-sm mb-5">
                Access your financial AI workspace
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </button>

              <p className="mt-4 text-center text-xs text-slate-500 leading-relaxed">
                Built for Indian businesses · GST · ITR · RTI · Legal
              </p>
            </div>
          </div>
        </div>

        {/* ── Desktop: centered login card ─────────────────────── */}
        <div className="hidden lg:block w-full max-w-sm p-6">
          {/* Mobile logo (hidden on lg, shown for desktop right panel) */}
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">FinX</span>
          </div>

          <div className="bg-surface-900/80 backdrop-blur-sm border border-white/8 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-300 text-sm mb-8">
              Sign in to access your financial AI workspace
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-surface-800 hover:bg-surface-700 text-slate-300 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-surface-700 border-t-neutral rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            <p className="mt-6 text-center text-xs text-slate-300 leading-relaxed">
              By signing in, you agree to our Terms of Service. Your documents are{' '}
              <span className="text-slate-300">never shared</span> with other users.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-300">
            Built for Indian businesses ·{' '}
            <span className="text-slate-300">GST · ITR · RTI · Legal</span>
          </p>
        </div>
      </div>
    </div>
  );
}
