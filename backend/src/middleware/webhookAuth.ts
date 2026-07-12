import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Verifies X-N8N-Signature header using HMAC-SHA256.
 * The signature is HMAC(rawBody, N8N_WEBHOOK_SECRET) as a hex digest.
 * Requests without a valid signature are rejected with 401.
 */
export function webhookAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.N8N_WEBHOOK_SECRET;

  // In development without a secret configured, allow through with a warning
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }
    console.warn('[webhookAuth] ⚠️  N8N_WEBHOOK_SECRET not set — skipping verification (dev only)');
    next();
    return;
  }

  const signature = req.headers['x-n8n-signature'] as string | undefined;

  if (!signature) {
    res.status(401).json({ error: 'Missing X-N8N-Signature header' });
    return;
  }

  // Collect raw body chunks for HMAC computation
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expected, 'hex');

    // Constant-time comparison to prevent timing attacks
    if (
      sigBuffer.length !== expBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expBuffer)
    ) {
      console.warn('[webhookAuth] Invalid signature — request rejected');
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    // Attach parsed body so downstream handlers can read it
    try {
      req.body = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    next();
  });

  req.on('error', (err) => {
    console.error('[webhookAuth] Body read error:', err);
    res.status(500).json({ error: 'Failed to read request body' });
  });
}
