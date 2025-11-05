// cache-manager.ts
// ============================================
// ⚡ نظام الـ Cache المتقدم
// ============================================

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time To Live (بالثواني)
  size: number; // حجم البيانات بالـ bytes
}

export interface CacheOptions {
  ttl?: number; // افتراضي: 1 ساعة
  maxSize?: number; // الحد الأقصى للـ cache (بالـ MB)
  enableDisk?: boolean; // تفعيل disk cache
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  itemsCount: number;
  hitRate: number;
}

// ============================================
// ⚡ مدير الـ Cache
// ============================================

export class CacheManager {
  private memoryCache: Map<string, CacheEntry>;
  private diskCachePath: string;
  private stats: CacheStats;
  private options: Required<CacheOptions>;

  private readonly DEFAULT_TTL = 3600; // 1 ساعة
  private readonly DEFAULT_MAX_SIZE = 100; // 100 MB
  private readonly CACHE_VERSION = '1.0.0';

  constructor(options: CacheOptions = {}) {
    this.memoryCache = new Map();
    this.diskCachePath = path.join(os.tmpdir(), 'oqool-code-cache');

    this.options = {
      ttl: options.ttl || this.DEFAULT_TTL,
      maxSize: options.maxSize || this.DEFAULT_MAX_SIZE,
      enableDisk: options.enableDisk ?? true,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      itemsCount: 0,
      hitRate: 0,
    };

    this.init();
  }

  /**
   * تهيئة نظام الـ cache
   */
  private async init(): Promise<void> {
    // إنشاء مجلد cache على الـ disk
    if (this.options.enableDisk) {
      await fs.ensureDir(this.diskCachePath);
    }

    // تنظيف دوري
    setInterval(() => this.cleanup(), 60000); // كل دقيقة
  }

  /**
   * توليد مفتاح hash
   */
  private generateKey(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * حساب حجم البيانات
   */
  private calculateSize(value: any): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  }

  /**
   * التحقق من صلاحية الـ entry
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // بالثواني
    return age < entry.ttl;
  }

  /**
   * الحصول من الـ memory cache
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.memoryCache.delete(key);
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * الحصول من الـ disk cache
   */
  private async getFromDisk<T>(key: string): Promise<T | null> {
    if (!this.options.enableDisk) {
      return null;
    }

    try {
      const filePath = path.join(this.diskCachePath, `${key}.json`);

      if (!(await fs.pathExists(filePath))) {
        return null;
      }

      const data = await fs.readJSON(filePath);
      const entry: CacheEntry<T> = data;

      if (!this.isValid(entry)) {
        await fs.remove(filePath);
        return null;
      }

      // نقل للـ memory cache للوصول السريع
      this.memoryCache.set(key, entry);

      this.stats.hits++;
      return entry.value;
    } catch (error) {
      return null;
    }
  }

  /**
   * الحفظ في الـ memory cache
   */
  private setInMemory<T>(key: string, value: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
      size: this.calculateSize(value),
    };

