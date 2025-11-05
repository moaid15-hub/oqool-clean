// code-vector-db.ts
// ============================================
// 🔍 Code Vector Database with Qdrant
// ============================================
// Semantic code search using vector embeddings

import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import type { CodeParser, ParsedFile } from '../parser/tree-sitter-parser.js';

// ============================================
// Types
// ============================================

export interface VectorDBConfig {
  qdrantUrl?: string;
  qdrantApiKey?: string;
  openaiApiKey?: string;
  embeddingModel?: string;
  collectionName?: string;
  vectorSize?: number;
}

export interface CodeChunk {
  id: string;
  content: string;
  type: 'function' | 'class' | 'file' | 'comment' | 'import';
  metadata: {
    file: string;
    language: string;
    startLine: number;
    endLine: number;
    name?: string;
    complexity?: number;
    imports?: string[];
    exports?: string[];
  };
}

export interface CodeEmbedding {
  id: string;
  vector: number[];
  chunk: CodeChunk;
}

export interface SearchResult {
  chunk: CodeChunk;
  score: number;
  similarity: number;
}

export interface IndexStats {
  totalChunks: number;
  totalFiles: number;
  languages: Record<string, number>;
  types: Record<string, number>;
}

// ============================================
// Code Vector Database
// ============================================

export class CodeVectorDB {
  private qdrant: QdrantClient;
  private openai: OpenAI;
  private config: Required<VectorDBConfig>;
  private codeParser?: CodeParser;
  private embeddingCache = new Map<string, number[]>();

