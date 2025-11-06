// fallback-manager.ts
// ============================================
// 🔄 Fallback Manager - مدير الاحتياط الذكي
// ============================================
// Advanced fallback management with intelligent retry strategies,
// circuit breaker pattern, and adaptive recovery mechanisms
// ============================================

// ============================================
// 📊 Core Types & Interfaces
// ============================================

/**
 * Fallback Strategy - استراتيجية الاحتياط
 */
export type FallbackStrategy =
  | 'sequential' // Try providers one by one
  | 'parallel' // Try multiple providers simultaneously
  | 'cascade' // Try in order of preference with smart skipping
  | 'adaptive' // Learn from failures and adapt strategy
  | 'custom'; // Custom strategy function

/**
 * Retry Strategy - استراتيجية إعادة المحاولة
 */
export interface RetryStrategy {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number; // exponential backoff
  jitter: boolean; // add randomness to prevent thundering herd
  retryableErrors: string[]; // Error codes that should trigger retry
}

/**
 * Circuit Breaker State - حالة قاطع الدائرة
 */
export type CircuitState = 'closed' | 'open' | 'half_open';

/**
 * Circuit Breaker Config - إعدادات قاطع الدائرة
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms before trying half-open
  resetTimeout: number; // Time in ms before resetting failure count
  monitoringWindow: number; // Time window for tracking failures (ms)
}

/**
 * Fallback Chain - سلسلة الاحتياط
 */
export interface FallbackChain {
  primary: string; // Primary provider
  fallbacks: string[]; // Ordered list of fallback providers
  strategy: FallbackStrategy;
  retryStrategy: RetryStrategy;
  circuitBreaker?: CircuitBreakerConfig;
  timeout?: number; // Per-provider timeout
  skipFailedProviders?: boolean; // Skip providers that recently failed
  parallelAttempts?: number; // Number of parallel attempts (for parallel strategy)
}

/**
 * Execution Attempt - محاولة التنفيذ
 */
export interface ExecutionAttempt {
  provider: string;
  attemptNumber: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: ExecutionError;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Execution Error - خطأ التنفيذ
 */
export interface ExecutionError {
  code: string;
  message: string;
  type: 'timeout' | 'rate_limit' | 'auth' | 'server' | 'network' | 'unknown';
  retryable: boolean;
  provider: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * Fallback Result - نتيجة الاحتياط
 */
export interface FallbackResult<T = any> {
  success: boolean;
  result?: T;
  error?: ExecutionError;
  providerUsed: string;
  attempts: ExecutionAttempt[];
  totalDuration: number;
  strategy: FallbackStrategy;
  metrics: {
    totalAttempts: number;
    successfulProvider: string | null;
    failedProviders: string[];
    skippedProviders: string[];
    averageAttemptDuration: number;
  };
}

/**
 * Provider Health Status - حالة صحة المزود
 */
export interface ProviderHealthStatus {
  provider: string;
  healthy: boolean;
  circuitState: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  failureRate: number; // 0-1
  averageResponseTime: number;
  lastChecked: Date;
  metadata: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    timeoutCount: number;
    rateLimitCount: number;
  };
}

/**
 * Recovery Action - إجراء الاسترداد
 */
export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'abort' | 'wait' | 'circuit_break';
  delay?: number;
  nextProvider?: string;
  reason: string;
  confidence: number; // 0-1
}

// ============================================
// 🔄 Fallback Manager Class
// ============================================

export class FallbackManager {
  private providerHealth: Map<string, ProviderHealthStatus> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private executionHistory: ExecutionAttempt[] = [];
  private logger: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;

