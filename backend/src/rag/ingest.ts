import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { embedBatch, ocrDocument } from '../services/gemini';
import { encodeTextToSparse, upsertVectors, deleteDocumentVectors } from '../services/pinecone';
import { updateDocumentStatus } from '../services/supabase';

export interface IngestParams {
  userId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  documentId: string;
  fileBuffer: Buffer;
}

// Chunk settings optimised for financial documents (invoices, GST returns)
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Minimum text length before treating a PDF as scanned and falling back to OCR
const MIN_TEXT_THRESHOLD = 100;

/**
 * Full ingestion pipeline:
 * 1. Extract text (OCR if image or scanned PDF)
 * 2. Split into overlapping chunks
 * 3. Batch embed via Gemini
 * 4. Encode sparse BM25 vectors
 * 5. Upsert to Pinecone with strict user_id metadata
 * 6. Update Supabase document status
 */
export async function ingestDocument(params: IngestParams): Promise<number> {
  const { userId, driveFileId, fileName, mimeType, documentId, fileBuffer } = params;

  // Mark as indexing
  await updateDocumentStatus(documentId, 'indexing');

  let rawText = '';

  try {
    // ── Step 1: Text Extraction ──────────────────────────────
    rawText = await extractText(fileBuffer, mimeType, fileName);

    if (!rawText || rawText.trim().length < 20) {
      throw new Error('Extracted text is too short — document may be empty or unreadable');
    }

    // ── Step 2: Chunking ─────────────────────────────────────
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''],
    });

    const docs = await splitter.createDocuments([rawText]);
    const chunks = docs.map((d) => d.pageContent).filter((c) => c.trim().length > 20);

    if (chunks.length === 0) {
      throw new Error('No valid chunks produced from document');
    }

    console.log(`[ingest] ${fileName}: ${chunks.length} chunks from ${rawText.length} chars`);

    // ── Step 3: Dense Embeddings (batched) ───────────────────
    const denseEmbeddings = await embedBatch(chunks);

    // ── Step 4: Sparse Encodings ─────────────────────────────
    const sparseEmbeddings = chunks.map(encodeTextToSparse);

    // ── Step 5: Build vector records ─────────────────────────
    const records = chunks.map((chunk, i) => ({
      id: `${documentId}_chunk_${i}`,
      userId,
      documentId,
      driveFileId,
      fileName,
      chunkIndex: i,
      text: chunk,
      denseValues: denseEmbeddings[i],
      sparseValues: sparseEmbeddings[i],
    }));

    // ── Step 6: Upsert to Pinecone ───────────────────────────
    await upsertVectors(records);

    // ── Step 7: Mark complete ────────────────────────────────
    await updateDocumentStatus(documentId, 'complete', { chunkCount: chunks.length });

    console.log(`[ingest] ✅ ${fileName}: ${chunks.length} vectors upserted`);
    return chunks.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ingest] ❌ Failed to ingest ${fileName}:`, message);
    await updateDocumentStatus(documentId, 'failed', { errorMessage: message });
    throw error;
  }
}

/**
 * Delete all vectors for a document and remove its Pinecone data.
 * Called when a file is deleted from Drive.
 */
export async function removeDocument(userId: string, documentId: string): Promise<void> {
  await deleteDocumentVectors(userId, documentId);
  console.log(`[ingest] 🗑️  Deleted vectors for document ${documentId}`);
}

// ── Text Extraction ───────────────────────────────────────────

async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  // Image files → Gemini OCR
  if (mimeType.startsWith('image/')) {
    console.log(`[ingest] 🔍 OCR (image): ${fileName}`);
    return ocrDocument(buffer, mimeType);
  }

  // PDF → try text extraction first, fall back to Gemini OCR
  if (mimeType === 'application/pdf') {
    try {
      const parsed = await pdfParse(buffer);
      const text = parsed.text?.trim() ?? '';

      if (text.length >= MIN_TEXT_THRESHOLD) {
        console.log(`[ingest] 📄 Text PDF parsed: ${fileName} (${text.length} chars)`);
        return text;
      }

      // Insufficient text — likely a scanned PDF
      console.log(`[ingest] 🔍 Scanned PDF detected — using Gemini OCR: ${fileName}`);
      return ocrDocument(buffer, 'application/pdf');
    } catch (parseError) {
      console.warn(`[ingest] PDF parse failed, falling back to OCR:`, parseError);
      return ocrDocument(buffer, 'application/pdf');
    }
  }

  // Plain text / CSV / other text formats
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/csv'
  ) {
    return buffer.toString('utf-8');
  }

  // Unknown type — try OCR as a last resort
  console.warn(`[ingest] Unknown MIME type "${mimeType}" — attempting OCR`);
  return ocrDocument(buffer, mimeType);
}
