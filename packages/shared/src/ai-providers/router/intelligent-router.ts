// intelligent-router.ts
// ============================================
// 🧠 Intelligent AI Router - الموجه الذكي للذكاء الاصطناعي
// ============================================
// Next-generation AI routing system with machine learning-inspired
// decision making, adaptive cost optimization, and real-time performance monitoring
// ============================================

import type {
  IAIProvider,
  UnifiedRequest,
  UnifiedResponse,
  ProviderConfig,
  RoutingDecision,
} from '../interfaces/iai-provider.interface.js';

// ============================================
// 📊 Core Types & Interfaces
// ============================================

/**
 * Task Classification - تصنيف المهام بذكاء متقدم
 */
export interface TaskClassification {
  complexity: 'trivial' | 'simple' | 'medium' | 'complex' | 'expert';
  category:
    | 'code_generation'
    | 'code_review'
    | 'debugging'
    | 'architecture'
    | 'testing'
    | 'documentation'
    | 'optimization'
    | 'security'
    | 'general';
  estimatedTokens: {
    input: number;
    output: number;
    total: number;
  };
  contextWindow: number;
  requiresReasoning: boolean;
  timeConstraint: 'realtime' | 'normal' | 'batch';
  qualityRequirement: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-1
}

/**
 * Provider Scoring - نظام تسجيل المزودين المتقدم
 */
export interface ProviderScore {
  provider: string;
  totalScore: number;
  breakdown: {
    costScore: number; // 0-100
    qualityScore: number; // 0-100
    speedScore: number; // 0-100
    reliabilityScore: number; // 0-100
    capabilityScore: number; // 0-100
    historicalPerformance: number; // 0-100
    contextFit: number; // 0-100
  };
  estimatedCost: number;
  estimatedLatency: number;
  confidence: number; // 0-1
  reasoning: string[];
}

/**
 * Routing Strategy - استراتيجية التوجيه
 */
export type RoutingStrategy =
  | 'cost_optimized' // تحسين التكلفة
  | 'quality_first' // الجودة أولاً
  | 'speed_first' // السرعة أولاً
  | 'balanced' // متوازن
  | 'adaptive' // تكيفي (يتعلم من الأداء)
  | 'custom'; // مخصص

/**
 * Provider Capabilities - قدرات المزود
 */
export interface ProviderCapabilities {
  maxContextWindow: number;
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  supportsVision: boolean;
  supportedLanguages: string[];
  specializations: string[]; // e.g., ['code', 'reasoning', 'creative']
  costPerMToken: {
    input: number;
    output: number;
  };
  averageLatency: number; // milliseconds
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

/**
 * Performance History - سجل الأداء
 */
export interface PerformanceHistory {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  averageQuality: number; // 0-1 based on user feedback
  totalCost: number;
  lastUsed: Date;
  successRate: number;
  taskCategories: Map<string, TaskPerformance>;
}

export interface TaskPerformance {
  category: string;
  count: number;
  successRate: number;
  averageQuality: number;
  averageLatency: number;
  averageCost: number;
  preferenceScore: number; // 0-1, learned from usage
}

/**
 * Routing Configuration - إعدادات التوجيه
 */
export interface RoutingConfig {
  strategy: RoutingStrategy;
  costBudget?: number; // $ per request
  qualityThreshold?: number; // 0-1
  maxLatency?: number; // milliseconds
  weights?: {
    cost: number; // 0-1
    quality: number; // 0-1
    speed: number; // 0-1
    reliability: number; // 0-1
  };
  fallbackEnabled: boolean;
  maxRetries: number;
  learningEnabled: boolean; // Enable adaptive learning
  customRules?: RoutingRule[];
}

/**
 * Custom Routing Rule - قاعدة توجيه مخصصة
 */
export interface RoutingRule {
  name: string;
  condition: (
    classification: TaskClassification,
    context: RoutingContext
  ) => boolean;
  action: {
    preferProvider?: string;
    excludeProviders?: string[];
    adjustWeights?: Partial<RoutingConfig['weights']>;
    overrideStrategy?: RoutingStrategy;
  };
  priority: number; // Higher priority rules evaluated first
}

/**
 * Routing Context - سياق التوجيه
 */
export interface RoutingContext {
  userId?: string;
  sessionId?: string;
  previousDecisions: RoutingDecision[];
  budget: {
    remaining: number;
    used: number;
  };
  timeOfDay: string;
  loadBalance: Map<string, number>; // Current load per provider
  userPreferences?: {
    preferredProviders?: string[];
    avoidProviders?: string[];
    maxCostPerRequest?: number;
  };
}

/**
 * Learning Feedback - ملاحظات التعلم
 */
export interface RoutingFeedback {
  decisionId: string;
  userSatisfaction?: number; // 0-1
  actualQuality?: number; // 0-1
  actualLatency?: number;
  actualCost?: number;
  success: boolean;
  comments?: string;
}

// ============================================
// 🧠 Intelligent Router Class
// ============================================

export class IntelligentRouter {
  private providers: Map<string, IAIProvider> = new Map();
  private capabilities: Map<string, ProviderCapabilities> = new Map();
  private performanceHistory: Map<string, PerformanceHistory> = new Map();
  private config: RoutingConfig;
  private context: RoutingContext;
  private decisionCache: Map<string, CachedDecision> = new Map();
  private logger: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;

