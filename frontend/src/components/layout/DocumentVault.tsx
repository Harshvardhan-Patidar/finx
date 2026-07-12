import React, { useRef, useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Link2,
  Link2Off,
} from 'lucide-react';
import { useDocuments, useDriveStatus } from '../../hooks/useDocuments';
import { api } from '../../lib/api';
import type { Document } from '@shared/types';

const STATUS_CONFIG = {
  complete: {
    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Indexed',
  },
  indexing: {
    icon: <Loader2 size={14} className="text-amber-500 animate-spin" />,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Indexing…',
  },
  pending: {
    icon: <Clock size={14} className="text-slate-500" />,
    badge: 'bg-slate-50 text-slate-500 border-slate-200',
    label: 'Pending',
  },
  failed: {
    icon: <AlertCircle size={14} className="text-red-500" />,
    badge: 'bg-red-50 text-red-700 border-red-200',
    label: 'Failed',
  },
} as const;

function getMimeIcon(mimeType: string | null): string {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📋';
  if (mimeType.startsWith('text/')) return '📝';
  return '📄';
}

function formatFileSize(doc: Document): string {
  if (doc.chunk_count > 0) return `${doc.chunk_count} chunks`;
  return '';
}

export function DocumentVault() {
  const { documents, loading, uploading, upload, deleteDocument } = useDocuments();
  const { data: driveStatus } = useDriveStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadError(null);

    try {
      for (const file of files) {
        await upload(file);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await deleteDocument(docId);
    } finally {
      setDeletingId(null);
    }
  };

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

  const indexedCount = documents.filter((d) => d.sync_status === 'complete').length;
  const totalCount = documents.length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-500">Document Vault</h2>
          {totalCount > 0 && (
            <span className="text-xs text-slate-500">
              {indexedCount}/{totalCount} indexed
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Documents indexed and available for AI queries
        </p>
      </div>

      {/* ── Upload Button ──────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-200">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-primary-600 hover:border-primary-600 hover:bg-primary-600 text-primary-600 hover:text-primary-600 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={15} />
              Upload Document
            </>
          )}
        </button>

        {uploadError && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} />
            {uploadError}
          </p>
        )}

        <p className="mt-1.5 text-xs text-slate-500 text-center">
          PDF, images, text files • max 50MB
        </p>

        {/* Google Drive Connect */}
        <button
          onClick={handleConnectDrive}
          disabled={connectingDrive || driveStatus?.connected}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            driveStatus?.connected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          {driveStatus?.connected ? (
            <>
              <Link2 size={12} />
              Google Drive Connected
            </>
          ) : (
            <>
              <Link2Off size={12} />
              {connectingDrive ? 'Redirecting…' : 'Connect Google Drive'}
            </>
          )}
        </button>
      </div>

      {/* ── Document List ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-chat py-2">
        {loading ? (
          <div className="px-4 space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
              <FileText size={24} className="text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">No documents yet</p>
            <p className="text-xs text-slate-500">
              Upload PDFs, images, or connect Google Drive to get started
            </p>
          </div>
        ) : (
          <div className="px-3 space-y-1.5">
            {documents.map((doc) => {
              const status = STATUS_CONFIG[doc.sync_status];
              return (
                <div
                  key={doc.id}
                  className="group flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-200 hover:shadow-card transition-all"
                >
                  <span className="text-xl flex-shrink-0 leading-none mt-0.5">
                    {getMimeIcon(doc.mime_type)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 truncate" title={doc.file_name}>
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${status.badge}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                      {formatFileSize(doc) && (
                        <span className="text-xs text-slate-500">{formatFileSize(doc)}</span>
                      )}
                    </div>
                    {doc.sync_status === 'failed' && doc.error_message && (
                      <p className="mt-1 text-xs text-red-500 truncate" title={doc.error_message}>
                        {doc.error_message}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-500 hover:text-red-500 transition-all flex-shrink-0"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">Auto-synced via Drive</span>
        <button
          onClick={() => window.location.reload()}
          className="p-1 rounded text-slate-500 hover:text-slate-500 hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
}
