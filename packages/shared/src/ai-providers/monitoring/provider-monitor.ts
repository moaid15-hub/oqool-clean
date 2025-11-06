import { ProviderRegistry } from '../registry/provider-registry';

/**
 * E1'B( 'D#/'! DDE2H/JF
 */
export class ProviderMonitor {
  private registry: ProviderRegistry;
  private metrics: Map<string, ProviderMetrics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
    this.initializeMetrics();
  }

  /**
   * *GJ&) 'DEB'JJ3 D,EJ9 'DE2H/JF
   */
  private initializeMetrics(): void {
    const providers = this.registry.getAvailableProviders();
    providers.forEach(provider => {
      this.metrics.set(provider, this.createDefaultMetrics());
    });
  }

  /**
   * %F4'! EB'JJ3 'A*1'6J)
   */
  private createDefaultMetrics(): ProviderMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      totalTokens: 0,
      totalCost: 0,
      lastRequestTime: null,
      lastError: null,
      uptime: 100,
      errorRate: 0,
      successRate: 100
    };
  }

  /**
   * *3,JD 7D( F',-
   */
  recordSuccess(
    provider: string,
    responseTime: number,
    tokens: number,
    cost: number
  ): void {
    const metrics = this.getOrCreateMetrics(provider);

    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.totalResponseTime += responseTime;
    metrics.totalTokens += tokens;
    metrics.totalCost += cost;
    metrics.lastRequestTime = new Date();

    // *-/J+ #HB'* 'D'3*,'()
    metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
    metrics.avgResponseTime = metrics.totalResponseTime / metrics.totalRequests;

    // *-/J+ 'DE9/D'*
    metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
    metrics.uptime = metrics.successRate;

    this.metrics.set(provider, metrics);
  }

  /**
   * *3,JD 7D( A'4D
   */
  recordFailure(provider: string, error: Error, responseTime?: number): void {
    const metrics = this.getOrCreateMetrics(provider);

    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.lastRequestTime = new Date();
    metrics.lastError = {
      message: error.message,
      timestamp: new Date()
    };

    if (responseTime) {
      metrics.totalResponseTime += responseTime;
      metrics.avgResponseTime = metrics.totalResponseTime / metrics.totalRequests;
    }

    // *-/J+ 'DE9/D'*
    metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
    metrics.uptime = metrics.successRate;

    this.metrics.set(provider, metrics);
  }

  /**
   * 'D-5HD 9DI EB'JJ3 E2H/ E9JF
   */
  getMetrics(provider: string): ProviderMetrics | null {
    return this.metrics.get(provider) || null;
  }

  /**
   * 'D-5HD 9DI EB'JJ3 ,EJ9 'DE2H/JF
   */
  getAllMetrics(): Record<string, ProviderMetrics> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * 'D-5HD #H %F4'! EB'JJ3
   */
  private getOrCreateMetrics(provider: string): ProviderMetrics {
    let metrics = this.metrics.get(provider);
    if (!metrics) {
      metrics = this.createDefaultMetrics();
      this.metrics.set(provider, metrics);
    }
    return metrics;
  }

  /**
   * A-5 5-) ,EJ9 'DE2H/JF
   */
  async healthCheck(): Promise<Record<string, HealthStatus>> {
    const providers = this.registry.getAvailableProviders();
    const healthStatuses: Record<string, HealthStatus> = {};

    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const providerInstance = this.registry.getProvider(provider);
        const isHealthy = await providerInstance.validate();
        const responseTime = Date.now() - startTime;

        const metrics = this.getMetrics(provider);

        healthStatuses[provider] = {
          healthy: isHealthy,
          responseTime,
          lastChecked: new Date(),
          metrics: metrics || undefined
        };
      } catch (error: any) {
        healthStatuses[provider] = {
          healthy: false,
          responseTime: 0,
          lastChecked: new Date(),
          error: error.message
        };
      }
    }

    return healthStatuses;
  }

  /**
   * (/! 'DA-5 'D/H1J DD5-)
   */
  startHealthCheckInterval(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.healthCheck();
    }, intervalMs);
  }

  /**
   * %JB'A 'DA-5 'D/H1J
   */
  stopHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * %9'/) *9JJF 'DEB'JJ3
   */
  resetMetrics(provider?: string): void {
    if (provider) {
      this.metrics.set(provider, this.createDefaultMetrics());
    } else {
      this.metrics.clear();
      this.initializeMetrics();
    }
  }

  /**
   * 'D-5HD 9DI *B1J1 'D#/'!
   */
  getPerformanceReport(): PerformanceReport {
    const allMetrics = this.getAllMetrics();
    const providers = Object.keys(allMetrics);

    if (providers.length === 0) {
      return {
        totalRequests: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        overallSuccessRate: 0,
        avgResponseTime: 0,
        totalCost: 0,
        providerCount: 0,
        bestProvider: null,
        worstProvider: null
      };
    }

    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalResponseTime = 0;
    let totalCost = 0;
    let bestProvider: string | null = null;
    let worstProvider: string | null = null;
    let bestSuccessRate = 0;
    let worstSuccessRate = 100;

    providers.forEach(provider => {
      const metrics = allMetrics[provider];
      totalRequests += metrics.totalRequests;
      totalSuccessful += metrics.successfulRequests;
      totalFailed += metrics.failedRequests;
      totalResponseTime += metrics.totalResponseTime;
      totalCost += metrics.totalCost;

      if (metrics.successRate > bestSuccessRate) {
        bestSuccessRate = metrics.successRate;
        bestProvider = provider;
      }

      if (metrics.successRate < worstSuccessRate) {
        worstSuccessRate = metrics.successRate;
        worstProvider = provider;
      }
    });

    return {
      totalRequests,
      totalSuccessful,
      totalFailed,
      overallSuccessRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
      avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      totalCost,
      providerCount: providers.length,
      bestProvider,
      worstProvider
    };
  }
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalTokens: number;
  totalCost: number;
  lastRequestTime: Date | null;
  lastError: {
    message: string;
    timestamp: Date;
  } | null;
  uptime: number;
  errorRate: number;
  successRate: number;
}

export interface HealthStatus {
  healthy: boolean;
  responseTime: number;
  lastChecked: Date;
  error?: string;
  metrics?: ProviderMetrics;
}

export interface PerformanceReport {
  totalRequests: number;
  totalSuccessful: number;
  totalFailed: number;
  overallSuccessRate: number;
  avgResponseTime: number;
  totalCost: number;
  providerCount: number;
  bestProvider: string | null;
  worstProvider: string | null;
}