  // Machine Learning-inspired parameters
  private learningRate: number = 0.1; // How fast to adapt
  private explorationRate: number = 0.1; // Chance to try non-optimal providers
  private decayFactor: number = 0.95; // How much to value recent vs old performance

  constructor(
    config: Partial<RoutingConfig> = {},
    logger?: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void
  ) {
    this.config = {
      strategy: 'balanced',
      weights: {
        cost: 0.3,
        quality: 0.35,
        speed: 0.2,
        reliability: 0.15,
      },
      fallbackEnabled: true,
      maxRetries: 3,
      learningEnabled: true,
      ...config,
    };

    this.context = {
      previousDecisions: [],
      budget: { remaining: Infinity, used: 0 },
      timeOfDay: new Date().toLocaleTimeString(),
      loadBalance: new Map(),
    };

    this.logger =
      logger ||
      ((message: string, level: string) => {
        const emoji = {
          info: '📘',
          warn: '⚠️',
          error: '❌',
          debug: '🔍',
        }[level];
        console.log(`${emoji} [IntelligentRouter] ${message}`);
      });

    this.logger('Intelligent Router initialized with strategy: ' + this.config.strategy, 'info');
  }

  // ============================================
  // 🎯 Main Routing Methods
  // ============================================

  /**
   * Route a request to the optimal provider
   * توجيه الطلب للمزود الأمثل
   */
  async route(request: UnifiedRequest): Promise<RoutingDecision> {
    const startTime = Date.now();

    try {
      // Step 1: Classify the task
      const classification = await this.classifyTask(request);
      this.logger(
        `Task classified: ${classification.category} (${classification.complexity})`,
        'debug'
      );

      // Step 2: Check cache for similar requests
      const cachedDecision = this.checkCache(request, classification);
      if (cachedDecision) {
        this.logger(`Using cached routing decision`, 'debug');
        return cachedDecision.decision;
      }

      // Step 3: Apply custom rules
      const rulesApplied = this.applyCustomRules(classification);
      if (rulesApplied) {
        this.logger(`Custom rules applied: ${rulesApplied.length} rules`, 'debug');
      }

      // Step 4: Score all available providers
      const scores = await this.scoreProviders(classification, request);
      this.logger(
        `Scored ${scores.length} providers: ${scores.map((s) => `${s.provider}=${s.totalScore.toFixed(1)}`).join(', ')}`,
        'debug'
      );

      // Step 5: Select optimal provider (with exploration)
      const selectedProvider = this.selectProvider(scores, classification);
      this.logger(
        `Selected provider: ${selectedProvider.provider} (score: ${selectedProvider.totalScore.toFixed(2)})`,
        'info'
      );

      // Step 6: Prepare fallback chain
      const fallbackChain = this.prepareFallbackChain(scores, selectedProvider.provider);

      // Step 7: Create routing decision
      const decision: RoutingDecision = {
        provider: selectedProvider.provider,
        reasoning: selectedProvider.reasoning,
        confidence: selectedProvider.confidence,
        estimatedCost: selectedProvider.estimatedCost,
        estimatedLatency: selectedProvider.estimatedLatency,
        fallbackChain,
        metadata: {
          classification,
          scores: scores.map((s) => ({
            provider: s.provider,
            score: s.totalScore,
            breakdown: s.breakdown,
          })),
          strategy: this.config.strategy,
          decisionTime: Date.now() - startTime,
          timestamp: new Date(),
        },
      };

      // Step 8: Update context and cache
      this.context.previousDecisions.push(decision);
      this.cacheDecision(request, classification, decision);

      this.logger(
        `Routing decision completed in ${Date.now() - startTime}ms`,
        'debug'
      );

      return decision;
    } catch (error: any) {
      this.logger(`Routing failed: ${error.message}`, 'error');
      throw new Error(`Intelligent routing failed: ${error.message}`);
    }
  }

