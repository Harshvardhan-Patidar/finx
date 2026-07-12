import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { ingestDocument, removeDocument } from '../rag/ingest';
import { createDocument, deleteDocument, getSupabaseAdmin } from '../services/supabase';

export const documentsRouter = Router();
documentsRouter.use(authMiddleware);

// Multer: store in memory, max 50MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'text/plain',
      'text/csv',
      'application/json',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not supported`));
    }
  },
});

/**
 * GET /api/documents
 * List all documents for the authenticated user with their sync status.
 */
documentsRouter.get(
  '/documents',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = getSupabaseAdmin();
      const { data, error } = await db
        .from('documents')
        .select('id, drive_file_id, file_name, mime_type, sync_status, error_message, chunk_count, updated_at')
        .eq('user_id', req.userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      res.json(data ?? []);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/documents/upload
 * Manual file upload. Bypasses n8n — runs ingest pipeline inline.
 * Uploads to Google Drive if connected, otherwise uses a synthetic Drive ID.
 */
documentsRouter.post(
  '/documents/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const { originalname, mimetype, buffer } = req.file;
      const userId = req.userId;

      // Try to upload to Drive (optional — requires Drive to be connected)
      let driveFileId: string;
      try {
        const { uploadToDrive } = await import('../services/drive');
        driveFileId = await uploadToDrive(userId, originalname, buffer, mimetype);
        console.log(`[upload] Uploaded to Drive: ${driveFileId}`);
      } catch (_driveError) {
        // Drive not connected — use a synthetic ID for local tracking
        driveFileId = `upload:${crypto.randomUUID().replace(/-/g, '')}`;
        console.log(`[upload] Drive not connected — using synthetic ID: ${driveFileId}`);
      }

      // Create document record
      const documentId = await createDocument({
        userId,
        driveFileId,
        fileName: originalname,
        mimeType: mimetype,
      });

      // Respond immediately
      res.status(202).json({
        documentId,
        driveFileId,
        fileName: originalname,
        status: 'indexing',
        message: 'File received and indexing in progress',
      });

      // Run ingest in background
      setImmediate(async () => {
        try {
          const chunkCount = await ingestDocument({
            userId,
            driveFileId,
            fileName: originalname,
            mimeType: mimetype,
            documentId,
            fileBuffer: buffer,
          });
          console.log(`[upload] ✅ Indexed ${originalname}: ${chunkCount} chunks`);
        } catch (err) {
          console.error(`[upload] ❌ Ingest failed for ${originalname}:`, err);
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/documents/:id
 * Remove a document, its Pinecone vectors, and Supabase record.
 */
documentsRouter.delete(
  '/documents/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = getSupabaseAdmin();
      const { data: doc, error } = await db
        .from('documents')
        .select('id, drive_file_id')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .maybeSingle();

      if (error || !doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      // Delete vectors from Pinecone
      await removeDocument(req.userId, doc.id);

      // Delete record from Supabase
      await deleteDocument(req.userId, doc.drive_file_id);

      res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
      next(error);
    }
  }
);


