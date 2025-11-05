// embeddings-service.ts
// ============================================
// 🧠 Code Embeddings Service
// ============================================
// Generate embeddings for code understanding and semantic search

import OpenAI from 'openai';

// ============================================
// Types
// ============================================

export interface EmbeddingsConfig {
  provider: 'openai' | 'local';
  apiKey?: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  batchSize?: number;
}

export interface CodeEmbedding {
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface BatchEmbeddingResult {
  embeddings: CodeEmbedding[];
  totalTokens: number;
  cost: number;
}

export interface ChunkStrategy {
  type: 'fixed' | 'semantic' | 'ast';
  size?: number; // for fixed
  overlap?: number; // for fixed
}

// ============================================
// Embeddings Service
// ============================================

export class EmbeddingsService {
  private openai?: OpenAI;
  private config: Required<EmbeddingsConfig>;
  private cache = new Map<string, number[]>();

  constructor(config: EmbeddingsConfig) {
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey || '',
      model: config.model || 'text-embedding-3-small',
      baseURL: config.baseURL || '',
      maxTokens: config.maxTokens || 8191, // text-embedding-3-small limit
      batchSize: config.batchSize || 100,
    };

    if (this.config.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL || undefined,
      });
    }
  }

  /**
   * Generate embedding for single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.config.provider === 'openai' && this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: text,
        });

        const embedding = response.data[0].embedding;

        // Cache result
        this.cacheEmbedding(cacheKey, embedding);

        return embedding;
      } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
      }
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateBatchEmbeddings(
    texts: string[],
    metadata?: Record<string, any>[]
  ): Promise<BatchEmbeddingResult> {
    const embeddings: CodeEmbedding[] = [];
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchMetadata = metadata?.slice(i, i + this.config.batchSize);

      try {
        const response = await this.openai!.embeddings.create({
          model: this.config.model,
          input: batch,
        });

        response.data.forEach((item, idx) => {
          const text = batch[idx];
          const embedding = item.embedding;
          const cacheKey = this.getCacheKey(text);

          // Cache
          this.cacheEmbedding(cacheKey, embedding);

          embeddings.push({
            text,
            embedding,
            metadata: batchMetadata?.[idx],
          });
        });

        totalTokens += response.usage.total_tokens;
      } catch (error) {
        console.error(`Error in batch ${i / this.config.batchSize}:`, error);
        throw error;
      }
    }

    // Calculate cost (text-embedding-3-small: $0.00002 per 1K tokens)
    const cost = (totalTokens / 1000) * 0.00002;

    return {
      embeddings,
      totalTokens,
      cost,
    };
  }

  /**
   * Generate embeddings for code with chunking
   */
  async generateCodeEmbeddings(
    code: string,
    strategy: ChunkStrategy = { type: 'fixed', size: 500, overlap: 50 }
  ): Promise<{
    fullEmbedding: number[];
    chunkEmbeddings: Array<{ text: string; embedding: number[]; startIndex: number }>;
  }> {
    // Generate full embedding
    const fullEmbedding = await this.generateEmbedding(code);

    // Chunk code
    const chunks = this.chunkCode(code, strategy);

    // Generate embeddings for chunks
    const chunkTexts = chunks.map((c) => c.text);
    const batchResult = await this.generateBatchEmbeddings(chunkTexts);

    const chunkEmbeddings = batchResult.embeddings.map((emb, idx) => ({
      text: emb.text,
      embedding: emb.embedding,
      startIndex: chunks[idx].startIndex,
    }));

    return {
      fullEmbedding,
      chunkEmbeddings,
    };
  }

  /**
   * Chunk code into smaller pieces
   */
  private chunkCode(
    code: string,
    strategy: ChunkStrategy
  ): Array<{ text: string; startIndex: number }> {
    if (strategy.type === 'fixed') {
      return this.fixedChunking(code, strategy.size || 500, strategy.overlap || 50);
    }

    // Default to fixed chunking
    return this.fixedChunking(code, 500, 50);
  }

  /**
   * Fixed-size chunking with overlap
   */
  private fixedChunking(
    text: string,
    size: number,
    overlap: number
  ): Array<{ text: string; startIndex: number }> {
    const chunks: Array<{ text: string; startIndex: number }> = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += size - overlap) {
      const chunk = words.slice(i, i + size).join(' ');
      chunks.push({
        text: chunk,
        startIndex: i,
      });
    }

    return chunks;
  }

  /**
   * Calculate similarity between two embeddings (cosine similarity)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  }

  /**
   * Find most similar texts to query
   */
  async findSimilar(
    query: string,
    corpus: string[],
    topK: number = 5
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Generate corpus embeddings
    const corpusResult = await this.generateBatchEmbeddings(corpus);

    // Calculate similarities
    const similarities = corpusResult.embeddings.map((item, idx) => ({
      text: item.text,
      similarity: this.calculateSimilarity(queryEmbedding, item.embedding),
      index: idx,
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return similarities.slice(0, topK);
  }

  /**
   * Semantic search in code
   */
  async semanticCodeSearch(
    query: string,
    codeSnippets: Array<{ code: string; metadata?: Record<string, any> }>,
    topK: number = 5
  ): Promise<
    Array<{
      code: string;
      similarity: number;
      metadata?: Record<string, any>;
    }>
  > {
    // Extract code texts
    const codes = codeSnippets.map((s) => s.code);

    // Generate embeddings
    const queryEmbedding = await this.generateEmbedding(query);
    const codeResult = await this.generateBatchEmbeddings(
      codes,
      codeSnippets.map((s) => s.metadata || {})
    );

    // Calculate similarities
    const results = codeResult.embeddings.map((item) => ({
      code: item.text,
      similarity: this.calculateSimilarity(queryEmbedding, item.embedding),
      metadata: item.metadata,
    }));

    // Sort and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  /**
   * Generate embedding for function signature
   */
  async generateFunctionEmbedding(functionCode: string): Promise<{
    signatureEmbedding: number[];
    bodyEmbedding: number[];
    fullEmbedding: number[];
  }> {
    // Extract signature (first line)
    const lines = functionCode.split('\n');
    const signature = lines[0];
    const body = lines.slice(1).join('\n');

    const [signatureEmbedding, bodyEmbedding, fullEmbedding] = await Promise.all([
      this.generateEmbedding(signature),
      this.generateEmbedding(body),
      this.generateEmbedding(functionCode),
    ]);

    return {
      signatureEmbedding,
      bodyEmbedding,
      fullEmbedding,
    };
  }

  /**
   * Cache management
   */
  private getCacheKey(text: string): string {
    // Use first 100 chars as cache key
    return text.slice(0, 100);
  }

  private cacheEmbedding(key: string, embedding: number[]): void {
    if (this.cache.size >= 1000) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, embedding);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Track hits/misses
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EmbeddingsConfig>): void {
    this.config = { ...this.config, ...config } as Required<EmbeddingsConfig>;

    if (this.config.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL || undefined,
      });
    }

    // Clear cache when config changes
    this.clearCache();
  }
}

