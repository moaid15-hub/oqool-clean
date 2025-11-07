// cache-layer.ts
// ============================================
// 💾 طبقة التخزين المؤقت - Cache Layer
// توفير 30-50% من تكاليف API
// ============================================

import crypto from 'crypto';

/**
 * استراتيجية Cache
 */
export type CacheStrategy = 'lru' | 'lfu' | 'ttl';

/**
 * طلب محفوظ
 */
export interface CachedRequest {
  hash: string;
  request: string;
  timestamp: number;
  hits: number;
}

/**
 * استجابة محفوظة
 */
export interface CachedResponse {
  content: string;
  cost: number;
  provider: string;
  timestamp: number;
  expiresAt?: number;
}

/**
 * LRU Cache - الأقل استخداماً
 */
class LRUCache {
  private cache = new Map<string, { data: CachedResponse; lastAccess: number }>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): CachedResponse | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // تحديث وقت الوصول
    item.lastAccess = Date.now();
    return item.data;
  }

  set(key: string, value: CachedResponse): void {
    // إذا امتلأ الـ Cache، احذف الأقل استخداماً
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.findLRU();
      if (lruKey) this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      data: value,
      lastAccess: Date.now()
    });
  }

  private findLRU(): string | null {
    let oldest = Date.now();
    let oldestKey: string | null = null;

    for (const [key, value] of this.cache) {
      if (value.lastAccess < oldest) {
        oldest = value.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * LFU Cache - الأقل تكراراً
 */
class LFUCache {
  private cache = new Map<string, { data: CachedResponse; frequency: number }>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): CachedResponse | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // زيادة عدد مرات الاستخدام
    item.frequency++;
    return item.data;
  }

  set(key: string, value: CachedResponse): void {
    if (this.cache.size >= this.maxSize) {
      const lfuKey = this.findLFU();
      if (lfuKey) this.cache.delete(lfuKey);
    }

    this.cache.set(key, {
      data: value,
      frequency: 1
    });
  }

  private findLFU(): string | null {
    let minFreq = Infinity;
    let lfuKey: string | null = null;

    for (const [key, value] of this.cache) {
      if (value.frequency < minFreq) {
        minFreq = value.frequency;
        lfuKey = key;
      }
    }

    return lfuKey;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * TTL Cache - وقت انتهاء محدد
 */
class TTLCache {
  private cache = new Map<string, CachedResponse>();
  private ttl: number; // بالميلي ثانية

  constructor(ttl: number = 3600000) { // ساعة واحدة افتراضياً
    this.ttl = ttl;

    // تنظيف دوري
    setInterval(() => this.cleanup(), 60000); // كل دقيقة
  }

  get(key: string): CachedResponse | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // التحقق من انتهاء الصلاحية
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  set(key: string, value: CachedResponse): void {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { ...value, expiresAt });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (value.expiresAt && value.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * طبقة التخزين المؤقت
 */
export class CacheLayer {
  private static instance: CacheLayer;

  private strategies = {
    lru: new LRUCache(100),
    lfu: new LFUCache(100),
    ttl: new TTLCache(3600000) // ساعة
  };

  private currentStrategy: CacheStrategy = 'lru';
  private enabled = true;

  // إحصائيات
  private stats = {
    hits: 0,
    misses: 0,
    savings: 0
  };

  private constructor() {}

  static getInstance(): CacheLayer {
    if (!CacheLayer.instance) {
      CacheLayer.instance = new CacheLayer();
    }
    return CacheLayer.instance;
  }

  /**
   * تعيين الاستراتيجية
   */
  setStrategy(strategy: CacheStrategy): void {
    this.currentStrategy = strategy;
  }

  /**
   * تفعيل/تعطيل Cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * التحقق من Cache
   */
  checkCache(request: string): CachedResponse | null {
    if (!this.enabled) return null;

    const hash = this.hashRequest(request);
    const cache = this.strategies[this.currentStrategy];
    const result = cache.get(hash);

    if (result) {
      this.stats.hits++;
      this.stats.savings += result.cost;
      return result;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * حفظ في Cache
   */
  saveToCache(request: string, response: CachedResponse): void {
    if (!this.enabled) return;

    const hash = this.hashRequest(request);
    const cache = this.strategies[this.currentStrategy];
    cache.set(hash, response);
  }

  /**
   * إنشاء Hash للطلب
   */
  private hashRequest(request: string): string {
    return crypto
      .createHash('sha256')
      .update(request.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * الإحصائيات
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate.toFixed(2) + '%',
      savings: `$${this.stats.savings.toFixed(4)}`,
      cacheSize: this.strategies[this.currentStrategy].size()
    };
  }

  /**
   * تنظيف Cache
   */
  clear(strategy?: CacheStrategy): void {
    if (strategy) {
      this.strategies[strategy].clear();
    } else {
      // تنظيف الكل
      Object.values(this.strategies).forEach(cache => cache.clear());
    }
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      savings: 0
    };
  }
}

export function getCacheLayer(): CacheLayer {
  return CacheLayer.getInstance();
}
