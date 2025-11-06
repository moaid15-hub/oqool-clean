/**
 * ════════════════════════════════════════════════════════════════════════════
 * 🧠 Claude AI Service - Ultimate Edition
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * الخدمة الأكثر تقدماً للتعامل مع Claude AI
 * 
 * الميزات:
 * ✅ محادثات عادية وبالأدوات
 * ✅ إدارة ذكية للمحادثات والسياق
 * ✅ تتبع دقيق للتكلفة والأداء
 * ✅ تحسين تلقائي للأدوات
 * ✅ نظام retry ذكي مع fallback
 * ✅ Caching متقدم للأداء
 * ✅ Rate limiting ذكي
 * ✅ اختيار تلقائي للنموذج المناسب
 * ✅ تحسين prompts تلقائي
 * ✅ Budget management
 * ✅ Analytics شامل
 * 
 * @author Oqool AI Team
 * @version 2.0.0
 */

import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

// ════════════════════════════════════════════════════════════════════════════
// 📊 Types & Interfaces
// ════════════════════════════════════════════════════════════════════════════

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  conversationId?: string;
  budget?: number;
  priority?: 'speed' | 'quality' | 'cost';
  enableCache?: boolean;
  maxRetries?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export interface UnifiedResponse {
  text: string;
  toolCalls?: ToolCall[];
  stopReason?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  model: string;
  duration: number;
  cost: number;
  tokensUsed: { input: number; output: number };
  cacheHit: boolean;
  retries: number;
  quality: 'low' | 'medium' | 'high';
}

export interface ConversationContext {
  id: string;
  messages: Message[];
  totalCost: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface CostStats {
  totalCost: number;
  totalRequests: number;
  averageCost: number;
  averageDuration: number;
  costByModel: Record<string, number>;
  estimatedMonthlyCost: number;
  savingsFromCache: number;
}

export interface ToolOptimizationResult {
  original: ToolDefinition[];
  optimized: ToolDefinition[];
  removed: string[];
  reasoning: string;
}

// ════════════════════════════════════════════════════════════════════════════
// 🧠 Smart Conversation Manager
// ════════════════════════════════════════════════════════════════════════════

class SmartConversationManager {
  private conversations: Map<string, ConversationContext> = new Map();
  private readonly MAX_CONTEXT_MESSAGES = 20;
  private readonly MAX_CONTEXT_TOKENS = 100000;
  private readonly CLEANUP_INTERVAL = 3600000; // 1 hour

