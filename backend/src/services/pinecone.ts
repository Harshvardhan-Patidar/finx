import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';

let _pinecone: Pinecone | null = null;

function getPinecone(): Pinecone {
  if (!_pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _pinecone;
}

function getIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) throw new Error('PINECONE_INDEX_NAME environment variable is not set');
  return getPinecone().Index(indexName);
}

// ── Sparse Vector Encoding (BM25-inspired) ────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their',
  'he', 'she', 'we', 'you', 'i', 'my', 'your', 'our', 'his', 'her',
  'as', 'if', 'so', 'not', 'no', 'nor', 'yet', 'both', 'either',
]);

/**
 * Deterministic djb2 hash — maps a token string to a non-negative 32-bit integer.
 * This gives us a stable dimension index for each term across upserts and queries.
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash >>> 0; // Unsigned 32-bit
  }
  // Pinecone sparse indices must be < 2^31; mask to be safe
  return hash & 0x7fffffff;
}

/**
 * Encode text to a sparse vector using TF-based BM25-inspired weighting.
 * Financial terms like "GST", "80C", "GSTR3B" are kept; stop words removed.
 */
export function encodeTextToSparse(text: string): {
  indices: number[];
  values: number[];
} {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  if (tokens.length === 0) {
    return { indices: [], values: [] };
  }

  // Term frequency map
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }

  const indices: number[] = [];
  const values: number[] = [];
  const seen = new Set<number>(); // Handle hash collisions by keeping first

  for (const [term, count] of tf.entries()) {
    const idx = djb2Hash(term);
    if (seen.has(idx)) continue; // Skip collision (rare)
    seen.add(idx);
    indices.push(idx);
    // Normalize TF by document length; apply log smoothing
    values.push(Math.log1p(count) / Math.log1p(tokens.length));
  }

  return { indices, values };
}

// ── Vector Upsert ─────────────────────────────────────────────

export interface VectorRecord {
  id: string;
  userId: string;
  documentId: string;
  driveFileId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
  denseValues: number[];
  sparseValues: { indices: number[]; values: number[] };
}

/**
 * Upsert a batch of vectors into Pinecone.
 * Each record is stored in a namespace scoped to userId for extra isolation.
 */
export async function upsertVectors(records: VectorRecord[]): Promise<void> {
  if (records.length === 0) return;

  const index = getIndex();

  // Group by userId namespace (belt-and-suspenders with metadata filter)
  const byUser = new Map<string, VectorRecord[]>();
  for (const r of records) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId)!.push(r);
  }

  for (const [userId, recs] of byUser.entries()) {
    const ns = index.namespace(userId);

    // Pinecone upsert in batches of 100
    const UPSERT_BATCH = 100;
    for (let i = 0; i < recs.length; i += UPSERT_BATCH) {
      const batch = recs.slice(i, i + UPSERT_BATCH);
      await ns.upsert(
        batch.map((r) => ({
          id: r.id,
          values: r.denseValues,
          sparseValues: r.sparseValues,
          metadata: {
            user_id: r.userId,          // Hard filter key
            document_id: r.documentId,
            drive_file_id: r.driveFileId,
            file_name: r.fileName,
            chunk_index: r.chunkIndex,
            text: r.text.slice(0, 1000), // Pinecone metadata limit
          } as RecordMetadata,
        }))
      );
    }
  }
}

// ── Hybrid Query ──────────────────────────────────────────────

export interface HybridQueryResult {
  id: string;
  score: number;
  text: string;
  fileName: string;
  driveFileId: string;
  documentId: string;
  chunkIndex: number;
}

/**
 * Hybrid search: blend dense (semantic) + sparse (keyword) vectors.
 * alpha=1 → pure semantic; alpha=0 → pure keyword.
 * Recommended alpha=0.6 for finance queries (keyword terms matter).
 *
 * CRITICAL: user_id filter is MANDATORY — never query without it.
 */
export async function queryHybrid(params: {
  userId: string;
  denseVector: number[];
  sparseVector: { indices: number[]; values: number[] };
  topK?: number;
  alpha?: number;
}): Promise<HybridQueryResult[]> {
  const { userId, denseVector, sparseVector, topK = 8, alpha = 0.6 } = params;

  // Scale vectors by alpha weight
  const scaledDense = denseVector.map((v) => v * alpha);
  const scaledSparse = {
    indices: sparseVector.indices,
    values: sparseVector.values.map((v) => v * (1 - alpha)),
  };

  const index = getIndex();
  const ns = index.namespace(userId);

  const results = await ns.query({
    vector: scaledDense,
    sparseVector: scaledSparse,
    topK,
    filter: {
      user_id: { $eq: userId }, // Hard isolation filter — never remove this
    },
    includeMetadata: true,
  });

  return (results.matches ?? [])
    .filter((m) => m.metadata)
    .map((m) => ({
      id: m.id,
      score: m.score ?? 0,
      text: (m.metadata!.text as string) ?? '',
      fileName: (m.metadata!.file_name as string) ?? '',
      driveFileId: (m.metadata!.drive_file_id as string) ?? '',
      documentId: (m.metadata!.document_id as string) ?? '',
      chunkIndex: (m.metadata!.chunk_index as number) ?? 0,
    }));
}

// ── Delete by Document ────────────────────────────────────────

/**
 * Delete all vectors belonging to a specific document for a user.
 * Called when a file is deleted from Drive or manually removed.
 */
export async function deleteDocumentVectors(
  userId: string,
  documentId: string
): Promise<void> {
  const index = getIndex();
  const ns = index.namespace(userId);

  // Pinecone deleteMany with metadata filter
  await ns.deleteMany({
    user_id: { $eq: userId },
    document_id: { $eq: documentId },
  });
}
