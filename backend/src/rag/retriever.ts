import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import { embedQuery } from '../services/gemini';
import { encodeTextToSparse, queryHybrid, HybridQueryResult } from '../services/pinecone';

export interface HybridRetrieverOptions {
  /** Supabase user ID — all queries are scoped to this user. MANDATORY. */
  userId: string;
  /** Blend ratio: 1=pure semantic, 0=pure keyword. Default 0.6 for finance. */
  alpha?: number;
  /** Number of top chunks to retrieve. Default 8. */
  topK?: number;
}

/**
 * Custom LangChain retriever that executes Pinecone hybrid (dense+sparse) search.
 *
 * Security guarantee: every query includes a hard `user_id` metadata filter.
 * No document from another user can ever be returned regardless of similarity.
 */
export class HybridPineconeRetriever extends BaseRetriever {
  // Required by LangChain for serialization
  lc_namespace = ['finx', 'retrievers', 'hybrid_pinecone'];

  private userId: string;
  private alpha: number;
  private topK: number;

  constructor(options: HybridRetrieverOptions) {
    super();
    this.userId = options.userId;
    this.alpha = options.alpha ?? 0.6;
    this.topK = options.topK ?? 8;
  }

  async _getRelevantDocuments(
    query: string,
    _runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    if (!query.trim()) return [];

    // Parallel: get dense embedding and sparse encoding simultaneously
    const [denseVector, sparseVector] = await Promise.all([
      embedQuery(query),
      Promise.resolve(encodeTextToSparse(query)),
    ]);

    const results: HybridQueryResult[] = await queryHybrid({
      userId: this.userId,
      denseVector,
      sparseVector,
      topK: this.topK,
      alpha: this.alpha,
    });

    // Convert to LangChain Document objects
    return results.map(
      (r) =>
        new Document({
          pageContent: r.text,
          metadata: {
            fileName: r.fileName,
            driveFileId: r.driveFileId,
            documentId: r.documentId,
            chunkId: r.id,
            chunkIndex: r.chunkIndex,
            score: r.score,
          },
        })
    );
  }
}

/**
 * Deduplicate sources from retrieved documents.
 * Returns unique files referenced in the context.
 */
export function extractSources(
  docs: Document[]
): Array<{ fileName: string; driveFileId: string; chunkId: string }> {
  const seen = new Set<string>();
  const sources: Array<{ fileName: string; driveFileId: string; chunkId: string }> = [];

  for (const doc of docs) {
    const key = doc.metadata.driveFileId as string;
    if (!seen.has(key)) {
      seen.add(key);
      sources.push({
        fileName: doc.metadata.fileName as string,
        driveFileId: doc.metadata.driveFileId as string,
        chunkId: doc.metadata.chunkId as string,
      });
    }
  }

  return sources;
}