// ============================================
// Factory
// ============================================

export function createEmbeddingsService(config: EmbeddingsConfig): EmbeddingsService {
  return new EmbeddingsService(config);
}

// ============================================
// Usage Examples
// ============================================

export const EMBEDDINGS_SERVICE_EXAMPLES = `
// 📝 استخدام Embeddings Service

import { createEmbeddingsService } from '@oqool/shared';

// 1. Initialize Service
const embeddings = createEmbeddingsService({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small'
});

// 2. Generate Single Embedding
const code = \`
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
\`;

const embedding = await embeddings.generateEmbedding(code);
console.log('Embedding dimensions:', embedding.length); // 1536

// 3. Generate Batch Embeddings
const codes = [
  'function add(a, b) { return a + b; }',
  'function multiply(a, b) { return a * b; }',
  'function divide(a, b) { return a / b; }'
];

const result = await embeddings.generateBatchEmbeddings(codes);
console.log('Total tokens:', result.totalTokens);
console.log('Cost:', result.cost);

// 4. Code Embeddings with Chunking
const longCode = \`...\`; // Long file

const codeEmb = await embeddings.generateCodeEmbeddings(longCode, {
  type: 'fixed',
  size: 500,
  overlap: 50
});

console.log('Full embedding:', codeEmb.fullEmbedding.length);
console.log('Chunks:', codeEmb.chunkEmbeddings.length);

// 5. Semantic Code Search
const snippets = [
  { code: 'function login(user, pass) { ... }', metadata: { file: 'auth.ts' } },
  { code: 'function logout() { ... }', metadata: { file: 'auth.ts' } },
  { code: 'function validateEmail(email) { ... }', metadata: { file: 'utils.ts' } }
];

const results = await embeddings.semanticCodeSearch(
  'user authentication',
  snippets,
  3
);

results.forEach(r => {
  console.log(\`Similarity: \${(r.similarity * 100).toFixed(2)}%\`);
  console.log(\`File: \${r.metadata?.file}\`);
  console.log(\`Code: \${r.code}\n\`);
});

// 6. Find Similar Code
const corpus = [
  'const sum = arr.reduce((a, b) => a + b, 0)',
  'const max = Math.max(...numbers)',
  'const sorted = arr.sort((a, b) => a - b)'
];

const similar = await embeddings.findSimilar(
  'calculate total of array',
  corpus,
  2
);

console.log('Most similar:', similar);

// 7. Calculate Similarity
const emb1 = await embeddings.generateEmbedding('function add(a, b)');
const emb2 = await embeddings.generateEmbedding('function sum(x, y)');

const similarity = embeddings.calculateSimilarity(emb1, emb2);
console.log(\`Similarity: \${(similarity * 100).toFixed(2)}%\`);

// 8. Function Embeddings
const funcEmb = await embeddings.generateFunctionEmbedding(\`
function processData(data) {
  return data.filter(x => x > 0).map(x => x * 2);
}
\`);

console.log('Signature embedding:', funcEmb.signatureEmbedding.length);
console.log('Body embedding:', funcEmb.bodyEmbedding.length);
`;

export default EmbeddingsService;
