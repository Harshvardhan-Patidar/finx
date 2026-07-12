import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { webhookAuthMiddleware } from '../middleware/webhookAuth';
import { ingestDocument, removeDocument } from '../rag/ingest';
import { downloadDriveFile } from '../services/drive';
import {
  createDocument,
  deleteDocument,
  getDocumentByDriveId,
} from '../services/supabase';
import { IngestWebhookPayload } from '../../../shared/types';

export const ingestRouter = Router();

// Rate limit ingest endpoint: max 50 requests per 15 minutes per IP
const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many ingest requests, please try again later' },
});

const IngestPayloadSchema = z.object({
  user_id: z.string().uuid('user_id must be a valid UUID'),
  drive_file_id: z.string().min(1),
  file_name: z.string().min(1),
  mime_type: z.string().min(1),
  event: z.enum(['created', 'updated', 'deleted']),
});

/**
 * POST /api/ingest
 * Called by n8n when a file is created, updated, or deleted in Google Drive.
 * Protected by HMAC signature verification.
 */
ingestRouter.post(
  '/ingest',
  ingestLimiter,
  webhookAuthMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = IngestPayloadSchema.parse(req.body) as IngestWebhookPayload;
      const { user_id, drive_file_id, file_name, mime_type, event } = payload;

      console.log(`[ingest] Event: ${event} | File: ${file_name} | User: ${user_id}`);

      // ── Handle Delete ────────────────────────────────────────
      if (event === 'deleted') {
        const existingDoc = await getDocumentByDriveId(user_id, drive_file_id);
        if (existingDoc) {
          await removeDocument(user_id, existingDoc.id);
          await deleteDocument(user_id, drive_file_id);
          console.log(`[ingest] 🗑️  Deleted: ${file_name}`);
        }
        res.json({ success: true, action: 'deleted', fileName: file_name });
        return;
      }

      // ── Handle Create / Update ───────────────────────────────

      // 1. Upsert document metadata in Supabase (get or create)
      const documentId = await createDocument({
        userId: user_id,
        driveFileId: drive_file_id,
        fileName: file_name,
        mimeType: mime_type,
      });

      // 2. Respond immediately — ingest runs asynchronously
      res.json({
        success: true,
        action: event,
        documentId,
        fileName: file_name,
        status: 'indexing',
      });

      // 3. Run ingest pipeline in background (don't await in response)
      setImmediate(async () => {
        try {
          // Download from Drive
          const { buffer, mimeType: actualMimeType } = await downloadDriveFile(
            user_id,
            drive_file_id
          );

          // Run RAG ingest pipeline
          const chunkCount = await ingestDocument({
            userId: user_id,
            driveFileId: drive_file_id,
            fileName: file_name,
            mimeType: actualMimeType || mime_type,
            documentId,
            fileBuffer: buffer,
          });

          console.log(`[ingest] ✅ Background ingest complete: ${file_name} (${chunkCount} chunks)`);
        } catch (bgError) {
          console.error(`[ingest] ❌ Background ingest failed: ${file_name}`, bgError);
          // updateDocumentStatus to 'failed' is handled inside ingestDocument
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
