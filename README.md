# FinX — B2B AI Finance & Tax Consultant

FinX is a production-ready SaaS platform for Indian business owners to query their financial documents using AI. Upload GST returns, invoices, and legal papers — ask questions and receive answers grounded strictly in your own data, with source citations.

## Architecture

```
Frontend (Vite + React)     Backend (Express + TypeScript)
├── 3-column dashboard  ──► ├── POST /api/chat     (RAG chain)
├── Supabase Google OAuth   ├── POST /api/ingest   (n8n webhook)
├── Document vault          ├── GET  /api/documents
└── Citation chips          └── GET  /api/chats

External Services
├── Supabase     — Auth (Google OAuth) + PostgreSQL
├── Pinecone     — Hybrid vector index (dense + sparse)
├── Gemini API   — Embeddings + Generation + OCR
├── Google Drive — File storage + OAuth2
└── n8n          — Drive event automation (external)
```

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Pinecone account  
- Google Cloud project (Drive API + OAuth2 enabled)
- Google AI Studio API key (Gemini)
- n8n instance (self-hosted or cloud)

### 1. Clone and Install

```bash
git clone https://github.com/yourorg/finx.git
cd finx
cp .env.example .env  # Fill in all values
npm install
```

### 2. Configure Environment

Edit `.env` with all required keys (see `.env.example` for the full list).

Generate the encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Set Up Supabase

1. Create a Supabase project
2. Enable Google OAuth in **Authentication → Providers → Google**
3. Set redirect URL: `http://localhost:5173/auth/callback`
4. Apply the database migration:
   ```bash
   # Option A: Supabase CLI
   supabase db push
   
   # Option B: Paste supabase/migrations/001_initial.sql in the SQL editor
   ```

### 4. Create Pinecone Index

```bash
npm run create-index
# Creates: finx-hybrid (768 dims, dotproduct metric, serverless AWS us-east-1)
```

### 5. Run Development Servers

```bash
npm run dev
# Backend:  http://localhost:3001
# Frontend: http://localhost:5173
```

### 6. Configure n8n

See [docs/n8n-webhook-contract.md](docs/n8n-webhook-contract.md) for the complete n8n workflow setup.

---

## Key Features

| Feature | Implementation |
|---------|----------------|
| **Hybrid Search** | Pinecone dense+sparse (α=0.6 for finance terms) |
| **OCR** | Gemini 1.5 Flash multimodal — supports images and scanned PDFs |
| **Strict Isolation** | Pinecone namespace + metadata filter per `user_id` |
| **Source Citations** | Every response returns `sources[]` with file names and Drive links |
| **Action Buttons** | Draft RTI, GST Summary, Section 80C/80D Check |
| **Auto-sync** | n8n watches Google Drive; no cron jobs in codebase |
| **Token Encryption** | Drive refresh tokens encrypted AES-256-CBC in Supabase |

## Project Structure

```
FinX/
├── frontend/         Vite + React + Tailwind (port 5173)
├── backend/          Express + TypeScript    (port 3001)
├── shared/           Shared TypeScript types
├── supabase/         Database migrations + RLS policies
└── docs/             n8n webhook contract
```

## API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | None | Health check |
| POST | `/api/ingest` | HMAC | n8n Drive sync webhook |
| POST | `/api/chat` | JWT | RAG chat + citations |
| GET | `/api/chats` | JWT | List chat history |
| GET | `/api/chats/:id/messages` | JWT | Load messages |
| DELETE | `/api/chats/:id` | JWT | Delete chat |
| GET | `/api/documents` | JWT | Document vault list |
| POST | `/api/documents/upload` | JWT | Manual file upload |
| DELETE | `/api/documents/:id` | JWT | Remove document |
| GET | `/api/auth/drive/url` | JWT | Get Drive OAuth URL |
| POST | `/api/auth/drive/connect` | JWT | Store Drive refresh token |
| GET | `/api/auth/drive/status` | JWT | Check Drive connection |

## Production Deployment

- **Backend**: Deploy to Railway, Render, or any Node.js host
- **Frontend**: Deploy to Vercel or Netlify
- **Environment**: Set all `.env` variables in your hosting platform
- **Supabase**: Enable email confirmation, set production redirect URLs
- **n8n Webhook URL**: Update to your production backend URL