  constructor(config: VectorDBConfig, codeParser?: CodeParser) {
    this.config = {
      qdrantUrl: config.qdrantUrl || 'http://localhost:6333',
      qdrantApiKey: config.qdrantApiKey || '',
      openaiApiKey: config.openaiApiKey || '',
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      collectionName: config.collectionName || 'oqool_codebase',
      vectorSize: config.vectorSize || 1536, // text-embedding-3-small dimension
    };

    this.qdrant = new QdrantClient({
      url: this.config.qdrantUrl,
      apiKey: this.config.qdrantApiKey || undefined,
    });

    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey,
    });

    this.codeParser = codeParser;
  }

  /**
   * Initialize the vector database
   */
  async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.config.collectionName
      );

      if (!exists) {
        // Create collection
        await this.qdrant.createCollection(this.config.collectionName, {
          vectors: {
            size: this.config.vectorSize,
            distance: 'Cosine',
          },
        });

        console.log(`✅ Created collection: ${this.config.collectionName}`);
      } else {
        console.log(`✅ Collection already exists: ${this.config.collectionName}`);
      }
    } catch (error) {
      console.error('Error initializing vector DB:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = text.slice(0, 100); // Use first 100 chars as key
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: text,
      });

      const vector = response.data[0].embedding;

      // Cache result
      if (this.embeddingCache.size < 1000) {
        // Limit cache size
        this.embeddingCache.set(cacheKey, vector);
      }

      return vector;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Chunk code file into smaller pieces
   */
  private async chunkCodeFile(
    file: string,
    content: string,
    language: string
  ): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];

    // If we have a parser, use AST-based chunking
    if (this.codeParser) {
      try {
        const parsed = await this.codeParser.parseFile(content, language);

        // Chunk by functions
        parsed.functions?.forEach((fn, idx) => {
          chunks.push({
            id: `${file}_fn_${idx}`,
            content: fn.body || '',
            type: 'function',
            metadata: {
              file,
              language,
              startLine: 0, // Tree-sitter parsed functions don't have line info
              endLine: 0,
              name: fn.name,
              complexity: this.calculateComplexity(fn.body || ''),
            },
          });
        });

        // Chunk by classes
        parsed.classes?.forEach((cls, idx) => {
          // Build class content from methods and properties
          const classContent = cls.methods?.map(m => m.body).join('\n') || '';
          chunks.push({
            id: `${file}_class_${idx}`,
            content: classContent,
            type: 'class',
            metadata: {
              file,
              language,
              startLine: 0,
              endLine: 0,
              name: cls.name,
              complexity: this.calculateComplexity(classContent),
            },
          });
        });

        // Add imports as a chunk
        if (parsed.imports && parsed.imports.length > 0) {
          chunks.push({
            id: `${file}_imports`,
            content: parsed.imports.map((imp) => `import ${imp.imports.map(i => i.name).join(', ')} from '${imp.source}'`).join('\n'),
            type: 'import',
            metadata: {
              file,
              language,
              startLine: 0,
              endLine: 0,
              imports: parsed.imports.map((imp) => imp.source),
            },
          });
        }
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
        // Fall back to simple chunking
        return this.simpleChunk(file, content, language);
      }
    } else {
      // Simple line-based chunking
      return this.simpleChunk(file, content, language);
    }

    // If no chunks were created, add whole file
    if (chunks.length === 0) {
      chunks.push({
        id: `${file}_whole`,
        content,
        type: 'file',
        metadata: {
          file,
          language,
          startLine: 1,
          endLine: content.split('\n').length,
        },
      });
    }

    return chunks;
  }

  /**
   * Simple line-based chunking (fallback)
   */
  private simpleChunk(file: string, content: string, language: string): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];
    const chunkSize = 50; // lines per chunk

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      const chunkContent = chunkLines.join('\n');

      chunks.push({
        id: `${file}_chunk_${i}`,
        content: chunkContent,
        type: 'file',
        metadata: {
          file,
          language,
          startLine: i + 1,
          endLine: Math.min(i + chunkSize, lines.length),
        },
      });
    }

    return chunks;
  }

  /**
   * Calculate code complexity (simple metric)
   */
  private calculateComplexity(code: string): number {
    let complexity = 1;

    // Count control structures
    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
    ];

    patterns.forEach((pattern) => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * Index a codebase
   */
  async indexCodebase(
    files: Array<{ path: string; content: string; language: string }>
  ): Promise<{ indexed: number; failed: number }> {
    let indexed = 0;
    let failed = 0;

    for (const file of files) {
      try {
        // Chunk the file
        const chunks = await this.chunkCodeFile(file.path, file.content, file.language);

        // Generate embeddings for each chunk
        const embeddings: CodeEmbedding[] = [];

        for (const chunk of chunks) {
          try {
            const vector = await this.generateEmbedding(chunk.content);
            embeddings.push({
              id: chunk.id,
              vector,
              chunk,
            });
          } catch (error) {
            console.error(`Error embedding chunk ${chunk.id}:`, error);
          }
        }

        // Insert into Qdrant
        if (embeddings.length > 0) {
          await this.qdrant.upsert(this.config.collectionName, {
            points: embeddings.map((emb) => ({
              id: emb.id,
              vector: emb.vector,
              payload: {
                content: emb.chunk.content,
                type: emb.chunk.type,
                metadata: emb.chunk.metadata,
              },
            })),
          });

          indexed += embeddings.length;
        }
      } catch (error) {
        console.error(`Error indexing ${file.path}:`, error);
        failed++;
      }
    }

    return { indexed, failed };
  }

  /**
   * Search for similar code
   */
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const queryVector = await this.generateEmbedding(query);

      // Search in Qdrant
      const results = await this.qdrant.search(this.config.collectionName, {
        vector: queryVector,
        limit,
        with_payload: true,
      });

      // Convert to SearchResult
      return results.map((result) => ({
        chunk: {
          id: result.id as string,
          content: result.payload?.content as string,
          type: result.payload?.type as CodeChunk['type'],
          metadata: result.payload?.metadata as CodeChunk['metadata'],
        },
        score: result.score,
        similarity: result.score * 100, // Convert to percentage
      }));
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }

  /**
   * Search by code type
   */
  async searchByType(
    query: string,
    type: CodeChunk['type'],
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const queryVector = await this.generateEmbedding(query);

      const results = await this.qdrant.search(this.config.collectionName, {
        vector: queryVector,
        limit,
        with_payload: true,
        filter: {
          must: [
            {
              key: 'type',
              match: { value: type },
            },
          ],
        },
      });

      return results.map((result) => ({
        chunk: {
          id: result.id as string,
          content: result.payload?.content as string,
          type: result.payload?.type as CodeChunk['type'],
          metadata: result.payload?.metadata as CodeChunk['metadata'],
        },
        score: result.score,
        similarity: result.score * 100,
      }));
    } catch (error) {
      console.error('Error searching by type:', error);
      throw error;
    }
  }

  /**
   * Search by file
   */
  async searchInFile(
    query: string,
    file: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const queryVector = await this.generateEmbedding(query);

      const results = await this.qdrant.search(this.config.collectionName, {
        vector: queryVector,
        limit,
        with_payload: true,
        filter: {
          must: [
            {
              key: 'metadata.file',
              match: { value: file },
            },
          ],
        },
      });

      return results.map((result) => ({
        chunk: {
          id: result.id as string,
          content: result.payload?.content as string,
          type: result.payload?.type as CodeChunk['type'],
          metadata: result.payload?.metadata as CodeChunk['metadata'],
        },
        score: result.score,
        similarity: result.score * 100,
      }));
    } catch (error) {
      console.error('Error searching in file:', error);
      throw error;
    }
  }

  /**
   * Find similar functions
   */
  async findSimilarFunctions(
    functionCode: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    return this.searchByType(functionCode, 'function', limit);
  }

  /**
   * Find code duplicates
   */
  async findDuplicates(threshold: number = 0.95): Promise<SearchResult[][]> {
    try {
      // Get all points
      const allPoints = await this.qdrant.scroll(this.config.collectionName, {
        limit: 1000,
        with_payload: true,
        with_vector: true,
      });

      const duplicates: SearchResult[][] = [];

      // Compare each point with others
      for (const point of allPoints.points) {
        if (!point.vector) continue;

        const similar = await this.qdrant.search(this.config.collectionName, {
          vector: point.vector as number[],
          limit: 5,
          with_payload: true,
        });

        const highSimilarity = similar
          .filter((s) => s.id !== point.id && s.score >= threshold)
          .map((s) => ({
            chunk: {
              id: s.id as string,
              content: s.payload?.content as string,
              type: s.payload?.type as CodeChunk['type'],
              metadata: s.payload?.metadata as CodeChunk['metadata'],
            },
            score: s.score,
            similarity: s.score * 100,
          }));

        if (highSimilarity.length > 0) {
          duplicates.push(highSimilarity);
        }
      }

      return duplicates;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<IndexStats> {
    try {
      const collection = await this.qdrant.getCollection(this.config.collectionName);

      // Get all points to calculate stats
      const points = await this.qdrant.scroll(this.config.collectionName, {
        limit: 10000,
        with_payload: true,
      });

      const files = new Set<string>();
      const languages: Record<string, number> = {};
      const types: Record<string, number> = {};

      points.points.forEach((point) => {
        const metadata = point.payload?.metadata as CodeChunk['metadata'];
        const type = point.payload?.type as string;

        if (metadata?.file) {
          files.add(metadata.file);
        }

        if (metadata?.language) {
          languages[metadata.language] = (languages[metadata.language] || 0) + 1;
        }

        if (type) {
          types[type] = (types[type] || 0) + 1;
        }
      });

      return {
        totalChunks: collection.points_count || 0,
        totalFiles: files.size,
        languages,
        types,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection(): Promise<void> {
    try {
      await this.qdrant.deleteCollection(this.config.collectionName);
      console.log(`✅ Deleted collection: ${this.config.collectionName}`);
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }
}

// ============================================
// Factory
// ============================================

export function createCodeVectorDB(
  config: VectorDBConfig,
  codeParser?: CodeParser
): CodeVectorDB {
  return new CodeVectorDB(config, codeParser);
}

// ============================================
// Usage Examples
// ============================================

export const CODE_VECTOR_DB_EXAMPLES = `
// 📝 استخدام Code Vector Database

import { createCodeVectorDB, CodeParser } from '@oqool/shared';

// 1. Initialize
const parser = new CodeParser();
await parser.initialize();

const vectorDB = createCodeVectorDB({
  qdrantUrl: 'http://localhost:6333',
  openaiApiKey: process.env.OPENAI_API_KEY,
  embeddingModel: 'text-embedding-3-small',
  collectionName: 'my_codebase'
}, parser);

await vectorDB.initialize();

// 2. Index Codebase
const files = [
  { path: 'src/utils.ts', content: '...', language: 'typescript' },
  { path: 'src/api.ts', content: '...', language: 'typescript' }
];

const result = await vectorDB.indexCodebase(files);
console.log(\`Indexed \${result.indexed} chunks, failed \${result.failed}\`);

// 3. Semantic Search
const results = await vectorDB.search('authentication function', 10);

results.forEach(result => {
  console.log(\`File: \${result.chunk.metadata.file}\`);
  console.log(\`Type: \${result.chunk.type}\`);
  console.log(\`Similarity: \${result.similarity.toFixed(2)}%\`);
  console.log(\`Code:\n\${result.chunk.content}\n\`);
});

// 4. Find Similar Functions
const myFunction = \`
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
\`;

const similar = await vectorDB.findSimilarFunctions(myFunction);
console.log('Similar functions:', similar);

// 5. Find Duplicates
const duplicates = await vectorDB.findDuplicates(0.95);
console.log(\`Found \${duplicates.length} potential duplicates\`);

// 6. Search by Type
const classes = await vectorDB.searchByType('user management', 'class');
console.log('Relevant classes:', classes);

// 7. Get Statistics
const stats = await vectorDB.getStats();
console.log('Total chunks:', stats.totalChunks);
console.log('Total files:', stats.totalFiles);
console.log('Languages:', stats.languages);
console.log('Types:', stats.types);
`;

export default CodeVectorDB;
