/// <reference types="node" />
/**
 * One-time script to create the Pinecone hybrid search index.
 * Run: npm run create-index --workspace=backend
 *
 * Requirements:
 *   - PINECONE_API_KEY must be set
 *   - PINECONE_INDEX_NAME must be set
 *   - EMBEDDING_DIMENSION must match Gemini text-embedding-004 (768)
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { Pinecone } from '@pinecone-database/pinecone';

const EMBEDDING_DIMENSION = 3072;    // Gemini text-embedding-004
const METRIC = 'dotproduct';        // Required for hybrid (sparse+dense) search

async function createIndex(): Promise<void> {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!apiKey || !indexName) {
    console.error('❌ PINECONE_API_KEY and PINECONE_INDEX_NAME must be set in .env');
    process.exit(1);
  }

  console.log(`\n🔧 Creating Pinecone hybrid index: "${indexName}"`);
  console.log(`   Dimensions : ${EMBEDDING_DIMENSION}`);
  console.log(`   Metric     : ${METRIC} (required for hybrid)`);
  console.log(`   Type       : Serverless (AWS us-east-1)\n`);

  const pinecone = new Pinecone({ apiKey });

  // Check if index already exists
  const existingIndexes = await pinecone.listIndexes();
  const exists = existingIndexes.indexes?.some((idx) => idx.name === indexName);

  if (exists) {
    console.log(`✅ Index "${indexName}" already exists — no action needed.`);
    console.log('   If you need to recreate it, delete the existing index first.');
    return;
  }

  // Create serverless index
  await pinecone.createIndex({
    name: indexName,
    dimension: EMBEDDING_DIMENSION,
    metric: METRIC,
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
    // waitUntilReady will poll until the index is ready to accept vectors
    waitUntilReady: true,
  });

  console.log(`✅ Index "${indexName}" created and ready!`);
  console.log('\nNext steps:');
  console.log('  1. Run the backend: npm run dev --workspace=backend');
  console.log('  2. Configure n8n to send webhooks to POST /api/ingest');
  console.log('  3. Upload a test document via the UI\n');
}

createIndex().catch((err) => {
  console.error('❌ Failed to create index:', err.message || err);
  process.exit(1);
});
