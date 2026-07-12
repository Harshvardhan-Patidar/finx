import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS for backend-only operations.
// NEVER expose this key to the frontend.
let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _adminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _adminClient;
}

// ── Document helpers ──────────────────────────────────────────

export async function createDocument(params: {
  userId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
}): Promise<string> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('documents')
    .upsert(
      {
        user_id: params.userId,
        drive_file_id: params.driveFileId,
        file_name: params.fileName,
        mime_type: params.mimeType,
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,drive_file_id' }
    )
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create document: ${error.message}`);
  return data.id;
}

export async function updateDocumentStatus(
  documentId: string,
  status: 'pending' | 'indexing' | 'complete' | 'failed',
  extras?: { chunkCount?: number; errorMessage?: string }
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('documents')
    .update({
      sync_status: status,
      ...(extras?.chunkCount !== undefined && { chunk_count: extras.chunkCount }),
      ...(extras?.errorMessage !== undefined && { error_message: extras.errorMessage }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) console.error(`[supabase] Failed to update document status:`, error.message);
}

export async function deleteDocument(userId: string, driveFileId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('documents')
    .delete()
    .eq('user_id', userId)
    .eq('drive_file_id', driveFileId);

  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}

export async function getDocumentByDriveId(
  userId: string,
  driveFileId: string
): Promise<{ id: string } | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('documents')
    .select('id')
    .eq('user_id', userId)
    .eq('drive_file_id', driveFileId)
    .maybeSingle();

  if (error) throw new Error(`Failed to query document: ${error.message}`);
  return data;
}

// ── Chat helpers ──────────────────────────────────────────────

export async function createChat(userId: string, title?: string): Promise<string> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('chats')
    .insert({ user_id: userId, title: title ?? 'New Chat' })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create chat: ${error.message}`);
  return data.id;
}

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from('chats').update({ title }).eq('id', chatId);
}

export async function saveMessage(params: {
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: object[];
}): Promise<string> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('messages')
    .insert({
      chat_id: params.chatId,
      role: params.role,
      content: params.content,
      sources: params.sources ?? [],
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save message: ${error.message}`);
  return data.id;
}

export async function getRecentMessages(
  chatId: string,
  limit = 10
): Promise<Array<{ role: string; content: string }>> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('messages')
    .select('role, content')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get messages: ${error.message}`);
  return (data ?? []).reverse();
}

// ── Profile helpers ───────────────────────────────────────────

export async function getProfile(userId: string): Promise<{ google_refresh_token: string | null }> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get profile: ${error.message}`);
  return data ?? { google_refresh_token: null };
}

export async function saveRefreshToken(userId: string, encryptedToken: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('profiles')
    .upsert({ id: userId, google_refresh_token: encryptedToken });

  if (error) throw new Error(`Failed to save refresh token: ${error.message}`);
}
