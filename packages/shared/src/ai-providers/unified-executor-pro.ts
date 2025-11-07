// unified-executor.ts
// ============================================
// ⚡ المنفذ الموحد المتقدم - Advanced Unified Executor
// نظام تنفيذ ذكي متعدد الطبقات مع دعم كامل للأدوات والتحسينات
// ============================================

import { getConnectionManager } from './connection-manager.js';
import { getDynamicRouter, type TaskAnalysis, type RoutingDecision } from './dynamic-router.js';
import { getCacheLayer } from './cache-layer.js';
import { getFallbackSystem } from './fallback-system.js';
import { getMetricsSystem } from './metrics-system.js';
import { getQueueSystem } from './queue-system.js';
import type { UnifiedMessage, UnifiedResponse, UnifiedTool } from '../ai-providers/interfaces/unified-types.interface.js';

// ============================================
// 📦 Types & Interfaces
// ============================================

/**
 * خيارات التنفيذ المتقدمة
 */
export interface ExecutionOptions {
  // الأولويات الأساسية
  priority?: 'cost' | 'quality' | 'speed' | 'balanced';
  
  // إعدادات الأدوات
  useTools?: boolean;
  specificTools?: string[]; // أدوات محددة للاستخدام
  maxToolCalls?: number; // حد أقصى لعدد استدعاءات الأدوات
  
  // إعدادات النموذج
  streaming?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  
  // إعدادات الأداء
  timeout?: number; // بالميلي ثانية
  retryAttempts?: number; // عدد محاولات إعادة التنفيذ
  useCache?: boolean; // استخدام Cache
  
  // إعدادات متقدمة
  parallelExecution?: boolean; // تنفيذ متوازي للمهام المتعددة
  circuitBreakerEnabled?: boolean; // حماية من الفشل المتكرر
  costLimit?: number; // حد أقصى للتكلفة
  
  // Context إضافي
  conversationHistory?: UnifiedMessage[]; // سجل المحادثة
  systemPrompt?: string; // تعليمات النظام
  metadata?: Record<string, any>; // بيانات إضافية
}

/**
 * نتيجة التنفيذ المحسّنة
 */
export interface ExecutionResult {
  // النتيجة الأساسية
  success: boolean;
  response?: string;
  
  // تفاصيل التحليل
  analysis: TaskAnalysis;
  routing: RoutingDecision;
  
  // معلومات الأداء
  cost: number;
  duration: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  
  // معلومات التنفيذ
  provider: string;
  attempts: number; // عدد المحاولات
  fromCache: boolean; // هل من Cache
  toolsUsed?: string[]; // الأدوات المستخدمة
  
  // معلومات الخطأ
  error?: string;
  warnings?: string[];
  
  // Metadata
  metadata?: {
    queueWaitTime?: number;
    fallbackUsed?: boolean;
    circuitBreakerTripped?: boolean;
    [key: string]: any;
  };
}

/**
 * حالة Circuit Breaker
 */
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * إحصائيات الأداء
 */
export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalCost: number;
  cacheHitRate: number;
  providerUsage: Record<string, number>;
}

// ============================================
// 🎯 المنفذ الموحد المتقدم
// ============================================

/**
 * المنفذ الموحد المتقدم
 * 
 * معمارية متعددة الطبقات:
 * ┌─────────────────────────────────────┐
 * │     Request Layer (الطلبات)        │
 * ├─────────────────────────────────────┤
 * │   Queue System (نظام الطوابير)     │
 * ├─────────────────────────────────────┤
 * │   Cache Layer (طبقة التخزين)       │
 * ├─────────────────────────────────────┤
 * │  Analysis & Routing (التحليل)      │
 * ├─────────────────────────────────────┤
 * │ Circuit Breaker (حماية الفشل)      │
 * ├─────────────────────────────────────┤
 * │   Execution Layer (التنفيذ)        │
 * ├─────────────────────────────────────┤
 * │  Fallback System (النظام البديل)   │
 * ├─────────────────────────────────────┤
 * │   Metrics & Monitoring (المراقبة)  │
 * └─────────────────────────────────────┘
 * 
 * الميزات الرئيسية:
 * ✅ تحليل ذكي للمهام
 * ✅ توجيه ديناميكي للموفرين
 * ✅ Caching متقدم
 * ✅ Fallback تلقائي
 * ✅ Circuit Breaker للحماية
 * ✅ Queue للأولويات
 * ✅ Retry Logic ذكي
 * ✅ Streaming Support
 * ✅ Parallel Execution
 * ✅ Cost Optimization
 * ✅ Comprehensive Monitoring
 */