  // Default configurations
  private defaultRetryStrategy: RetryStrategy = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['timeout', 'rate_limit', 'server', 'network'],
  };

  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    resetTimeout: 300000, // 5 minutes
    monitoringWindow: 60000, // 1 minute
  };

  constructor(
    logger?: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void
  ) {
    this.logger =
      logger ||
      ((message: string, level: string) => {
        const emoji = { info: '🔄', warn: '⚠️', error: '❌', debug: '🔍' }[level];
        console.log(`${emoji} [FallbackManager] ${message}`);
      });

    this.logger('Fallback Manager initialized', 'info');

    // Start health monitoring
    this.startHealthMonitoring();
  }

  // ============================================
  // 🎯 Main Execution Methods
  // ============================================

  /**
   * Execute with fallback support
   * التنفيذ مع دعم الاحتياط
   */
  async executeWithFallback<T>(
    chain: FallbackChain,
    executor: (provider: string) => Promise<T>
  ): Promise<FallbackResult<T>> {
    const startTime = Date.now();
    const attempts: ExecutionAttempt[] = [];

    this.logger(
      `Starting execution with ${chain.strategy} strategy (primary: ${chain.primary})`,
      'info'
    );

    try {
      // Build provider list
      const providers = this.buildProviderList(chain);

      // Execute based on strategy
      let result: FallbackResult<T>;

      switch (chain.strategy) {
        case 'sequential':
          result = await this.executeSequential(providers, executor, chain, attempts);
          break;

        case 'parallel':
          result = await this.executeParallel(providers, executor, chain, attempts);
          break;

        case 'cascade':
          result = await this.executeCascade(providers, executor, chain, attempts);
          break;

        case 'adaptive':
          result = await this.executeAdaptive(providers, executor, chain, attempts);
          break;

        default:
          result = await this.executeSequential(providers, executor, chain, attempts);
      }

      // Update health status
      this.updateHealthFromAttempts(attempts);

      // Store execution history
      this.executionHistory.push(...attempts);
      this.trimExecutionHistory();

      result.totalDuration = Date.now() - startTime;
      result.attempts = attempts;

      this.logger(
        `Execution completed: ${result.success ? 'SUCCESS' : 'FAILURE'} with ${result.providerUsed || 'none'} in ${result.totalDuration}ms`,
        result.success ? 'info' : 'error'
      );

      return result;
    } catch (error: any) {
      this.logger(`Execution failed catastrophically: ${error.message}`, 'error');

      return {
        success: false,
        error: this.categorizeError(error, 'unknown'),
        providerUsed: '',
        attempts,
        totalDuration: Date.now() - startTime,
        strategy: chain.strategy,
        metrics: this.buildMetrics(attempts),
      };
    }
  }

  // ============================================
  // 📋 Execution Strategies
  // ============================================

  /**
   * Sequential execution - try one provider at a time
   * التنفيذ المتسلسل
   */
  private async executeSequential<T>(
    providers: string[],
    executor: (provider: string) => Promise<T>,
    chain: FallbackChain,
    attempts: ExecutionAttempt[]
  ): Promise<FallbackResult<T>> {
    for (const provider of providers) {
      // Check circuit breaker
      if (this.isCircuitOpen(provider)) {
        this.logger(`Circuit breaker open for ${provider}, skipping`, 'warn');
        attempts.push(this.createSkippedAttempt(provider, 'circuit_open'));
        continue;
      }

      // Try with retries
      const result = await this.tryWithRetries(provider, executor, chain, attempts);

      if (result.success) {
        return {
          success: true,
          result: result.data,
          providerUsed: provider,
          attempts,
          totalDuration: 0, // Will be set by caller
          strategy: chain.strategy,
          metrics: this.buildMetrics(attempts),
        };
      }

      // Record failure
      this.recordFailure(provider, result.error!);

      // Check if should continue
      if (!result.error?.retryable && providers.indexOf(provider) === providers.length - 1) {
        // Last provider and non-retryable error
        break;
      }
    }

    // All providers failed
    return {
      success: false,
      error: attempts[attempts.length - 1]?.error,
      providerUsed: '',
      attempts,
      totalDuration: 0,
      strategy: chain.strategy,
      metrics: this.buildMetrics(attempts),
    };
  }

  /**
   * Parallel execution - try multiple providers simultaneously
   * التنفيذ المتوازي
   */
  private async executeParallel<T>(
    providers: string[],
    executor: (provider: string) => Promise<T>,
    chain: FallbackChain,
    attempts: ExecutionAttempt[]
  ): Promise<FallbackResult<T>> {
    const parallelCount = Math.min(
      chain.parallelAttempts || 2,
      providers.length
    );

    this.logger(`Executing ${parallelCount} providers in parallel`, 'debug');

    // Filter out providers with open circuits
    const availableProviders = providers.filter((p) => !this.isCircuitOpen(p));

    if (availableProviders.length === 0) {
      this.logger('All providers have open circuits', 'error');
      return {
        success: false,
        error: {
          code: 'ALL_CIRCUITS_OPEN',
          message: 'All providers are unavailable',
          type: 'server',
          retryable: true,
          provider: 'none',
          timestamp: new Date(),
        },
        providerUsed: '',
        attempts,
        totalDuration: 0,
        strategy: chain.strategy,
        metrics: this.buildMetrics(attempts),
      };
    }

    // Take top N providers
    const selectedProviders = availableProviders.slice(0, parallelCount);

    // Execute in parallel with race
    const promises = selectedProviders.map(async (provider) => {
      const result = await this.tryWithRetries(provider, executor, chain, attempts);
      return { provider, result };
    });

    try {
      // Wait for first successful result
      const winner = await Promise.race(
        promises.map(async (p) => {
          const result = await p;
          if (result.result.success) {
            return result;
          }
          throw result.result.error;
        })
      );

      this.recordSuccess(winner.provider);

      return {
        success: true,
        result: winner.result.data,
        providerUsed: winner.provider,
        attempts,
        totalDuration: 0,
        strategy: chain.strategy,
        metrics: this.buildMetrics(attempts),
      };
    } catch (error) {
      // All failed
      return {
        success: false,
        error: error as ExecutionError,
        providerUsed: '',
        attempts,
        totalDuration: 0,
        strategy: chain.strategy,
        metrics: this.buildMetrics(attempts),
      };
    }
  }

  /**
   * Cascade execution - intelligent provider selection with skipping
   * التنفيذ المتتالي
   */
  private async executeCascade<T>(
    providers: string[],
    executor: (provider: string) => Promise<T>,
    chain: FallbackChain,
    attempts: ExecutionAttempt[]
  ): Promise<FallbackResult<T>> {
    // Sort providers by health
    const sortedProviders = this.sortProvidersByHealth(providers);

    this.logger(
      `Cascade execution with sorted providers: ${sortedProviders.join(' → ')}`,
      'debug'
    );

    for (const provider of sortedProviders) {
      // Smart skip decision
      const shouldSkip = this.shouldSkipProvider(provider);

      if (shouldSkip.skip) {
        this.logger(`Skipping ${provider}: ${shouldSkip.reason}`, 'debug');
        attempts.push(this.createSkippedAttempt(provider, shouldSkip.reason));
        continue;
      }

      // Try provider
      const result = await this.tryWithRetries(provider, executor, chain, attempts);

      if (result.success) {
        this.recordSuccess(provider);
        return {
          success: true,
          result: result.data,
          providerUsed: provider,
          attempts,
          totalDuration: 0,
          strategy: chain.strategy,
          metrics: this.buildMetrics(attempts),
        };
      }

      this.recordFailure(provider, result.error!);

      // Adaptive decision: should continue?
      const shouldContinue = this.shouldContinueCascade(provider, result.error!, sortedProviders);

      if (!shouldContinue) {
        this.logger('Cascade stopped based on error analysis', 'warn');
        break;
      }
    }

    return {
      success: false,
      error: attempts[attempts.length - 1]?.error,
      providerUsed: '',
      attempts,
      totalDuration: 0,
      strategy: chain.strategy,
      metrics: this.buildMetrics(attempts),
    };
  }

  /**
   * Adaptive execution - learns from patterns and adapts
   * التنفيذ التكيفي
   */
  private async executeAdaptive<T>(
    providers: string[],
    executor: (provider: string) => Promise<T>,
    chain: FallbackChain,
    attempts: ExecutionAttempt[]
  ): Promise<FallbackResult<T>> {
    // Analyze historical patterns
    const recommendations = this.analyzeHistoricalPatterns(providers);

    this.logger(
      `Adaptive execution - recommended order: ${recommendations.join(' → ')}`,
      'debug'
    );

    // Use cascade with adaptive ordering
    return this.executeCascade(recommendations, executor, chain, attempts);
  }

  // ============================================
  // 🔄 Retry Logic
  // ============================================

  /**
   * Try provider with retry logic
   * المحاولة مع إعادة المحاولة
   */
  private async tryWithRetries<T>(
    provider: string,
    executor: (provider: string) => Promise<T>,
    chain: FallbackChain,
    attempts: ExecutionAttempt[]
  ): Promise<{ success: boolean; data?: T; error?: ExecutionError }> {
    const retryStrategy = chain.retryStrategy || this.defaultRetryStrategy;
    let lastError: ExecutionError | undefined;

    for (let attempt = 1; attempt <= retryStrategy.maxAttempts; attempt++) {
      const attemptRecord: ExecutionAttempt = {
        provider,
        attemptNumber: attempt,
        startTime: Date.now(),
        success: false,
      };

      try {
        this.logger(`Attempting ${provider} (${attempt}/${retryStrategy.maxAttempts})`, 'debug');

        // Execute with timeout
        const result = await this.executeWithTimeout(
          () => executor(provider),
          chain.timeout || 30000
        );

        attemptRecord.success = true;
        attemptRecord.endTime = Date.now();
        attemptRecord.duration = attemptRecord.endTime - attemptRecord.startTime;
        attempts.push(attemptRecord);

        return { success: true, data: result };
      } catch (error: any) {
        lastError = this.categorizeError(error, provider);

        attemptRecord.success = false;
        attemptRecord.error = lastError;
        attemptRecord.endTime = Date.now();
        attemptRecord.duration = attemptRecord.endTime - attemptRecord.startTime;
        attempts.push(attemptRecord);

        this.logger(
          `Attempt ${attempt} failed for ${provider}: ${lastError.message}`,
          'warn'
        );

        // Check if should retry
        if (attempt < retryStrategy.maxAttempts && lastError.retryable) {
          const delay = this.calculateBackoffDelay(
            attempt,
            retryStrategy.initialDelay,
            retryStrategy.maxDelay,
            retryStrategy.backoffMultiplier,
            retryStrategy.jitter
          );

          this.logger(`Waiting ${delay}ms before retry`, 'debug');
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * Calculate exponential backoff delay
   * حساب تأخير التراجع الأسي
   */
  private calculateBackoffDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    multiplier: number,
    jitter: boolean
  ): number {
    let delay = initialDelay * Math.pow(multiplier, attempt - 1);
    delay = Math.min(delay, maxDelay);

    if (jitter) {
      // Add random jitter (±25%)
      const jitterAmount = delay * 0.25;
      delay += (Math.random() * 2 - 1) * jitterAmount;
    }

    return Math.floor(delay);
  }

  // ============================================
  // 🔌 Circuit Breaker Logic
  // ============================================

  /**
   * Check if circuit is open
   * التحقق من فتح الدائرة
   */
  private isCircuitOpen(provider: string): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) {
      this.initializeCircuitBreaker(provider);
      return false;
    }

    return breaker.state === 'open';
  }

  /**
   * Initialize circuit breaker
   * تهيئة قاطع الدائرة
   */
  private initializeCircuitBreaker(provider: string): void {
    const config = this.defaultCircuitConfig;
    this.circuitBreakers.set(provider, new CircuitBreaker(provider, config));
    this.logger(`Initialized circuit breaker for ${provider}`, 'debug');
  }

  /**
   * Record success
   * تسجيل النجاح
   */
  private recordSuccess(provider: string): void {
    let health = this.providerHealth.get(provider);

    if (!health) {
      health = this.initializeProviderHealth(provider);
    }

    health.consecutiveSuccesses++;
    health.consecutiveFailures = 0;
    health.lastSuccessTime = new Date();
    health.metadata.successfulRequests++;
    health.metadata.totalRequests++;

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.recordSuccess();
    }

    // Update health status
    this.updateHealthStatus(health);

    this.logger(`Recorded success for ${provider}`, 'debug');
  }

  /**
   * Record failure
   * تسجيل الفشل
   */
  private recordFailure(provider: string, error: ExecutionError): void {
    let health = this.providerHealth.get(provider);

    if (!health) {
      health = this.initializeProviderHealth(provider);
    }

    health.consecutiveFailures++;
    health.consecutiveSuccesses = 0;
    health.lastFailureTime = new Date();
    health.metadata.failedRequests++;
    health.metadata.totalRequests++;

    // Track error types
    if (error.type === 'timeout') health.metadata.timeoutCount++;
    if (error.type === 'rate_limit') health.metadata.rateLimitCount++;

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.recordFailure();
    }

    // Update health status
    this.updateHealthStatus(health);

    this.logger(`Recorded failure for ${provider}: ${error.type}`, 'warn');
  }

  // ============================================
  // 🏥 Health Management
  // ============================================

  /**
   * Initialize provider health
   * تهيئة صحة المزود
   */
  private initializeProviderHealth(provider: string): ProviderHealthStatus {
    const health: ProviderHealthStatus = {
      provider,
      healthy: true,
      circuitState: 'closed',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      failureRate: 0,
      averageResponseTime: 0,
      lastChecked: new Date(),
      metadata: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        timeoutCount: 0,
        rateLimitCount: 0,
      },
    };

    this.providerHealth.set(provider, health);
    return health;
  }

  /**
   * Update health status
   * تحديث حالة الصحة
   */
  private updateHealthStatus(health: ProviderHealthStatus): void {
    const totalRequests = health.metadata.totalRequests;

    if (totalRequests > 0) {
      health.failureRate = health.metadata.failedRequests / totalRequests;
    }

    // Determine if healthy
    health.healthy =
      health.failureRate < 0.3 && // Less than 30% failure rate
      health.consecutiveFailures < 5 && // Less than 5 consecutive failures
      health.circuitState !== 'open';

    health.lastChecked = new Date();

    // Update circuit state
    const breaker = this.circuitBreakers.get(health.provider);
    if (breaker) {
      health.circuitState = breaker.state;
    }
  }

  /**
   * Get provider health
   * الحصول على صحة المزود
   */
  getProviderHealth(provider: string): ProviderHealthStatus | undefined {
    return this.providerHealth.get(provider);
  }

  /**
   * Get all health statuses
   * الحصول على جميع حالات الصحة
   */
  getAllHealthStatuses(): ProviderHealthStatus[] {
    return Array.from(this.providerHealth.values());
  }

  // ============================================
  // 🧠 Intelligent Decision Making
  // ============================================

  /**
   * Should skip provider?
   * هل يجب تخطي المزود؟
   */
  private shouldSkipProvider(provider: string): { skip: boolean; reason: string } {
    const health = this.providerHealth.get(provider);

    if (!health) {
      return { skip: false, reason: '' };
    }

    // Circuit open
    if (health.circuitState === 'open') {
      return { skip: true, reason: 'circuit_open' };
    }

    // Too many recent failures
    if (health.consecutiveFailures >= 3) {
      return { skip: true, reason: 'consecutive_failures' };
    }

    // High failure rate
    if (health.failureRate > 0.5 && health.metadata.totalRequests > 10) {
      return { skip: true, reason: 'high_failure_rate' };
    }

    // Rate limited recently
    const timeSinceLastFailure = health.lastFailureTime
      ? Date.now() - health.lastFailureTime.getTime()
      : Infinity;

    if (
      timeSinceLastFailure < 10000 && // Within last 10 seconds
      health.metadata.rateLimitCount > 0
    ) {
      return { skip: true, reason: 'recent_rate_limit' };
    }

    return { skip: false, reason: '' };
  }

  /**
   * Should continue cascade?
   * هل يجب الاستمرار في التتالي؟
   */
  private shouldContinueCascade(
    provider: string,
    error: ExecutionError,
    remainingProviders: string[]
  ): boolean {
    // Always continue if there are providers left
    if (remainingProviders.indexOf(provider) < remainingProviders.length - 1) {
      // Non-retryable errors suggest systemic issue
      if (!error.retryable) {
        this.logger('Non-retryable error detected, may skip remaining providers', 'warn');
        return false;
      }

      // Authentication errors unlikely to be resolved by different provider
      if (error.type === 'auth') {
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Sort providers by health
   * ترتيب المزودين حسب الصحة
   */
  private sortProvidersByHealth(providers: string[]): string[] {
    return [...providers].sort((a, b) => {
      const healthA = this.providerHealth.get(a);
      const healthB = this.providerHealth.get(b);

      if (!healthA && !healthB) return 0;
      if (!healthA) return 1;
      if (!healthB) return -1;

      // Score calculation
      const scoreA = this.calculateHealthScore(healthA);
      const scoreB = this.calculateHealthScore(healthB);

      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Calculate health score
   * حساب نقاط الصحة
   */
  private calculateHealthScore(health: ProviderHealthStatus): number {
    let score = 100;

    // Failure rate penalty
    score -= health.failureRate * 40;

    // Consecutive failures penalty
    score -= health.consecutiveFailures * 10;

    // Circuit state penalty
    if (health.circuitState === 'open') score -= 50;
    if (health.circuitState === 'half_open') score -= 20;

    // Consecutive successes bonus
    score += Math.min(health.consecutiveSuccesses * 5, 20);

    // Recent success bonus
    const timeSinceSuccess = health.lastSuccessTime
      ? Date.now() - health.lastSuccessTime.getTime()
      : Infinity;

    if (timeSinceSuccess < 60000) {
      // Within last minute
      score += 10;
    }

    return Math.max(0, score);
  }

  /**
   * Analyze historical patterns
   * تحليل الأنماط التاريخية
   */
  private analyzeHistoricalPatterns(providers: string[]): string[] {
    // Analyze recent execution history
    const recentAttempts = this.executionHistory.slice(-100);

    const providerScores = new Map<string, number>();

    for (const provider of providers) {
      const relevantAttempts = recentAttempts.filter((a) => a.provider === provider);

      if (relevantAttempts.length === 0) {
        providerScores.set(provider, 50); // Neutral score for unknown
        continue;
      }

      const successRate =
        relevantAttempts.filter((a) => a.success).length / relevantAttempts.length;

      const avgDuration =
        relevantAttempts.reduce((sum, a) => sum + (a.duration || 0), 0) /
        relevantAttempts.length;

      // Score: 70% success rate, 30% speed
      const score = successRate * 70 + (1 - Math.min(avgDuration / 10000, 1)) * 30;

      providerScores.set(provider, score);
    }

    // Sort by score
    return [...providers].sort((a, b) => {
      const scoreA = providerScores.get(a) || 50;
      const scoreB = providerScores.get(b) || 50;
      return scoreB - scoreA;
    });
  }

  // ============================================
  // 🔧 Helper Methods
  // ============================================

  /**
   * Build provider list
   * بناء قائمة المزودين
   */
  private buildProviderList(chain: FallbackChain): string[] {
    return [chain.primary, ...chain.fallbacks];
  }

  /**
   * Create skipped attempt record
   * إنشاء سجل محاولة متخطاة
   */
  private createSkippedAttempt(provider: string, reason: string): ExecutionAttempt {
    return {
      provider,
      attemptNumber: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      success: false,
      skipped: true,
      skipReason: reason,
    };
  }

  /**
   * Build metrics
   * بناء المقاييس
   */
  private buildMetrics(attempts: ExecutionAttempt[]): FallbackResult['metrics'] {
    const successfulAttempt = attempts.find((a) => a.success);

    return {
      totalAttempts: attempts.length,
      successfulProvider: successfulAttempt?.provider || null,
      failedProviders: attempts.filter((a) => !a.success && !a.skipped).map((a) => a.provider),
      skippedProviders: attempts.filter((a) => a.skipped).map((a) => a.provider),
      averageAttemptDuration:
        attempts.reduce((sum, a) => sum + (a.duration || 0), 0) / Math.max(attempts.length, 1),
    };
  }

  /**
   * Categorize error
   * تصنيف الخطأ
   */
  private categorizeError(error: any, provider: string): ExecutionError {
    const errorTypes = {
      timeout: ['timeout', 'etimedout', 'time out'],
      rate_limit: ['rate limit', 'too many requests', '429'],
      auth: ['unauthorized', 'forbidden', '401', '403', 'invalid api key'],
      server: ['internal server error', '500', '502', '503', '504'],
      network: ['network', 'econnrefused', 'enotfound', 'connection'],
    };

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    let type: ExecutionError['type'] = 'unknown';
    let retryable = false;

    for (const [errorType, keywords] of Object.entries(errorTypes)) {
      if (
        keywords.some((keyword) => errorMessage.includes(keyword) || errorCode.includes(keyword))
      ) {
        type = errorType as ExecutionError['type'];
        retryable = ['timeout', 'rate_limit', 'server', 'network'].includes(errorType);
        break;
      }
    }

    return {
      code: error.code || 'UNKNOWN',
      message: error.message || 'Unknown error',
      type,
      retryable,
      provider,
      timestamp: new Date(),
      metadata: error,
    };
  }

  /**
   * Execute with timeout
   * التنفيذ مع مهلة
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  /**
   * Sleep utility
   * أداة النوم
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update health from attempts
   * تحديث الصحة من المحاولات
   */
  private updateHealthFromAttempts(attempts: ExecutionAttempt[]): void {
    for (const attempt of attempts) {
      if (attempt.skipped) continue;

      let health = this.providerHealth.get(attempt.provider);
      if (!health) {
        health = this.initializeProviderHealth(attempt.provider);
      }

      if (attempt.duration) {
        const count = health.metadata.totalRequests || 1;
        health.averageResponseTime =
          (health.averageResponseTime * count + attempt.duration) / (count + 1);
      }
    }
  }

  /**
   * Trim execution history
   * تقليم سجل التنفيذ
   */
  private trimExecutionHistory(): void {
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }
  }

  /**
   * Start health monitoring
   * بدء مراقبة الصحة
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.cleanupOldData();
      this.updateCircuitBreakers();
    }, 60000); // Every minute
  }

  /**
   * Cleanup old data
   * تنظيف البيانات القديمة
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    this.executionHistory = this.executionHistory.filter(
      (attempt) => now - attempt.startTime < maxAge
    );
  }

  /**
   * Update circuit breakers
   * تحديث قواطع الدائرة
   */
  private updateCircuitBreakers(): void {
    for (const [provider, breaker] of this.circuitBreakers) {
      breaker.checkAndUpdate();
    }
  }

  // ============================================
  // 📊 Export & Reset
  // ============================================

  /**
   * Export statistics
   * تصدير الإحصائيات
   */
  exportStatistics(): string {
    const data = {
      providerHealth: Array.from(this.providerHealth.entries()),
      recentAttempts: this.executionHistory.slice(-100),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        provider: name,
        state: breaker.state,
        failures: breaker.consecutiveFailures,
        successes: breaker.consecutiveSuccesses,
      })),
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Reset all data
   * إعادة تعيين جميع البيانات
   */
  resetAll(): void {
    this.providerHealth.clear();
    this.circuitBreakers.clear();
    this.executionHistory = [];
    this.logger('All data reset', 'info');
  }
}

// ============================================
// 🔌 Circuit Breaker Implementation
// ============================================

class CircuitBreaker {
  provider: string;
  state: CircuitState = 'closed';
  consecutiveFailures: number = 0;
  consecutiveSuccesses: number = 0;
  lastFailureTime?: Date;
  lastStateChange: Date = new Date();
  config: CircuitBreakerConfig;

  constructor(provider: string, config: CircuitBreakerConfig) {
    this.provider = provider;
    this.config = config;
  }

  recordSuccess(): void {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    if (this.state === 'half_open' && this.consecutiveSuccesses >= this.config.successThreshold) {
      this.state = 'closed';
      this.lastStateChange = new Date();
    }
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = new Date();

    if (this.state === 'closed' && this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = 'open';
      this.lastStateChange = new Date();
    } else if (this.state === 'half_open') {
      this.state = 'open';
      this.lastStateChange = new Date();
    }
  }

  checkAndUpdate(): void {
    if (this.state === 'open') {
      const timeSinceOpen = Date.now() - this.lastStateChange.getTime();

      if (timeSinceOpen >= this.config.timeout) {
        this.state = 'half_open';
        this.lastStateChange = new Date();
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
      }
    }
  }
}

// ============================================
// 📤 Exports
// ============================================

export default FallbackManager;
