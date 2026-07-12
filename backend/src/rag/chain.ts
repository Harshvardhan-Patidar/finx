import { Document } from '@langchain/core/documents';
import { HybridPineconeRetriever, extractSources } from './retriever';
import { generateText } from '../services/gemini';
import { getSystemPrompt, buildPrompt } from './prompts';
import { MessageSource } from '../../../shared/types';

export interface RAGInput {
  userId: string;
  question: string;
  action?: string | null;
  chatHistory?: Array<{ role: string; content: string }>;
  /** Override alpha for this query (default 0.6) */
  alpha?: number;
}

export interface RAGOutput {
  answer: string;
  sources: MessageSource[];
  retrievedDocs: Document[];
}

/**
 * Main RAG chain:
 * 1. Retrieve relevant chunks via hybrid Pinecone search (user-scoped)
 * 2. Build grounded prompt with context + history
 * 3. Generate answer via Gemini
 * 4. Return answer with deduplicated source citations
 */
export async function runRAGChain(input: RAGInput): Promise<RAGOutput> {
  const { userId, question, action, chatHistory = [], alpha } = input;

  console.log(`[chain] Query by user=${userId} action=${action ?? 'none'}`);

  // ── Step 1: Retrieve relevant chunks ────────────────────────
  const retriever = new HybridPineconeRetriever({
    userId,
    alpha: alpha ?? 0.6,
    topK: 8,
  });

  let retrievedDocs: Document[] = [];
  try {
    retrievedDocs = await retriever._getRelevantDocuments(question);
    console.log(`[chain] Retrieved ${retrievedDocs.length} chunks`);
  } catch (retrievalError) {
    console.error('[chain] Retrieval failed:', retrievalError);
    // Continue with empty context — prompt handles "no documents" case
  }

  // ── Step 2: Build prompt ─────────────────────────────────────
  const context = retrievedDocs
    .map((doc, i) => {
      const meta = doc.metadata;
      return `[Source ${i + 1}: ${meta.fileName}]\n${doc.pageContent}`;
    })
    .join('\n\n---\n\n');

  const systemPrompt = getSystemPrompt(action);
  const fullPrompt = buildPrompt({
    systemPrompt,
    context,
    chatHistory,
    question,
  });

  // ── Step 3: Generate via Gemini ──────────────────────────────
  let answer: string;
  try {
    answer = await generateText(fullPrompt);
  } catch (genError) {
    console.error('[chain] Generation failed:', genError);
    throw new Error('Failed to generate response. Please try again.');
  }

  // ── Step 4: Extract deduplicated sources ─────────────────────
  const sources = extractSources(retrievedDocs);

  return { answer, sources, retrievedDocs };
}

/**
 * Generate a short chat title from the first user message.
 * Used to auto-title new conversations.
 */
export async function generateChatTitle(firstMessage: string): Promise<string> {
  const prompt = `Generate a concise 4-6 word title for a financial chat conversation that starts with this message: "${firstMessage.slice(0, 200)}"
  
Requirements:
- Maximum 6 words
- Descriptive and specific
- No quotes or punctuation at the end
- Examples: "GST March Quarter Analysis", "Section 80C Deductions Check", "RTI Application for Land Records"

Title:`;

  try {
    const title = await generateText(prompt);
    return title.trim().slice(0, 80); // Cap at 80 chars for DB
  } catch {
    // Fall back to truncated first message
    return firstMessage.slice(0, 50).trim() + (firstMessage.length > 50 ? '...' : '');
  }
}
