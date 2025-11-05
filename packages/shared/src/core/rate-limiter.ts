/**
 * Rate Limiter System
 *
 * نظام تحديد معدل الطلبات لحماية من:
 * - استنزاف API quota
 * - التكاليف الزائدة
 * - حظر الحساب من AI providers
 */

export interface RateLimitConfig {
  maxRequests: number;      // عدد الطلبات المسموح بها
  timeWindow: number;        // الفترة الزمنية بالميللي ثانية
  cleanupInterval?: number;  // فترة التنظيف التلقائي
}

export interface RateLimitWindow {
  count: number;
  startTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Default configurations for different use cases
 */
export const DEFAULT_RATE_LIMITS = {
  // AI API Calls (محافظ)
  AI_CALLS: {
    maxRequests: 10,
    timeWindow: 60000, // 1 minute
    cleanupInterval: 300000, // 5 minutes
  },

  // File Operations (متوسط)
  FILE_OPS: {
    maxRequests: 50,
    timeWindow: 60000,
    cleanupInterval: 300000,
  },

  // Git Operations (صارم)
  GIT_OPS: {
    maxRequests: 5,
    timeWindow: 60000,
    cleanupInterval: 300000,
  },

  // General CLI Commands (متساهل)
  CLI_COMMANDS: {
    maxRequests: 100,
    timeWindow: 60000,
    cleanupInterval: 300000,
  },
};

/**
 * Rate Limiter Class
 *
 * يحدد عدد الطلبات المسموح بها في فترة زمنية معينة
 */
export class RateLimiter {
  private windows: Map<string, RateLimitWindow>;
  private lastCleanup: number;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.windows = new Map();
    this.lastCleanup = Date.now();
    this.config = {
      maxRequests: config.maxRequests,
      timeWindow: config.timeWindow,
      cleanupInterval: config.cleanupInterval || 300000,
    };
  }

  /**
   * Check if request is allowed
   */
  isAllowed(clientId: string): boolean {
    const result = this.checkLimit(clientId);
    return result.allowed;
  }

  /**
   * Check limit with detailed information
   */
  checkLimit(clientId: string): RateLimitResult {
    const now = Date.now();

    // Periodic cleanup
    if (now - this.lastCleanup > this.config.cleanupInterval) {
      this.cleanupExpired();
      this.lastCleanup = now;
    }

    let window = this.windows.get(clientId);

    // New window or expired window
    if (!window || now - window.startTime > this.config.timeWindow) {
      window = {
        count: 1,
        startTime: now,
      };
      this.windows.set(clientId, window);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.timeWindow,
      };
    }

    // Check if limit exceeded
    if (window.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: window.startTime + this.config.timeWindow,
      };
    }

    // Increment and allow
    window.count++;

    return {
      allowed: true,
      remaining: this.config.maxRequests - window.count,
      resetAt: window.startTime + this.config.timeWindow,
    };
  }

  /**
   * Get current usage for a client
   */
  getUsage(clientId: string): { count: number; remaining: number; resetAt: number } {
    const now = Date.now();
    const window = this.windows.get(clientId);

    if (!window || now - window.startTime > this.config.timeWindow) {
      return {
        count: 0,
        remaining: this.config.maxRequests,
        resetAt: now + this.config.timeWindow,
      };
    }

    return {
      count: window.count,
      remaining: Math.max(0, this.config.maxRequests - window.count),
      resetAt: window.startTime + this.config.timeWindow,
    };
  }

  /**
   * Reset limit for a specific client
   */
  reset(clientId: string): void {
    this.windows.delete(clientId);
  }

  /**
   * Reset all limits
   */
  resetAll(): void {
    this.windows.clear();
  }

  /**
   * Clean up expired windows
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [clientId, window] of this.windows.entries()) {
      if (now - window.startTime > this.config.timeWindow) {
        toDelete.push(clientId);
      }
    }

    toDelete.forEach((clientId) => this.windows.delete(clientId));

    if (toDelete.length > 0) {
      console.debug(`[RateLimiter] Cleaned up ${toDelete.length} expired windows`);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalClients: number;
    config: RateLimitConfig;
    windows: Array<{ clientId: string; count: number; age: number }>;
  } {
    const now = Date.now();
    const windows: Array<{ clientId: string; count: number; age: number }> = [];

    for (const [clientId, window] of this.windows.entries()) {
      windows.push({
        clientId,
        count: window.count,
        age: now - window.startTime,
      });
    }

    return {
      totalClients: this.windows.size,
      config: this.config,
      windows,
    };
  }
}

/**
 * Multi-tier Rate Limiter
 *
 * يدعم عدة مستويات من التحديد (tier-based)
 */
export class TieredRateLimiter {
  private limiters: Map<string, RateLimiter>;

  constructor() {
    this.limiters = new Map();
  }

  /**
   * Register a tier with its config
   */
  registerTier(tierName: string, config: RateLimitConfig): void {
    this.limiters.set(tierName, new RateLimiter(config));
  }

  /**
   * Check if request is allowed for a specific tier
   */
  isAllowed(tierName: string, clientId: string): boolean {
    const limiter = this.limiters.get(tierName);
    if (!limiter) {
      throw new Error(`Rate limiter tier "${tierName}" not found`);
    }
    return limiter.isAllowed(clientId);
  }

  /**
   * Check limit with detailed information
   */
  checkLimit(tierName: string, clientId: string): RateLimitResult {
    const limiter = this.limiters.get(tierName);
    if (!limiter) {
      throw new Error(`Rate limiter tier "${tierName}" not found`);
    }
    return limiter.checkLimit(clientId);
  }

  /**
   * Get usage for a specific tier
   */
  getUsage(tierName: string, clientId: string) {
    const limiter = this.limiters.get(tierName);
    if (!limiter) {
      throw new Error(`Rate limiter tier "${tierName}" not found`);
    }
    return limiter.getUsage(clientId);
  }

  /**
   * Get all registered tiers
   */
  getTiers(): string[] {
    return Array.from(this.limiters.keys());
  }
}

/**
 * Factory function to create pre-configured rate limiters
 */
export function createRateLimiter(type: keyof typeof DEFAULT_RATE_LIMITS): RateLimiter {
  const config = DEFAULT_RATE_LIMITS[type];
  return new RateLimiter(config);
}

/**
 * Global rate limiter instance with default tiers
 */
export const globalRateLimiter = new TieredRateLimiter();

// Register default tiers
globalRateLimiter.registerTier('ai', DEFAULT_RATE_LIMITS.AI_CALLS);
globalRateLimiter.registerTier('file', DEFAULT_RATE_LIMITS.FILE_OPS);
globalRateLimiter.registerTier('git', DEFAULT_RATE_LIMITS.GIT_OPS);
globalRateLimiter.registerTier('cli', DEFAULT_RATE_LIMITS.CLI_COMMANDS);

/**
 * Helper function for CLI usage
 */
export async function withRateLimit<T>(
  tier: string,
  clientId: string,
  operation: () => Promise<T>
): Promise<T> {
  const result = globalRateLimiter.checkLimit(tier, clientId);

  if (!result.allowed) {
    const waitTime = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new Error(
      `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`
    );
  }

  return await operation();
}
