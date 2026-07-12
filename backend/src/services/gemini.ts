import { GoogleGenerativeAI, Part, TaskType } from '@google/generative-ai';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

// ── Constants ─────────────────────────────────────────────────
export const EMBEDDING_DIMENSION = 3072;
const EMBEDDING_MODEL = 'gemini-embedding-2';
const GENERATION_MODEL = 'gemini-3.5-flash';
const BATCH_SIZE = 20; // Max concurrent embedding requests

// ── Dense Embeddings ──────────────────────────────────────────

/**
 * Embed a single text string into a 768-dim dense vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });
  return result.embedding.values;
}

/**
 * Embed a query string (uses RETRIEVAL_QUERY task type for better recall).
 */
export async function embedQuery(query: string): Promise<number[]> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text: query }] },
    taskType: TaskType.RETRIEVAL_QUERY,
  });
  return result.embedding.values;
}

/**
 * Batch embed multiple texts with rate-limit-friendly chunking.
 * Returns embeddings in the same order as input texts.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await Promise.all(batch.map(embedText));
    results.push(...embeddings);

    // Avoid rate limiting on large documents
    if (i + BATCH_SIZE < texts.length) {
      await sleep(300);
    }
  }

  return results;
}

// ── Text Generation ───────────────────────────────────────────

/**
 * Generate a text response from a prompt string.
 * Used by the RAG chain after context retrieval.
 */
export async function generateText(prompt: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: GENERATION_MODEL,
    generationConfig: {
      temperature: 0.2,     // Lower temperature for factual finance Q&A
      maxOutputTokens: 2048,
      topP: 0.8,
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;

  if (!response.text()) {
    throw new Error('Gemini returned an empty response');
  }

  return response.text();
}

// ── OCR ───────────────────────────────────────────────────────

/**
 * Extract text from an image or PDF using Gemini multimodal OCR.
 * Handles: image/jpeg, image/png, image/webp, image/gif, application/pdf
 */
export async function ocrDocument(buffer: Buffer, mimeType: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: GENERATION_MODEL });

  const base64Data = buffer.toString('base64');

  const imagePart: Part = {
    inlineData: {
      mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'application/pdf',
      data: base64Data,
    },
  };

  const prompt = `You are a document digitization assistant for Indian financial documents.
Extract ALL text verbatim from this document. Preserve:
- All numbers, amounts, dates, GST numbers, PAN numbers, invoice numbers
- Table structure using plain text alignment  
- Section headings and labels
- Hindi text if present (transliterate if needed)
Do NOT summarize or interpret. Output the raw extracted text only.`;

  const result = await model.generateContent([imagePart, prompt]);
  const text = result.response.text();

  if (!text || text.trim().length < 10) {
    throw new Error('OCR produced insufficient text — document may be blank or unreadable');
  }

  return text;
}

// ── Utilities ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
