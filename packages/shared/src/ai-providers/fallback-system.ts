// fallback-system.ts
// ============================================
// 🛡️ نظام النسخ الاحتياطي - Fallback System
// ضمان عمل النظام 99.9%
// ============================================

import { getConnectionManager } from './connection-manager.js';
import type { UnifiedMessage, UnifiedResponse } from '../ai-providers/interfaces/unified-types.interface.js';
import type { IAIProvider } from '../ai-providers/interfaces/iai-provider.interface.js';

/**
 * أولوية المزود
 */
export interface ProviderPriority {
  primary: string;
  secondary: string;
  tertiary: string;
  emergency: string;
}

/**
 * محاولة التنفيذ
 */
export interface FallbackAttempt {
  provider: string;
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * نتيجة Fallback
 */
export interface FallbackResult {
  success: boolean;
  response?: UnifiedResponse;
  attempts: FallbackAttempt[];
  finalProvider?: string;
  totalDuration: number;
}

/**
 * نظام Fallback
 */
export class FallbackSystem {
  private static instance: FallbackSystem;
  private connectionManager = getConnectionManager();
  private ui = this.connectionManager.getUI();

  // ترتيب الأولويات الافتراضي
  private defaultPriorities: ProviderPriority = {
    primary: 'claude',
    secondary: 'openai',
    tertiary: 'gemini',
    emergency: 'deepseek'
  };

  // إحصائيات Fallback
  private stats = {
    totalFallbacks: 0,
    successfulFallbacks: 0,
    failedFallbacks: 0,
    providerFailures: new Map<string, number>()
  };

  private constructor() {}

  static getInstance(): FallbackSystem {
    if (!FallbackSystem.instance) {
      FallbackSystem.instance = new FallbackSystem();
    }
    return FallbackSystem.instance;
  }

  /**
   * تنفيذ مع Fallback
   */
  async execute(
    messages: UnifiedMessage[],
    priorities?: Partial<ProviderPriority>
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    const attempts: FallbackAttempt[] = [];

    // دمج الأولويات
    const finalPriorities = { ...this.defaultPriorities, ...priorities };

    // ترتيب المحاولات
    const providerSequence = [
      finalPriorities.primary,
      finalPriorities.secondary,
      finalPriorities.tertiary,
      finalPriorities.emergency
    ];

    this.stats.totalFallbacks++;
    this.ui.debug('Starting fallback execution', 'Fallback');

    // المحاولة مع كل Provider
    for (const providerName of providerSequence) {
      const attemptStart = Date.now();

      try {
        this.ui.info(`Trying ${providerName}...`, 'Fallback');

        const provider = this.connectionManager.getAIProvider(providerName);

        if (!provider) {
          this.ui.warning(`Provider ${providerName} not available`, 'Fallback');
          attempts.push({
            provider: providerName,
            success: false,
            error: 'Provider not available',
            duration: Date.now() - attemptStart
          });
          continue;
        }

        // التحقق من حالة Provider
        const status = provider.getStatus();
        if (!status.available) {
          this.ui.warning(`Provider ${providerName} unavailable`, 'Fallback');
          attempts.push({
            provider: providerName,
            success: false,
            error: 'Provider unavailable',
            duration: Date.now() - attemptStart
          });
          this.recordFailure(providerName);
          continue;
        }

        // التنفيذ
        const response = await provider.chat(messages);

        // نجح!
        attempts.push({
          provider: providerName,
          success: true,
          duration: Date.now() - attemptStart
        });

        this.stats.successfulFallbacks++;
        this.ui.success(`Succeeded with ${providerName}`, 'Fallback');

        return {
          success: true,
          response,
          attempts,
          finalProvider: providerName,
          totalDuration: Date.now() - startTime
        };
      } catch (error) {
        // فشل - نجرب التالي
        this.ui.warning(`Failed with ${providerName}: ${error}`, 'Fallback');

        attempts.push({
          provider: providerName,
          success: false,
          error: String(error),
          duration: Date.now() - attemptStart
        });

        this.recordFailure(providerName);
      }
    }

    // فشلت كل المحاولات
    this.stats.failedFallbacks++;
    this.ui.error('All fallback attempts failed', 'Fallback');

    return {
      success: false,
      attempts,
      totalDuration: Date.now() - startTime
    };
  }

  /**
   * تسجيل فشل Provider
   */
  private recordFailure(provider: string): void {
    const current = this.stats.providerFailures.get(provider) || 0;
    this.stats.providerFailures.set(provider, current + 1);
  }

  /**
   * الحصول على أفضل Provider متاح
   */
  async getBestAvailableProvider(): Promise<string | null> {
    const available = this.connectionManager.getAvailableProviders();

    if (available.length === 0) return null;

    // ترتيب حسب عدد الأعطال (الأقل أولاً)
    const sorted = available.sort((a, b) => {
      const aFailures = this.stats.providerFailures.get(a) || 0;
      const bFailures = this.stats.providerFailures.get(b) || 0;
      return aFailures - bFailures;
    });

    // التحقق من حالة أفضل Provider
    for (const providerName of sorted) {
      const provider = this.connectionManager.getAIProvider(providerName);
      if (provider) {
        try {
          const isValid = await provider.validate();
          if (isValid) return providerName;
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * تعيين الأولويات الافتراضية
   */
  setDefaultPriorities(priorities: Partial<ProviderPriority>): void {
    this.defaultPriorities = { ...this.defaultPriorities, ...priorities };
    this.ui.info('Fallback priorities updated', 'Fallback');
  }

  /**
   * الإحصائيات
   */
  getStats() {
    const successRate =
      this.stats.totalFallbacks > 0
        ? (this.stats.successfulFallbacks / this.stats.totalFallbacks) * 100
        : 0;

    return {
      totalFallbacks: this.stats.totalFallbacks,
      successful: this.stats.successfulFallbacks,
      failed: this.stats.failedFallbacks,
      successRate: successRate.toFixed(2) + '%',
      providerFailures: Object.fromEntries(this.stats.providerFailures)
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.stats = {
      totalFallbacks: 0,
      successfulFallbacks: 0,
      failedFallbacks: 0,
      providerFailures: new Map()
    };
  }

  /**
   * اختبار جميع Providers
   */
  async testAllProviders(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const providers = this.connectionManager.getAvailableProviders();

    this.ui.info('Testing all providers...', 'Fallback');

    for (const providerName of providers) {
      const provider = this.connectionManager.getAIProvider(providerName);
      if (!provider) {
        results.set(providerName, false);
        continue;
      }

      try {
        const isValid = await provider.validate();
        results.set(providerName, isValid);
        this.ui.success(`${providerName}: ${isValid ? 'OK' : 'FAILED'}`, 'Fallback');
      } catch {
        results.set(providerName, false);
        this.ui.error(`${providerName}: ERROR`, 'Fallback');
      }
    }

    return results;
  }
}

export function getFallbackSystem(): FallbackSystem {
  return FallbackSystem.getInstance();
}
