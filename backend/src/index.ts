import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import cron from 'node-cron';
import { getSupabaseAdmin } from './services/supabase';
import ws from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws as any;
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { chatRouter } from './routes/chat';
import { ingestRouter } from './routes/ingest';
import { chatsRouter } from './routes/chats';
import { documentsRouter } from './routes/documents';
import { authRouter } from './routes/auth';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ── Security Headers ────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-N8N-Signature'],
    credentials: true,
  })
);

// ── Body Parsing ────────────────────────────────────────────
// Raw body preserved for webhook HMAC verification (ingest route handles its own parsing)
app.use((req, _res, next) => {
  if (req.path === '/api/ingest') {
    next();
  } else {
    express.json({ limit: '50mb' })(req, _res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api', ingestRouter);   // webhook auth (no JWT)
app.use('/api', chatRouter);     // JWT auth
app.use('/api', chatsRouter);    // JWT auth
app.use('/api', documentsRouter); // JWT auth
app.use('/api', authRouter);     // JWT auth for Drive OAuth connect

// ── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 FinX API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS origin : ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});

// ── DB Keepalive Cron ─────────────────────────────────────────
cron.schedule('0 0 */4 * *', async () => {
  console.log(`[cron] Running DB keepalive at ${new Date().toISOString()}`);
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from('profiles').select('id').limit(1);
    if (error) {
      console.error('[cron] ❌ DB keepalive failed:', error.message);
    } else {
      console.log('[cron] ✅ DB keepalive successful — Supabase project stays active');
    }
  } catch (err) {
    console.error('[cron] ❌ DB keepalive error:', err instanceof Error ? err.message : err);
  }
});

export default app;
