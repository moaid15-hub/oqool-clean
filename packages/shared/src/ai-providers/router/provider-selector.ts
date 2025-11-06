// provider-selector.ts
// ============================================
// 🎯 Provider Selector - محدد المزود الذكي
// ============================================
// Advanced provider selection with multi-criteria decision making,
// cost optimization, quality assurance, and predictive analytics
// ============================================

import type {
  IAIProvider,
  UnifiedRequest,
  ProviderConfig,
} from '../interfaces/iai-provider.interface.js';

// ============================================
// 📊 Selection Types & Interfaces
// ============================================

/**
 * Selection Criteria - معايير الاختيار
 */
export interface SelectionCriteria {
  // Primary factors
  maxCost?: number; // Maximum acceptable cost per request
  minQuality?: number; // Minimum quality score (0-1)
  maxLatency?: number; // Maximum acceptable latency (ms)
  minReliability?: number; // Minimum reliability score (0-1)

  // Task requirements
  requiredCapabilities?: {
    contextWindow?: number;
    streaming?: boolean;
    toolCalling?: boolean;
    vision?: boolean;
    multimodal?: boolean;
  };

  // Preferences
  preferredProviders?: string[];
  excludedProviders?: string[];
  languagePreference?: 'arabic' | 'english' | 'mixed';

  // Advanced
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  optimizationGoal?: 'cost' | 'quality' | 'speed' | 'balanced';
}

/**
 * Provider Evaluation - تقييم المزود
 */
export interface ProviderEvaluation {
  provider: string;
  scores: {
    cost: number; // 0-100
    quality: number; // 0-100
    speed: number; // 0-100
    reliability: number; // 0-100
    capability: number; // 0-100
    fit: number; // 0-100 (overall fit to criteria)
  };
  metrics: {
    estimatedCost: number;
    estimatedLatency: number;
    estimatedQuality: number;
    successProbability: number;
  };
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
  confidenceLevel: number; // 0-1
  reasoningChain: ReasoningStep[];
  warnings: string[];
  alternatives: string[];
}

/**
 * Reasoning Step - خطوة تفكير
 */
export interface ReasoningStep {
  criterion: string;
  value: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

/**
 * Selection Result - نتيجة الاختيار
 */
export interface SelectionResult {
  selected: ProviderEvaluation;
  alternatives: ProviderEvaluation[];
  selectionStrategy: string;
  decisionConfidence: number;
  reasoning: string[];
  tradeoffs: {
    costVsQuality: number; // -1 to 1 (negative = favoring cost, positive = favoring quality)
    speedVsReliability: number; // -1 to 1
  };
  predictedOutcome: {
    successProbability: number;
    expectedCost: number;
    expectedLatency: number;
    expectedQuality: number;
  };
}

/**
 * Provider Statistics - إحصائيات المزود
 */
export interface ProviderStatistics {
  provider: string;
  totalRequests: number;
  successRate: number;
  averageCost: number;
  averageLatency: number;
  averageQuality: number;
  peakPerformanceTime: string;
  worstPerformanceTime: string;
  costEfficiencyRank: number;
  qualityRank: number;
  speedRank: number;
  overallRank: number;
  trend: 'improving' | 'stable' | 'declining';
  recentPerformance: {
    last24h: PerformanceSnapshot;
    last7d: PerformanceSnapshot;
    last30d: PerformanceSnapshot;
  };
}

export interface PerformanceSnapshot {
  requests: number;
  successRate: number;
  avgCost: number;
  avgLatency: number;
  avgQuality: number;
}

/**
 * Cost Model - نموذج التكلفة
 */
export interface CostModel {
  provider: string;
  pricing: {
    inputCostPerMToken: number;
    outputCostPerMToken: number;
    minimumCost?: number;
    tieredPricing?: Array<{
      threshold: number; // tokens
      discount: number; // percentage
    }>;
  };
  estimateCost(inputTokens: number, outputTokens: number): number;
}

/**
 * Quality Model - نموذج الجودة
 */
export interface QualityModel {
  provider: string;
  baseQuality: number; // 0-1
  strengthAreas: string[]; // e.g., ['code', 'reasoning', 'arabic']
  weaknessAreas: string[];
  taskSpecificQuality: Map<string, number>; // task type -> quality score
  predictQuality(taskType: string, complexity: string): number;
}

/**
 * Latency Model - نموذج الكمون
 */
export interface LatencyModel {
  provider: string;
  baseLatency: number; // milliseconds
  tokenProcessingRate: number; // tokens per second
  overhead: number; // fixed overhead in ms
  variability: number; // standard deviation
  predictLatency(tokens: number, streaming: boolean): {
    expected: number;
    min: number;
    max: number;
  };
}

// ============================================
// 🎯 Provider Selector Class
// ============================================

export class ProviderSelector {
  private providers: Map<string, IAIProvider> = new Map();
  private statistics: Map<string, ProviderStatistics> = new Map();
  private costModels: Map<string, CostModel> = new Map();
  private qualityModels: Map<string, QualityModel> = new Map();
  private latencyModels: Map<string, LatencyModel> = new Map();
  private selectionHistory: SelectionResult[] = [];
  private logger: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;

