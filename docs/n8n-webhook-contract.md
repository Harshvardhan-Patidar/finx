# n8n Webhook Contract — FinX Ingest API

## Overview

FinX does **not** contain any cron jobs or Drive watchers. Google Drive monitoring is handled entirely by **n8n** (per architectural rule #1). When a file is created, updated, or deleted in a user's Drive folder, n8n sends a signed HTTP POST to the FinX ingest API.

---

## Endpoint

```
POST https://api.finx.app/api/ingest
```

(In development: `http://localhost:3001/api/ingest`)

---

## Authentication

Every request MUST include an HMAC-SHA256 signature header:

```
X-N8N-Signature: <hex_digest>
```

The signature is computed as:

```
HMAC-SHA256(rawBody, N8N_WEBHOOK_SECRET)
```

Where `N8N_WEBHOOK_SECRET` is the shared secret configured in both n8n and the FinX backend `.env`.

**To generate a test signature in n8n:**

Use the "Crypto" node with operation "HMAC" → algorithm "SHA256" → output "hex".

---

## Request Payload

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "drive_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  "file_name": "GST_Invoice_March_2024.pdf",
  "mime_type": "application/pdf",
  "event": "created"
}
```

### Field Reference

| Field           | Type   | Required | Description                                           |
|-----------------|--------|----------|-------------------------------------------------------|
| `user_id`       | UUID   | ✅        | Supabase user ID — **must match** the Drive file owner |
| `drive_file_id` | string | ✅        | Google Drive file ID from the Drive API               |
| `file_name`     | string | ✅        | Human-readable filename (for display and citations)   |
| `mime_type`     | string | ✅        | MIME type of the file (see supported types below)     |
| `event`         | enum   | ✅        | `"created"` \| `"updated"` \| `"deleted"`              |

### Supported MIME Types

| MIME Type            | Processing Method           |
|----------------------|-----------------------------|
| `application/pdf`    | Text parse → OCR fallback   |
| `image/jpeg`         | Gemini multimodal OCR       |
| `image/png`          | Gemini multimodal OCR       |
| `image/webp`         | Gemini multimodal OCR       |
| `text/plain`         | Direct text chunking        |
| `text/csv`           | Direct text chunking        |

---

## Response

### Success (202 Accepted)

```json
{
  "success": true,
  "action": "created",
  "documentId": "uuid-of-created-document-record",
  "fileName": "GST_Invoice_March_2024.pdf",
  "status": "indexing"
}
```

The ingest pipeline runs **asynchronously** after the 202 response. Poll `GET /api/documents` to monitor sync status.

### Delete Success (200 OK)

```json
{
  "success": true,
  "action": "deleted",
  "fileName": "GST_Invoice_March_2024.pdf"
}
```

### Error Responses

| Status | Cause                           |
|--------|---------------------------------|
| 400    | Invalid JSON or missing fields  |
| 401    | Missing or invalid HMAC signature |
| 429    | Rate limit exceeded (50 req/15min) |
| 500    | Server error                    |

---

## n8n Workflow Setup

### Step 1 — Google Drive Trigger
- Node: **Google Drive Trigger**
- Event: `File Created` + `File Updated` + `File Deleted`
- Folder: User's FinX Documents folder (or root)
- Credentials: Per-user OAuth2 (one workflow per user, or dynamic credential)

### Step 2 — Get User ID
- Node: **Supabase** → query `profiles` where `google_email = {{ $json.emailAddress }}`
- Or: Store user_id as Drive file metadata / in a lookup table

### Step 3 — Compute HMAC Signature
- Node: **Code** (JavaScript):
```javascript
const crypto = require('crypto');
const body = JSON.stringify({
  user_id: items[0].json.userId,
  drive_file_id: items[0].json.fileId,
  file_name: items[0].json.fileName,
  mime_type: items[0].json.mimeType,
  event: items[0].json.event,
});
const signature = crypto
  .createHmac('sha256', process.env.N8N_WEBHOOK_SECRET)
  .update(body)
  .digest('hex');
return [{ json: { body, signature } }];
```

### Step 4 — HTTP Request
- Node: **HTTP Request**
- Method: POST
- URL: `https://api.finx.app/api/ingest`
- Headers:
  ```
  Content-Type: application/json
  X-N8N-Signature: {{ $json.signature }}
  ```
- Body: `{{ $json.body }}`

---

## Tenant Isolation Guarantee

The backend enforces **two independent layers** of isolation:

1. **Pinecone namespace**: Every vector is stored in a namespace equal to `user_id`. Queries always target the user's namespace.
2. **Metadata filter**: Every Pinecone query includes a hard filter `{ user_id: { $eq: userId } }`.

**No vector from User A can ever appear in User B's query results**, regardless of semantic similarity.

---

## Testing Checklist

- [ ] Send a `created` event with a valid GST PDF → verify `sync_status = complete` in Supabase
- [ ] Send a `created` event with a scanned receipt image → verify OCR text in chat responses
- [ ] Send a `deleted` event → verify vectors removed from Pinecone and document row deleted from Supabase
- [ ] Send a request without `X-N8N-Signature` → expect 401
- [ ] Send with wrong signature → expect 401
- [ ] As User B, query for User A's document content → expect zero results
