// base-adapter.ts
// ============================================
// 🔌 Base Adapter - المحول الأساسي الموحد
// ============================================
// Abstract base class for all AI provider adapters
// Provides unified interface, common functionality, and standardization
// ============================================

import type {
  IAIProvider,
  UnifiedRequest,
  UnifiedResponse,
  ProviderConfig,
} from '../interfaces/iai-provider.interface.js';

// ============================================
// 📊 Base Types & Interfaces
// ============================================

/**
 * Adapter Configuration - إعدادات المحول
 */
export interface BaseAdapterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheConfig?: CacheConfig;
  rateLimitConfig?: RateLimitConfig;
}

/**
 * Cache Configuration - إعدادات الكاش
 */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number; // Maximum cache entries
  ttl: number; // Time to live in milliseconds
  strategy: 'lru' | 'lfu' | 'fifo'; // Cache eviction strategy
  keyGenerator?: (request: UnifiedRequest) => string;
}

/**
 * Rate Limit Configuration - إعدادات حد المعدل
 */
export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  tokensPerMinute?: number;
  burstAllowance?: number; // Allow burst above limit
}

/**
 * Request Context - سياق الطلب
 */
export interface RequestContext {
  requestId: string;
  timestamp: Date;
  retryCount: number;
  cached: boolean;
  metadata: Record<string, any>;
}

/**
 * Execution Metrics - مقاييس التنفيذ
 */
export interface ExecutionMetrics {
  requestId: string;
  provider: string;
  model: string;
  startTime: number;
  endTime: number;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  cached: boolean;
  success: boolean;
  error?: string;
  retries: number;
}

/**
 * Provider Status - حالة المزود
 */
export interface ProviderStatus {
  available: boolean;
  healthy: boolean;
  lastChecked: Date;
  responseTime: number;
  errorRate: number;
  rateLimitRemaining?: number;
  message?: string;
}

// ============================================
// 🔌 Base Adapter Abstract Class
// ============================================

export abstract class BaseAdapter implements IAIProvider {
  protected config: BaseAdapterConfig;
  protected providerName: string;
  protected logger: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;

