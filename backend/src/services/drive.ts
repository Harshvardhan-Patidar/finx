import { google } from 'googleapis';
import crypto from 'crypto';
import { getProfile, saveRefreshToken } from './supabase';

const IV_LENGTH = 16;

// ── Encryption Helpers ────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is not set');
  return Buffer.from(key, 'hex');
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':');
  if (!ivHex || !encHex) throw new Error('Invalid encrypted token format');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── OAuth2 Client Factory ─────────────────────────────────────

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getAuthenticatedClient(userId: string) {
  const profile = await getProfile(userId);

  if (!profile.google_refresh_token) {
    throw new Error('Google Drive not connected. Please connect your Drive account first.');
  }

  const decryptedToken = decryptToken(profile.google_refresh_token);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: decryptedToken });
  return oauth2Client;
}

// ── Drive File Operations ─────────────────────────────────────

export interface DriveFileData {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

/**
 * Download a file from Google Drive using the user's stored refresh token.
 * Returns the raw buffer and detected MIME type.
 */
export async function downloadDriveFile(
  userId: string,
  driveFileId: string
): Promise<DriveFileData> {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth });

  // Get file metadata first
  const metaRes = await drive.files.get({
    fileId: driveFileId,
    fields: 'name,mimeType',
  });

  const fileName = metaRes.data.name ?? 'unknown';
  const mimeType = metaRes.data.mimeType ?? 'application/octet-stream';

  // Download file content
  const fileRes = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return {
    buffer: Buffer.from(fileRes.data as ArrayBuffer),
    mimeType,
    fileName,
  };
}

/**
 * Upload a file buffer to the user's Google Drive (FinX folder).
 * Returns the new Drive file ID.
 */
export async function uploadToDrive(
  userId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth });

  // Ensure FinX folder exists
  const folderId = await ensureFinXFolder(drive);

  const { Readable } = await import('stream');
  const readableStream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: readableStream,
    },
    fields: 'id',
  });

  if (!res.data.id) throw new Error('Drive upload did not return a file ID');
  return res.data.id;
}

async function ensureFinXFolder(drive: ReturnType<typeof google.drive>): Promise<string> {
  // Look for existing FinX folder
  const list = await drive.files.list({
    q: "name='FinX Documents' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id)',
    spaces: 'drive',
  });

  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id!;
  }

  // Create it
  const folder = await drive.files.create({
    requestBody: {
      name: 'FinX Documents',
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id!;
}

// ── OAuth2 Flow ───────────────────────────────────────────────

/**
 * Generate Google OAuth2 URL for Drive access consent.
 */
export function generateAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state: generateOAuthState(userId),   // ← embeds signed userId
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

/**
 * Exchange an OAuth2 authorization code for tokens and persist the refresh token.
 */
export async function exchangeCodeForTokens(
  userId: string,
  code: string
): Promise<void> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error('No refresh token returned — ensure prompt=consent is set');
  }

  const encrypted = encryptToken(tokens.refresh_token);
  await saveRefreshToken(userId, encrypted);
}


/**
 * Generate a signed, time-limited state token for CSRF protection.
 * Encodes userId + timestamp + HMAC so the callback can verify it
 * without storing anything server-side.
 */
export function generateOAuthState(userId: string): string {
  const ts = Date.now().toString();
  const payload = `${userId}:${ts}`;
  const hmac = crypto
    .createHmac('sha256', getEncryptionKey())
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Verify a state token from a Google OAuth callback.
 * Returns the userId if valid, null if tampered or expired (> 10 min).
 */
export function verifyOAuthState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [userId, ts, receivedHmac] = parts;
    const expectedHmac = crypto
      .createHmac('sha256', getEncryptionKey())
      .update(`${userId}:${ts}`)
      .digest('hex');

    const hmacBuf = Buffer.from(receivedHmac);
    const expectedBuf = Buffer.from(expectedHmac);
    if (
      hmacBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(hmacBuf, expectedBuf)
    ) {
      return null;
    }

    // Reject states older than 10 minutes
    if (Date.now() - parseInt(ts, 10) > 10 * 60 * 1000) return null;

    return userId;
  } catch {
    return null;
  }
}