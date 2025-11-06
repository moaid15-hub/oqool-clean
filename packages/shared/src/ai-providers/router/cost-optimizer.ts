import { ProviderRegistry } from '../registry/provider-registry';
import { IAIProvider } from '../interfaces/iai-provider.interface';

/**
 * محسن التكلفة - يحسب ويقلل التكاليف
 */
export class CostOptimizer {
  private registry: ProviderRegistry;
  private costHistory: CostRecord[] = [];
  private savingsTarget: number = 0.2; // 20% هدف التوفير

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
  }

  /**
   * حساب التكلفة المتوقعة لمزود معين
   */
  estimateCost(
    providerName: string,
    inputTokens: number,
    outputTokens: number = 1000
  ): number {
    const provider = this.registry.getProvider(providerName);
    const pricing = provider.getPricing();
    
    const inputCost = inputTokens * pricing.inputCostPerToken;
    const outputCost = outputTokens * pricing.outputCostPerToken;
    
    return inputCost + outputCost;
  }

  /**
   * اختيار المزود الأرخص للمهمة
   */
  findCheapestProvider(
    taskRequirements: TaskRequirements
  ): { provider: string; estimatedCost: number } {
    const availableProviders = this.registry.getAvailableProviders();
    
    let cheapestProvider = availableProviders[0];
    let lowestCost = Infinity;

    for (const providerName of availableProviders) {
      const provider = this.registry.getProvider(providerName);
      const capabilities = provider.getCapabilities();

      // تحقق من أن المزود يفي بالمتطلبات
      if (taskRequirements.requiresTools && !capabilities.supportsTools) {
        continue;
      }

      if (taskRequirements.minTokens && capabilities.maxTokens < taskRequirements.minTokens) {
        continue;
      }

      // حساب التكلفة
      const cost = this.estimateCost(
        providerName,
        taskRequirements.estimatedInputTokens,
        taskRequirements.estimatedOutputTokens
      );

      if (cost < lowestCost) {
        lowestCost = cost;
        cheapestProvider = providerName;
      }
    }

    return {
      provider: cheapestProvider,
      estimatedCost: lowestCost
    };
  }

  /**
   * تسجيل التكلفة الفعلية
   */
  recordCost(
    providerName: string,
    inputTokens: number,
    outputTokens: number,
    actualCost: number,
    taskType: string = 'chat'
  ): void {
    const record: CostRecord = {
      timestamp: new Date(),
      provider: providerName,
      inputTokens,
      outputTokens,
      cost: actualCost,
      taskType
    };

    this.costHistory.push(record);

    // الاحتفاظ بآخر 1000 سجل فقط
    if (this.costHistory.length > 1000) {
      this.costHistory.shift();
    }
  }

  /**
   * حساب متوسط التكلفة
   */
  getAverageCost(): number {
    if (this.costHistory.length === 0) return 0;

    const totalCost = this.costHistory.reduce((sum, record) => sum + record.cost, 0);
    return totalCost / this.costHistory.length;
  }

  /**
   * حساب التكلفة الإجمالية
   */
  getTotalCost(timeRange?: { start: Date; end: Date }): number {
    let records = this.costHistory;

    if (timeRange) {
      records = records.filter(
        r => r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
      );
    }

    return records.reduce((sum, record) => sum + record.cost, 0);
  }

  /**
   * حساب التوفير المتحقق
   */
  getCostSavings(): number {
    if (this.costHistory.length === 0) return 0;

    // مقارنة التكلفة الفعلية بأغلى مزود
    const actualCost = this.getTotalCost();
    const mostExpensiveProvider = this.findMostExpensiveProvider();
    
    if (!mostExpensiveProvider) return 0;

    // حساب كم كان سيكلف لو استخدمنا المزود الأغلى
    const hypotheticalCost = this.costHistory.reduce((sum, record) => {
      const hypotheticalProviderCost = this.estimateCost(
        mostExpensiveProvider,
        record.inputTokens,
        record.outputTokens
      );
      return sum + hypotheticalProviderCost;
    }, 0);

    return Math.max(0, hypotheticalCost - actualCost);
  }

  /**
   * البحث عن المزود الأغلى
   */
  private findMostExpensiveProvider(): string | null {
    const availableProviders = this.registry.getAvailableProviders();
    
    if (availableProviders.length === 0) return null;

    let mostExpensive = availableProviders[0];
    let highestCost = 0;

    for (const providerName of availableProviders) {
      const provider = this.registry.getProvider(providerName);
      const pricing = provider.getPricing();
      
      // استخدام متوسط 1000 token كمعيار
      const avgCost = (1000 * pricing.inputCostPerToken) + (1000 * pricing.outputCostPerToken);
      
      if (avgCost > highestCost) {
        highestCost = avgCost;
        mostExpensive = providerName;
      }
    }

    return mostExpensive;
  }

  /**
   * الحصول على تقرير التكلفة حسب المزود
   */
  getCostReportByProvider(): Record<string, ProviderCostSummary> {
    const report: Record<string, ProviderCostSummary> = {};

    for (const record of this.costHistory) {
      if (!report[record.provider]) {
        report[record.provider] = {
          totalCost: 0,
          totalRequests: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          averageCost: 0
        };
      }

      const summary = report[record.provider];
      summary.totalCost += record.cost;
      summary.totalRequests++;
      summary.totalInputTokens += record.inputTokens;
      summary.totalOutputTokens += record.outputTokens;
      summary.averageCost = summary.totalCost / summary.totalRequests;
    }

    return report;
  }

  /**
   * توصيات لتقليل التكلفة
   */
  getCostOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = this.getCostReportByProvider();
    const avgCost = this.getAverageCost();

    // البحث عن المزودين الأغلى
    Object.entries(report).forEach(([provider, summary]) => {
      if (summary.averageCost > avgCost * 1.5) {
        recommendations.push(
          `⚠️ المزود ${provider} يكلف أكثر بـ ${((summary.averageCost / avgCost - 1) * 100).toFixed(0)}% من المتوسط`
        );
      }
    });

    // البحث عن الاستخدام غير الفعال
    const totalCost = this.getTotalCost();
    const potentialSavings = this.getCostSavings();
    
    if (potentialSavings > totalCost * 0.1) {
      recommendations.push(
        `💰 يمكن توفير ${potentialSavings.toFixed(4)}$ من خلال اختيار مزودين أرخص`
      );
    }

    // توصيات عامة
    if (recommendations.length === 0) {
      recommendations.push('✅ الاستخدام الحالي محسّن بشكل جيد');
    }

    return recommendations;
  }

  /**
   * مسح سجل التكلفة
   */
  clearHistory(): void {
    this.costHistory = [];
  }

  /**
   * تصدير سجل التكلفة
   */
  exportCostHistory(): CostRecord[] {
    return [...this.costHistory];
  }
}

/**
 * واجهات TypeScript
 */
export interface TaskRequirements {
  requiresTools: boolean;
  minTokens?: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export interface CostRecord {
  timestamp: Date;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  taskType: string;
}

export interface ProviderCostSummary {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  averageCost: number;
}
