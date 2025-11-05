/**
 * Qdrant Vector Database Integration for Oqool AI
 *
 * يوفر هذا الملف تكاملاً مع Qdrant لإجراء بحث دلالي في الكود
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

interface CodeEmbedding {
  id: string;
  code: string;
  file: string;
  language: string;
  description?: string;
  vector: number[];
}

interface SearchResult {
  code: string;
  file: string;
  similarity: number;
  language: string;
  description?: string;
}

/**
 * نظام البحث الدلالي في الكود
 */
export class SemanticCodeSearch {
  private qdrant: QdrantClient;
  private openai: OpenAI;
  private collectionName: string = 'oqool_code_embeddings';

  constructor(
    qdrantUrl: string = 'http://localhost:6333',
    openaiApiKey?: string
  ) {
    this.qdrant = new QdrantClient({ url: qdrantUrl });
    this.openai = new OpenAI({
      apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * تهيئة مجموعة Qdrant
   */
  async initialize() {
    try {
      // التحقق من وجود المجموعة
      await this.qdrant.getCollection(this.collectionName);
      console.log('✅ Collection already exists');
    } catch {
      // إنشاء مجموعة جديدة
      await this.qdrant.createCollection(this.collectionName, {
        vectors: {
          size: 1536, // OpenAI embedding dimension
          distance: 'Cosine',
        },
      });
      console.log('✅ Collection created successfully');
    }
  }

  /**
   * تحويل الكود إلى embedding
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * إضافة كود إلى قاعدة البيانات
   */
  async addCode(
    id: string,
    code: string,
    file: string,
    language: string,
    description?: string
  ): Promise<void> {
    // تحويل الكود إلى embedding
    const embedding = await this.getEmbedding(code);

    // إضافة إلى Qdrant
    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id: id,
          vector: embedding,
          payload: {
            code,
            file,
            language,
            description,
          },
        },
      ],
    });
  }

  /**
   * إضافة عدة أكواد دفعة واحدة
   */
  async addCodeBatch(codes: Omit<CodeEmbedding, 'vector'>[]): Promise<void> {
    const points = await Promise.all(
      codes.map(async (codeData) => ({
        id: codeData.id,
        vector: await this.getEmbedding(codeData.code),
        payload: {
          code: codeData.code,
          file: codeData.file,
          language: codeData.language,
          description: codeData.description,
        },
      }))
    );

    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  /**
   * البحث عن أكواد مشابهة
   */
  async searchSimilarCode(
    query: string,
    limit: number = 10,
    languageFilter?: string
  ): Promise<SearchResult[]> {
    // تحويل السؤال إلى embedding
    const queryEmbedding = await this.getEmbedding(query);

    // البحث في Qdrant
    const searchResult = await this.qdrant.search(this.collectionName, {
      vector: queryEmbedding,
      limit,
      filter: languageFilter
        ? {
            must: [
              {
                key: 'language',
                match: { value: languageFilter },
              },
            ],
          }
        : undefined,
    });

    // تحويل النتائج
    return searchResult.map((result) => ({
      code: result.payload!.code as string,
      file: result.payload!.file as string,
      language: result.payload!.language as string,
      description: result.payload!.description as string | undefined,
      similarity: result.score,
    }));
  }

  /**
   * البحث بالمعنى (مثال: "authentication function")
   */
  async semanticSearch(description: string, limit: number = 5): Promise<SearchResult[]> {
    return this.searchSimilarCode(description, limit);
  }

  /**
   * إيجاد أكواد مكررة أو متشابهة جداً
   */
  async findDuplicateCode(
    threshold: number = 0.95,
    language?: string
  ): Promise<Array<{ file1: string; file2: string; similarity: number }>> {
    // الحصول على جميع الأكواد
    const allPoints = await this.qdrant.scroll(this.collectionName, {
      limit: 1000,
      with_payload: true,
      with_vector: true,
    });

    const duplicates: Array<{ file1: string; file2: string; similarity: number }> = [];

    // مقارنة كل كود بالآخر
    for (let i = 0; i < allPoints.points.length; i++) {
      const point1 = allPoints.points[i];

      if (language && point1.payload!.language !== language) {
        continue;
      }

      for (let j = i + 1; j < allPoints.points.length; j++) {
        const point2 = allPoints.points[j];

        if (language && point2.payload!.language !== language) {
          continue;
        }

        // حساب التشابه
        const similarity = this.cosineSimilarity(
          point1.vector as number[],
          point2.vector as number[]
        );

        if (similarity >= threshold) {
          duplicates.push({
            file1: point1.payload!.file as string,
            file2: point2.payload!.file as string,
            similarity,
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * حذف جميع البيانات
   */
  async clear(): Promise<void> {
    await this.qdrant.deleteCollection(this.collectionName);
    await this.initialize();
  }

  /**
   * حساب تشابه الكوساين
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * الحصول على إحصائيات
   */
  async getStats(): Promise<{
    totalCodes: number;
    languages: Record<string, number>;
  }> {
    const collection = await this.qdrant.getCollection(this.collectionName);

    const allPoints = await this.qdrant.scroll(this.collectionName, {
      limit: 10000,
      with_payload: true,
    });

    const languages: Record<string, number> = {};

    allPoints.points.forEach(point => {
      const lang = point.payload!.language as string;
      languages[lang] = (languages[lang] || 0) + 1;
    });

    return {
      totalCodes: collection.points_count || 0,
      languages,
    };
  }
}

/**
 * مثال استخدام:
 *
 * const search = new SemanticCodeSearch();
 * await search.initialize();
 *
 * // إضافة كود
 * await search.addCode(
 *   'func_1',
 *   'function authenticate(user, password) { ... }',
 *   'src/auth.ts',
 *   'typescript',
 *   'User authentication function'
 * );
 *
 * // البحث
 * const results = await search.searchSimilarCode('login function');
 * console.log(results);
 */