  /**
   * Route with execution - includes actual provider call
   * التوجيه مع التنفيذ الفعلي
   */
  async routeAndExecute(request: UnifiedRequest): Promise<{
    decision: RoutingDecision;
    response: UnifiedResponse;
    feedback: RoutingFeedback;
  }> {
    const decision = await this.route(request);
    const startTime = Date.now();

    let lastError: Error | null = null;
    const providersToTry = [decision.provider, ...(decision.fallbackChain || [])];

    for (let i = 0; i < providersToTry.length; i++) {
      const providerName = providersToTry[i];
      const provider = this.providers.get(providerName);

      if (!provider) {
        this.logger(`Provider ${providerName} not registered, skipping`, 'warn');
        continue;
      }

      try {
        this.logger(
          `Attempting request with ${providerName} (attempt ${i + 1}/${providersToTry.length})`,
          'info'
        );

        const response = await provider.complete(request);
        const actualLatency = Date.now() - startTime;

        // Record successful execution
        const feedback: RoutingFeedback = {
          decisionId: decision.metadata?.timestamp?.toISOString() || 'unknown',
          success: true,
          actualLatency,
          actualCost: response.metadata?.cost,
          actualQuality: response.metadata?.quality,
        };

        // Learn from this execution
        if (this.config.learningEnabled) {
          await this.learnFromFeedback(decision, feedback);
        }

        this.logger(
          `Request completed successfully with ${providerName} in ${actualLatency}ms`,
          'info'
        );

        return { decision, response, feedback };
      } catch (error: any) {
        lastError = error;
        this.logger(
          `Provider ${providerName} failed: ${error.message}`,
          i < providersToTry.length - 1 ? 'warn' : 'error'
        );

        // Record failure for learning
        if (this.config.learningEnabled) {
          await this.learnFromFeedback(decision, {
            decisionId: decision.metadata?.timestamp?.toISOString() || 'unknown',
            success: false,
            comments: error.message,
          });
        }

        // Try next provider in fallback chain
        if (i < providersToTry.length - 1) {
          continue;
        }
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  // ============================================
  // 📊 Task Classification
  // ============================================

  /**
   * Classify task complexity and requirements
   * تصنيف تعقيد المهمة ومتطلباتها
   */
  private async classifyTask(request: UnifiedRequest): Promise<TaskClassification> {
    const prompt = request.messages[request.messages.length - 1]?.content || '';
    const systemPrompt = request.systemPrompt || '';
    const fullText = systemPrompt + ' ' + prompt;

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedInputTokens = Math.ceil(fullText.length / 4);
    const estimatedOutputTokens = request.maxTokens || 2048;

    // Complexity indicators
    const complexityIndicators = {
      trivial: ['hello', 'hi', 'test', 'ping', 'اختبار', 'مرحبا'],
      simple: [
        'explain',
        'what is',
        'define',
        'اشرح',
        'ما هو',
        'عرف',
        'simple',
        'basic',
      ],
      medium: [
        'write code',
        'create',
        'implement',
        'اكتب كود',
        'نفذ',
        'أنشئ',
        'function',
        'class',
      ],
      complex: [
        'architecture',
        'design system',
        'refactor',
        'معمارية',
        'صمم نظام',
        'أعد هيكلة',
        'optimize',
        'review',
      ],
      expert: [
        'microservices',
        'distributed',
        'scalable',
        'موزع',
        'قابل للتوسع',
        'enterprise',
        'security audit',
      ],
    };

    // Determine complexity
    let complexity: TaskClassification['complexity'] = 'medium';
    const lowerText = fullText.toLowerCase();

    for (const [level, keywords] of Object.entries(complexityIndicators)) {
      if (keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))) {
        complexity = level as TaskClassification['complexity'];
        break;
      }
    }

    // Length-based complexity adjustment
    if (estimatedInputTokens > 10000) complexity = 'complex';
    if (estimatedInputTokens > 50000) complexity = 'expert';
    if (estimatedInputTokens < 100) complexity = 'trivial';

    // Category detection
    const categoryKeywords = {
      code_generation: ['write', 'create', 'generate', 'اكتب', 'أنشئ', 'code', 'function'],
      code_review: ['review', 'check', 'analyze', 'راجع', 'افحص', 'حلل'],
      debugging: ['debug', 'fix', 'error', 'bug', 'صحح', 'خطأ', 'مشكلة'],
      architecture: ['design', 'architecture', 'صمم', 'معمارية', 'structure'],
      testing: ['test', 'unit test', 'اختبار', 'testing', 'spec'],
      documentation: ['document', 'explain', 'describe', 'وثق', 'اشرح', 'وصف'],
      optimization: ['optimize', 'improve', 'performance', 'حسن', 'أداء'],
      security: ['security', 'vulnerability', 'أمان', 'ثغرة', 'secure'],
    };

    let category: TaskClassification['category'] = 'general';
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        category = cat as TaskClassification['category'];
        break;
      }
    }

