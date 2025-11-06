/**
 * ,'E9 'DEB'JJ3 'D4'ED
 */
export class MetricsCollector {
  private metrics: Metric[] = [];
  private aggregations: Map<string, AggregatedMetrics> = new Map();

  /**
   * *3,JD EBJ'3 ,/J/
   */
  record(metric: Omit<Metric, 'id' | 'timestamp'>): string {
    const fullMetric: Metric = {
      id: this.generateId(),
      timestamp: new Date(),
      ...metric
    };

    this.metrics.push(fullMetric);

    // *-/J+ 'D*,EJ9'*
    this.updateAggregations(fullMetric);

    // 'D'-*A'8 (".1 50000 EBJ'3
    if (this.metrics.length > 50000) {
      this.metrics = this.metrics.slice(-50000);
    }

    return fullMetric.id;
  }

  /**
   * *-/J+ 'D*,EJ9'*
   */
  private updateAggregations(metric: Metric): void {
    const key = `${metric.provider}:${metric.type}`;
    let agg = this.aggregations.get(key);

    if (!agg) {
      agg = {
        provider: metric.provider,
        type: metric.type,
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
        lastUpdated: new Date()
      };
    }

    agg.count++;
    agg.sum += metric.value;
    agg.min = Math.min(agg.min, metric.value);
    agg.max = Math.max(agg.max, metric.value);
    agg.avg = agg.sum / agg.count;
    agg.lastUpdated = new Date();

    this.aggregations.set(key, agg);
  }

  /**
   * 'D-5HD 9DI EB'JJ3 E5A')
   */
  getMetrics(filters?: MetricFilters): Metric[] {
    if (!filters) return [...this.metrics];

    return this.metrics.filter(metric => {
      if (filters.provider && metric.provider !== filters.provider) return false;
      if (filters.type && metric.type !== filters.type) return false;
      if (filters.startDate && metric.timestamp < filters.startDate) return false;
      if (filters.endDate && metric.timestamp > filters.endDate) return false;
      if (filters.minValue !== undefined && metric.value < filters.minValue) return false;
      if (filters.maxValue !== undefined && metric.value > filters.maxValue) return false;

      return true;
    });
  }

  /**
   * 'D-5HD 9DI 'D*,EJ9'*
   */
  getAggregations(provider?: string, type?: MetricType): AggregatedMetrics[] {
    const allAggregations = Array.from(this.aggregations.values());

    if (!provider && !type) {
      return allAggregations;
    }

    return allAggregations.filter(agg => {
      if (provider && agg.provider !== provider) return false;
      if (type && agg.type !== type) return false;
      return true;
    });
  }

  /**
   * -3'( %-5'&J'* DEB'JJ3 E9JF)
   */
  calculateStats(filters?: MetricFilters): MetricStats | null {
    const filteredMetrics = this.getMetrics(filters);

    if (filteredMetrics.length === 0) return null;

    const values = filteredMetrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    // -3'( 'D'F-1'A 'DE9J'1J
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // -3'( 'DE&JF'*
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    return {
      count: filteredMetrics.length,
      sum,
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev,
      p50,
      p95,
      p99
    };
  }

  /**
   * -3'( 'DE&JF
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 'D-5HD 9DI *B1J1 'DEB'JJ3
   */
  getMetricsReport(filters?: MetricFilters): MetricsReport {
    const filteredMetrics = this.getMetrics(filters);

    // *,EJ9 -3( 'DE2H/
    const byProvider: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      byProvider[m.provider] = (byProvider[m.provider] || 0) + 1;
    });

    // *,EJ9 -3( 'DFH9
    const byType: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });

    // *,EJ9 -3( 'DJHE
    const byDay: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      const day = m.timestamp.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return {
      totalMetrics: filteredMetrics.length,
      byProvider,
      byType,
      byDay,
      stats: this.calculateStats(filters) || undefined
    };
  }

  /**
   * *3,JD EB'JJ3 E*9//) /A9) H'-/)
   */
  recordBatch(metrics: Omit<Metric, 'id' | 'timestamp'>[]): string[] {
    return metrics.map(m => this.record(m));
  }

  /**
   * E3- 'DEB'JJ3
   */
  clearMetrics(filters?: MetricFilters): number {
    if (!filters) {
      const count = this.metrics.length;
      this.metrics = [];
      this.aggregations.clear();
      return count;
    }

    const filteredMetrics = this.getMetrics(filters);
    const idsToRemove = new Set(filteredMetrics.map(m => m.id));
    const originalLength = this.metrics.length;
    this.metrics = this.metrics.filter(m => !idsToRemove.has(m.id));

    // %9'/) (F'! 'D*,EJ9'*
    this.rebuildAggregations();

    return originalLength - this.metrics.length;
  }

  /**
   * %9'/) (F'! 'D*,EJ9'*
   */
  private rebuildAggregations(): void {
    this.aggregations.clear();
    this.metrics.forEach(metric => this.updateAggregations(metric));
  }

  /**
   * *5/J1 'DEB'JJ3
   */
  exportMetrics(filters?: MetricFilters): Metric[] {
    return this.getMetrics(filters);
  }

  /**
   * '3*J1'/ EB'JJ3
   */
  importMetrics(metrics: Metric[]): number {
    let imported = 0;
    metrics.forEach(metric => {
      this.metrics.push(metric);
      this.updateAggregations(metric);
      imported++;
    });
    return imported;
  }

  /**
   * *HDJ/ E91A A1J/
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export type MetricType =
  | 'request'
  | 'response_time'
  | 'token_count'
  | 'cost'
  | 'error'
  | 'success'
  | 'cache_hit'
  | 'cache_miss'
  | 'retry'
  | 'fallback'
  | 'custom';

export interface Metric {
  id: string;
  timestamp: Date;
  provider: string;
  type: MetricType;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface MetricFilters {
  provider?: string;
  type?: MetricType;
  startDate?: Date;
  endDate?: Date;
  minValue?: number;
  maxValue?: number;
  tags?: Record<string, string>;
}

export interface AggregatedMetrics {
  provider: string;
  type: MetricType;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  lastUpdated: Date;
}

export interface MetricStats {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  stdDev: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricsReport {
  totalMetrics: number;
  byProvider: Record<string, number>;
  byType: Record<string, number>;
  byDay: Record<string, number>;
  stats?: MetricStats;
}