  // Caching
  protected cache: Map<string, CachedResponse> = new Map();
  protected cacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
  };

  // Rate limiting
  protected rateLimiter?: RateLimiter;

  // Metrics
  protected metrics: ExecutionMetrics[] = [];
  protected metricsStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalCost: 0,
    totalTokens: 0,
    averageDuration: 0,
  };

  // Status
  protected status: ProviderStatus = {
    available: true,
    healthy: true,
    lastChecked: new Date(),
    responseTime: 0,
    errorRate: 0,
  };

  constructor(providerName: string, config: BaseAdapterConfig) {
    this.providerName = providerName;
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableLogging: true,
      enableMetrics: true,
      enableCaching: false,
      ...config,
    };

    // Setup logger
    this.logger = (message: string, level: string) => {
      if (!this.config.enableLogging) return;

      const emoji = { info: '🔌', warn: '⚠️', error: '❌', debug: '🔍' }[level];
      console.log(`${emoji} [${this.providerName}] ${message}`);
    };

    // Setup cache
    if (this.config.enableCaching && this.config.cacheConfig) {
      this.setupCache(this.config.cacheConfig);
    }

    // Setup rate limiter
    if (this.config.rateLimitConfig?.enabled) {
      this.rateLimiter = new RateLimiter(this.config.rateLimitConfig);
    }

    this.logger(`${this.providerName} adapter initialized`, 'info');
  }

  // ============================================
  // 🎯 Abstract Methods (Must be implemented by subclasses)
  // ============================================

  /**
   * Execute the actual API call to the provider
   * تنفيذ استدعاء API الفعلي
   */
  protected abstract executeRequest(
    request: UnifiedRequest,
    context: RequestContext
  ): Promise<UnifiedResponse>;

  /**
   * Get provider-specific configuration
   * الحصول على إعدادات خاصة بالمزود
   */
  abstract getProviderConfig(): ProviderConfig;

  /**
   * Validate request for provider-specific requirements
   * التحقق من الطلب حسب متطلبات المزود
   */
  protected abstract validateRequest(request: UnifiedRequest): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Transform unified request to provider format
   * تحويل الطلب الموحد إلى صيغة المزود
   */
  protected abstract transformRequest(request: UnifiedRequest): any;

  /**
   * Transform provider response to unified format
   * تحويل استجابة المزود إلى صيغة موحدة
   */
  protected abstract transformResponse(response: any, request: UnifiedRequest): UnifiedResponse;

  /**
   * Calculate cost for request
   * حساب تكلفة الطلب
   */
  protected abstract calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string
  ): number;

  // ============================================
  // 🎯 Core Implementation Methods
  // ============================================

  /**
   * Main completion method - entry point
   * طريقة الإكمال الرئيسية
   */
  async complete(request: UnifiedRequest): Promise<UnifiedResponse> {
    const requestId = this.generateRequestId();
    const context: RequestContext = {
      requestId,
      timestamp: new Date(),
      retryCount: 0,
      cached: false,
      metadata: {},
    };

    this.logger(`Processing request ${requestId}`, 'info');

    try {
      // Step 1: Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
      }

      // Step 2: Check cache
      if (this.config.enableCaching) {
        const cached = this.checkCache(request);
        if (cached) {
          this.logger(`Cache hit for request ${requestId}`, 'debug');
          this.cacheStats.hits++;
          context.cached = true;

          const response = cached.response;
          response.metadata = {
            ...response.metadata,
            cached: true,
            requestId,
          };

          return response;
        }
        this.cacheStats.misses++;
      }

      // Step 3: Check rate limit
      if (this.rateLimiter) {
        await this.rateLimiter.waitForToken();
      }

      // Step 4: Execute with retry logic
      const response = await this.executeWithRetry(request, context);

      // Step 5: Cache response
      if (this.config.enableCaching && !response.error) {
        this.cacheResponse(request, response);
      }

      // Step 6: Record metrics
      if (this.config.enableMetrics) {
        this.recordMetrics(request, response, context);
      }

      // Step 7: Update status
      this.updateStatus(true);

      this.logger(`Request ${requestId} completed successfully`, 'info');

      return response;
    } catch (error: any) {
      this.logger(`Request ${requestId} failed: ${error.message}`, 'error');

      // Update status
      this.updateStatus(false);

      // Record failed metrics
      if (this.config.enableMetrics) {
        this.recordFailedMetrics(request, error, context);
      }

      // Return error response
      return {
        content: '',
        finishReason: 'error',
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          type: this.categorizeError(error),
        },
        metadata: {
          provider: this.providerName,
          requestId,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Execute with retry logic
   * التنفيذ مع منطق إعادة المحاولة
   */
  private async executeWithRetry(
    request: UnifiedRequest,
    context: RequestContext
  ): Promise<UnifiedResponse> {
    let lastError: Error | null = null;
    const maxRetries = this.config.maxRetries || 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      context.retryCount = attempt;

      try {
        this.logger(
          `Attempt ${attempt + 1}/${maxRetries} for request ${context.requestId}`,
          'debug'
        );

        // Execute with timeout
        const response = await this.executeWithTimeout(
          () => this.executeRequest(request, context),
          this.config.timeout || 30000
        );

        return response;
      } catch (error: any) {
        lastError = error;
        this.logger(`Attempt ${attempt + 1} failed: ${error.message}`, 'warn');

        // Check if should retry
        if (attempt < maxRetries - 1 && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger(`Waiting ${delay}ms before retry`, 'debug');
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Execute with timeout
   * التنفيذ مع مهلة
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  /**
   * Should retry error?
   * هل يجب إعادة محاولة الخطأ؟
   */
  protected shouldRetry(error: any): boolean {
    // Retry on rate limits, timeouts, and server errors
    const retryableErrors = [
      'rate_limit',
      'timeout',
      'server_error',
      'network_error',
      'ETIMEDOUT',
      'ECONNREFUSED',
      '429',
      '500',
      '502',
      '503',
      '504',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return retryableErrors.some(
      (err) => errorMessage.includes(err.toLowerCase()) || errorCode.includes(err.toLowerCase())
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   * حساب تأخير إعادة المحاولة
   */
  protected calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    const delay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    return Math.floor(delay + jitter);
  }

  // ============================================
  // 💾 Caching Methods
  // ============================================

  /**
   * Setup cache
   * إعداد الكاش
   */
  private setupCache(config: CacheConfig): void {
    this.config.cacheConfig = {
      strategy: 'lru',
      ...config,
    };

    this.logger(`Cache enabled with ${config.strategy} strategy`, 'info');
  }

  /**
   * Generate cache key
   * توليد مفتاح الكاش
   */
  private generateCacheKey(request: UnifiedRequest): string {
    if (this.config.cacheConfig?.keyGenerator) {
      return this.config.cacheConfig.keyGenerator(request);
    }

    // Default key generation
    const key = {
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    };

    return JSON.stringify(key);
  }

  /**
   * Check cache
   * التحقق من الكاش
   */
  private checkCache(request: UnifiedRequest): CachedResponse | null {
    const key = this.generateCacheKey(request);
    const cached = this.cache.get(key);

    if (!cached) return null;

    const now = Date.now();
    const ttl = this.config.cacheConfig?.ttl || 3600000; // 1 hour default

    if (now - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    if (this.config.cacheConfig?.strategy === 'lru') {
      cached.lastAccess = now;
      cached.hits++;
    }

    return cached;
  }

  /**
   * Cache response
   * حفظ الاستجابة في الكاش
   */
  private cacheResponse(request: UnifiedRequest, response: UnifiedResponse): void {
    const key = this.generateCacheKey(request);
    const maxSize = this.config.cacheConfig?.maxSize || 100;

    // Evict if needed
    if (this.cache.size >= maxSize) {
      this.evictCache();
    }

    this.cache.set(key, {
      key,
      response,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      hits: 0,
    });

    this.cacheStats.size = this.cache.size;
  }

  /**
   * Evict cache entry
   * إزالة إدخال من الكاش
   */
  private evictCache(): void {
    const strategy = this.config.cacheConfig?.strategy || 'lru';

    let keyToEvict: string | null = null;

    if (strategy === 'lru') {
      // Least Recently Used
      let oldestAccess = Date.now();
      for (const [key, entry] of this.cache) {
        if (entry.lastAccess < oldestAccess) {
          oldestAccess = entry.lastAccess;
          keyToEvict = key;
        }
      }
    } else if (strategy === 'lfu') {
      // Least Frequently Used
      let lowestHits = Infinity;
      for (const [key, entry] of this.cache) {
        if (entry.hits < lowestHits) {
          lowestHits = entry.hits;
          keyToEvict = key;
        }
      }
    } else if (strategy === 'fifo') {
      // First In First Out
      keyToEvict = this.cache.keys().next().value;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.logger(`Evicted cache entry: ${keyToEvict.substring(0, 50)}...`, 'debug');
    }
  }

  // ============================================
  // 📊 Metrics & Monitoring
  // ============================================

  /**
   * Record successful metrics
   * تسجيل مقاييس النجاح
   */
  private recordMetrics(
    request: UnifiedRequest,
    response: UnifiedResponse,
    context: RequestContext
  ): void {
    const metric: ExecutionMetrics = {
      requestId: context.requestId,
      provider: this.providerName,
      model: request.model || this.config.defaultModel || 'unknown',
      startTime: context.timestamp.getTime(),
      endTime: Date.now(),
      duration: Date.now() - context.timestamp.getTime(),
      inputTokens: response.usage?.inputTokens || 0,
      outputTokens: response.usage?.outputTokens || 0,
      totalTokens: response.usage?.totalTokens || 0,
      cost: response.metadata?.cost || 0,
      cached: context.cached,
      success: true,
      retries: context.retryCount,
    };

    this.metrics.push(metric);
    this.updateMetricsStats(metric);

    // Limit metrics history
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Record failed metrics
   * تسجيل مقاييس الفشل
   */
  private recordFailedMetrics(
    request: UnifiedRequest,
    error: Error,
    context: RequestContext
  ): void {
    const metric: ExecutionMetrics = {
      requestId: context.requestId,
      provider: this.providerName,
      model: request.model || this.config.defaultModel || 'unknown',
      startTime: context.timestamp.getTime(),
      endTime: Date.now(),
      duration: Date.now() - context.timestamp.getTime(),
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      cached: false,
      success: false,
      error: error.message,
      retries: context.retryCount,
    };

    this.metrics.push(metric);
    this.updateMetricsStats(metric);
  }

  /**
   * Update metrics statistics
   * تحديث إحصائيات المقاييس
   */
  private updateMetricsStats(metric: ExecutionMetrics): void {
    this.metricsStats.totalRequests++;

    if (metric.success) {
      this.metricsStats.successfulRequests++;
      this.metricsStats.totalCost += metric.cost;
      this.metricsStats.totalTokens += metric.totalTokens;
    } else {
      this.metricsStats.failedRequests++;
    }

    // Update average duration
    const totalDuration = this.metricsStats.averageDuration * (this.metricsStats.totalRequests - 1);
    this.metricsStats.averageDuration =
      (totalDuration + metric.duration) / this.metricsStats.totalRequests;
  }

  /**
   * Get metrics
   * الحصول على المقاييس
   */
  getMetrics(): {
    recent: ExecutionMetrics[];
    stats: typeof this.metricsStats;
    cache: typeof this.cacheStats;
  } {
    return {
      recent: this.metrics.slice(-100),
      stats: { ...this.metricsStats },
      cache: { ...this.cacheStats },
    };
  }

  // ============================================
  // 🏥 Status & Health
  // ============================================

  /**
   * Update provider status
   * تحديث حالة المزود
   */
  private updateStatus(success: boolean): void {
    this.status.lastChecked = new Date();

    const recentMetrics = this.metrics.slice(-100);
    const totalRecent = recentMetrics.length;

    if (totalRecent > 0) {
      const failedRecent = recentMetrics.filter((m) => !m.success).length;
      this.status.errorRate = failedRecent / totalRecent;

      const avgResponseTime =
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRecent;
      this.status.responseTime = avgResponseTime;

      // Consider healthy if error rate < 30% and response time < 30s
      this.status.healthy = this.status.errorRate < 0.3 && avgResponseTime < 30000;
    }

    this.status.available = success || this.status.errorRate < 0.5;
  }

  /**
   * Get provider status
   * الحصول على حالة المزود
   */
  getStatus(): ProviderStatus {
    return { ...this.status };
  }

  /**
   * Health check
   * فحص الصحة
   */
  async healthCheck(): Promise<ProviderStatus> {
    try {
      // Simple ping request
      const testRequest: UnifiedRequest = {
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 10,
      };

      const startTime = Date.now();
      await this.complete(testRequest);
      const duration = Date.now() - startTime;

      this.status.responseTime = duration;
      this.status.healthy = true;
      this.status.available = true;
      this.status.message = 'Health check passed';
    } catch (error: any) {
      this.status.healthy = false;
      this.status.message = `Health check failed: ${error.message}`;
    }

    this.status.lastChecked = new Date();
    return this.getStatus();
  }

  // ============================================
  // 🔧 Utility Methods
  // ============================================

  /**
   * Generate unique request ID
   * توليد معرف طلب فريد
   */
  protected generateRequestId(): string {
    return `${this.providerName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Categorize error type
   * تصنيف نوع الخطأ
   */
  protected categorizeError(error: any): 'timeout' | 'rate_limit' | 'auth' | 'server' | 'network' | 'unknown' {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    if (message.includes('timeout') || code.includes('etimedout')) return 'timeout';
    if (message.includes('rate limit') || code === '429') return 'rate_limit';
    if (message.includes('unauthorized') || code === '401' || code === '403') return 'auth';
    if (code === '500' || code === '502' || code === '503' || code === '504') return 'server';
    if (code.includes('econnrefused') || code.includes('enotfound')) return 'network';

    return 'unknown';
  }

  /**
   * Sleep utility
   * أداة النوم
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   * مسح الكاش
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, size: 0 };
    this.logger('Cache cleared', 'info');
  }

  /**
   * Reset metrics
   * إعادة تعيين المقاييس
   */
  resetMetrics(): void {
    this.metrics = [];
    this.metricsStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      averageDuration: 0,
    };
    this.logger('Metrics reset', 'info');
  }
}

// ============================================
// 🔧 Helper Classes
// ============================================

/**
 * Cached Response
 */
interface CachedResponse {
  key: string;
  response: UnifiedResponse;
  timestamp: number;
  lastAccess: number;
  hits: number;
}

/**
 * Rate Limiter
 */
class RateLimiter {
  private config: RateLimitConfig;
  private tokens: number;
  private lastRefill: number;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.requestsPerMinute;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    this.refillTokens();

    if (this.tokens < 1) {
      const waitTime = 60000 / this.config.requestsPerMinute;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refillTokens();
    }

    this.tokens--;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= 60000) {
      this.tokens = this.config.requestsPerMinute;
      this.lastRefill = now;
    } else {
      const tokensToAdd = (elapsed / 60000) * this.config.requestsPerMinute;
      this.tokens = Math.min(
        this.config.requestsPerMinute + (this.config.burstAllowance || 0),
        this.tokens + tokensToAdd
      );
    }
  }
}

// ============================================
// 📤 Exports
// ============================================

export default BaseAdapter;