    // Reasoning requirement detection
    const reasoningKeywords = [
      'why',
      'how',
      'explain',
      'design',
      'architecture',
      'لماذا',
      'كيف',
      'اشرح',
      'صمم',
    ];
    const requiresReasoning = reasoningKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );

    // Time constraint
    const timeConstraint: TaskClassification['timeConstraint'] = request.stream
      ? 'realtime'
      : 'normal';

    // Quality requirement based on complexity
    const qualityRequirement: TaskClassification['qualityRequirement'] =
      complexity === 'expert' || complexity === 'complex'
        ? 'high'
        : complexity === 'simple' || complexity === 'trivial'
          ? 'low'
          : 'medium';

    return {
      complexity,
      category,
      estimatedTokens: {
        input: estimatedInputTokens,
        output: estimatedOutputTokens,
        total: estimatedInputTokens + estimatedOutputTokens,
      },
      contextWindow: estimatedInputTokens + estimatedOutputTokens,
      requiresReasoning,
      timeConstraint,
      qualityRequirement,
      confidenceScore: 0.85, // Base confidence
    };
  }

  // ============================================
  // 📈 Provider Scoring System
  // ============================================

  /**
   * Score all providers for the given task
   * تسجيل جميع المزودين للمهمة المحددة
   */
  private async scoreProviders(
    classification: TaskClassification,
    request: UnifiedRequest
  ): Promise<ProviderScore[]> {
    const scores: ProviderScore[] = [];

    for (const [name, provider] of this.providers) {
      const capabilities = this.capabilities.get(name);
      if (!capabilities) {
        this.logger(`No capabilities defined for ${name}, skipping`, 'warn');
        continue;
      }

      const score = await this.scoreProvider(
        name,
        capabilities,
        classification,
        request
      );
      scores.push(score);
    }

    // Sort by total score (descending)
    return scores.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Score individual provider
   * تسجيل مزود فردي
   */
  private async scoreProvider(
    providerName: string,
    capabilities: ProviderCapabilities,
    classification: TaskClassification,
    request: UnifiedRequest
  ): Promise<ProviderScore> {
    const reasoning: string[] = [];

    // 1. Cost Score (0-100, lower cost = higher score)
    const estimatedCost =
      (classification.estimatedTokens.input / 1_000_000) * capabilities.costPerMToken.input +
      (classification.estimatedTokens.output / 1_000_000) * capabilities.costPerMToken.output;

    const maxCost = 0.1; // $0.10 as reference
    const costScore = Math.max(0, 100 * (1 - estimatedCost / maxCost));
    reasoning.push(`Cost: $${estimatedCost.toFixed(4)} (score: ${costScore.toFixed(1)})`);

    // 2. Quality Score (0-100, based on specializations and historical performance)
    let qualityScore = 50; // Base score

    // Check specializations match
    const specializationMatch = capabilities.specializations.some((spec) => {
      if (classification.category.includes('code') && spec === 'code') return true;
      if (classification.requiresReasoning && spec === 'reasoning') return true;
      if (classification.category === 'documentation' && spec === 'creative') return true;
      return false;
    });

    if (specializationMatch) {
      qualityScore += 25;
      reasoning.push(`Specialization match: +25 points`);
    }

    // Historical performance
    const history = this.performanceHistory.get(providerName);
    if (history) {
      const taskHistory = history.taskCategories.get(classification.category);
      if (taskHistory) {
        qualityScore += taskHistory.averageQuality * 25;
        reasoning.push(
          `Historical quality: ${(taskHistory.averageQuality * 100).toFixed(1)}% (+${(taskHistory.averageQuality * 25).toFixed(1)})`
        );
      }
    }

    // 3. Speed Score (0-100, lower latency = higher score)
    const estimatedLatency = capabilities.averageLatency;
    const maxLatency = 30000; // 30 seconds as reference
    const speedScore = Math.max(0, 100 * (1 - estimatedLatency / maxLatency));
    reasoning.push(`Latency: ${estimatedLatency}ms (score: ${speedScore.toFixed(1)})`);

    // 4. Reliability Score (0-100, based on success rate)
    let reliabilityScore = 100;
    if (history) {
      reliabilityScore = history.successRate * 100;
      reasoning.push(`Success rate: ${(history.successRate * 100).toFixed(1)}%`);
    } else {
      reliabilityScore = 80; // Default for new providers
      reasoning.push(`New provider: default reliability 80%`);
    }

    // 5. Capability Score (0-100, can it handle this task?)
    let capabilityScore = 100;

    // Context window check
    if (classification.contextWindow > capabilities.maxContextWindow) {
      capabilityScore = 0;
      reasoning.push(
        `Context window exceeded: ${classification.contextWindow} > ${capabilities.maxContextWindow}`
      );
    }

    // Streaming requirement
    if (request.stream && !capabilities.supportsStreaming) {
      capabilityScore -= 30;
      reasoning.push(`Streaming not supported: -30 points`);
    }

    // Tool calling requirement
    if (request.tools && request.tools.length > 0 && !capabilities.supportsToolCalling) {
      capabilityScore -= 40;
      reasoning.push(`Tool calling not supported: -40 points`);
    }

    // 6. Historical Performance Score (0-100)
    let historicalScore = 50; // Default
    if (history && history.totalRequests > 10) {
      const taskHistory = history.taskCategories.get(classification.category);
      if (taskHistory && taskHistory.count > 5) {
        historicalScore = taskHistory.preferenceScore * 100;
        reasoning.push(
          `Task-specific history: ${taskHistory.count} requests (score: ${historicalScore.toFixed(1)})`
        );
      }
    }

    // 7. Context Fit Score (0-100, how well does it fit current context?)
    let contextFit = 70; // Base

    // Check if provider is overloaded
    const currentLoad = this.context.loadBalance.get(providerName) || 0;
    if (currentLoad > 10) {
      contextFit -= 20;
      reasoning.push(`High load: ${currentLoad} requests (-20 points)`);
    }

    // Check user preferences
    if (this.context.userPreferences?.preferredProviders?.includes(providerName)) {
      contextFit += 20;
      reasoning.push(`User preference: +20 points`);
    }

    if (this.context.userPreferences?.avoidProviders?.includes(providerName)) {
      contextFit = 0;
      reasoning.push(`User blacklist: 0 points`);
    }

    // Calculate weighted total score
    const breakdown = {
      costScore,
      qualityScore,
      speedScore,
      reliabilityScore,
      capabilityScore,
      historicalPerformance: historicalScore,
      contextFit,
    };

    const weights = this.getStrategyWeights(classification);
    const totalScore =
      costScore * weights.cost +
      qualityScore * weights.quality +
      speedScore * weights.speed +
      reliabilityScore * weights.reliability +
      capabilityScore * 0.1 + // Capability is critical
      historicalScore * 0.1 + // Historical performance
      contextFit * 0.1; // Context fit

    // Confidence calculation
    const confidence = Math.min(
      1,
      (reliabilityScore / 100) * (capabilityScore / 100) * (history ? 1 : 0.8)
    );

    return {
      provider: providerName,
      totalScore,
      breakdown,
      estimatedCost,
      estimatedLatency,
      confidence,
      reasoning,
    };
  }

  /**
   * Get strategy-specific weights
   * الحصول على الأوزان حسب الاستراتيجية
   */
  private getStrategyWeights(
    classification: TaskClassification
  ): Required<RoutingConfig>['weights'] {
    const baseWeights = this.config.weights!;

    switch (this.config.strategy) {
      case 'cost_optimized':
        return { cost: 0.6, quality: 0.2, speed: 0.1, reliability: 0.1 };

      case 'quality_first':
        return { cost: 0.1, quality: 0.6, speed: 0.15, reliability: 0.15 };

      case 'speed_first':
        return { cost: 0.1, quality: 0.2, speed: 0.5, reliability: 0.2 };

      case 'balanced':
        return { cost: 0.25, quality: 0.35, speed: 0.2, reliability: 0.2 };

      case 'adaptive':
        // Adaptive strategy adjusts based on task
        if (classification.complexity === 'expert' || classification.complexity === 'complex') {
          return { cost: 0.15, quality: 0.5, speed: 0.15, reliability: 0.2 };
        } else if (classification.timeConstraint === 'realtime') {
          return { cost: 0.2, quality: 0.25, speed: 0.4, reliability: 0.15 };
        } else {
          return { cost: 0.4, quality: 0.3, speed: 0.15, reliability: 0.15 };
        }

      case 'custom':
        return baseWeights;

      default:
        return baseWeights;
    }
  }

  // ============================================
  // 🎲 Provider Selection (with Exploration)
  // ============================================

  /**
   * Select provider using epsilon-greedy strategy
   * اختيار المزود باستخدام استراتيجية epsilon-greedy
   */
  private selectProvider(
    scores: ProviderScore[],
    classification: TaskClassification
  ): ProviderScore {
    if (scores.length === 0) {
      throw new Error('No providers available for selection');
    }

    // Exploration vs Exploitation
    // Occasionally try non-optimal providers to discover better options
    const shouldExplore =
      this.config.learningEnabled &&
      Math.random() < this.explorationRate &&
      scores.length > 1;

    if (shouldExplore) {
      // Select random provider (weighted by score to avoid terrible choices)
      const totalScore = scores.reduce((sum, s) => sum + s.totalScore, 0);
      let random = Math.random() * totalScore;

      for (const score of scores) {
        random -= score.totalScore;
        if (random <= 0) {
          this.logger(
            `🎲 Exploration: selected ${score.provider} (score: ${score.totalScore.toFixed(2)})`,
            'debug'
          );
          return score;
        }
      }
    }

    // Exploitation: select best provider
    return scores[0];
  }

  // ============================================
  // 🔄 Fallback Management
  // ============================================

  /**
   * Prepare fallback chain
   * إعداد سلسلة الاحتياط
   */
  private prepareFallbackChain(
    scores: ProviderScore[],
    selectedProvider: string
  ): string[] {
    if (!this.config.fallbackEnabled) {
      return [];
    }

    // Return top 3 providers (excluding selected) as fallback
    return scores
      .filter((s) => s.provider !== selectedProvider && s.capabilityScore > 0)
      .slice(0, 3)
      .map((s) => s.provider);
  }

  // ============================================
  // 🧠 Learning & Adaptation
  // ============================================

  /**
   * Learn from routing feedback
   * التعلم من ملاحظات التوجيه
   */
  private async learnFromFeedback(
    decision: RoutingDecision,
    feedback: RoutingFeedback
  ): Promise<void> {
    if (!this.config.learningEnabled) return;

    const providerName = decision.provider;
    let history = this.performanceHistory.get(providerName);

    // Initialize history if doesn't exist
    if (!history) {
      history = {
        provider: providerName,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        averageQuality: 0,
        totalCost: 0,
        lastUsed: new Date(),
        successRate: 1,
        taskCategories: new Map(),
      };
      this.performanceHistory.set(providerName, history);
    }

    // Update general metrics
    history.totalRequests++;
    history.lastUsed = new Date();

    if (feedback.success) {
      history.successfulRequests++;

      // Update latency (exponential moving average)
      if (feedback.actualLatency) {
        history.averageLatency =
          this.decayFactor * history.averageLatency +
          (1 - this.decayFactor) * feedback.actualLatency;
      }

      // Update quality
      if (feedback.actualQuality) {
        history.averageQuality =
          this.decayFactor * history.averageQuality +
          (1 - this.decayFactor) * feedback.actualQuality;
      }

      // Update cost
      if (feedback.actualCost) {
        history.totalCost += feedback.actualCost;
      }
    } else {
      history.failedRequests++;
    }

    // Update success rate
    history.successRate = history.successfulRequests / history.totalRequests;

    // Update task-specific performance
    const classification = decision.metadata?.classification;
    if (classification) {
      const category = classification.category;
      let taskPerf = history.taskCategories.get(category);

      if (!taskPerf) {
        taskPerf = {
          category,
          count: 0,
          successRate: 1,
          averageQuality: 0.5,
          averageLatency: 0,
          averageCost: 0,
          preferenceScore: 0.5,
        };
        history.taskCategories.set(category, taskPerf);
      }

      taskPerf.count++;

      if (feedback.success) {
        // Update task-specific metrics
        if (feedback.actualLatency) {
          taskPerf.averageLatency =
            this.decayFactor * taskPerf.averageLatency +
            (1 - this.decayFactor) * feedback.actualLatency;
        }

        if (feedback.actualQuality) {
          taskPerf.averageQuality =
            this.decayFactor * taskPerf.averageQuality +
            (1 - this.decayFactor) * feedback.actualQuality;
        }

        if (feedback.actualCost) {
          taskPerf.averageCost =
            this.decayFactor * taskPerf.averageCost +
            (1 - this.decayFactor) * feedback.actualCost;
        }

        // Update preference score (reward successful executions)
        taskPerf.preferenceScore = Math.min(
          1,
          taskPerf.preferenceScore + this.learningRate * 0.1
        );
      } else {
        // Penalize failed executions
        taskPerf.preferenceScore = Math.max(
          0,
          taskPerf.preferenceScore - this.learningRate * 0.2
        );
      }

      // Update success rate
      taskPerf.successRate =
        history.taskCategories
          .get(category)!
          .preferenceScore;
    }

    this.logger(
      `📊 Learned from ${providerName}: success=${feedback.success}, quality=${feedback.actualQuality?.toFixed(2) || 'N/A'}`,
      'debug'
    );
  }

  // ============================================
  // 🔧 Custom Rules & Cache
  // ============================================

  /**
   * Apply custom routing rules
   * تطبيق قواعد التوجيه المخصصة
   */
  private applyCustomRules(classification: TaskClassification): RoutingRule[] {
    if (!this.config.customRules || this.config.customRules.length === 0) {
      return [];
    }

    const appliedRules: RoutingRule[] = [];

    // Sort rules by priority
    const sortedRules = [...this.config.customRules].sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of sortedRules) {
      try {
        if (rule.condition(classification, this.context)) {
          appliedRules.push(rule);

          // Apply rule actions
          if (rule.action.overrideStrategy) {
            this.config.strategy = rule.action.overrideStrategy;
          }

          if (rule.action.adjustWeights) {
            this.config.weights = {
              ...this.config.weights!,
              ...rule.action.adjustWeights,
            };
          }

          this.logger(`Applied custom rule: ${rule.name}`, 'debug');
        }
      } catch (error: any) {
        this.logger(`Failed to apply rule ${rule.name}: ${error.message}`, 'warn');
      }
    }

    return appliedRules;
  }

  /**
   * Check cache for similar decisions
   * التحقق من الكاش لقرارات مشابهة
   */
  private checkCache(
    request: UnifiedRequest,
    classification: TaskClassification
  ): CachedDecision | null {
    const cacheKey = this.generateCacheKey(request, classification);
    const cached = this.decisionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached;
    }

    return null;
  }

  /**
   * Cache routing decision
   * حفظ قرار التوجيه في الكاش
   */
  private cacheDecision(
    request: UnifiedRequest,
    classification: TaskClassification,
    decision: RoutingDecision
  ): void {
    const cacheKey = this.generateCacheKey(request, classification);
    this.decisionCache.set(cacheKey, {
      decision,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000, // 5 minutes
    });

    // Limit cache size
    if (this.decisionCache.size > 1000) {
      const oldestKey = this.decisionCache.keys().next().value;
      this.decisionCache.delete(oldestKey);
    }
  }

  /**
   * Generate cache key
   * توليد مفتاح الكاش
   */
  private generateCacheKey(
    request: UnifiedRequest,
    classification: TaskClassification
  ): string {
    const prompt = request.messages[request.messages.length - 1]?.content || '';
    return `${classification.category}-${classification.complexity}-${prompt.substring(0, 50)}`;
  }

  // ============================================
  // 🔧 Provider Management
  // ============================================

  /**
   * Register a provider
   * تسجيل مزود
   */
  registerProvider(
    name: string,
    provider: IAIProvider,
    capabilities: ProviderCapabilities
  ): void {
    this.providers.set(name, provider);
    this.capabilities.set(name, capabilities);
    this.logger(`Registered provider: ${name}`, 'info');
  }

  /**
   * Unregister a provider
   * إلغاء تسجيل مزود
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name);
    this.capabilities.delete(name);
    this.logger(`Unregistered provider: ${name}`, 'info');
  }

  /**
   * Update provider capabilities
   * تحديث قدرات المزود
   */
  updateCapabilities(name: string, capabilities: Partial<ProviderCapabilities>): void {
    const existing = this.capabilities.get(name);
    if (existing) {
      this.capabilities.set(name, { ...existing, ...capabilities });
      this.logger(`Updated capabilities for ${name}`, 'info');
    }
  }

  // ============================================
  // 📊 Analytics & Monitoring
  // ============================================

  /**
   * Get performance analytics
   * الحصول على تحليلات الأداء
   */
  getAnalytics(): {
    providers: Array<{
      name: string;
      metrics: PerformanceHistory;
      score: number;
    }>;
    totalRequests: number;
    overallSuccessRate: number;
    totalCost: number;
    averageLatency: number;
  } {
    const providers = Array.from(this.performanceHistory.entries()).map(
      ([name, metrics]) => ({
        name,
        metrics,
        score: metrics.successRate * 100,
      })
    );

    const totalRequests = providers.reduce((sum, p) => sum + p.metrics.totalRequests, 0);
    const totalSuccess = providers.reduce(
      (sum, p) => sum + p.metrics.successfulRequests,
      0
    );
    const totalCost = providers.reduce((sum, p) => sum + p.metrics.totalCost, 0);
    const avgLatency =
      providers.reduce((sum, p) => sum + p.metrics.averageLatency, 0) / providers.length;

    return {
      providers: providers.sort((a, b) => b.score - a.score),
      totalRequests,
      overallSuccessRate: totalRequests > 0 ? totalSuccess / totalRequests : 0,
      totalCost,
      averageLatency: avgLatency,
    };
  }

  /**
   * Get provider recommendations
   * الحصول على توصيات المزودين
   */
  getRecommendations(): {
    mostReliable: string;
    mostCostEffective: string;
    fastest: string;
    bestOverall: string;
  } {
    const analytics = this.getAnalytics();

    const mostReliable = analytics.providers.reduce((best, current) =>
      current.metrics.successRate > best.metrics.successRate ? current : best
    );

    const mostCostEffective = analytics.providers.reduce((best, current) => {
      const currentCostPerRequest =
        current.metrics.totalCost / current.metrics.totalRequests;
      const bestCostPerRequest = best.metrics.totalCost / best.metrics.totalRequests;
      return currentCostPerRequest < bestCostPerRequest ? current : best;
    });

    const fastest = analytics.providers.reduce((best, current) =>
      current.metrics.averageLatency < best.metrics.averageLatency ? current : best
    );

    // Best overall: weighted combination
    const bestOverall = analytics.providers.reduce((best, current) => {
      const currentScore =
        current.metrics.successRate * 0.4 +
        (1 - current.metrics.averageLatency / 30000) * 0.3 +
        (1 - (current.metrics.totalCost / current.metrics.totalRequests) / 0.1) * 0.3;

      const bestScore =
        best.metrics.successRate * 0.4 +
        (1 - best.metrics.averageLatency / 30000) * 0.3 +
        (1 - (best.metrics.totalCost / best.metrics.totalRequests) / 0.1) * 0.3;

      return currentScore > bestScore ? current : best;
    });

    return {
      mostReliable: mostReliable.name,
      mostCostEffective: mostCostEffective.name,
      fastest: fastest.name,
      bestOverall: bestOverall.name,
    };
  }

  /**
   * Reset learning data
   * إعادة تعيين بيانات التعلم
   */
  resetLearning(): void {
    this.performanceHistory.clear();
    this.decisionCache.clear();
    this.logger('Learning data reset', 'info');
  }

  /**
   * Export learning data
   * تصدير بيانات التعلم
   */
  exportLearningData(): string {
    const data = {
      performance: Array.from(this.performanceHistory.entries()).map(([name, history]) => ({
        provider: name,
        ...history,
        taskCategories: Array.from(history.taskCategories.entries()),
      })),
      config: this.config,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import learning data
   * استيراد بيانات التعلم
   */
  importLearningData(data: string): void {
    try {
      const parsed = JSON.parse(data);

      if (parsed.performance) {
        this.performanceHistory.clear();
        for (const item of parsed.performance) {
          const history: PerformanceHistory = {
            ...item,
            lastUsed: new Date(item.lastUsed),
            taskCategories: new Map(item.taskCategories),
          };
          this.performanceHistory.set(item.provider, history);
        }
      }

      this.logger('Learning data imported successfully', 'info');
    } catch (error: any) {
      this.logger(`Failed to import learning data: ${error.message}`, 'error');
    }
  }
}

// ============================================
// 🔧 Helper Types
// ============================================

interface CachedDecision {
  decision: RoutingDecision;
  timestamp: number;
  ttl: number;
}

// ============================================
// 📤 Exports
// ============================================

export default IntelligentRouter;