import React, { useState } from 'react';
import { 
  X, 
  User, 
  Link2, 
  Link2Off, 
  Palette, 
  CheckCircle2, 
  Monitor,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDriveStatus } from '../../hooks/useDocuments';
import { api } from '../../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'integrations' | 'appearance';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const { data: driveStatus, isLoading: isDriveLoading } = useDriveStatus();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [connectingDrive, setConnectingDrive] = useState(false);

  if (!isOpen) return null;

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    try {
      const { url } = await api.get<{ url: string }>('/api/auth/drive/url');
      window.location.href = url;
    } catch (err) {
      console.error('Failed to get Drive auth URL:', err);
    } finally {
      setConnectingDrive(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
            <div className="flex items-center gap-4 p-4 bg-surface-900 rounded-xl border border-surface-700">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-16 h-16 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                  <User size={32} className="text-primary-400" />
                </div>
              )}
              <div>
                <p className="text-lg font-medium text-white">
                  {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'}
                </p>
                <p className="text-sm text-slate-300">{user?.email}</p>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Integrations</h3>
            <div className="p-4 bg-surface-900 rounded-xl border border-surface-700 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-white flex items-center gap-2">
                    Google Drive
                    {driveStatus?.connected && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-900">
                        <CheckCircle2 size={10} /> Connected
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-slate-300 mt-1 max-w-sm">
                    Connect your Google Drive to sync and search through your financial documents securely.
                  </p>
                </div>
                {isDriveLoading ? (
                  <div className="px-4 py-2">
                    <Loader2 size={18} className="animate-spin text-slate-300" />
                  </div>
                ) : (
                  <button
                    onClick={handleConnectDrive}
                    disabled={connectingDrive || driveStatus?.connected}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      driveStatus?.connected
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900 cursor-default'
                        : 'bg-surface-800 border border-surface-600 text-slate-300 hover:bg-surface-700 shadow-sm'
                    }`}
                  >
                    {driveStatus?.connected ? (
                      <>
                        <Link2 size={16} />
                        Connected
                      </>
                    ) : (
                      <>
                        <Link2Off size={16} />
                        {connectingDrive ? 'Redirecting…' : 'Connect'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Appearance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-900 rounded-xl border border-surface-700 cursor-default opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-900 flex items-center justify-center text-white">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">System Theme</h4>
                    <p className="text-sm text-slate-300">Currently using the default application theme.</p>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal — bottom sheet on mobile, centered dialog on desktop */}
      <div className="relative w-full sm:max-w-2xl bg-surface-800 sm:rounded-2xl rounded-t-2xl shadow-2xl border border-surface-700/80 overflow-hidden flex flex-col md:flex-row max-h-[92vh] sm:h-[600px] sm:max-h-[85vh]">

        {/* ── Mobile: horizontal tab bar at top ─────────────────── */}
        <div className="md:hidden bg-surface-900 border-b border-surface-700">
          {/* Header row */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            {/* Drag handle (visual only) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-surface-700" />
            <h2 className="text-base font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
          {/* Tab strip */}
          <div className="flex border-t border-surface-700/50">
            {([
              { id: 'profile' as Tab, label: 'Profile', icon: User },
              { id: 'integrations' as Tab, label: 'Integrations', icon: Link2 },
              { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Desktop: vertical sidebar ──────────────────────────── */}
        <div className="hidden md:flex w-64 bg-surface-900 border-r border-surface-700 p-4 flex-col">
          <h2 className="text-xl font-bold text-white mb-6 px-2">Settings</h2>
          <nav className="space-y-1 flex-1">
            {([
              { id: 'profile' as Tab, label: 'Profile', icon: User },
              { id: 'integrations' as Tab, label: 'Integrations', icon: Link2 },
              { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-slate-300 hover:bg-surface-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface-800 overflow-hidden">
          {/* Desktop close button */}
          <div className="hidden md:flex justify-end p-4 pb-0">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 px-4 sm:px-6 md:px-10 py-5 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