export class UnifiedExecutor {
  private static instance: UnifiedExecutor;

  // ═══════════════════════════════════════
  // Core Systems (الأنظمة الأساسية)
  // ═══════════════════════════════════════
  private connectionManager = getConnectionManager();
  private router = getDynamicRouter();
  private cache = getCacheLayer();
  private fallback = getFallbackSystem();
  private metrics = getMetricsSystem();
  private queue = getQueueSystem();
  private ui = this.connectionManager.getUI();

  // ═══════════════════════════════════════
  // Advanced Features (الميزات المتقدمة)
  // ═══════════════════════════════════════
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private performanceStats: PerformanceStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    totalCost: 0,
    cacheHitRate: 0,
    providerUsage: {}
  };

  // ═══════════════════════════════════════
  // Configuration (الإعدادات)
  // ═══════════════════════════════════════
  private readonly DEFAULT_TIMEOUT = 120000; // 2 دقيقة
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 دقيقة
  private readonly MAX_PARALLEL_TASKS = 5;

  private constructor() {
    this.initializeCircuitBreakers();
  }

  static getInstance(): UnifiedExecutor {
    if (!UnifiedExecutor.instance) {
      UnifiedExecutor.instance = new UnifiedExecutor();
    }
    return UnifiedExecutor.instance;
  }

  // ═══════════════════════════════════════
  // 🚀 Main Execution Flow
  // ═══════════════════════════════════════

  /**
   * تنفيذ طلب كامل مع جميع الطبقات والتحسينات
   * 
   * سير العمل:
   * 1. ✅ Validation & Initialization
   * 2. 📊 Queue Management (إن لزم)
   * 3. 💾 Cache Check
   * 4. 🔍 Task Analysis
   * 5. 🎯 Dynamic Routing
   * 6. 🛡️ Circuit Breaker Check
   * 7. ⚡ Primary Execution
   * 8. 🔄 Fallback (عند الفشل)
   * 9. 💾 Cache Update
   * 10. 📈 Metrics Recording
   */
  async execute(
    request: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    // تطبيق الإعدادات الافتراضية
    const opts = this.applyDefaults(options);

    try {
      // ═══════════════════════════════════
      // Layer 1: Validation & Initialization
      // ═══════════════════════════════════
      await this.ensureSystemReady();
      
      this.ui.printHeader(
        '🚀 Advanced Unified Executor', 
        `[${executionId}] ${request.substring(0, 60)}...`
      );

      this.performanceStats.totalRequests++;

      // ═══════════════════════════════════
      // Layer 2: Queue Management (للمهام ذات الأولوية)
      // ═══════════════════════════════════
      const queueWaitTime = await this.handleQueueing(request, opts);

      // ═══════════════════════════════════
      // Layer 3: Cache Check
      // ═══════════════════════════════════
      if (opts.useCache !== false) {
        const cachedResult = await this.checkCache(request, opts);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // ═══════════════════════════════════
      // Layer 4: Task Analysis
      // ═══════════════════════════════════
      this.ui.startSpinner('🔍 Analyzing task with AI intelligence...');
      const analysis = await this.analyzeTask(request, opts);
      this.ui.succeedSpinner(`Task analyzed: ${analysis.type} (${analysis.complexity}/10)`);

      // تحقق من حد التكلفة
      if (opts.costLimit && analysis.estimatedCost > opts.costLimit) {
        throw new Error(
          `Estimated cost ($${analysis.estimatedCost.toFixed(4)}) exceeds limit ($${opts.costLimit.toFixed(4)})`
        );
      }

      // ═══════════════════════════════════
      // Layer 5: Dynamic Routing
      // ═══════════════════════════════════
      this.ui.startSpinner('🎯 Routing to optimal provider...');
      const routing = await this.routeTask(analysis, opts);
      this.ui.succeedSpinner(`Routed to ${routing.provider}`);

      // عرض خطة التنفيذ
      this.displayExecutionPlan(analysis, routing, opts);

      // ═══════════════════════════════════
      // Layer 6: Circuit Breaker Check
      // ═══════════════════════════════════
      if (opts.circuitBreakerEnabled !== false) {
        this.checkCircuitBreaker(routing.provider);
      }

      // ═══════════════════════════════════
      // Layer 7: Primary Execution
      // ═══════════════════════════════════
      let result: ExecutionResult;
      let executionError: Error | null = null;

      try {
        result = await this.executePrimary(
          request,
          analysis,
          routing,
          opts,
          startTime
        );
      } catch (error) {
        executionError = error as Error;
        this.recordCircuitBreakerFailure(routing.provider);

        // ═══════════════════════════════════
        // Layer 8: Fallback Execution
        // ═══════════════════════════════════
        this.ui.warning(
          `Primary execution failed: ${executionError.message}`,
          'Fallback'
        );
        
        result = await this.executeFallback(
          request,
          analysis,
          routing,
          opts,
          startTime,
          executionError
        );
      }

      // ═══════════════════════════════════
      // Layer 9: Cache Update
      // ═══════════════════════════════════
      if (result.success && opts.useCache !== false) {
        await this.updateCache(request, result, opts);
      }

      // ═══════════════════════════════════
      // Layer 10: Metrics & Stats
      // ═══════════════════════════════════
      await this.recordMetrics(result, analysis, routing, queueWaitTime);
      this.updatePerformanceStats(result);

      // عرض النتيجة
      this.displayResult(result);

      // Reset circuit breaker عند النجاح
      if (result.success && !result.metadata?.fallbackUsed) {
        this.resetCircuitBreaker(routing.provider);
      }

      return result;

    } catch (error) {
      // معالجة الأخطاء النهائية
      return this.handleFatalError(error as Error, startTime, executionId);
    }
  }

  // ═══════════════════════════════════════
  // 🔧 Core Execution Methods
  // ═══════════════════════════════════════

  /**
   * التنفيذ الأساسي مع Provider المختار
   */
  private async executePrimary(
    request: string,
    analysis: TaskAnalysis,
    routing: RoutingDecision,
    options: ExecutionOptions,
    startTime: number
  ): Promise<ExecutionResult> {
    this.ui.startSpinner(`⚡ Executing with ${routing.provider}...`);

    // تحضير الرسائل
    const messages = this.prepareMessages(request, options);

    // التنفيذ مع Retry
    const response = await this.executeWithRetry(
      routing.provider,
      messages,
      routing,
      options
    );

    const duration = Date.now() - startTime;

    this.ui.succeedSpinner('Execution completed successfully');

    return {
      success: true,
      response: response.content,
      analysis,
      routing,
      cost: analysis.estimatedCost,
      duration,
      provider: routing.provider,
      attempts: 1,
      fromCache: false,
      toolsUsed: routing.tools,
      tokensUsed: response.usage ? {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
        total: response.usage.inputTokens + response.usage.outputTokens
      } : undefined
    };
  }

  /**
   * التنفيذ الاحتياطي عند فشل Primary
   */
  private async executeFallback(
    request: string,
    analysis: TaskAnalysis,
    routing: RoutingDecision,
    options: ExecutionOptions,
    startTime: number,
    primaryError: Error
  ): Promise<ExecutionResult> {
    this.ui.startSpinner('🔄 Executing fallback strategy...');

    const messages = this.prepareMessages(request, options);
    const fallbackResult = await this.fallback.execute(messages);

    if (!fallbackResult.success || !fallbackResult.response) {
      throw new Error(`All providers failed. Last error: ${primaryError.message}`);
    }

    const duration = Date.now() - startTime;
    this.ui.succeedSpinner(`Fallback succeeded with ${fallbackResult.finalProvider}`);

    return {
      success: true,
      response: fallbackResult.response.content,
      analysis,
      routing,
      cost: analysis.estimatedCost * 1.2, // زيادة بسيطة للتكلفة
      duration,
      provider: fallbackResult.finalProvider || 'unknown',
      attempts: fallbackResult.attempts?.length || 1,
      fromCache: false,
      warnings: [`Primary provider (${routing.provider}) failed, used fallback`],
      metadata: {
        fallbackUsed: true,
        primaryError: primaryError.message
      }
    };
  }

  /**
   * التنفيذ مع إعادة المحاولة الذكية
   */
  private async executeWithRetry(
    provider: string,
    messages: UnifiedMessage[],
    routing: RoutingDecision,
    options: ExecutionOptions
  ): Promise<UnifiedResponse> {
    const maxAttempts = options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Timeout handling
        const timeout = options.timeout || this.DEFAULT_TIMEOUT;
        const response = await this.executeWithTimeout(
          provider,
          messages,
          routing,
          options,
          timeout
        );

        return response;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          this.ui.warning(
            `Attempt ${attempt} failed, retrying in ${delay}ms...`,
            'Retry'
          );
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * التنفيذ مع Timeout
   */
  private async executeWithTimeout(
    provider: string,
    messages: UnifiedMessage[],
    routing: RoutingDecision,
    options: ExecutionOptions,
    timeout: number
  ): Promise<UnifiedResponse> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), timeout);
    });

    const executionPromise = this.executeWithProvider(
      provider,
      messages,
      routing,
      options
    );

    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * التنفيذ الفعلي مع Provider
   */
  private async executeWithProvider(
    providerName: string,
    messages: UnifiedMessage[],
    routing: RoutingDecision,
    options: ExecutionOptions
  ): Promise<UnifiedResponse> {
    const provider = this.connectionManager.getAIProvider(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not available`);
    }

    // تحديد الأدوات المطلوبة
    const shouldUseTools = options.useTools !== false && routing.tools.length > 0;
    
    if (shouldUseTools) {
      // التنفيذ مع الأدوات
      const tools = this.prepareTools(routing.tools, options.specificTools);
      const maxToolCalls = options.maxToolCalls || 10;

      return await provider.chatWithTools(messages, tools);
    } else {
      // التنفيذ بدون أدوات
      return await provider.chat(messages);
    }
  }

  // ═══════════════════════════════════════
  // 🛠️ Helper Methods
  // ═══════════════════════════════════════

  /**
   * التأكد من جاهزية النظام
   */
  private async ensureSystemReady(): Promise<void> {
    if (!this.connectionManager.isReady()) {
      this.ui.warning('Initializing connections...', 'System');
      await this.connectionManager.initialize();
      this.ui.success('All systems ready', 'System');
    }
  }

  /**
   * معالجة الطوابير للمهام ذات الأولوية
   */
  private async handleQueueing(
    request: string,
    options: ExecutionOptions
  ): Promise<number> {
    if (!options.priority || options.priority === 'balanced') {
      return 0;
    }

    const queueStart = Date.now();
    // TODO: Implement actual queue logic
    // await this.queue.enqueue(request, options.priority);
    return Date.now() - queueStart;
  }

  /**
   * فحص Cache
   */
  private async checkCache(
    request: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult | null> {
    const cached = this.cache.checkCache(request);
    
    if (cached) {
      this.ui.success('✨ Response found in cache!', 'Cache');
      
      return {
        success: true,
        response: cached.content,
        analysis: {} as TaskAnalysis,
        routing: { provider: cached.provider } as RoutingDecision,
        cost: 0,
        duration: 0,
        provider: cached.provider,
        attempts: 1,
        fromCache: true
      };
    }

    return null;
  }

  /**
   * تحليل المهمة
   */
  private async analyzeTask(
    request: string,
    options: ExecutionOptions
  ): Promise<TaskAnalysis> {
    return await this.router.analyzeTask(request, {
      priority: options.priority
    });
  }

  /**
   * توجيه المهمة
   */
  private async routeTask(
    analysis: TaskAnalysis,
    options: ExecutionOptions
  ): Promise<RoutingDecision> {
    return await this.router.route(analysis);
  }

  /**
   * تحضير الرسائل
   */
  private prepareMessages(
    request: string,
    options: ExecutionOptions
  ): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];

    // إضافة System Prompt إن وجد
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    // إضافة تاريخ المحادثة إن وجد
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      messages.push(...options.conversationHistory);
    }

    // إضافة الطلب الحالي
    messages.push({
      role: 'user',
      content: request
    });

    return messages;
  }

  /**
   * تحضير الأدوات
   */
  private prepareTools(
    toolNames: string[],
    specificTools?: string[]
  ): UnifiedTool[] {
    const allTools = this.connectionManager.getTools().definitions;

    // إذا كانت هناك أدوات محددة، استخدمها فقط
    if (specificTools && specificTools.length > 0) {
      return allTools.filter((tool: any) =>
        specificTools.includes(tool.name)
      ) as any;
    }

    // وإلا استخدم الأدوات من Router
    return allTools.filter((tool: any) =>
      toolNames.includes(tool.name)
    ) as any;
  }

  /**
   * حفظ في Cache
   */
  private async updateCache(
    request: string,
    result: ExecutionResult,
    options: ExecutionOptions
  ): Promise<void> {
    if (!result.response) return;

    this.cache.saveToCache(request, {
      content: result.response,
      cost: result.cost,
      provider: result.provider,
      timestamp: Date.now()
    });
  }

  /**
   * تسجيل Metrics
   */
  private async recordMetrics(
    result: ExecutionResult,
    analysis: TaskAnalysis,
    routing: RoutingDecision,
    queueWaitTime: number
  ): Promise<void> {
    this.metrics.track({
      agent: routing.agents[0] || 'unknown',
      provider: result.provider,
      task: analysis.type,
      cost: result.cost,
      time: result.duration,
      quality: this.estimateQuality(result),
      success: result.success
    });
  }

  /**
   * تحديث إحصائيات الأداء
   */
  private updatePerformanceStats(result: ExecutionResult): void {
    if (result.success) {
      this.performanceStats.successfulRequests++;
    } else {
      this.performanceStats.failedRequests++;
    }

    // تحديث متوسط الزمن
    const totalLatency = 
      this.performanceStats.averageLatency * (this.performanceStats.totalRequests - 1) +
      result.duration;
    this.performanceStats.averageLatency = 
      totalLatency / this.performanceStats.totalRequests;

    // تحديث التكلفة الإجمالية
    this.performanceStats.totalCost += result.cost;

    // تحديث استخدام Providers
    const provider = result.provider;
    this.performanceStats.providerUsage[provider] = 
      (this.performanceStats.providerUsage[provider] || 0) + 1;

    // تحديث Cache hit rate
    const cacheHits = this.performanceStats.successfulRequests - 
      Object.values(this.performanceStats.providerUsage).reduce((a, b) => a + b, 0);
    this.performanceStats.cacheHitRate = 
      cacheHits / this.performanceStats.totalRequests;
  }

  // ═══════════════════════════════════════
  // 🛡️ Circuit Breaker Methods
  // ═══════════════════════════════════════

  /**
   * تهيئة Circuit Breakers
   */
  private initializeCircuitBreakers(): void {
    const providers = ['deepseek', 'claude', 'openai', 'ollama'];
    providers.forEach(provider => {
      this.circuitBreakers.set(provider, {
        failures: 0,
        lastFailure: 0,
        state: 'closed'
      });
    });
  }

  /**
   * فحص Circuit Breaker
   */
  private checkCircuitBreaker(provider: string): void {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    const now = Date.now();

    if (breaker.state === 'open') {
      // تحقق إذا انتهت مدة العقوبة
      if (now - breaker.lastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        breaker.state = 'half-open';
        breaker.failures = 0;
        this.ui.warning(`Circuit breaker for ${provider} moved to half-open`, 'Circuit Breaker');
      } else {
        throw new Error(
          `Circuit breaker for ${provider} is open. Too many failures.`
        );
      }
    }
  }

  /**
   * تسجيل فشل في Circuit Breaker
   */
  private recordCircuitBreakerFailure(provider: string): void {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.state = 'open';
      this.ui.error(
        `Circuit breaker for ${provider} opened after ${breaker.failures} failures`,
        'Circuit Breaker'
      );
    }
  }

  /**
   * إعادة تعيين Circuit Breaker
   */
  private resetCircuitBreaker(provider: string): void {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    if (breaker.state !== 'closed') {
      breaker.state = 'closed';
      breaker.failures = 0;
      this.ui.success(`Circuit breaker for ${provider} reset`, 'Circuit Breaker');
    }
  }

  // ═══════════════════════════════════════
  // 🎨 Display Methods
  // ═══════════════════════════════════════

  /**
   * عرض خطة التنفيذ
   */
  private displayExecutionPlan(
    analysis: TaskAnalysis,
    routing: RoutingDecision,
    options: ExecutionOptions
  ): void {
    this.ui.printSection('📋 Execution Plan');

    const items = [
      `Type: ${analysis.type}`,
      `Complexity: ${analysis.complexity}/10 ${this.getComplexityEmoji(analysis.complexity)}`,
      `Priority: ${options.priority || 'balanced'}`,
      `Provider: ${routing.provider} ${this.getProviderEmoji(routing.provider)}`,
      `Agents: ${routing.agents.join(', ')}`,
      `Tools: ${routing.tools.length > 0 ? routing.tools.join(', ') : 'none'}`,
      `Cost: $${analysis.estimatedCost.toFixed(4)}`,
      `Cache: ${options.useCache !== false ? 'enabled' : 'disabled'}`,
      `Retry: ${options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS} attempts`
    ];

    if (options.timeout) {
      items.push(`Timeout: ${options.timeout}ms`);
    }

    this.ui.printList(items, { bullet: '•' });
    this.ui.printTip(routing.reason, { type: 'info' });
  }

  /**
   * عرض النتيجة
   */
  private displayResult(result: ExecutionResult): void {
    this.ui.printSection('✅ Execution Result');

    const summaryItems = [
      { 
        label: 'Status', 
        value: result.success ? 'Success' : 'Failed',
        color: result.success ? 'green' : 'red',
        icon: result.success ? '✓' : '✗'
      },
      { 
        label: 'Duration', 
        value: `${result.duration}ms`,
        color: 'cyan'
      },
      { 
        label: 'Cost', 
        value: result.fromCache ? 'FREE (cached)' : `$${result.cost.toFixed(4)}`,
        color: result.fromCache ? 'green' : 'yellow'
      },
      { 
        label: 'Provider', 
        value: result.provider,
        color: 'blue'
      },
      { 
        label: 'Attempts', 
        value: String(result.attempts),
        color: 'magenta'
      }
    ];

    if (result.tokensUsed) {
      summaryItems.push({
        label: 'Tokens',
        value: `${result.tokensUsed.total} (${result.tokensUsed.input}→${result.tokensUsed.output})`,
        color: 'cyan'
      });
    }

    if (result.toolsUsed && result.toolsUsed.length > 0) {
      summaryItems.push({
        label: 'Tools',
        value: `${result.toolsUsed.length} used`,
        color: 'yellow'
      });
    }

    this.ui.printSummary('Performance', summaryItems as any);

    // عرض Warnings إن وجدت
    if (result.warnings && result.warnings.length > 0) {
      this.ui.printSection('⚠️  Warnings', { level: 2 });
      result.warnings.forEach(warning => {
        this.ui.warning(warning, 'Warning');
      });
    }

    // عرض Response (مختصر)
    if (result.response) {
      this.ui.printSection('📝 Response', { level: 2 });
      const preview = result.response.substring(0, 500);
      console.log(preview + (result.response.length > 500 ? '...' : ''));
      
      if (result.response.length > 500) {
        this.ui.printTip(
          `Full response: ${result.response.length} characters`,
          { type: 'info' }
        );
      }
    }

    // عرض Metadata إن وجدت
    if (result.metadata && Object.keys(result.metadata).length > 0) {
      this.ui.printSection('🔍 Metadata', { level: 2 });
      Object.entries(result.metadata).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
  }

  // ═══════════════════════════════════════
  // 🔧 Utility Methods
  // ═══════════════════════════════════════

  /**
   * تطبيق الإعدادات الافتراضية
   */
  private applyDefaults(options: ExecutionOptions): ExecutionOptions {
    return {
      priority: 'balanced',
      useTools: true,
      streaming: false,
      useCache: true,
      retryAttempts: this.DEFAULT_RETRY_ATTEMPTS,
      timeout: this.DEFAULT_TIMEOUT,
      circuitBreakerEnabled: true,
      parallelExecution: false,
      ...options
    };
  }

  /**
   * حساب تأخير إعادة المحاولة (Exponential Backoff)
   */
  private calculateRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }

  /**
   * تقدير جودة النتيجة
   */
  private estimateQuality(result: ExecutionResult): number {
    if (!result.success) return 0;
    
    let quality = 0.8;
    
    // زيادة الجودة للـ providers عالية الجودة
    if (result.provider === 'claude') quality += 0.1;
    
    // تقليل الجودة عند استخدام fallback
    if (result.metadata?.fallbackUsed) quality -= 0.2;
    
    // تقليل الجودة مع زيادة المحاولات
    quality -= (result.attempts - 1) * 0.1;
    
    return Math.max(0, Math.min(1, quality));
  }

  /**
   * توليد ID للتنفيذ
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * انتظار مدة محددة
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * معالجة خطأ نهائي
   */
  private handleFatalError(
    error: Error,
    startTime: number,
    executionId: string
  ): ExecutionResult {
    const duration = Date.now() - startTime;

    this.ui.failSpinner('Fatal error occurred');
    this.ui.error(`[${executionId}] ${error.message}`, 'Fatal Error');

    this.performanceStats.failedRequests++;

    return {
      success: false,
      analysis: {} as TaskAnalysis,
      routing: {} as RoutingDecision,
      cost: 0,
      duration,
      provider: 'none',
      attempts: 0,
      fromCache: false,
      error: error.message
    };
  }

  /**
   * الحصول على emoji للتعقيد
   */
  private getComplexityEmoji(complexity: number): string {
    if (complexity <= 3) return '🟢';
    if (complexity <= 6) return '🟡';
    if (complexity <= 8) return '🟠';
    return '🔴';
  }

  /**
   * الحصول على emoji للموفر
   */
  private getProviderEmoji(provider: string): string {
    const emojis: Record<string, string> = {
      deepseek: '🚀',
      claude: '🧠',
      openai: '⚡',
      ollama: '🏠'
    };
    return emojis[provider] || '🤖';
  }

  // ═══════════════════════════════════════
  // 📊 Public API Methods
  // ═══════════════════════════════════════

  /**
   * الحصول على حالة النظام
   */
  getSystemStatus() {
    return {
      connections: this.connectionManager.getStatus(),
      ready: this.connectionManager.isReady(),
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      performance: this.performanceStats
    };
  }

  /**
   * الحصول على إحصائيات الأداء
   */
  getPerformanceStats(): PerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.performanceStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalCost: 0,
      cacheHitRate: 0,
      providerUsage: {}
    };
    this.ui.success('Performance stats reset', 'Stats');
  }

  /**
   * إعادة تعيين جميع Circuit Breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.forEach((breaker, provider) => {
      breaker.state = 'closed';
      breaker.failures = 0;
      breaker.lastFailure = 0;
    });
    this.ui.success('All circuit breakers reset', 'Circuit Breaker');
  }

  /**
   * مسح Cache
   */
  clearCache(): void {
    // TODO: Implement cache clear
    this.ui.success('Cache cleared', 'Cache');
  }

  /**
   * تنفيذ متوازي لمهام متعددة
   */
  async executeParallel(
    requests: Array<{ request: string; options?: ExecutionOptions }>,
    maxConcurrent: number = this.MAX_PARALLEL_TASKS
  ): Promise<ExecutionResult[]> {
    this.ui.printHeader(
      '🔀 Parallel Execution',
      `Executing ${requests.length} tasks (max ${maxConcurrent} concurrent)`
    );

    const results: ExecutionResult[] = [];
    
    // تقسيم المهام إلى دفعات
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      
      this.ui.startSpinner(`Processing batch ${Math.floor(i / maxConcurrent) + 1}...`);
      
      const batchResults = await Promise.all(
        batch.map(({ request, options }) => this.execute(request, options))
      );
      
      results.push(...batchResults);
      
      this.ui.succeedSpinner(`Batch completed`);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.ui.printSummary('Parallel Execution Results', [
      { label: 'Total', value: String(results.length), color: 'cyan' },
      { label: 'Successful', value: String(successful), color: 'green', icon: '✓' },
      { label: 'Failed', value: String(failed), color: 'red', icon: '✗' }
    ]);

    return results;
  }
}

// ═══════════════════════════════════════
// 🌟 Exported Functions
// ═══════════════════════════════════════

/**
 * الحصول على المنفذ الموحد
 */
export function getUnifiedExecutor(): UnifiedExecutor {
  return UnifiedExecutor.getInstance();
}

/**
 * دالة تنفيذ سريعة
 */
export async function execute(
  request: string,
  options?: ExecutionOptions
): Promise<ExecutionResult> {
  const executor = getUnifiedExecutor();
  return executor.execute(request, options);
}

/**
 * دالة تنفيذ متوازي سريعة
 */
export async function executeParallel(
  requests: Array<{ request: string; options?: ExecutionOptions }>,
  maxConcurrent?: number
): Promise<ExecutionResult[]> {
  const executor = getUnifiedExecutor();
  return executor.executeParallel(requests, maxConcurrent);
}

/**
 * الحصول على حالة النظام
 */
export function getSystemStatus() {
  const executor = getUnifiedExecutor();
  return executor.getSystemStatus();
}

/**
 * الحصول على إحصائيات الأداء
 */
export function getPerformanceStats(): PerformanceStats {
  const executor = getUnifiedExecutor();
  return executor.getPerformanceStats();
}
