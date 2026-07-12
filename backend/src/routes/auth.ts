import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { generateAuthUrl, exchangeCodeForTokens } from '../services/drive';
import { getProfile } from '../services/supabase';

export const authRouter = Router();

/**
 * GET /api/auth/drive/url
 * Returns the Google OAuth2 URL for the user to grant Drive access.
 */
authRouter.get(
  '/auth/drive/url',
  authMiddleware,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = generateAuthUrl();
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/drive/connect
 * Exchange OAuth2 code for refresh token and persist it encrypted.
 */
authRouter.post(
  '/auth/drive/connect',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.body as { code?: string };
      if (!code) {
        res.status(400).json({ error: 'Missing OAuth2 code' });
        return;
      }

      await exchangeCodeForTokens(req.userId, code);
      res.json({ success: true, message: 'Google Drive connected successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/drive/status
 * Check if the user has connected their Google Drive.
 */
authRouter.get(
  '/auth/drive/status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await getProfile(req.userId);
      res.json({ connected: !!profile.google_refresh_token });
    } catch (error) {
      next(error);
    }
  }
);
