import { ExternalLink, FileText } from 'lucide-react';
import type { MessageSource } from '@shared/types';

interface CitationChipProps {
  source: MessageSource;
  index: number;
}

export function CitationChip({ source, index }: CitationChipProps) {
  const isDriveFile = !source.driveFileId.startsWith('upload:');
  const driveUrl = isDriveFile
    ? `https://drive.google.com/file/d/${source.driveFileId}/view`
    : null;

  const handleClick = () => {
    if (driveUrl) window.open(driveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={driveUrl ? handleClick : undefined}
      title={driveUrl ? `Open in Google Drive: ${source.fileName}` : source.fileName}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        driveUrl
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer'
          : 'bg-surface-900 text-slate-300 border-surface-700 cursor-default'
      }`}
    >
      <FileText size={11} className="flex-shrink-0" />
      <span className="max-w-[160px] truncate">
        [{index + 1}] {source.fileName}
      </span>
      {driveUrl && (
        <ExternalLink
          size={10}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </button>
  );
}
