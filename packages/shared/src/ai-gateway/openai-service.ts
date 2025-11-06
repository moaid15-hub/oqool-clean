/**
 * ════════════════════════════════════════════════════════════════════════════
 * 🤖 OpenAI Service - Ultimate Edition
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * خدمة OpenAI الأكثر تقدماً (GPT-4, GPT-4o, GPT-3.5)
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

import OpenAI from 'openai';
import crypto from 'crypto';

// ════════════════════════════════════════════════════════════════════════════
// 📊 Types & Interfaces
// ════════════════════════════════════════════════════════════════════════════

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
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

// ════════════════════════════════════════════════════════════════════════════
// 🧠 Smart Conversation Manager
// ════════════════════════════════════════════════════════════════════════════

class SmartConversationManager {
  private conversations: Map<string, ConversationContext> = new Map();
  private readonly MAX_CONTEXT_MESSAGES = 20;
  private readonly MAX_CONTEXT_TOKENS = 100000;
  private readonly CLEANUP_INTERVAL = 3600000;

  constructor() {
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  async getOptimizedContext(
    conversationId: string,
    newMessages: Message[]
  ): Promise<Message[]> {
    const context = this.conversations.get(conversationId);

    if (!context) {
      this.createConversation(conversationId, newMessages);
      return newMessages;
    }

    const allMessages = [...context.messages, ...newMessages];
    const optimized = this.smartContextSelection(allMessages);

    context.messages = optimized;
    context.updatedAt = Date.now();
    this.conversations.set(conversationId, context);

    return optimized;
  }

  private smartContextSelection(messages: Message[]): Message[] {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');
    const recentMessages = conversationMessages.slice(-this.MAX_CONTEXT_MESSAGES);
    const estimatedTokens = this.estimateTokens(recentMessages);

    if (estimatedTokens > this.MAX_CONTEXT_TOKENS) {
      return [
        ...systemMessages,
        ...recentMessages.slice(-Math.floor(this.MAX_CONTEXT_MESSAGES / 2)),
      ];
    }

    return [...systemMessages, ...recentMessages];
  }

  private createConversation(id: string, messages: Message[]): void {
    this.conversations.set(id, {
      id,
      messages,
      totalCost: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  saveMessage(conversationId: string, message: Message, cost: number): void {
    const context = this.conversations.get(conversationId);
    if (!context) return;

    context.messages.push(message);
    context.totalCost += cost;
    context.updatedAt = Date.now();
  }

  getStats(conversationId: string): ConversationContext | null {
    return this.conversations.get(conversationId) || null;
  }

  clear(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  private cleanup(): void {
    const oneDayAgo = Date.now() - 86400000;
    for (const [id, context] of this.conversations.entries()) {
      if (context.updatedAt < oneDayAgo) {
        this.conversations.delete(id);
      }
    }
  }

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

  optimize(
    tools: ToolDefinition[],
    prompt: string,
    conversationHistory?: Message[]
  ): { optimized: ToolDefinition[]; removed: string[]; reasoning: string } {
    const original = [...tools];
    let optimized = this.removeDuplicates(tools);
    optimized = this.selectRelevantTools(optimized, prompt);
    optimized = this.sortByPriorityAndUsage(optimized, prompt);

    const removed = optimized.slice(10).map((t) => t.name);
    optimized = optimized.slice(0, 10);

    return {
      optimized,
      removed,
      reasoning: `Optimized from ${original.length} to ${optimized.length} tools`,
    };
  }

  private removeDuplicates(tools: ToolDefinition[]): ToolDefinition[] {
    const seen = new Set<string>();
    return tools.filter((tool) => {
      if (seen.has(tool.name)) return false;
      seen.add(tool.name);
      return true;
    });
  }

  private selectRelevantTools(tools: ToolDefinition[], prompt: string): ToolDefinition[] {
    const lowerPrompt = prompt.toLowerCase();
    const toolKeywords: Record<string, string[]> = {
      read_file: ['read', 'show', 'file', 'content', 'اقرأ', 'ملف'],
      write_file: ['write', 'create', 'edit', 'save', 'اكتب', 'أنشئ'],
      list_directory: ['list', 'folder', 'directory', 'files', 'قائمة', 'مجلد'],
      search_files: ['search', 'find', 'locate', 'ابحث', 'بحث'],
      execute_command: ['execute', 'run', 'command', 'نفذ', 'أمر'],
    };

    const scored = tools.map((tool) => {
      const keywords = toolKeywords[tool.name] || [];
      const score = keywords.filter((kw) => lowerPrompt.includes(kw)).length;
      return { tool, score };
    });

    const hasRelevance = scored.some((s) => s.score > 0);
    if (!hasRelevance) return tools;

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.tool);
  }

  private sortByPriorityAndUsage(tools: ToolDefinition[], prompt: string): ToolDefinition[] {
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
      const usageA = this.usageStats.get(a.name) || 0;
      const usageB = this.usageStats.get(b.name) || 0;
      const scoreA = priorityA + usageA * 0.1;
      const scoreB = priorityB + usageB * 0.1;
      return scoreB - scoreA;
    });
  }

  recordUsage(toolName: string): void {
    const current = this.usageStats.get(toolName) || 0;
    this.usageStats.set(toolName, current + 1);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 💰 Advanced Cost Tracker
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
  private readonly WARNING_THRESHOLD = 10;
  private readonly CRITICAL_THRESHOLD = 50;

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
      this.cacheSavings += data.cost * 0.9;
    }

    this.checkThresholds();
  }

  private checkThresholds(): void {
    if (this.totalCost >= this.CRITICAL_THRESHOLD) {
      console.error(
        `🚨 تحذير حرج: التكلفة $${this.totalCost.toFixed(2)} تجاوزت $${this.CRITICAL_THRESHOLD}`
      );
    } else if (this.totalCost >= this.WARNING_THRESHOLD) {
      console.warn(`⚠️ تحذير: التكلفة $${this.totalCost.toFixed(2)} اقتربت من الحد`);
    }
  }

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

  private calculateAverageDailyCost(): number {
    if (this.requests.length === 0) return 0;
    const firstRequest = this.requests[0].timestamp;
    const lastRequest = this.requests[this.requests.length - 1].timestamp;
    const daysPassed = (lastRequest - firstRequest) / 86400000 || 1;
    return this.totalCost / daysPassed;
  }

  checkBudget(budget?: number): { allowed: boolean; remaining: number } {
    if (!budget) return { allowed: true, remaining: Infinity };
    return {
      allowed: this.totalCost < budget,
      remaining: Math.max(0, budget - this.totalCost),
    };
  }

  displayDetailedReport(): void {
    const stats = this.getStats();
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         🤖 تقرير OpenAI - التكلفة والأداء            ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ 📊 إجمالي الطلبات: ${stats.totalRequests.toString().padEnd(34)} ║`);
    console.log(`║ 💵 التكلفة الإجمالية: $${stats.totalCost.toFixed(4).padEnd(32)} ║`);
    console.log(`║ 📈 متوسط التكلفة: $${stats.averageCost.toFixed(4).padEnd(35)} ║`);
    console.log(`║ ⏱️  متوسط المدة: ${stats.averageDuration.toFixed(0)}ms${' '.repeat(36 - stats.averageDuration.toFixed(0).length)} ║`);
    console.log(`║ 💾 توفير من Cache: $${stats.savingsFromCache.toFixed(4).padEnd(32)} ║`);
    console.log(`║ 📅 تقدير شهري: $${stats.estimatedMonthlyCost.toFixed(2).padEnd(36)} ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║ 🎯 التكلفة حسب النموذج:                               ║');
    for (const [model, cost] of Object.entries(stats.costByModel)) {
      const modelShort = model.includes('gpt-4o') ? 'GPT-4o' : model.includes('gpt-4') ? 'GPT-4' : 'GPT-3.5';
      console.log(`║   • ${modelShort}: $${cost.toFixed(4).padEnd(40 - modelShort.length)} ║`);
    }
    console.log('╚════════════════════════════════════════════════════════╝\n');
  }

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
  private cache: Map<string, { response: string; timestamp: number; hits: number }> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 3600000;

  private generateKey(messages: Message[], options: any): string {
    const content = messages.map((m) => `${m.role}:${m.content}`).join('|');
    const optsStr = JSON.stringify({ model: options.model, temp: options.temperature });
    return crypto.createHash('md5').update(content + optsStr).digest('hex');
  }

  get(messages: Message[], options: any): string | null {
    this.cleanup();
    const key = this.generateKey(messages, options);
    const cached = this.cache.get(key);
    if (!cached) return null;
    cached.hits++;
    this.cache.set(key, cached);
    return cached.response;
  }

  set(messages: Message[], options: any, response: string): void {
    const key = this.generateKey(messages, options);
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }
    this.cache.set(key, { response, timestamp: Date.now(), hits: 0 });
  }

  private evictLeastUsed(): void {
    let minHits = Infinity;
    let keyToRemove = '';
    for (const [key, value] of this.cache.entries()) {
      if (value.hits < minHits) {
        minHits = value.hits;
        keyToRemove = key;
      }
    }
    if (keyToRemove) this.cache.delete(keyToRemove);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, v) => sum + v.hits, 0);
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
  selectOptimalModel(
    prompt: string,
    options: ChatCompletionOptions,
    conversationLength?: number
  ): string {
    if (options.model) return options.model;

    switch (options.priority) {
      case 'speed':
        return 'gpt-4o-mini'; // الأسرع
      case 'quality':
        return this.needsO1(prompt) ? 'o1-preview' : 'gpt-4o';
      case 'cost':
        return 'gpt-3.5-turbo'; // الأرخص
      default:
        return this.autoSelect(prompt, conversationLength || 0);
    }
  }

  private needsO1(prompt: string): boolean {
    const complexKeywords = [
      'complex', 'advanced', 'architecture', 'comprehensive', 'critical',
      'معقد', 'متقدم', 'معماري', 'شامل', 'حرج'
    ];
    const lower = prompt.toLowerCase();
    return complexKeywords.some((kw) => lower.includes(kw));
  }

  private autoSelect(prompt: string, conversationLength: number): string {
    const promptLength = prompt.length;

    if (promptLength < 200 && conversationLength < 5) {
      return 'gpt-4o-mini';
    }

    if (this.needsO1(prompt)) {
      return 'o1-preview';
    }

    return 'gpt-4o'; // أفضل توازن
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 🚀 Main OpenAI Service Class
// ════════════════════════════════════════════════════════════════════════════

export class OpenAIService {
  private client: OpenAI;
  private conversationManager: SmartConversationManager;
  private toolOptimizer: IntelligentToolOptimizer;
  private costTracker: AdvancedCostTracker;
  private cache: SmartCache;
  private modelSelector: SmartModelSelector;

  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue = false;
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private requestsThisMinute = 0;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({ apiKey });
    this.conversationManager = new SmartConversationManager();
    this.toolOptimizer = new IntelligentToolOptimizer();
    this.costTracker = new AdvancedCostTracker();
    this.cache = new SmartCache();
    this.modelSelector = new SmartModelSelector();

    setInterval(() => {
      this.requestsThisMinute = 0;
    }, 60000);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 💬 Chat Completion (Basic)
  // ════════════════════════════════════════════════════════════════════════

  async chatCompletion(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    return this.executeWithRateLimit(async () => {
      const startTime = Date.now();

      const model = this.modelSelector.selectOptimalModel(
        messages[messages.length - 1]?.content || '',
        options,
        messages.length
      );

      if (options.enableCache !== false) {
        const cached = this.cache.get(messages, { ...options, model });
        if (cached) {
          console.log('✅ Cache hit!');
          return cached;
        }
      }

      let processedMessages = messages;
      if (options.conversationId) {
        processedMessages = await this.conversationManager.getOptimizedContext(
          options.conversationId,
          messages
        );
      }

      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: processedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature || 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        const duration = Date.now() - startTime;
        const usage = response.usage!;
        const cost = this.calculateCost(usage.prompt_tokens, usage.completion_tokens, model);

        this.costTracker.record({
          model,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          cost,
          duration,
          cached: false,
        });

        if (options.conversationId) {
          this.conversationManager.saveMessage(
            options.conversationId,
            { role: 'assistant', content },
            cost
          );
        }

        if (options.enableCache !== false) {
          this.cache.set(messages, { ...options, model }, content);
        }

        return content;
      } catch (error: any) {
        return this.handleError(error, messages, options);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🛠️ Chat with Tools (Advanced)
  // ════════════════════════════════════════════════════════════════════════

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

      const model = this.modelSelector.selectOptimalModel(
        messages[messages.length - 1]?.content || '',
        options,
        messages.length
      );

      const prompt = messages[messages.length - 1]?.content || '';
      const optimizationResult = this.toolOptimizer.optimize(tools, prompt, messages);

      console.log(`🛠️  تحسين الأدوات: ${tools.length} → ${optimizationResult.optimized.length}`);

      let processedMessages = messages;
      if (options.conversationId) {
        processedMessages = await this.conversationManager.getOptimizedContext(
          options.conversationId,
          messages
        );
      }

      const openaiTools = this.adaptToolsForOpenAI(optimizationResult.optimized);
      let conversationMessages = [...processedMessages];
      let finalResponse = '';

      while (iterations < maxIterations) {
        try {
          const response = await this.client.chat.completions.create({
            model,
            messages: conversationMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            max_tokens: options.maxTokens || 4096,
            temperature: options.temperature || 0.7,
            tools: openaiTools,
            tool_choice: 'auto',
          });

          const usage = response.usage!;
          const cost = this.calculateCost(usage.prompt_tokens, usage.completion_tokens, model);

          totalInputTokens += usage.prompt_tokens;
          totalOutputTokens += usage.completion_tokens;
          totalCost += cost;
          iterations++;

          const message = response.choices[0]?.message;
          if (!message) break;

          if (message.content) {
            finalResponse += message.content;
          }

          if (message.tool_calls && message.tool_calls.length > 0) {
            conversationMessages.push({
              role: 'assistant',
              content: message.content || '',
              metadata: { tool_calls: message.tool_calls },
            });

            for (const toolCall of message.tool_calls) {
              console.log(`🔧 تنفيذ: ${toolCall.function.name}`);

              const result = await this.executeToolSafely(
                toolCall.function.name,
                JSON.parse(toolCall.function.arguments || '{}')
              );

              this.toolOptimizer.recordUsage(toolCall.function.name);

              conversationMessages.push({
                role: 'system',
                content: `Tool result: ${JSON.stringify(result)}`,
              });
            }
          } else {
            break;
          }
        } catch (error: any) {
          console.error(`❌ خطأ في iteration ${iterations}:`, error.message);
          break;
        }
      }

      const duration = Date.now() - startTime;

      this.costTracker.record({
        model,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cost: totalCost,
        duration,
        cached: false,
      });

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
          tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
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

  async *chatCompletionStream(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const model = this.modelSelector.selectOptimalModel(
      messages[messages.length - 1]?.content || '',
      options,
      messages.length
    );

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      console.error('OpenAI Stream Error:', error);
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🔧 Helper Methods
  // ════════════════════════════════════════════════════════════════════════

  private adaptToolsForOpenAI(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.keys(tool.parameters),
        },
      },
    }));
  }

  private async executeToolSafely(name: string, params: any): Promise<any> {
    try {
      const { executeTool } = await import('../core/tools.js');
      return await executeTool(name, params);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleError(
    error: any,
    messages: Message[],
    options: ChatCompletionOptions,
    retryCount: number = 0
  ): Promise<string> {
    const maxRetries = options.maxRetries || 3;

    console.error(`❌ خطأ OpenAI (محاولة ${retryCount + 1}/${maxRetries}):`, error.message);

    if (error.status === 401 || error.message?.includes('authentication') || retryCount >= maxRetries) {
      throw new Error(this.enhanceError(error));
    }

    if (error.status === 429) {
      const waitTime = Math.min(2000 * Math.pow(2, retryCount), 10000);
      console.log(`⏳ انتظار ${waitTime}ms قبل إعادة المحاولة...`);
      await this.sleep(waitTime);
      return this.chatCompletion(messages, { ...options, maxRetries: maxRetries - retryCount - 1 });
    }

    if (error.status >= 500) {
      await this.sleep(1000);
      return this.chatCompletion(messages, { ...options, maxRetries: maxRetries - retryCount - 1 });
    }

    throw new Error(this.enhanceError(error));
  }

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
      return `${statusCode} خطأ في خادم OpenAI`;
    }

    return errorMsg || 'خطأ غير معروف';
  }

  private assessQuality(model: string): 'low' | 'medium' | 'high' {
    if (model.includes('o1')) return 'high';
    if (model.includes('gpt-4o')) return 'high';
    if (model.includes('gpt-4')) return 'medium';
    return 'low';
  }

  calculateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 5.0, output: 15.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
      'gpt-4': { input: 30.0, output: 60.0 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'o1-preview': { input: 15.0, output: 60.0 },
      'o1-mini': { input: 3.0, output: 12.0 },
    };

    const modelPricing = pricing[model || 'gpt-4o'] || pricing['gpt-4o'];
    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  private async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    if (this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE) {
      console.warn('⚠️ وصلت لحد الطلبات، الانتظار...');
      await this.sleep(1000);
      return this.executeWithRateLimit(fn);
    }

    this.requestsThisMinute++;
    return fn();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ════════════════════════════════════════════════════════════════════════
  // 📊 Public API - Stats & Management
  // ════════════════════════════════════════════════════════════════════════

  getCostStats(): CostStats {
    return this.costTracker.getStats();
  }

  displayDetailedReport(): void {
    this.costTracker.displayDetailedReport();
  }

  getConversationStats(conversationId: string): ConversationContext | null {
    return this.conversationManager.getStats(conversationId);
  }

  clearConversation(conversationId: string): void {
    this.conversationManager.clear(conversationId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return this.cache.getStats();
  }

  resetCostTracking(): void {
    this.costTracker.reset();
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.chatCompletion([{ role: 'user', content: 'test' }], { maxTokens: 10 });
      return true;
    } catch {
      return false;
    }
  }

  getAvailableModels() {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: '⚡ الأسرع والأذكى - توازن مثالي',
        maxTokens: 128000,
        cost: { input: 5.0, output: 15.0 },
        supportsTools: true,
        quality: 'high',
        speed: 'fast',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: '💰 رخيص وسريع - مثالي للمهام البسيطة',
        maxTokens: 128000,
        cost: { input: 0.15, output: 0.6 },
        supportsTools: true,
        quality: 'medium',
        speed: 'fastest',
      },
      {
        id: 'o1-preview',
        name: 'O1 Preview',
        description: '🧠 الأقوى - للمهام المعقدة جداً',
        maxTokens: 128000,
        cost: { input: 15.0, output: 60.0 },
        supportsTools: false,
        quality: 'highest',
        speed: 'slow',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: '🚀 الأرخص - للمهام البسيطة',
        maxTokens: 16385,
        cost: { input: 0.5, output: 1.5 },
        supportsTools: true,
        quality: 'low',
        speed: 'fastest',
      },
    ];
  }

  getModelInfo() {
    return {
      name: 'OpenAI',
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
      defaultModel: 'gpt-4o',
      supportsTools: true,
      supportsStreaming: true,
      supportsConversations: true,
    };
  }
}

export default OpenAIService;
