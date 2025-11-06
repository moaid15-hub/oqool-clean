/**
 * OpenTelemetry Integration for Oqool AI
 *
 * يوفر مراقبة شاملة لأداء النظام وتتبع AI requests
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import * as api from '@opentelemetry/api';

/**
 * نظام المراقبة والتتبع
 */
export class OqoolObservability {
  private sdk: NodeSDK | null = null;
  private tracer: api.Tracer;

  constructor(serviceName: string = 'oqool-ai') {
    // إنشاء SDK
    this.sdk = new NodeSDK({
      instrumentations: [getNodeAutoInstrumentations()],
    });

    // الحصول على tracer
    this.tracer = api.trace.getTracer('oqool-ai', '1.0.0');
  }

  /**
   * تهيئة نظام المراقبة
   */
  async initialize() {
    try {
      this.sdk!.start();
      console.log('✅ OpenTelemetry initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  /**
   * إيقاف نظام المراقبة
   */
  async shutdown() {
    if (this.sdk) {
      await this.sdk.shutdown();
      console.log('✅ OpenTelemetry shut down successfully');
    }
  }

  /**
   * تتبع AI request
   */
  async trackAIRequest<T>(
    provider: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const span = this.tracer.startSpan(`ai.${provider}.${operation}`);

    span.setAttributes({
      'ai.provider': provider,
      'ai.operation': operation,
      ...metadata,
    });

    try {
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      span.setAttributes({
        'ai.duration_ms': duration,
        'ai.status': 'success',
      });

      span.end();
      return result;
    } catch (error) {
      span.setAttributes({
        'ai.status': 'error',
        'ai.error': error instanceof Error ? error.message : String(error),
      });

      span.recordException(error as Error);
      span.end();
      throw error;
    }
  }

  /**
   * تتبع استخدام tokens
   */
  trackTokenUsage(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  ) {
    const span = this.tracer.startSpan('ai.token_usage');

    span.setAttributes({
      'ai.provider': provider,
      'ai.model': model,
      'ai.tokens.prompt': promptTokens,
      'ai.tokens.completion': completionTokens,
      'ai.tokens.total': totalTokens,
      'ai.cost': this.calculateCost(provider, model, totalTokens),
    });

    span.end();
  }

  /**
   * تتبع عملية code generation
   */
  async trackCodeGeneration<T>(
    language: string,
    linesOfCode: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const span = this.tracer.startSpan('code.generation');

    span.setAttributes({
      'code.language': language,
      'code.lines': linesOfCode,
    });

    try {
      const result = await fn();
      span.setAttributes({ 'code.status': 'success' });
      span.end();
      return result;
    } catch (error) {
      span.setAttributes({ 'code.status': 'error' });
      span.recordException(error as Error);
      span.end();
      throw error;
    }
  }

  /**
   * تتبع عملية code review
   */
  async trackCodeReview<T>(
    fileName: string,
    issues: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const span = this.tracer.startSpan('code.review');

    span.setAttributes({
      'code.file': fileName,
      'code.issues': issues,
    });

    try {
      const result = await fn();
      span.end();
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.end();
      throw error;
    }
  }

  /**
   * تتبع user action
   */
  trackUserAction(action: string, metadata?: Record<string, any>) {
    const span = this.tracer.startSpan(`user.${action}`);

    span.setAttributes({
      'user.action': action,
      ...metadata,
    });

    span.end();
  }

  /**
   * تتبع performance metric
   */
  trackPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ) {
    const span = this.tracer.startSpan(`performance.${operation}`);

    span.setAttributes({
      'performance.duration_ms': duration,
      ...metadata,
    });

    span.end();
  }

  /**
   * حساب تكلفة AI request
   */
  private calculateCost(provider: string, model: string, tokens: number): number {
    // أسعار تقريبية (يجب تحديثها)
    const pricing: Record<string, Record<string, number>> = {
      openai: {
        'gpt-4': 0.03 / 1000, // $0.03 per 1K tokens
        'gpt-3.5-turbo': 0.001 / 1000,
      },
      anthropic: {
        'claude-2': 0.011 / 1000,
      },
    };

    const pricePerToken = pricing[provider]?.[model] || 0;
    return tokens * pricePerToken;
  }

  /**
   * إنشاء custom span
   */
  createSpan(name: string, fn: (span: api.Span) => void) {
    const span = this.tracer.startSpan(name);
    try {
      fn(span);
    } finally {
      span.end();
    }
  }
}

/**
 * Metrics Collector - لجمع إحصائيات مفصلة
 */
export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  /**
   * تسجيل metric
   */
  record(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  /**
   * الحصول على إحصائيات
   */
  getStats(name: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  /**
   * الحصول على جميع الإحصائيات
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name);
    }

    return stats;
  }

  /**
   * مسح جميع البيانات
   */
  clear() {
    this.metrics.clear();
  }
}

/**
 * مثال استخدام:
 *
 * const observability = new OqoolObservability();
 * await observability.initialize();
 *
 * // تتبع AI request
 * await observability.trackAIRequest(
 *   'openai',
 *   'completion',
 *   async () => {
 *     return await openai.createCompletion(...);
 *   },
 *   { model: 'gpt-4', temperature: 0.7 }
 * );
 *
 * // تتبع token usage
 * observability.trackTokenUsage('openai', 'gpt-4', 100, 50, 150);
 */