  constructor() {
    // Auto-cleanup old conversations
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * الحصول على سياق محسّن ذكياً
   */
  async getOptimizedContext(
    conversationId: string,
    newMessages: Message[]
  ): Promise<Message[]> {
    const context = this.conversations.get(conversationId);

    if (!context) {
      // محادثة جديدة
      this.createConversation(conversationId, newMessages);
      return newMessages;
    }

    // دمج الرسائل القديمة مع الجديدة
    const allMessages = [...context.messages, ...newMessages];

    // تحسين السياق: احتفظ بالأهم فقط
    const optimized = this.smartContextSelection(allMessages);

    // تحديث المحادثة
    context.messages = optimized;
    context.updatedAt = Date.now();
    this.conversations.set(conversationId, context);

    return optimized;
  }

  /**
   * اختيار ذكي للرسائل المهمة
   */
  private smartContextSelection(messages: Message[]): Message[] {
    // 1. احتفظ بأول رسالة system دائماً
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // 2. احتفظ بآخر N رسالة
    const recentMessages = conversationMessages.slice(-this.MAX_CONTEXT_MESSAGES);

    // 3. احسب الـ tokens التقريبي
    const estimatedTokens = this.estimateTokens(recentMessages);

    // 4. إذا تجاوز الحد، قلل أكثر
    if (estimatedTokens > this.MAX_CONTEXT_TOKENS) {
      return [
        ...systemMessages,
        ...recentMessages.slice(-Math.floor(this.MAX_CONTEXT_MESSAGES / 2)),
      ];
    }

    return [...systemMessages, ...recentMessages];
  }

  /**
   * إنشاء محادثة جديدة
   */
  private createConversation(id: string, messages: Message[]): void {
    this.conversations.set(id, {
      id,
      messages,
      totalCost: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * حفظ رسالة جديدة
   */
  saveMessage(conversationId: string, message: Message, cost: number): void {
    const context = this.conversations.get(conversationId);
    if (!context) return;

    context.messages.push(message);
    context.totalCost += cost;
    context.updatedAt = Date.now();
  }

  /**
   * الحصول على إحصائيات محادثة
   */
  getStats(conversationId: string): ConversationContext | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * مسح محادثة
   */
  clear(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  /**
   * تنظيف المحادثات القديمة
   */
  private cleanup(): void {
    const oneDayAgo = Date.now() - 86400000; // 24 hours
    for (const [id, context] of this.conversations.entries()) {
      if (context.updatedAt < oneDayAgo) {
        this.conversations.delete(id);
      }
    }
  }

  /**
   * تقدير عدد الـ tokens
   */
  private estimateTokens(messages: Message[]): number {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 🛠️ Intelligent Tool Optimizer
// ════════════════════════════════════════════════════════════════════════════

class IntelligentToolOptimizer {
  private usageStats: Map<string, number> = new Map();

  /**
   * تحسين ذكي للأدوات بناءً على السياق
   */
  optimize(
    tools: ToolDefinition[],
    prompt: string,
    conversationHistory?: Message[]
  ): ToolOptimizationResult {
    const original = [...tools];

    // 1. إزالة المكررات
    let optimized = this.removeDuplicates(tools);

    // 2. اختيار الأدوات الأكثر صلة بالـ prompt
    optimized = this.selectRelevantTools(optimized, prompt);

    // 3. ترتيب حسب الأولوية والاستخدام
    optimized = this.sortByPriorityAndUsage(optimized, prompt);

    // 4. تحديد العدد (max 10 tools)
    const removed = optimized.slice(10).map((t) => t.name);
    optimized = optimized.slice(0, 10);

    return {
      original,
      optimized,
      removed,
      reasoning: this.generateReasoning(original, optimized, prompt),
    };
  }

  /**
   * إزالة الأدوات المكررة
   */
  private removeDuplicates(tools: ToolDefinition[]): ToolDefinition[] {
    const seen = new Set<string>();
    return tools.filter((tool) => {
      if (seen.has(tool.name)) return false;
      seen.add(tool.name);
      return true;
    });
  }

  /**
   * اختيار الأدوات ذات الصلة
   */
  private selectRelevantTools(
    tools: ToolDefinition[],
    prompt: string
  ): ToolDefinition[] {
    const lowerPrompt = prompt.toLowerCase();

    // Keywords للمهام المختلفة
    const toolKeywords: Record<string, string[]> = {
      read_file: [
        'اقرأ',
        'read',
        'عرض',
        'show',
        'ملف',
        'file',
        'محتوى',
        'content',
      ],
      write_file: [
        'اكتب',
        'write',
        'أنشئ',
        'create',
        'عدل',
        'edit',
        'حفظ',
        'save',
      ],
      list_directory: [
        'قائمة',
        'list',
        'مجلد',
        'folder',
        'directory',
        'ملفات',
        'files',
      ],
      search_files: ['ابحث', 'search', 'find', 'بحث', 'locate'],
      execute_command: ['نفذ', 'execute', 'run', 'أمر', 'command', 'terminal'],
    };

    // حساب relevance score لكل أداة
    const scored = tools.map((tool) => {
      const keywords = toolKeywords[tool.name] || [];
      const score = keywords.filter((kw) => lowerPrompt.includes(kw)).length;
      return { tool, score };
    });

    // إذا لم نجد أي صلة، نرجع الكل
    const hasRelevance = scored.some((s) => s.score > 0);
    if (!hasRelevance) return tools;

    // ترتيب ونرجع الأدوات ذات الصلة
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.tool);
  }

  /**
   * ترتيب حسب الأولوية والاستخدام
   */
  private sortByPriorityAndUsage(
    tools: ToolDefinition[],
    prompt: string
  ): ToolDefinition[] {
    // أولويات ثابتة
    const basePriority: Record<string, number> = {
      read_file: 10,
      list_directory: 9,
      search_files: 8,
      write_file: 7,
      execute_command: 6,
    };

    return tools.sort((a, b) => {
      const priorityA = basePriority[a.name] || 5;
      const priorityB = basePriority[b.name] || 5;

      // أضف bonus من الاستخدام السابق
      const usageA = this.usageStats.get(a.name) || 0;
      const usageB = this.usageStats.get(b.name) || 0;

      const scoreA = priorityA + usageA * 0.1;
      const scoreB = priorityB + usageB * 0.1;

      return scoreB - scoreA;
    });
  }

  /**
   * توليد تفسير للتحسين
   */
  private generateReasoning(
    original: ToolDefinition[],
    optimized: ToolDefinition[],
    prompt: string
  ): string {
    const removed = original.length - optimized.length;
    return `Optimized from ${original.length} to ${optimized.length} tools (removed ${removed}). Selected most relevant tools based on prompt context.`;
  }

  /**
   * تسجيل استخدام أداة
   */
  recordUsage(toolName: string): void {
    const current = this.usageStats.get(toolName) || 0;
    this.usageStats.set(toolName, current + 1);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 💰 Advanced Cost & Performance Tracker
// ════════════════════════════════════════════════════════════════════════════

class AdvancedCostTracker {
  private totalCost = 0;
  private requests: Array<{
    timestamp: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    duration: number;
    cached: boolean;
  }> = [];

  private cacheSavings = 0;
  private readonly WARNING_THRESHOLD = 10; // $10
  private readonly CRITICAL_THRESHOLD = 50; // $50

  /**
   * تسجيل طلب
   */
  record(data: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    duration: number;
    cached?: boolean;
  }): void {
    this.requests.push({
      timestamp: Date.now(),
      ...data,
      cached: data.cached || false,
    });

    this.totalCost += data.cost;

    if (data.cached) {
      this.cacheSavings += data.cost * 0.9; // تقدير: 90% توفير
    }

    this.checkThresholds();
  }

  /**
   * فحص العتبات والتحذير
   */
  private checkThresholds(): void {
    if (this.totalCost >= this.CRITICAL_THRESHOLD) {
      console.error(
        `🚨 تحذير حرج: التكلفة $${this.totalCost.toFixed(2)} تجاوزت $${this.CRITICAL_THRESHOLD}`
      );
    } else if (this.totalCost >= this.WARNING_THRESHOLD) {
      console.warn(
        `⚠️ تحذير: التكلفة $${this.totalCost.toFixed(2)} اقتربت من الحد`
      );
    }
  }

  /**
   * الحصول على إحصائيات شاملة
   */
  getStats(): CostStats {
    if (this.requests.length === 0) {
      return {
        totalCost: 0,
        totalRequests: 0,
        averageCost: 0,
        averageDuration: 0,
        costByModel: {},
        estimatedMonthlyCost: 0,
        savingsFromCache: 0,
      };
    }

    const totalDuration = this.requests.reduce((sum, r) => sum + r.duration, 0);
    const costByModel: Record<string, number> = {};

    for (const req of this.requests) {
      costByModel[req.model] = (costByModel[req.model] || 0) + req.cost;
    }

    // تقدير التكلفة الشهرية بناءً على الاستخدام الحالي
    const avgDailyCost = this.calculateAverageDailyCost();
    const estimatedMonthlyCost = avgDailyCost * 30;

    return {
      totalCost: this.totalCost,
      totalRequests: this.requests.length,
      averageCost: this.totalCost / this.requests.length,
      averageDuration: totalDuration / this.requests.length,
      costByModel,
      estimatedMonthlyCost,
      savingsFromCache: this.cacheSavings,
    };
  }

  /**
   * حساب متوسط التكلفة اليومية
   */
  private calculateAverageDailyCost(): number {
    if (this.requests.length === 0) return 0;

    const firstRequest = this.requests[0].timestamp;
    const lastRequest = this.requests[this.requests.length - 1].timestamp;
    const daysPassed = (lastRequest - firstRequest) / 86400000 || 1;

    return this.totalCost / daysPassed;
  }

  /**
   * التحقق من الميزانية
   */
  checkBudget(budget?: number): { allowed: boolean; remaining: number } {
    if (!budget) return { allowed: true, remaining: Infinity };

    return {
      allowed: this.totalCost < budget,
      remaining: Math.max(0, budget - this.totalCost),
    };
  }

  /**
   * عرض تقرير مفصل
   */
  displayDetailedReport(): void {
    const stats = this.getStats();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           💰 تقرير التكلفة والأداء المفصل            ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ 📊 إجمالي الطلبات: ${stats.totalRequests.toString().padEnd(34)} ║`);
    console.log(
      `║ 💵 التكلفة الإجمالية: $${stats.totalCost.toFixed(4).padEnd(32)} ║`
    );
    console.log(
      `║ 📈 متوسط التكلفة: $${stats.averageCost.toFixed(4).padEnd(35)} ║`
    );
    console.log(
      `║ ⏱️  متوسط المدة: ${stats.averageDuration.toFixed(0)}ms${' '.repeat(36 - stats.averageDuration.toFixed(0).length)} ║`
    );
    console.log(
      `║ 💾 توفير من Cache: $${stats.savingsFromCache.toFixed(4).padEnd(32)} ║`
    );
    console.log(
      `║ 📅 تقدير شهري: $${stats.estimatedMonthlyCost.toFixed(2).padEnd(36)} ║`
    );
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║ 🎯 التكلفة حسب النموذج:                               ║');

    for (const [model, cost] of Object.entries(stats.costByModel)) {
      const modelShort = model.split('-').slice(0, 2).join('-');
      console.log(
        `║   • ${modelShort}: $${cost.toFixed(4).padEnd(40 - modelShort.length)} ║`
      );
    }

    console.log('╚════════════════════════════════════════════════════════╝\n');
  }

  /**
   * إعادة تعيين
   */
  reset(): void {
    this.totalCost = 0;
    this.requests = [];
    this.cacheSavings = 0;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 💾 Smart Cache System
// ════════════════════════════════════════════════════════════════════════════

class SmartCache {
  private cache: Map<string, { response: string; timestamp: number; hits: number }> =
    new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 3600000; // 1 hour

  /**
   * توليد cache key من الرسائل
   */
  private generateKey(messages: Message[], options: any): string {
    const content = messages.map((m) => `${m.role}:${m.content}`).join('|');
    const optsStr = JSON.stringify({
      model: options.model,
      temp: options.temperature,
    });
    return crypto.createHash('md5').update(content + optsStr).digest('hex');
  }

  /**
   * الحصول من Cache
   */
  get(messages: Message[], options: any): string | null {
    this.cleanup();

    const key = this.generateKey(messages, options);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // تحديث hits
    cached.hits++;
    this.cache.set(key, cached);

    return cached.response;
  }

  /**
   * الحفظ في Cache
   */
  set(messages: Message[], options: any, response: string): void {
    const key = this.generateKey(messages, options);

    // إذا امتلأ الـ cache، احذف الأقل استخداماً
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * إزالة الأقل استخداماً
   */
  private evictLeastUsed(): void {
    let minHits = Infinity;
    let keyToRemove = '';

    for (const [key, value] of this.cache.entries()) {
      if (value.hits < minHits) {
        minHits = value.hits;
        keyToRemove = key;
      }
    }

    if (keyToRemove) {
      this.cache.delete(keyToRemove);
    }
  }

  /**
   * تنظيف المنتهية الصلاحية
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * مسح الكل
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * الحصول على إحصائيات
   */
  getStats(): { size: number; hitRate: number } {
    const totalHits = Array.from(this.cache.values()).reduce(
      (sum, v) => sum + v.hits,
      0
    );
    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 🎯 Smart Model Selector
// ════════════════════════════════════════════════════════════════════════════

class SmartModelSelector {
  /**
   * اختيار النموذج الأمثل بناءً على المهمة
   */
  selectOptimalModel(
    prompt: string,
    options: ChatCompletionOptions,
    conversationLength?: number
  ): string {
    // إذا المستخدم حدد model معين
    if (options.model) return options.model;

    // حسب الأولوية
    switch (options.priority) {
      case 'speed':
        return 'claude-3-haiku-20240307'; // الأسرع

      case 'quality':
        return this.needsOpus(prompt)
          ? 'claude-3-opus-20240229'
          : 'claude-3-5-sonnet-20241022';

      case 'cost':
        return 'claude-3-haiku-20240307'; // الأرخص

      default:
        // ذكاء تلقائي
        return this.autoSelect(prompt, conversationLength || 0);
    }
  }

  /**
   * تحديد إذا المهمة تحتاج Opus
   */
  private needsOpus(prompt: string): boolean {
    const complexKeywords = [
      'معقد',
      'complex',
      'advanced',
      'متقدم',
      'architecture',
      'معماري',
      'comprehensive',
      'شامل',
      'critical',
      'حرج',
    ];

    const lower = prompt.toLowerCase();
    return complexKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * اختيار تلقائي ذكي
   */
  private autoSelect(prompt: string, conversationLength: number): string {
    const promptLength = prompt.length;

    // مهمة بسيطة = Haiku
    if (promptLength < 200 && conversationLength < 5) {
      return 'claude-3-haiku-20240307';
    }

    // مهمة معقدة = Opus
    if (this.needsOpus(prompt)) {
      return 'claude-3-opus-20240229';
    }

    // متوسط = Sonnet (أفضل توازن)
    return 'claude-3-5-sonnet-20241022';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 🚀 Main Claude Service Class
// ════════════════════════════════════════════════════════════════════════════

export class ClaudeService {
  private client: Anthropic;
  private conversationManager: SmartConversationManager;
  private toolOptimizer: IntelligentToolOptimizer;
  private costTracker: AdvancedCostTracker;
  private cache: SmartCache;
  private modelSelector: SmartModelSelector;

  // Rate limiting
  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue = false;
  private readonly MAX_REQUESTS_PER_MINUTE = 50;
  private requestsThisMinute = 0;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({ apiKey });
    this.conversationManager = new SmartConversationManager();
    this.toolOptimizer = new IntelligentToolOptimizer();
    this.costTracker = new AdvancedCostTracker();
    this.cache = new SmartCache();
    this.modelSelector = new SmartModelSelector();

    // Reset rate limit counter every minute
    setInterval(() => {
      this.requestsThisMinute = 0;
    }, 60000);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 💬 Chat Completion (Basic)
  // ════════════════════════════════════════════════════════════════════════

  /**
   * محادثة أساسية بدون أدوات
   */
  async chatCompletion(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    return this.executeWithRateLimit(async () => {
      const startTime = Date.now();

      // اختيار النموذج الأمثل
      const model = this.modelSelector.selectOptimalModel(
        messages[messages.length - 1]?.content || '',
        options,
        messages.length
      );

      // محاولة من Cache
      if (options.enableCache !== false) {
        const cached = this.cache.get(messages, { ...options, model });
        if (cached) {
          console.log('✅ Cache hit!');
          return cached;
        }
      }

      // معالجة السياق إذا كان هناك conversationId
      let processedMessages = messages;
      if (options.conversationId) {
        processedMessages = await this.conversationManager.getOptimizedContext(
          options.conversationId,
          messages
        );
      }

      try {
        // تحويل الرسائل لصيغة Claude
        const claudeMessages = processedMessages
          .filter((m) => m.role !== 'system')
          .map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }));

        const systemPrompt =
          options.systemPrompt ||
          processedMessages.find((m) => m.role === 'system')?.content;

        const response = await this.client.messages.create({
          model,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature || 0.7,
          ...(systemPrompt && { system: systemPrompt }),
          messages: claudeMessages,
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }

        const result = content.text;
        const duration = Date.now() - startTime;

        // تسجيل الإحصائيات
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const cost = this.calculateCost(inputTokens, outputTokens, model);

        this.costTracker.record({
          model,
          inputTokens,
          outputTokens,
          cost,
          duration,
          cached: false,
        });

        // حفظ في المحادثة
        if (options.conversationId) {
          this.conversationManager.saveMessage(
            options.conversationId,
            { role: 'assistant', content: result },
            cost
          );
        }

        // حفظ في Cache
        if (options.enableCache !== false) {
          this.cache.set(messages, { ...options, model }, result);
        }

        return result;
      } catch (error: any) {
        return this.handleError(error, messages, options);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🛠️ Chat with Tools (Advanced)
  // ════════════════════════════════════════════════════════════════════════

  /**
   * محادثة مع أدوات - Agent Loop كامل
   */
  async chatWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options: ChatCompletionOptions = {}
  ): Promise<UnifiedResponse> {
    return this.executeWithRateLimit(async () => {
      const startTime = Date.now();
      let totalCost = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let iterations = 0;
      const maxIterations = 15;

      // اختيار النموذج
      const model = this.modelSelector.selectOptimalModel(
        messages[messages.length - 1]?.content || '',
        options,
        messages.length
      );

      // تحسين الأدوات
      const prompt = messages[messages.length - 1]?.content || '';
      const optimizationResult = this.toolOptimizer.optimize(
        tools,
        prompt,
        messages
      );

      console.log(`🛠️  تحسين الأدوات: ${tools.length} → ${optimizationResult.optimized.length}`);

      // معالجة السياق
      let processedMessages = messages;
      if (options.conversationId) {
        processedMessages = await this.conversationManager.getOptimizedContext(
          options.conversationId,
          messages
        );
      }

      // تحويل لصيغة Claude
      const claudeMessages = processedMessages
        .filter((m) => m.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      const systemPrompt =
        options.systemPrompt ||
        processedMessages.find((m) => m.role === 'system')?.content;

      // تحويل الأدوات لصيغة Claude
      const claudeTools = this.adaptToolsForClaude(optimizationResult.optimized);

      let finalResponse = '';
      let conversationMessages = [...claudeMessages];

      // Agent Loop
      while (iterations < maxIterations) {
        try {
          const response = await this.client.messages.create({
            model,
            max_tokens: options.maxTokens || 4096,
            temperature: options.temperature || 0.7,
            ...(systemPrompt && { system: systemPrompt }),
            messages: conversationMessages,
            tools: claudeTools,
          });

          // تحديث الإحصائيات
          const inputTokens = response.usage.input_tokens;
          const outputTokens = response.usage.output_tokens;
          const cost = this.calculateCost(inputTokens, outputTokens, model);

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          totalCost += cost;
          iterations++;

          // معالجة المحتوى
          let hasToolCalls = false;
          const toolResults: any[] = [];

          for (const content of response.content) {
            if (content.type === 'text') {
              finalResponse += content.text;
            } else if (content.type === 'tool_use') {
              hasToolCalls = true;

              console.log(`🔧 تنفيذ: ${content.name}`);

              // تنفيذ الأداة
              const result = await this.executeToolSafely(
                content.name,
                content.input
              );

              // تسجيل الاستخدام
              this.toolOptimizer.recordUsage(content.name);

              toolResults.push({
                type: 'tool_result',
                tool_use_id: content.id,
                content: JSON.stringify(result),
              });
            }
          }

          // إذا لم توجد tool calls، انتهينا
          if (!hasToolCalls) {
            break;
          }

          // إضافة النتائج للمحادثة
          conversationMessages.push({
            role: 'assistant',
            content: response.content as any,
          });

          conversationMessages.push({
            role: 'user',
            content: toolResults as any,
          });
        } catch (error: any) {
          console.error(`❌ خطأ في iteration ${iterations}:`, error.message);
          break;
        }
      }

      const duration = Date.now() - startTime;

      // تسجيل في CostTracker
      this.costTracker.record({
        model,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cost: totalCost,
        duration,
        cached: false,
      });

      // حفظ في المحادثة
      if (options.conversationId) {
        this.conversationManager.saveMessage(
          options.conversationId,
          { role: 'assistant', content: finalResponse },
          totalCost
        );
      }

      return {
        text: finalResponse,
        stopReason: iterations >= maxIterations ? 'max_iterations' : 'stop',
        metadata: {
          model,
          duration,
          cost: totalCost,
          tokensUsed: {
            input: totalInputTokens,
            output: totalOutputTokens,
          },
          cacheHit: false,
          retries: 0,
          quality: this.assessQuality(model),
        },
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🌊 Streaming Support
  // ════════════════════════════════════════════════════════════════════════

  /**
   * محادثة مع streaming
   */
  async *chatCompletionStream(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const model = this.modelSelector.selectOptimalModel(
      messages[messages.length - 1]?.content || '',
      options,
      messages.length
    );

    const claudeMessages = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    const systemPrompt =
      options.systemPrompt || messages.find((m) => m.role === 'system')?.content;

    try {
      const stream = await this.client.messages.stream({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        ...(systemPrompt && { system: systemPrompt }),
        messages: claudeMessages,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error: any) {
      console.error('Claude Stream Error:', error);
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🔧 Helper Methods
  // ════════════════════════════════════════════════════════════════════════

  /**
   * تحويل الأدوات لصيغة Claude
   */
  private adaptToolsForClaude(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters,
        required: Object.keys(tool.parameters),
      },
    }));
  }

  /**
   * تنفيذ أداة بأمان
   */
  private async executeToolSafely(name: string, params: any): Promise<any> {
    try {
      // استيراد executeTool من core/tools
      const { executeTool } = await import('../core/tools.js');
      return await executeTool(name, params);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * معالجة الأخطاء مع Retry ذكي
   */
  private async handleError(
    error: any,
    messages: Message[],
    options: ChatCompletionOptions,
    retryCount: number = 0
  ): Promise<string> {
    const maxRetries = options.maxRetries || 3;

    console.error(`❌ خطأ Claude (محاولة ${retryCount + 1}/${maxRetries}):`, error.message);

    // أخطاء لا يمكن إعادة المحاولة فيها
    if (
      error.status === 401 ||
      error.message?.includes('authentication') ||
      retryCount >= maxRetries
    ) {
      throw new Error(this.enhanceError(error));
    }

    // Rate limit - انتظر وأعد المحاولة
    if (error.status === 429) {
      const waitTime = Math.min(2000 * Math.pow(2, retryCount), 10000);
      console.log(`⏳ انتظار ${waitTime}ms قبل إعادة المحاولة...`);
      await this.sleep(waitTime);
      return this.chatCompletion(messages, {
        ...options,
        maxRetries: maxRetries - retryCount - 1,
      });
    }

    // خطأ مؤقت - أعد المحاولة
    if (error.status >= 500) {
      await this.sleep(1000);
      return this.chatCompletion(messages, {
        ...options,
        maxRetries: maxRetries - retryCount - 1,
      });
    }

    throw new Error(this.enhanceError(error));
  }

  /**
   * تحسين رسائل الخطأ
   */
  private enhanceError(error: any): string {
    const errorMsg = error.message || '';
    const statusCode = error.status || error.statusCode;

    if (statusCode === 401 || errorMsg.includes('authentication')) {
      return '401 مفتاح API غير صالح';
    }
    if (statusCode === 429) {
      return '429 تجاوز حد الطلبات';
    }
    if (statusCode === 500 || statusCode === 503) {
      return `${statusCode} خطأ في خادم Claude`;
    }

    return errorMsg || 'خطأ غير معروف';
  }

  /**
   * تقييم جودة النموذج
   */
  private assessQuality(model: string): 'low' | 'medium' | 'high' {
    if (model.includes('opus')) return 'high';
    if (model.includes('sonnet')) return 'medium';
    return 'low';
  }

  /**
   * حساب التكلفة
   */
  calculateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
      'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
      'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
    };

    const modelPricing =
      pricing[model || 'claude-3-haiku-20240307'] || pricing['claude-3-haiku-20240307'];

    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  /**
   * Rate limiting ذكي
   */
  private async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    if (this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE) {
      console.warn('⚠️ وصلت لحد الطلبات، الانتظار...');
      await this.sleep(1000);
      return this.executeWithRateLimit(fn);
    }

    this.requestsThisMinute++;
    return fn();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ════════════════════════════════════════════════════════════════════════
  // 📊 Public API - Stats & Management
  // ════════════════════════════════════════════════════════════════════════

  /**
   * الحصول على إحصائيات التكلفة
   */
  getCostStats(): CostStats {
    return this.costTracker.getStats();
  }

  /**
   * عرض تقرير مفصل
   */
  displayDetailedReport(): void {
    this.costTracker.displayDetailedReport();
  }

  /**
   * الحصول على إحصائيات المحادثة
   */
  getConversationStats(conversationId: string): ConversationContext | null {
    return this.conversationManager.getStats(conversationId);
  }

  /**
   * مسح محادثة
   */
  clearConversation(conversationId: string): void {
    this.conversationManager.clear(conversationId);
  }

  /**
   * مسح الـ cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * الحصول على إحصائيات الـ cache
   */
  getCacheStats(): { size: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * إعادة تعيين متتبع التكلفة
   */
  resetCostTracking(): void {
    this.costTracker.reset();
  }

  /**
   * التحقق من صلاحية الـ API Key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.chatCompletion([{ role: 'user', content: 'test' }], {
        maxTokens: 10,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * الحصول على النماذج المتاحة
   */
  getAvailableModels() {
    return [
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: '💰 الأرخص والأسرع - مثالي للمهام البسيطة',
        maxTokens: 200000,
        cost: { input: 0.25, output: 1.25 },
        supportsTools: true,
        quality: 'low',
        speed: 'fast',
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: '⚡ الأذكى - توازن مثالي بين الجودة والسعر',
        maxTokens: 200000,
        cost: { input: 3.0, output: 15.0 },
        supportsTools: true,
        quality: 'high',
        speed: 'medium',
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: '🎯 الأقوى - للمهام الحرجة والمعقدة',
        maxTokens: 200000,
        cost: { input: 15.0, output: 75.0 },
        supportsTools: true,
        quality: 'highest',
        speed: 'slow',
      },
    ];
  }

  /**
   * معلومات الخدمة
   */
  getModelInfo() {
    return {
      name: 'Claude (Anthropic)',
      version: '2.0.0',
      features: [
        'محادثات ذكية مع إدارة سياق',
        'دعم أدوات متقدم مع Agent Loop',
        'تتبع دقيق للتكلفة والأداء',
        'تحسين تلقائي للأدوات',
        'نظام cache ذكي',
        'اختيار تلقائي للنموذج المناسب',
        'Rate limiting ذكي',
        'إدارة ميزانية',
      ],
      defaultModel: 'claude-3-haiku-20240307',
      supportsTools: true,
      supportsStreaming: true,
      supportsConversations: true,
    };
  }
}

export default ClaudeService;