    this.memoryCache.set(key, entry);
    this.stats.itemsCount = this.memoryCache.size;
    this.stats.size += entry.size;
  }

  /**
   * الحفظ في الـ disk cache
   */
  private async setOnDisk<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.options.enableDisk) {
      return;
    }

    try {
      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        size: this.calculateSize(value),
      };

      const filePath = path.join(this.diskCachePath, `${key}.json`);
      await fs.writeJSON(filePath, entry);
    } catch (error) {
      // تجاهل أخطاء الكتابة
    }
  }

  /**
   * الحصول من الـ cache
   */
  async get<T>(key: string): Promise<T | null> {
    const hashedKey = this.generateKey(key);

    // محاولة من الـ memory أولاً
    const fromMemory = this.getFromMemory<T>(hashedKey);
    if (fromMemory !== null) {
      return fromMemory;
    }

    // محاولة من الـ disk
    const fromDisk = await this.getFromDisk<T>(hashedKey);
    if (fromDisk !== null) {
      return fromDisk;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * الحفظ في الـ cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const hashedKey = this.generateKey(key);
    const cacheTTL = ttl || this.options.ttl;

    // حفظ في الـ memory
    this.setInMemory(hashedKey, value, cacheTTL);

    // حفظ في الـ disk للبيانات الكبيرة
    const valueSize = this.calculateSize(value);
    if (valueSize > 1024 * 100) {
      // أكبر من 100 KB
      await this.setOnDisk(hashedKey, value, cacheTTL);
    }

    // التحقق من الحد الأقصى للحجم
    await this.enforceMaxSize();
  }

  /**
   * حذف من الـ cache
   */
  async delete(key: string): Promise<void> {
    const hashedKey = this.generateKey(key);

    // حذف من الـ memory
    this.memoryCache.delete(hashedKey);

    // حذف من الـ disk
    if (this.options.enableDisk) {
      const filePath = path.join(this.diskCachePath, `${hashedKey}.json`);
      await fs.remove(filePath).catch(() => {});
    }

    this.stats.itemsCount = this.memoryCache.size;
  }

  /**
   * مسح الـ cache بالكامل
   */
  async clear(): Promise<void> {
    // مسح الـ memory
    this.memoryCache.clear();

    // مسح الـ disk
    if (this.options.enableDisk) {
      await fs.emptyDir(this.diskCachePath);
    }

    // إعادة تعيين الإحصائيات
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      itemsCount: 0,
      hitRate: 0,
    };
  }

  /**
   * تنظيف الـ cache من العناصر المنتهية
   */
  private async cleanup(): Promise<void> {
    // تنظيف الـ memory
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // تنظيف الـ disk
    if (this.options.enableDisk) {
      try {
        const files = await fs.readdir(this.diskCachePath);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(this.diskCachePath, file);
          const data = await fs.readJSON(filePath);
          const entry: CacheEntry = data;

          if (!this.isValid(entry)) {
            await fs.remove(filePath);
          }
        }
      } catch (error) {
        // تجاهل الأخطاء
      }
    }

    this.stats.itemsCount = this.memoryCache.size;
  }

  /**
   * فرض الحد الأقصى للحجم
   */
  private async enforceMaxSize(): Promise<void> {
    const maxSizeBytes = this.options.maxSize * 1024 * 1024; // تحويل لـ bytes

    if (this.stats.size <= maxSizeBytes) {
      return;
    }

    // حذف العناصر الأقدم
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    while (this.stats.size > maxSizeBytes && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.memoryCache.delete(key);
      this.stats.size -= entry.size;
    }

    this.stats.itemsCount = this.memoryCache.size;
  }

  /**
   * تحديث نسبة الـ hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * الحصول على إحصائيات الـ cache
   */
  getStats(): CacheStats {
    this.updateHitRate();
    return { ...this.stats };
  }

  /**
   * cache AI response
   */
  async cacheAIResponse(prompt: string, response: string): Promise<void> {
    const key = `ai:${prompt}`;
    await this.set(key, response, 3600 * 24); // 24 ساعة
  }

  /**
   * الحصول على AI response من cache
   */
  async getAIResponse(prompt: string): Promise<string | null> {
    const key = `ai:${prompt}`;
    return await this.get<string>(key);
  }

  /**
   * cache file analysis
   */
  async cacheAnalysis(filePath: string, analysis: any): Promise<void> {
    const key = `analysis:${filePath}`;
    await this.set(key, analysis, 3600); // 1 ساعة
  }

  /**
   * الحصول على file analysis من cache
   */
  async getAnalysis(filePath: string): Promise<any | null> {
    const key = `analysis:${filePath}`;
    return await this.get<any>(key);
  }

  /**
   * cache git info
   */
  async cacheGitInfo(repo: string, info: any): Promise<void> {
    const key = `git:${repo}`;
    await this.set(key, info, 300); // 5 دقائق
  }

  /**
   * الحصول على git info من cache
   */
  async getGitInfo(repo: string): Promise<any | null> {
    const key = `git:${repo}`;
    return await this.get<any>(key);
  }
}

// تصدير instance واحد (Singleton)
let globalCacheManager: CacheManager | null = null;

export function getCacheManager(options?: CacheOptions): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager(options);
  }
  return globalCacheManager;
}

export function createCacheManager(options?: CacheOptions): CacheManager {
  return new CacheManager(options);
}
