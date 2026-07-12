-- ================================================================
-- FinX Database Schema — Migration 001
-- Apply via: supabase db push  OR  paste in Supabase SQL editor
-- ================================================================

-- ── 1. Profiles ─────────────────────────────────────────────────
-- Extends auth.users — created automatically via trigger below.
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT,
  business_name        TEXT,
  google_refresh_token TEXT,        -- AES-256 encrypted at application layer
  created_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- ── 2. Documents ────────────────────────────────────────────────
-- Metadata only. Vector chunks live in Pinecone, NOT here.
CREATE TABLE IF NOT EXISTS public.documents (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drive_file_id  TEXT        NOT NULL,
  file_name      TEXT        NOT NULL,
  mime_type      TEXT,
  sync_status    TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (sync_status IN ('pending', 'indexing', 'complete', 'failed')),
  error_message  TEXT,
  chunk_count    INTEGER     DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, drive_file_id)
);

-- Index for fast per-user document lookups
CREATE INDEX IF NOT EXISTS idx_documents_user_id
  ON public.documents (user_id, updated_at DESC);

-- ── 3. Chats ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id
  ON public.chats (user_id, created_at DESC);

-- ── 4. Messages ─────────────────────────────────────────────────
-- sources JSONB stores [{fileName, driveFileId, chunkId}] for citation chips
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID        NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  sources    JSONB       NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id
  ON public.messages (chat_id, created_at ASC);

-- ================================================================
-- Row-Level Security Policies
-- Every table is user-scoped. Service role bypasses RLS for ingest.
-- ================================================================

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages  ENABLE ROW LEVEL SECURITY;

-- ── Profiles ────────────────────────────────────────────────────
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── Documents ───────────────────────────────────────────────────
CREATE POLICY "Users view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Documents are updated/deleted by the backend service role only.
-- No user-facing UPDATE/DELETE RLS policy needed (service role bypasses).

-- ── Chats ───────────────────────────────────────────────────────
CREATE POLICY "Users manage own chats"
  ON public.chats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Messages ────────────────────────────────────────────────────
CREATE POLICY "Users view messages in own chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert messages in own chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = auth.uid()
    )
  );

-- ================================================================
-- Trigger: Auto-create profile on user signup
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- Helper function: Updated_at auto-update trigger
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
