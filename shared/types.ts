// ============================================================
// Shared TypeScript types for FinX
// Used by both frontend (via import) and backend.
// ============================================================

export interface Profile {
  id: string;
  business_name: string | null;
  google_refresh_token: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  drive_file_id: string;
  file_name: string;
  mime_type: string | null;
  sync_status: 'pending' | 'indexing' | 'complete' | 'failed';
  error_message: string | null;
  chunk_count: number;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface MessageSource {
  fileName: string;
  driveFileId: string;
  chunkId: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: MessageSource[];
  created_at: string;
}

// n8n webhook payload (sent by n8n on Drive events)
export interface IngestWebhookPayload {
  user_id: string;
  drive_file_id: string;
  file_name: string;
  mime_type: string;
  event: 'created' | 'updated' | 'deleted';
}

// Chat API request
export interface ChatRequest {
  chatId: string | null;
  message: string;
  action?: 'draft_rti' | 'gst_summary' | 'tax_deductions' | null;
}

// Chat API response
export interface ChatResponse {
  chatId: string;
  messageId: string;
  answer: string;
  sources: MessageSource[];
}

// Document upload response
export interface UploadResponse {
  documentId: string;
  status: 'indexing' | 'complete' | 'failed';
  message: string;
}

// Action button definitions (used by frontend)
export interface ActionButton {
  id: 'draft_rti' | 'gst_summary' | 'tax_deductions';
  label: string;
  icon: string;
  description: string;
}

export const ACTION_BUTTONS: ActionButton[] = [
  {
    id: 'draft_rti',
    label: 'Draft RTI Application',
    icon: '📋',
    description: 'Generate RTI application per RTI Act 2005',
  },
  {
    id: 'gst_summary',
    label: 'GST Summary',
    icon: '🧾',
    description: 'Summarize GST figures from your documents',
  },
  {
    id: 'tax_deductions',
    label: 'Section 80C/80D Check',
    icon: '💰',
    description: 'List eligible tax deductions from your documents',
  },
];
