import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { createChat, getSupabaseAdmin } from '../services/supabase';

export const chatsRouter = Router();

chatsRouter.use(authMiddleware);

/**
 * GET /api/chats
 * List all chats for the authenticated user (ordered by most recent).
 */
chatsRouter.get('/chats', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('chats')
      .select('id, title, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chats
 * Create a new empty chat (optional — /api/chat creates one automatically).
 */
chatsRouter.post('/chats', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title } = z.object({ title: z.string().optional() }).parse(req.body);
    const chatId = await createChat(req.userId, title ?? 'New Chat');
    res.status(201).json({ id: chatId, title: title ?? 'New Chat' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chats/:id/messages
 * Load all messages for a specific chat (ownership verified).
 */
chatsRouter.get(
  '/chats/:id/messages',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chatId = req.params.id;
      const db = getSupabaseAdmin();

      // Verify chat belongs to this user
      const { data: chat, error: chatError } = await db
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', req.userId)
        .maybeSingle();

      if (chatError || !chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }

      // Fetch messages
      const { data: messages, error } = await db
        .from('messages')
        .select('id, role, content, sources, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      res.json(messages ?? []);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/chats/:id
 * Delete a chat and all its messages (cascade).
 */
chatsRouter.delete(
  '/chats/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = getSupabaseAdmin();
      const { error } = await db
        .from('chats')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);
