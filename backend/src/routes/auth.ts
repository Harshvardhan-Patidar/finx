import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { generateAuthUrl, exchangeCodeForTokens, verifyOAuthState } from '../services/drive';
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
      const url = generateAuthUrl(_req.userId);
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/drive/callback 
 * Handles the redirect from Google after OAuth2 authorization.
 * Exchanges the authorization code for an access token and refresh token.
 * Persists the refresh token in the database.
 */
authRouter.get(
  '/auth/drive/callback',
  async (req: Request, res: Response): Promise<void> => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { code, state, error: oauthError } = req.query as Record<string, string>;

    // Google returned an error (user clicked Deny, etc.)
    if (oauthError) {
      console.warn('[Drive callback] OAuth error from Google:', oauthError);
      res.redirect(`${frontendUrl}?drive_error=${encodeURIComponent(oauthError)}`);
      return;
    }

    // Missing params
    if (!code || !state) {
      res.redirect(`${frontendUrl}?drive_error=missing_params`);
      return;
    }

    // Verify the signed state and extract userId
    const userId = verifyOAuthState(state);
    if (!userId) {
      console.warn('[Drive callback] Invalid or expired state token');
      res.redirect(`${frontendUrl}?drive_error=invalid_state`);
      return;
    }

    try {
      await exchangeCodeForTokens(userId, code);
      console.log(`[Drive callback] Drive connected for user ${userId}`);
      res.redirect(`${frontendUrl}?drive_connected=true`);
    } catch (err) {
      console.error('[Drive callback] Token exchange failed:', err);
      const msg = err instanceof Error ? err.message : 'token_exchange_failed';
      res.redirect(`${frontendUrl}?drive_error=${encodeURIComponent(msg)}`);
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
