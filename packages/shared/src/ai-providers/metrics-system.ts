// metrics-system.ts
// ============================================
// 📊 نظام القياسات - Metrics System
// تحليل الأداء والتحسين المستمر
// ============================================

export interface MetricEvent {
  agent: string;
  provider: string;
  task: string;
  cost: number;
  time: number;
  quality: number;
  success: boolean;
  timestamp: number;
}

export interface MetricsAnalysis {
  bestAgentFor: Map<string, string>;
  bestProviderFor: Map<string, string>;
  costSavings: number;
  averageQuality: number;
  averageTime: number;
  successRate: number;
}

export class MetricsSystem {
  private static instance: MetricsSystem;
  private events: MetricEvent[] = [];
  private maxEvents = 1000;

  private constructor() {}

  static getInstance(): MetricsSystem {
    if (!MetricsSystem.instance) {
      MetricsSystem.instance = new MetricsSystem();
    }
    return MetricsSystem.instance;
  }

  track(event: Omit<MetricEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: Date.now()
    });

    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  analyze(): MetricsAnalysis {
    const bestAgentFor = new Map<string, string>();
    const bestProviderFor = new Map<string, string>();

    // تحليل الوكلاء
    const agentPerformance = new Map<string, { quality: number; count: number }>();
    this.events.forEach(e => {
      const current = agentPerformance.get(e.agent) || { quality: 0, count: 0 };
      agentPerformance.set(e.agent, {
        quality: current.quality + e.quality,
        count: current.count + 1
      });
    });

    // تحليل المزودين
    const providerPerformance = new Map<string, { cost: number; quality: number; count: number }>();
    this.events.forEach(e => {
      const current = providerPerformance.get(e.provider) || { cost: 0, quality: 0, count: 0 };
      providerPerformance.set(e.provider, {
        cost: current.cost + e.cost,
        quality: current.quality + e.quality,
        count: current.count + 1
      });
    });

    const totalCost = this.events.reduce((sum, e) => sum + e.cost, 0);
    const avgQuality = this.events.reduce((sum, e) => sum + e.quality, 0) / this.events.length;
    const avgTime = this.events.reduce((sum, e) => sum + e.time, 0) / this.events.length;
    const successRate = this.events.filter(e => e.success).length / this.events.length;

    return {
      bestAgentFor,
      bestProviderFor,
      costSavings: totalCost,
      averageQuality: avgQuality,
      averageTime: avgTime,
      successRate
    };
  }

  getStats() {
    const analysis = this.analyze();
    return {
      totalEvents: this.events.length,
      avgQuality: analysis.averageQuality.toFixed(2),
      avgTime: analysis.averageTime.toFixed(0) + 'ms',
      successRate: (analysis.successRate * 100).toFixed(2) + '%',
      totalCost: `$${analysis.costSavings.toFixed(4)}`
    };
  }

  clear(): void {
    this.events = [];
  }
}

export function getMetricsSystem(): MetricsSystem {
  return MetricsSystem.getInstance();
}