  // Configuration
  private defaultWeights = {
    cost: 0.25,
    quality: 0.30,
    speed: 0.25,
    reliability: 0.20,
  };

  constructor(
    logger?: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void
  ) {
    this.logger =
      logger ||
      ((message: string, level: string) => {
        const emoji = { info: '🎯', warn: '⚠️', error: '❌', debug: '🔍' }[level];
        console.log(`${emoji} [ProviderSelector] ${message}`);
      });

    this.logger('Provider Selector initialized', 'info');
  }

  // ============================================
  // 🎯 Main Selection Methods
  // ============================================

  /**
   * Select optimal provider based on criteria
   * اختيار المزود الأمثل بناءً على المعايير
   */
  async select(
    request: UnifiedRequest,
    criteria: SelectionCriteria = {}
  ): Promise<SelectionResult> {
    const startTime = Date.now();

    try {
      this.logger(`Starting provider selection with ${this.providers.size} providers`, 'debug');

      // Step 1: Filter providers by hard requirements
      const eligibleProviders = this.filterByRequirements(criteria);
      this.logger(`${eligibleProviders.length} providers meet hard requirements`, 'debug');

      if (eligibleProviders.length === 0) {
        throw new Error('No providers meet the specified requirements');
      }

      // Step 2: Evaluate each eligible provider
      const evaluations = await Promise.all(
        eligibleProviders.map((provider) => this.evaluateProvider(provider, request, criteria))
      );

      // Step 3: Sort by overall score
      evaluations.sort((a, b) => b.scores.fit - a.scores.fit);

      // Step 4: Apply selection strategy
      const selected = this.applySelectionStrategy(evaluations, criteria);

      // Step 5: Calculate tradeoffs
      const tradeoffs = this.calculateTradeoffs(selected, evaluations);

      // Step 6: Build reasoning
      const reasoning = this.buildReasoningExplanation(selected, evaluations, criteria);

      // Step 7: Predict outcome
      const predictedOutcome = this.predictOutcome(selected, request);

      const result: SelectionResult = {
        selected,
        alternatives: evaluations.filter((e) => e.provider !== selected.provider).slice(0, 3),
        selectionStrategy: this.getStrategyName(criteria),
        decisionConfidence: selected.confidenceLevel,
        reasoning,
        tradeoffs,
        predictedOutcome,
      };

      // Step 8: Record selection
      this.selectionHistory.push(result);
      if (this.selectionHistory.length > 1000) {
        this.selectionHistory.shift();
      }

      this.logger(
        `Selected ${selected.provider} with confidence ${(selected.confidenceLevel * 100).toFixed(1)}% in ${Date.now() - startTime}ms`,
        'info'
      );

      return result;
    } catch (error: any) {
      this.logger(`Selection failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Compare multiple providers side by side
   * مقارنة عدة مزودين جنباً إلى جنب
   */
  async compareProviders(
    providerNames: string[],
    request: UnifiedRequest,
    criteria: SelectionCriteria = {}
  ): Promise<{
    comparison: ProviderEvaluation[];
    recommendation: string;
    insights: string[];
  }> {
    const evaluations = await Promise.all(
      providerNames
        .filter((name) => this.providers.has(name))
        .map((name) => this.evaluateProvider(name, request, criteria))
    );

    evaluations.sort((a, b) => b.scores.fit - a.scores.fit);

    const insights = this.generateComparisonInsights(evaluations);
    const recommendation = evaluations[0]?.provider || 'No suitable provider found';

    return {
      comparison: evaluations,
      recommendation,
      insights,
    };
  }

  /**
   * Get real-time provider rankings
   * الحصول على تصنيفات المزودين في الوقت الفعلي
   */
  getRankings(criterion: 'cost' | 'quality' | 'speed' | 'reliability' | 'overall'): Array<{
    provider: string;
    rank: number;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    const stats = Array.from(this.statistics.values());

    const scoreMap: Record<typeof criterion, (s: ProviderStatistics) => number> = {
      cost: (s) => 100 * (1 - s.averageCost / 0.1), // Lower is better
      quality: (s) => s.averageQuality * 100,
      speed: (s) => 100 * (1 - s.averageLatency / 30000), // Lower is better
      reliability: (s) => s.successRate * 100,
      overall: (s) => s.overallRank,
    };

    const rankings = stats
      .map((stat) => ({
        provider: stat.provider,
        score: scoreMap[criterion](stat),
        trend: stat.trend === 'improving' ? 'up' : stat.trend === 'declining' ? 'down' : 'stable',
      }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return rankings as Array<{
      provider: string;
      rank: number;
      score: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  }

  // ============================================
  // 🔍 Evaluation Logic
  // ============================================

  /**
   * Evaluate a single provider
   * تقييم مزود واحد
   */
  private async evaluateProvider(
    providerName: string,
    request: UnifiedRequest,
    criteria: SelectionCriteria
  ): Promise<ProviderEvaluation> {
    const stats = this.statistics.get(providerName);
    const costModel = this.costModels.get(providerName);
    const qualityModel = this.qualityModels.get(providerName);
    const latencyModel = this.latencyModels.get(providerName);

    if (!stats || !costModel || !qualityModel || !latencyModel) {
      throw new Error(`Missing models for provider: ${providerName}`);
    }

    const reasoningChain: ReasoningStep[] = [];
    const warnings: string[] = [];

    // Estimate tokens
    const estimatedInputTokens = this.estimateTokens(request);
    const estimatedOutputTokens = request.maxTokens || 2048;

    // 1. Cost Score
    const estimatedCost = costModel.estimateCost(estimatedInputTokens, estimatedOutputTokens);
    const costScore = this.calculateCostScore(estimatedCost, criteria.maxCost);
    reasoningChain.push({
      criterion: 'cost',
      value: costScore,
      weight: this.defaultWeights.cost,
      impact: costScore > 70 ? 'positive' : costScore < 40 ? 'negative' : 'neutral',
      explanation: `Estimated cost: $${estimatedCost.toFixed(4)} (score: ${costScore.toFixed(1)}/100)`,
    });

    if (criteria.maxCost && estimatedCost > criteria.maxCost) {
      warnings.push(`Cost exceeds maximum: $${estimatedCost.toFixed(4)} > $${criteria.maxCost}`);
    }

    // 2. Quality Score
    const taskType = this.detectTaskType(request);
    const complexity = this.detectComplexity(request);
    const estimatedQuality = qualityModel.predictQuality(taskType, complexity);
    const qualityScore = estimatedQuality * 100;
    reasoningChain.push({
      criterion: 'quality',
      value: qualityScore,
      weight: this.defaultWeights.quality,
      impact: qualityScore > 75 ? 'positive' : qualityScore < 50 ? 'negative' : 'neutral',
      explanation: `Expected quality: ${(estimatedQuality * 100).toFixed(1)}% for ${taskType} task`,
    });

    if (criteria.minQuality && estimatedQuality < criteria.minQuality) {
      warnings.push(
        `Quality below minimum: ${(estimatedQuality * 100).toFixed(1)}% < ${(criteria.minQuality * 100).toFixed(1)}%`
      );
    }

    // 3. Speed Score
    const latencyPrediction = latencyModel.predictLatency(
      estimatedInputTokens + estimatedOutputTokens,
      request.stream || false
    );
    const speedScore = this.calculateSpeedScore(latencyPrediction.expected, criteria.maxLatency);
    reasoningChain.push({
      criterion: 'speed',
      value: speedScore,
      weight: this.defaultWeights.speed,
      impact: speedScore > 70 ? 'positive' : speedScore < 40 ? 'negative' : 'neutral',
      explanation: `Expected latency: ${latencyPrediction.expected}ms (range: ${latencyPrediction.min}-${latencyPrediction.max}ms)`,
    });

    if (criteria.maxLatency && latencyPrediction.expected > criteria.maxLatency) {
      warnings.push(
        `Latency exceeds maximum: ${latencyPrediction.expected}ms > ${criteria.maxLatency}ms`
      );
    }

    // 4. Reliability Score
    const reliabilityScore = stats.successRate * 100;
    reasoningChain.push({
      criterion: 'reliability',
      value: reliabilityScore,
      weight: this.defaultWeights.reliability,
      impact: reliabilityScore > 95 ? 'positive' : reliabilityScore < 85 ? 'negative' : 'neutral',
      explanation: `Historical success rate: ${(stats.successRate * 100).toFixed(1)}%`,
    });

    if (criteria.minReliability && stats.successRate < criteria.minReliability) {
      warnings.push(
        `Reliability below minimum: ${(stats.successRate * 100).toFixed(1)}% < ${(criteria.minReliability * 100).toFixed(1)}%`
      );
    }

    // 5. Capability Score
    const capabilityScore = 100; // Assume capable if it passed filtering
    reasoningChain.push({
      criterion: 'capability',
      value: capabilityScore,
      weight: 0.1,
      impact: 'positive',
      explanation: 'Provider meets all capability requirements',
    });

    // 6. Calculate overall fit score
    const weights = this.getWeights(criteria);
    const fitScore =
      costScore * weights.cost +
      qualityScore * weights.quality +
      speedScore * weights.speed +
      reliabilityScore * weights.reliability;

    // 7. Determine recommendation
    const recommendation = this.determineRecommendation(
      fitScore,
      warnings.length,
      estimatedQuality
    );

    // 8. Calculate confidence
    const confidenceLevel = this.calculateConfidence(stats, warnings.length);

    // 9. Find alternatives
    const alternatives = this.findAlternatives(providerName, taskType);

    return {
      provider: providerName,
      scores: {
        cost: costScore,
        quality: qualityScore,
        speed: speedScore,
        reliability: reliabilityScore,
        capability: capabilityScore,
        fit: fitScore,
      },
      metrics: {
        estimatedCost,
        estimatedLatency: latencyPrediction.expected,
        estimatedQuality,
        successProbability: stats.successRate,
      },
      recommendation,
      confidenceLevel,
      reasoningChain,
      warnings,
      alternatives,
    };
  }

  /**
   * Filter providers by hard requirements
   * تصفية المزودين حسب المتطلبات الصارمة
   */
  private filterByRequirements(criteria: SelectionCriteria): string[] {
    const eligible: string[] = [];

    for (const [name, provider] of this.providers) {
      let meetsRequirements = true;

      // Check excluded providers
      if (criteria.excludedProviders?.includes(name)) {
        continue;
      }

      // Check required capabilities
      if (criteria.requiredCapabilities) {
        const caps = criteria.requiredCapabilities;

        // Context window
        if (caps.contextWindow) {
          const model = this.latencyModels.get(name);
          if (!model || caps.contextWindow > 100000) {
            // Assume 100k max for simplicity
            meetsRequirements = false;
          }
        }

        // Streaming
        if (caps.streaming && !this.supportsStreaming(name)) {
          meetsRequirements = false;
        }

        // Tool calling
        if (caps.toolCalling && !this.supportsToolCalling(name)) {
          meetsRequirements = false;
        }

        // Vision
        if (caps.vision && !this.supportsVision(name)) {
          meetsRequirements = false;
        }
      }

      if (meetsRequirements) {
        eligible.push(name);
      }
    }

    // If preferred providers specified, prioritize them
    if (criteria.preferredProviders && criteria.preferredProviders.length > 0) {
      const preferred = eligible.filter((p) => criteria.preferredProviders!.includes(p));
      if (preferred.length > 0) {
        return preferred;
      }
    }

    return eligible;
  }

  // ============================================
  // 📊 Scoring Functions
  // ============================================

  private calculateCostScore(cost: number, maxCost?: number): number {
    // Reference costs
    const cheapCost = 0.0001; // $0.0001
    const expensiveCost = 0.05; // $0.05

    let score = 100 * (1 - (cost - cheapCost) / (expensiveCost - cheapCost));
    score = Math.max(0, Math.min(100, score));

    // Apply penalty if exceeds max
    if (maxCost && cost > maxCost) {
      score *= 0.5; // 50% penalty
    }

    return score;
  }

  private calculateSpeedScore(latency: number, maxLatency?: number): number {
    // Reference latencies
    const fastLatency = 500; // 500ms
    const slowLatency = 30000; // 30s

    let score = 100 * (1 - (latency - fastLatency) / (slowLatency - fastLatency));
    score = Math.max(0, Math.min(100, score));

    // Apply penalty if exceeds max
    if (maxLatency && latency > maxLatency) {
      score *= 0.5; // 50% penalty
    }

    return score;
  }

  private calculateConfidence(stats: ProviderStatistics, warningCount: number): number {
    let confidence = 1.0;

    // Reduce confidence based on limited data
    if (stats.totalRequests < 10) {
      confidence *= 0.7;
    } else if (stats.totalRequests < 50) {
      confidence *= 0.85;
    }

    // Reduce confidence based on warnings
    confidence *= Math.pow(0.9, warningCount);

    // Adjust based on trend
    if (stats.trend === 'declining') {
      confidence *= 0.9;
    } else if (stats.trend === 'improving') {
      confidence *= 1.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  // ============================================
  // 🎯 Selection Strategy
  // ============================================

  private applySelectionStrategy(
    evaluations: ProviderEvaluation[],
    criteria: SelectionCriteria
  ): ProviderEvaluation {
    const goal = criteria.optimizationGoal || 'balanced';
    const riskTolerance = criteria.riskTolerance || 'moderate';

    switch (goal) {
      case 'cost':
        // Lowest cost with acceptable quality
        return (
          evaluations
            .filter((e) => e.scores.quality >= 60) // Minimum 60% quality
            .sort((a, b) => b.scores.cost - a.scores.cost)[0] || evaluations[0]
        );

      case 'quality':
        // Highest quality within budget
        if (criteria.maxCost) {
          return (
            evaluations
              .filter((e) => e.metrics.estimatedCost <= criteria.maxCost!)
              .sort((a, b) => b.scores.quality - a.scores.quality)[0] || evaluations[0]
          );
        }
        return evaluations.sort((a, b) => b.scores.quality - a.scores.quality)[0];

      case 'speed':
        // Fastest with acceptable quality
        return (
          evaluations
            .filter((e) => e.scores.quality >= 60)
            .sort((a, b) => b.scores.speed - a.scores.speed)[0] || evaluations[0]
        );

      case 'balanced':
      default:
        // Apply risk tolerance
        if (riskTolerance === 'conservative') {
          // Prefer highly reliable providers
          return (
            evaluations
              .filter((e) => e.scores.reliability >= 90)
              .sort((a, b) => b.scores.fit - a.scores.fit)[0] || evaluations[0]
          );
        } else if (riskTolerance === 'aggressive') {
          // Can try less proven providers for better cost/quality
          return evaluations[0];
        } else {
          // Moderate: balance all factors
          return evaluations.filter((e) => e.scores.reliability >= 85)[0] || evaluations[0];
        }
    }
  }

  // ============================================
  // 📈 Analytics & Insights
  // ============================================

  private calculateTradeoffs(
    selected: ProviderEvaluation,
    all: ProviderEvaluation[]
  ): SelectionResult['tradeoffs'] {
    const bestCost = Math.max(...all.map((e) => e.scores.cost));
    const bestQuality = Math.max(...all.map((e) => e.scores.quality));
    const bestSpeed = Math.max(...all.map((e) => e.scores.speed));
    const bestReliability = Math.max(...all.map((e) => e.scores.reliability));

    // Cost vs Quality tradeoff
    const costNormalized = selected.scores.cost / bestCost;
    const qualityNormalized = selected.scores.quality / bestQuality;
    const costVsQuality = qualityNormalized - costNormalized; // -1 to 1

    // Speed vs Reliability tradeoff
    const speedNormalized = selected.scores.speed / bestSpeed;
    const reliabilityNormalized = selected.scores.reliability / bestReliability;
    const speedVsReliability = reliabilityNormalized - speedNormalized; // -1 to 1

    return {
      costVsQuality,
      speedVsReliability,
    };
  }

  private predictOutcome(
    evaluation: ProviderEvaluation,
    request: UnifiedRequest
  ): SelectionResult['predictedOutcome'] {
    return {
      successProbability: evaluation.metrics.successProbability,
      expectedCost: evaluation.metrics.estimatedCost,
      expectedLatency: evaluation.metrics.estimatedLatency,
      expectedQuality: evaluation.metrics.estimatedQuality,
    };
  }

  private buildReasoningExplanation(
    selected: ProviderEvaluation,
    all: ProviderEvaluation[],
    criteria: SelectionCriteria
  ): string[] {
    const reasoning: string[] = [];

    // Main reason
    reasoning.push(
      `Selected ${selected.provider} with overall fit score of ${selected.scores.fit.toFixed(1)}/100`
    );

    // Key strengths
    const strengths: string[] = [];
    if (selected.scores.cost >= 80) strengths.push('excellent cost efficiency');
    if (selected.scores.quality >= 80) strengths.push('high quality output');
    if (selected.scores.speed >= 80) strengths.push('fast response time');
    if (selected.scores.reliability >= 90) strengths.push('exceptional reliability');

    if (strengths.length > 0) {
      reasoning.push(`Key strengths: ${strengths.join(', ')}`);
    }

    // Comparison to alternatives
    if (all.length > 1) {
      const secondBest = all[1];
      const scoreDiff = selected.scores.fit - secondBest.scores.fit;
      if (scoreDiff > 10) {
        reasoning.push(
          `Significantly outperforms ${secondBest.provider} by ${scoreDiff.toFixed(1)} points`
        );
      } else if (scoreDiff > 0) {
        reasoning.push(`Slightly better than ${secondBest.provider} (margin: ${scoreDiff.toFixed(1)} points)`);
      }
    }

    // Criteria satisfaction
    if (criteria.optimizationGoal) {
      reasoning.push(`Optimized for: ${criteria.optimizationGoal}`);
    }

    // Warnings
    if (selected.warnings.length > 0) {
      reasoning.push(`⚠️ Note: ${selected.warnings.length} potential concern(s) identified`);
    }

    // Confidence
    const confidencePercent = (selected.confidenceLevel * 100).toFixed(1);
    reasoning.push(`Decision confidence: ${confidencePercent}%`);

    return reasoning;
  }

  private generateComparisonInsights(evaluations: ProviderEvaluation[]): string[] {
    const insights: string[] = [];

    if (evaluations.length === 0) return insights;

    // Find best in each category
    const bestCost = evaluations.reduce((best, curr) =>
      curr.scores.cost > best.scores.cost ? curr : best
    );
    const bestQuality = evaluations.reduce((best, curr) =>
      curr.scores.quality > best.scores.quality ? curr : best
    );
    const bestSpeed = evaluations.reduce((best, curr) =>
      curr.scores.speed > best.scores.speed ? curr : best
    );

    insights.push(`💰 Most cost-effective: ${bestCost.provider}`);
    insights.push(`⭐ Highest quality: ${bestQuality.provider}`);
    insights.push(`⚡ Fastest: ${bestSpeed.provider}`);

    // Score spread analysis
    const fitScores = evaluations.map((e) => e.scores.fit);
    const spread = Math.max(...fitScores) - Math.min(...fitScores);

    if (spread < 10) {
      insights.push('📊 All providers are closely matched in overall performance');
    } else if (spread > 30) {
      insights.push('📊 Significant performance gap between providers');
    }

    // Cost range
    const costs = evaluations.map((e) => e.metrics.estimatedCost);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const costDiff = ((maxCost - minCost) / minCost) * 100;

    if (costDiff > 100) {
      insights.push(
        `💸 Cost varies significantly: ${costDiff.toFixed(0)}% difference between cheapest and most expensive`
      );
    }

    return insights;
  }

  // ============================================
  // 🔧 Helper Methods
  // ============================================

  private estimateTokens(request: UnifiedRequest): number {
    const content = request.messages.map((m) => m.content).join(' ');
    return Math.ceil(content.length / 4); // Rough approximation
  }

  private detectTaskType(request: UnifiedRequest): string {
    const content = request.messages[request.messages.length - 1]?.content.toLowerCase() || '';

    if (content.includes('code') || content.includes('function') || content.includes('اكتب'))
      return 'code_generation';
    if (content.includes('review') || content.includes('راجع')) return 'code_review';
    if (content.includes('debug') || content.includes('fix') || content.includes('خطأ'))
      return 'debugging';
    if (content.includes('design') || content.includes('architecture') || content.includes('صمم'))
      return 'architecture';

    return 'general';
  }

  private detectComplexity(request: UnifiedRequest): string {
    const content = request.messages.map((m) => m.content).join(' ');
    const length = content.length;

    if (length < 200) return 'simple';
    if (length < 1000) return 'medium';
    return 'complex';
  }

  private getWeights(criteria: SelectionCriteria): Required<typeof this.defaultWeights> {
    if (criteria.optimizationGoal === 'cost') {
      return { cost: 0.5, quality: 0.2, speed: 0.15, reliability: 0.15 };
    } else if (criteria.optimizationGoal === 'quality') {
      return { cost: 0.15, quality: 0.5, speed: 0.15, reliability: 0.2 };
    } else if (criteria.optimizationGoal === 'speed') {
      return { cost: 0.15, quality: 0.2, speed: 0.5, reliability: 0.15 };
    }
    return this.defaultWeights;
  }

  private determineRecommendation(
    fitScore: number,
    warningCount: number,
    quality: number
  ): ProviderEvaluation['recommendation'] {
    if (warningCount >= 3) return 'not_recommended';
    if (fitScore >= 80 && quality >= 0.8) return 'highly_recommended';
    if (fitScore >= 60 && quality >= 0.6) return 'recommended';
    if (fitScore >= 40) return 'acceptable';
    return 'not_recommended';
  }

  private findAlternatives(currentProvider: string, taskType: string): string[] {
    const alternatives: string[] = [];

    for (const [name, qualityModel] of this.qualityModels) {
      if (name !== currentProvider && qualityModel.strengthAreas.includes(taskType)) {
        alternatives.push(name);
      }
    }

    return alternatives.slice(0, 3);
  }

  private getStrategyName(criteria: SelectionCriteria): string {
    if (criteria.optimizationGoal) {
      return `${criteria.optimizationGoal}_optimized`;
    }
    return 'balanced';
  }

  private supportsStreaming(provider: string): boolean {
    // Implement based on provider capabilities
    return true; // Assume all support streaming
  }

  private supportsToolCalling(provider: string): boolean {
    // Implement based on provider capabilities
    return ['claude', 'openai', 'gemini'].includes(provider);
  }

  private supportsVision(provider: string): boolean {
    // Implement based on provider capabilities
    return ['claude', 'openai', 'gemini'].includes(provider);
  }

  // ============================================
  // 🔧 Provider Management
  // ============================================

  registerProvider(
    name: string,
    provider: IAIProvider,
    costModel: CostModel,
    qualityModel: QualityModel,
    latencyModel: LatencyModel
  ): void {
    this.providers.set(name, provider);
    this.costModels.set(name, costModel);
    this.qualityModels.set(name, qualityModel);
    this.latencyModels.set(name, latencyModel);

    // Initialize statistics
    if (!this.statistics.has(name)) {
      this.statistics.set(name, {
        provider: name,
        totalRequests: 0,
        successRate: 1.0,
        averageCost: 0,
        averageLatency: latencyModel.baseLatency,
        averageQuality: qualityModel.baseQuality,
        peakPerformanceTime: 'N/A',
        worstPerformanceTime: 'N/A',
        costEfficiencyRank: 0,
        qualityRank: 0,
        speedRank: 0,
        overallRank: 0,
        trend: 'stable',
        recentPerformance: {
          last24h: { requests: 0, successRate: 1, avgCost: 0, avgLatency: 0, avgQuality: 0 },
          last7d: { requests: 0, successRate: 1, avgCost: 0, avgLatency: 0, avgQuality: 0 },
          last30d: { requests: 0, successRate: 1, avgCost: 0, avgLatency: 0, avgQuality: 0 },
        },
      });
    }

    this.logger(`Registered provider: ${name}`, 'info');
  }

  updateStatistics(provider: string, outcome: {
    success: boolean;
    cost: number;
    latency: number;
    quality: number;
  }): void {
    const stats = this.statistics.get(provider);
    if (!stats) return;

    stats.totalRequests++;
    stats.successRate =
      (stats.successRate * (stats.totalRequests - 1) + (outcome.success ? 1 : 0)) /
      stats.totalRequests;
    stats.averageCost =
      (stats.averageCost * (stats.totalRequests - 1) + outcome.cost) / stats.totalRequests;
    stats.averageLatency =
      (stats.averageLatency * (stats.totalRequests - 1) + outcome.latency) / stats.totalRequests;
    stats.averageQuality =
      (stats.averageQuality * (stats.totalRequests - 1) + outcome.quality) / stats.totalRequests;

    // Update trend (simple moving average comparison)
    const recentQuality = stats.recentPerformance.last7d.avgQuality;
    if (recentQuality > stats.averageQuality * 1.05) {
      stats.trend = 'improving';
    } else if (recentQuality < stats.averageQuality * 0.95) {
      stats.trend = 'declining';
    } else {
      stats.trend = 'stable';
    }

    this.logger(`Updated statistics for ${provider}`, 'debug');
  }

  // ============================================
  // 📊 Export & Analytics
  // ============================================

  exportAnalytics(): string {
    const data = {
      statistics: Array.from(this.statistics.entries()),
      history: this.selectionHistory.slice(-100), // Last 100 selections
      rankings: {
        cost: this.getRankings('cost'),
        quality: this.getRankings('quality'),
        speed: this.getRankings('speed'),
        reliability: this.getRankings('reliability'),
        overall: this.getRankings('overall'),
      },
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }
}

// ============================================
// 📤 Exports
// ============================================

export default ProviderSelector;
