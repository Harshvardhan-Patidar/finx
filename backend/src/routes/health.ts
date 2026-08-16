import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'FinX API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── DB keepalive endpoint ────────────────────────────────────────
healthRouter.get('/keepalive', async (_req, res) => {
  try {
    const db = getSupabaseAdmin();

    const { error } = await db.from('profiles').select('id').limit(1);

    if (error) {
      console.error('[keepalive] DB query failed:', error.message);
      res.status(503).json({
        status: 'error',
        db: 'unreachable',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`[keepalive] ✅ DB pinged successfully at ${new Date().toISOString()}`);
    res.json({
      status: 'alive',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[keepalive] Unexpected error:', message);
    res.status(500).json({
      status: 'error',
      db: 'unreachable',
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});
