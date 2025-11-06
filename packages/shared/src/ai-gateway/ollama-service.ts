/**
 * ════════════════════════════════════════════════════════════════════════════
 * 🦙 Ollama Service - Ultimate Edition
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * خدمة Ollama المحلية الأكثر تقدماً (مجانية 100%)
 * 
 * الميزات:
 * ✅ محادثات عادية وبالأدوات
 * ✅ إدارة ذكية للمحادثات والسياق
 * ✅ تتبع دقيق للأداء (بدون تكلفة!)
 * ✅ تحسين تلقائي للأدوات
 * ✅ نظام retry ذكي مع fallback
 * ✅ Caching متقدم للأداء
 * ✅ Rate limiting ذكي
 * ✅ اختيار تلقائي للنموذج المناسب
 * ✅ تحسين prompts تلقائي
 * ✅ Analytics شامل
 * ✅ دعم نماذج متعددة (Llama, Mistral, CodeLlama, etc.)
 * 
 * @author Oqool AI Team
 * @version 2.0.0
 */

import { Ollama } from 'ollama';
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
  totalDuration: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalDuration: number;
  totalRequests: number;
  averageDuration: number;
  requestsByModel: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
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
      totalDuration: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  saveMessage(conversationId: string, message: Message, duration: number): void {
    const context = this.conversations.get(conversationId);
    if (!context) return;

    context.messages.push(message);
    context.totalDuration += duration;
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
// 📊 Advanced Performance Tracker
// ════════════════════════════════════════════════════════════════════════════

class AdvancedPerformanceTracker {
  private totalDuration = 0;
  private requests: Array<{
    timestamp: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    cached: boolean;
  }> = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  record(data: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    cached?: boolean;
  }): void {
    this.requests.push({
      timestamp: Date.now(),
      ...data,
      cached: data.cached || false,
    });

    this.totalDuration += data.duration;

    if (data.cached) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  getStats(): PerformanceStats {
    if (this.requests.length === 0) {
      return {
        totalDuration: 0,
        totalRequests: 0,
        averageDuration: 0,
        requestsByModel: {},
        cacheHits: 0,
        cacheMisses: 0,
      };
    }

    const requestsByModel: Record<string, number> = {};

    for (const req of this.requests) {
      requestsByModel[req.model] = (requestsByModel[req.model] || 0) + 1;
    }

    return {
      totalDuration: this.totalDuration,
      totalRequests: this.requests.length,
      averageDuration: this.totalDuration / this.requests.length,
      requestsByModel,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
    };
  }

  displayDetailedReport(): void {
    const stats = this.getStats();
    const cacheHitRate = stats.totalRequests > 0
      ? ((stats.cacheHits / stats.totalRequests) * 100).toFixed(1)
      : '0.0';

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         🦙 تقرير Ollama - الأداء والاستخدام           ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ 📊 إجمالي الطلبات: ${stats.totalRequests.toString().padEnd(34)} ║`);
    console.log(`║ ⏱️  الوقت الإجمالي: ${(stats.totalDuration / 1000).toFixed(2)}s${' '.repeat(32 - (stats.totalDuration / 1000).toFixed(2).length)} ║`);
    console.log(`║ 📈 متوسط المدة: ${stats.averageDuration.toFixed(0)}ms${' '.repeat(36 - stats.averageDuration.toFixed(0).length)} ║`);
    console.log(`║ 💾 Cache Hits: ${stats.cacheHits} (${cacheHitRate}%)${' '.repeat(32 - stats.cacheHits.toString().length - cacheHitRate.length)} ║`);
    console.log(`║ 💵 التكلفة: $0.00 (مجاني!)${' '.repeat(30)} ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║ 🎯 الاستخدام حسب النموذج:                             ║');
    for (const [model, count] of Object.entries(stats.requestsByModel)) {
      const modelShort = model.split(':')[0];
      console.log(`║   • ${modelShort}: ${count} طلب${' '.repeat(38 - modelShort.length - count.toString().length)} ║`);
    }
    console.log('╚════════════════════════════════════════════════════════╝\n');
  }

  reset(): void {
    this.totalDuration = 0;
    this.requests = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
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
    conversationLength?: number,
    availableModels?: string[]
  ): string {
    if (options.model) return options.model;

    // إذا لم نعرف النماذج المتاحة، نستخدم الافتراضي
    if (!availableModels || availableModels.length === 0) {
      return 'llama3.2:latest';
    }

    switch (options.priority) {
      case 'speed':
        return this.selectFastest(availableModels);
      case 'quality':
        return this.selectBest(availableModels, prompt);
      case 'cost':
        return this.selectSmallest(availableModels); // مجاني لكن أسرع
      default:
        return this.autoSelect(prompt, conversationLength || 0, availableModels);
    }
  }

  private selectFastest(models: string[]): string {
    // النماذج الصغيرة أسرع
    const fastModels = ['llama3.2:1b', 'phi3:mini', 'qwen2:1.5b'];
    for (const fast of fastModels) {
      const found = models.find((m) => m.includes(fast.split(':')[0]));
      if (found) return found;
    }
    return models[0];
  }

  private selectBest(models: string[], prompt: string): string {
    // للكود: CodeLlama
    if (this.isCodeRelated(prompt)) {
      const codeLlama = models.find((m) => m.includes('codellama'));
      if (codeLlama) return codeLlama;
    }

    // للمهام المعقدة: أكبر نموذج
    const largeModels = ['llama3.1:70b', 'llama3.1:405b', 'mixtral:8x22b'];
    for (const large of largeModels) {
      const found = models.find((m) => m.includes(large.split(':')[0]));
      if (found) return found;
    }

    return models[0];
  }

  private selectSmallest(models: string[]): string {
    const smallModels = ['llama3.2:1b', 'phi3:mini', 'qwen2:1.5b'];
    for (const small of smallModels) {
      const found = models.find((m) => m.includes(small.split(':')[0]));
      if (found) return found;
    }
    return models[0];
  }

  private autoSelect(prompt: string, conversationLength: number, models: string[]): string {
    const promptLength = prompt.length;

    // مهمة بسيطة = نموذج صغير
    if (promptLength < 200 && conversationLength < 5) {
      return this.selectSmallest(models);
    }

    // كود = CodeLlama
    if (this.isCodeRelated(prompt)) {
      const codeLlama = models.find((m) => m.includes('codellama'));
      if (codeLlama) return codeLlama;
    }

    // معقد = نموذج كبير
    if (this.isComplex(prompt)) {
      return this.selectBest(models, prompt);
    }

    // متوسط = llama3.2 أو llama3.1
    const defaultModels = ['llama3.2:latest', 'llama3.1:8b', 'mistral:latest'];
    for (const def of defaultModels) {
      const found = models.find((m) => m.includes(def.split(':')[0]));
      if (found) return found;
    }

    return models[0];
  }

  private isCodeRelated(prompt: string): boolean {
    const codeKeywords = [
      'code', 'function', 'class', 'debug', 'error', 'كود', 'برمجة',
      'typescript', 'python', 'javascript', 'react', 'api'
    ];
    const lower = prompt.toLowerCase();
    return codeKeywords.some((kw) => lower.includes(kw));
  }

  private isComplex(prompt: string): boolean {
    const complexKeywords = [
      'complex', 'advanced', 'architecture', 'comprehensive',
      'معقد', 'متقدم', 'معماري', 'شامل'
    ];
    const lower = prompt.toLowerCase();
    return complexKeywords.some((kw) => lower.includes(kw));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 🚀 Main Ollama Service Class
// ════════════════════════════════════════════════════════════════════════════

export class OllamaService {
  private client: Ollama;
  private conversationManager: SmartConversationManager;
  private toolOptimizer: IntelligentToolOptimizer;
  private performanceTracker: AdvancedPerformanceTracker;
  private cache: SmartCache;
  private modelSelector: SmartModelSelector;
  private availableModels: string[] = [];

  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue = false;
  private readonly MAX_REQUESTS_PER_MINUTE = 100; // محلي = unlimited تقريباً
  private requestsThisMinute = 0;

  constructor(host?: string) {
    this.client = new Ollama({ host: host || 'http://localhost:11434' });
    this.conversationManager = new SmartConversationManager();
    this.toolOptimizer = new IntelligentToolOptimizer();
    this.performanceTracker = new AdvancedPerformanceTracker();
    this.cache = new SmartCache();
    this.modelSelector = new SmartModelSelector();

    // تحميل النماذج المتاحة
    this.loadAvailableModels();

    setInterval(() => {
      this.requestsThisMinute = 0;
    }, 60000);
  }

  private async loadAvailableModels(): Promise<void> {
    try {
      const response = await this.client.list();
      this.availableModels = response.models.map((m: any) => m.name);
    } catch (error) {
      console.warn('⚠️ تعذر تحميل النماذج المتاحة');
      this.availableModels = ['llama3.2:latest'];
    }
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
        messages.length,
        this.availableModels
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
        const response = await this.client.chat({
          model,
          messages: processedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 4096,
          },
        });

        const content = response.message.content;
        const duration = Date.now() - startTime;

        // تقدير الـ tokens
        const inputTokens = this.estimateTokens(
          processedMessages.map((m) => m.content).join(' ')
        );
        const outputTokens = this.estimateTokens(content);

        this.performanceTracker.record({
          model,
          inputTokens,
          outputTokens,
          duration,
          cached: false,
        });

        if (options.conversationId) {
          this.conversationManager.saveMessage(
            options.conversationId,
            { role: 'assistant', content },
            duration
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
      let totalDuration = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let iterations = 0;
      const maxIterations = 15;

      const model = this.modelSelector.selectOptimalModel(
        messages[messages.length - 1]?.content || '',
        options,
        messages.length,
        this.availableModels
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

      const ollamaTools = this.adaptToolsForOllama(optimizationResult.optimized);
      let conversationMessages = [...processedMessages];
      let finalResponse = '';

      while (iterations < maxIterations) {
        try {
          const iterStart = Date.now();

          const response = await this.client.chat({
            model,
            messages: conversationMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            tools: ollamaTools,
            options: {
              temperature: options.temperature || 0.7,
              num_predict: options.maxTokens || 4096,
            },
          });

          const iterDuration = Date.now() - iterStart;
          totalDuration += iterDuration;

          const inputTokens = this.estimateTokens(conversationMessages.map((m) => m.content).join(' '));
          const outputTokens = this.estimateTokens(response.message.content);

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          iterations++;

          if (response.message.content) {
            finalResponse += response.message.content;
          }

          if (response.message.tool_calls && response.message.tool_calls.length > 0) {
            conversationMessages.push({
              role: 'assistant',
              content: response.message.content,
            });

            for (const toolCall of response.message.tool_calls) {
              console.log(`🔧 تنفيذ: ${toolCall.function.name}`);

              const result = await this.executeToolSafely(
                toolCall.function.name,
                toolCall.function.arguments
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

      this.performanceTracker.record({
        model,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        duration,
        cached: false,
      });

      if (options.conversationId) {
        this.conversationManager.saveMessage(
          options.conversationId,
          { role: 'assistant', content: finalResponse },
          duration
        );
      }

      return {
        text: finalResponse,
        stopReason: iterations >= maxIterations ? 'max_iterations' : 'stop',
        metadata: {
          model,
          duration,
          cost: 0, // مجاني!
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
      messages.length,
      this.availableModels
    );

    try {
      const stream = await this.client.chat({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 4096,
        },
      });

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          yield chunk.message.content;
        }
      }
    } catch (error: any) {
      console.error('Ollama Stream Error:', error);
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🔧 Helper Methods
  // ════════════════════════════════════════════════════════════════════════

  private adaptToolsForOllama(tools: ToolDefinition[]): any[] {
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

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async handleError(
    error: any,
    messages: Message[],
    options: ChatCompletionOptions,
    retryCount: number = 0
  ): Promise<string> {
    const maxRetries = options.maxRetries || 3;

    console.error(`❌ خطأ Ollama (محاولة ${retryCount + 1}/${maxRetries}):`, error.message);

    if (error.message?.includes('connection') || retryCount >= maxRetries) {
      throw new Error(this.enhanceError(error));
    }

    await this.sleep(1000);
    return this.chatCompletion(messages, { ...options, maxRetries: maxRetries - retryCount - 1 });
  }

  private enhanceError(error: any): string {
    const errorMsg = error.message || '';

    if (errorMsg.includes('connection') || errorMsg.includes('ECONNREFUSED')) {
      return 'لا يمكن الاتصال بـ Ollama. تأكد أن Ollama يعمل (ollama serve)';
    }
    if (errorMsg.includes('not found') || errorMsg.includes('model')) {
      return 'النموذج غير موجود. قم بتنزيله أولاً (ollama pull model-name)';
    }

    return errorMsg || 'خطأ غير معروف';
  }

  private assessQuality(model: string): 'low' | 'medium' | 'high' {
    if (model.includes('70b') || model.includes('405b')) return 'high';
    if (model.includes('13b') || model.includes('8b')) return 'medium';
    return 'low';
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

  getPerformanceStats(): PerformanceStats {
    return this.performanceTracker.getStats();
  }

  displayDetailedReport(): void {
    this.performanceTracker.displayDetailedReport();
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

  resetPerformanceTracking(): void {
    this.performanceTracker.reset();
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const response = await this.client.list();
      return response.models.map((m: any) => ({
        id: m.name,
        name: m.name,
        size: m.size,
        modified: m.modified_at,
        supportsTools: this.modelSupportsTools(m.name),
      }));
    } catch (error) {
      console.error('خطأ في جلب النماذج:', error);
      return [];
    }
  }

  private modelSupportsTools(modelName: string): boolean {
    // النماذج التي تدعم Tools
    const toolsSupport = ['llama3.1', 'llama3.2', 'mistral', 'mixtral'];
    return toolsSupport.some((m) => modelName.includes(m));
  }

  getModelInfo() {
    return {
      name: 'Ollama (Local)',
      version: '2.0.0',
      features: [
        'محادثات ذكية مع إدارة سياق',
        'دعم أدوات متقدم (حسب النموذج)',
        'تتبع دقيق للأداء',
        'تحسين تلقائي للأدوات',
        'نظام cache ذكي',
        'اختيار تلقائي للنموذج المناسب',
        'مجاني 100% ومحلي',
        'خصوصية كاملة',
      ],
      defaultModel: 'llama3.2:latest',
      supportsTools: true,
      supportsStreaming: true,
      supportsConversations: true,
      cost: 0,
      privacy: 'full',
    };
  }
}

export default OllamaService;
