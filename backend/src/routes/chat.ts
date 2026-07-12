import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { runRAGChain, generateChatTitle } from '../rag/chain';
import {
  createChat,
  saveMessage,
  getRecentMessages,
  updateChatTitle,
  getSupabaseAdmin,
} from '../services/supabase';

export const chatRouter = Router();

const ChatRequestSchema = z.object({
  chatId: z.string().uuid().nullable().default(null),
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
  action: z
    .enum(['draft_rti', 'gst_summary', 'tax_deductions'])
    .nullable()
    .optional()
    .default(null),
});

/**
 * POST /api/chat
 * Main RAG chat endpoint. Creates or continues a conversation.
 */
chatRouter.post(
  '/chat',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { chatId: inputChatId, message, action } = ChatRequestSchema.parse(req.body);
      const userId = req.userId;

      // ── 1. Ensure chat exists ────────────────────────────────
      let chatId = inputChatId;
      let isNewChat = false;

      if (!chatId) {
        chatId = await createChat(userId, 'New Chat');
        isNewChat = true;
      } else {
        // Verify ownership
        const db = getSupabaseAdmin();
        const { data, error } = await db
          .from('chats')
          .select('id')
          .eq('id', chatId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !data) {
          res.status(404).json({ error: 'Chat not found or access denied' });
          return;
        }
      }

      // ── 2. Save user message ─────────────────────────────────
      await saveMessage({ chatId, role: 'user', content: message });

      // ── 3. Get recent conversation history ───────────────────
      const chatHistory = await getRecentMessages(chatId, 10);

      // ── 4. Run RAG chain ─────────────────────────────────────
      const { answer, sources } = await runRAGChain({
        userId,
        question: message,
        action,
        chatHistory: chatHistory.slice(0, -1), // Exclude the message we just added
      });

      // ── 5. Save assistant message with sources ───────────────
      const messageId = await saveMessage({
        chatId,
        role: 'assistant',
        content: answer,
        sources,
      });

      // ── 6. Auto-title new chats ──────────────────────────────
      if (isNewChat) {
        const title = await generateChatTitle(message);
        await updateChatTitle(chatId, title).catch(() => {}); // Non-critical
      }

      // ── 7. Respond ───────────────────────────────────────────
      res.json({
        chatId,
        messageId,
        answer,
        sources,
      });
    } catch (error) {
      next(error);
    }
  }
);
