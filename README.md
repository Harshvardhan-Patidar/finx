# FinX — AI-Powered B2B Finance & Tax Consultant

**FinX** is a production-ready SaaS platform designed specifically for business owners and financial professionals. It leverages advanced Artificial Intelligence (RAG - Retrieval-Augmented Generation) to allow users to securely chat with their own financial documents—such as GST returns, invoices, and legal papers.

Instead of manually sifting through complex financial documents, users can simply ask questions and receive instant, accurate answers strictly grounded in their uploaded data, complete with exact source citations.

---

## 🎯 The Problem & The Solution

**The Problem:** Financial documents are notoriously dense. Business owners spend hours searching for specific clauses in contracts, verifying GST input credits across multiple invoices, or understanding tax liabilities. 

**The Solution:** FinX acts as an intelligent, 24/7 financial assistant. By combining OCR (Optical Character Recognition) with advanced vector search, it can read both digital PDFs and scanned images, understand the context of financial queries, and extract precise information instantly.

---

## ✨ Key Features & Technical Highlights

- **Intelligent RAG System:** Implements a sophisticated Retrieval-Augmented Generation pipeline using hybrid search (combining dense vector embeddings and sparse keyword search via Pinecone) optimized specifically for financial terminology.
- **Multimodal OCR:** Integrates Gemini 1.5 Flash to seamlessly process and understand both text-based PDFs and scanned document images.
- **Strict Data Isolation:** Ensures enterprise-grade security by utilizing Pinecone namespaces and Supabase Row Level Security (RLS). Every query is strictly sandboxed to the authenticated user's data.
- **Verifiable Citations:** Every AI response includes direct references to the source documents, allowing users to independently verify the AI's claims with one click.
- **Automated Workflow Integrations:** Features an automated data ingestion pipeline using n8n to sync documents directly from Google Drive without requiring manual uploads.
- **Secure Token Management:** Implements AES-256-CBC encryption to securely store and manage third-party OAuth tokens (like Google Drive) within the PostgreSQL database.

---

## 🛠️ Technical Architecture & Stack

FinX is built using a modern, scalable, and type-safe architecture:

### Frontend
- **React & Vite:** Fast, modern single-page application framework.
- **Tailwind CSS:** For a responsive, premium "Cyber-Dark" UI aesthetic.
- **Component-Driven Design:** Features a modular 3-column dashboard layout (Chat, Document Vault, and Citations).

### Backend
- **Node.js & Express (TypeScript):** Robust and strongly-typed API server handling the RAG pipeline and webhook integrations.
- **Google AI Studio (Gemini API):** Powers the core LLM reasoning, multimodal document understanding, and text embeddings.
- **Pinecone:** Serverless vector database handling the hybrid search mechanism.

### Infrastructure & Services
- **Supabase (PostgreSQL):** Handles secure user authentication (Google OAuth) and relational data storage.
- **n8n:** Open-source workflow automation tool used for event-driven document synchronization.

---

## ⚙️ How It Works (Under the Hood)

1. **Ingestion:** When a user uploads a document (or adds it to their synced Google Drive), FinX processes the file, extracts text via OCR, chunks the data, generates vector embeddings, and stores them in Pinecone.
2. **Retrieval:** When a user asks a question, the query is vectorized and compared against the user's isolated document database using hybrid search to find the most mathematically relevant document chunks.
3. **Generation:** The retrieved context is securely passed to the LLM (Gemini), which synthesizes a natural language answer based *only* on the provided context, preventing hallucinations.
4. **Delivery:** The user receives a clear answer alongside interactive citation chips linking directly to the source documents.
