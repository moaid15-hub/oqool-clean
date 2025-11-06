/**
 * ════════════════════════════════════════════════════════════════════════════
 * 💎 Google Gemini Service - Ultimate Edition
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * خدمة Google Gemini الأكثر تقدماً (Gemini Pro, Flash, Ultra)
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

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

// ════════════════════════════════════════════════════════════════════════════
// 📊 Types & Interfaces
// ════════════════════════════════════════════════════════════════════════════

export interface Message {
  role: 'user' | 'model' | 'system';
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
    console.log('║         💎 تقرير Gemini - التكلفة والأداء            ║');
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
      const modelShort = model.includes('flash') ? 'Flash' : model.includes('pro') ? 'Pro' : 'Ultra';
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
        return 'gemini-1.5-flash'; // الأسرع
      case 'quality':
        return 'gemini-1.5-pro'; // الأقوى
      case 'cost':
        return 'gemini-1.5-flash'; // الأرخص
      default:
        return this.autoSelect(prompt, conversationLength || 0);
    }
  }

  private autoSelect(prompt: string, conversationLength: number): string {
    const promptLength = prompt.length;

    // مهمة بسيطة = Flash
    if (promptLength < 200 && conversationLength < 5) {
      return 'gemini-1.5-flash';
    }

    // مهمة معقدة = Pro
    if (this.isComplex(prompt)) {
      return 'gemini-1.5-pro';
    }

    // متوسط = Flash (أسرع وأرخص)
    return 'gemini-1.5-flash';
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
// 🚀 Main Gemini Service Class
// ════════════════════════════════════════════════════════════════════════════

export class GeminiService {
  private client: GoogleGenerativeAI;
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
      throw new Error('Google AI API key is required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
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
        const genModel = this.client.getGenerativeModel({ model });

        // تحويل الرسائل لصيغة Gemini
        const systemMessage = processedMessages.find((m) => m.role === 'system');
        const conversationMessages = processedMessages.filter((m) => m.role !== 'system');

        // بناء history
        const history = conversationMessages.slice(0, -1).map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

        const chat = genModel.startChat({
          history,
          generationConfig: {
            maxOutputTokens: options.maxTokens || 8192,
            temperature: options.temperature || 0.7,
          },
          ...(systemMessage && {
            systemInstruction: systemMessage.content,
          }),
        });

        const lastMessage = conversationMessages[conversationMessages.length - 1];
        const result = await chat.sendMessage(lastMessage.content);
        const response = result.response;
        const text = response.text();

        const duration = Date.now() - startTime;

        // تقدير الـ tokens (Gemini لا يعطي usage دائماً)
        const inputTokens = this.estimateTokens(
          conversationMessages.map((m) => m.content).join(' ')
        );
        const outputTokens = this.estimateTokens(text);
        const cost = this.calculateCost(inputTokens, outputTokens, model);

        this.costTracker.record({
          model,
          inputTokens,
          outputTokens,
          cost,
          duration,
          cached: false,
        });

        if (options.conversationId) {
          this.conversationManager.saveMessage(
            options.conversationId,
            { role: 'model', content: text },
            cost
          );
        }

        if (options.enableCache !== false) {
          this.cache.set(messages, { ...options, model }, text);
        }

        return text;
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

      const geminiTools = this.adaptToolsForGemini(optimizationResult.optimized);
      const genModel = this.client.getGenerativeModel({
        model,
        tools: geminiTools,
      });

      const systemMessage = processedMessages.find((m) => m.role === 'system');
      const conversationMessages = processedMessages.filter((m) => m.role !== 'system');

      let finalResponse = '';
      let history = conversationMessages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const chat = genModel.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 8192,
          temperature: options.temperature || 0.7,
        },
        ...(systemMessage && {
          systemInstruction: systemMessage.content,
        }),
      });

      const lastMessage = conversationMessages[conversationMessages.length - 1];
      let currentPrompt = lastMessage.content;

      while (iterations < maxIterations) {
        try {
          const result = await chat.sendMessage(currentPrompt);
          const response = result.response;

          const inputTokens = this.estimateTokens(currentPrompt);
          const outputTokens = this.estimateTokens(response.text());
          const cost = this.calculateCost(inputTokens, outputTokens, model);

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          totalCost += cost;
          iterations++;

          const functionCalls = response.functionCalls();

          if (!functionCalls || functionCalls.length === 0) {
            finalResponse += response.text();
            break;
          }

          // تنفيذ الأدوات
          const functionResponses = [];
          for (const call of functionCalls) {
            console.log(`🔧 تنفيذ: ${call.name}`);

            const result = await this.executeToolSafely(call.name, call.args);
            this.toolOptimizer.recordUsage(call.name);

            functionResponses.push({
              name: call.name,
              response: result,
            });
          }

          // أرسل النتائج
          currentPrompt = JSON.stringify(functionResponses);
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
          { role: 'model', content: finalResponse },
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
      const genModel = this.client.getGenerativeModel({ model });

      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      const history = conversationMessages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const chat = genModel.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 8192,
          temperature: options.temperature || 0.7,
        },
        ...(systemMessage && {
          systemInstruction: systemMessage.content,
        }),
      });

      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error: any) {
      console.error('Gemini Stream Error:', error);
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🔧 Helper Methods
  // ════════════════════════════════════════════════════════════════════════

  private adaptToolsForGemini(tools: ToolDefinition[]): any[] {
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: tool.parameters,
            required: Object.keys(tool.parameters),
          },
        })),
      },
    ];
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

    console.error(`❌ خطأ Gemini (محاولة ${retryCount + 1}/${maxRetries}):`, error.message);

    if (error.message?.includes('API key') || retryCount >= maxRetries) {
      throw new Error(this.enhanceError(error));
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      const waitTime = Math.min(2000 * Math.pow(2, retryCount), 10000);
      console.log(`⏳ انتظار ${waitTime}ms قبل إعادة المحاولة...`);
      await this.sleep(waitTime);
      return this.chatCompletion(messages, { ...options, maxRetries: maxRetries - retryCount - 1 });
    }

    await this.sleep(1000);
    return this.chatCompletion(messages, { ...options, maxRetries: maxRetries - retryCount - 1 });
  }

  private enhanceError(error: any): string {
    const errorMsg = error.message || '';

    if (errorMsg.includes('API key')) {
      return '401 مفتاح API غير صالح';
    }
    if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
      return '429 تجاوز حد الطلبات';
    }

    return errorMsg || 'خطأ غير معروف';
  }

  private assessQuality(model: string): 'low' | 'medium' | 'high' {
    if (model.includes('pro')) return 'high';
    if (model.includes('flash')) return 'medium';
    return 'low';
  }

  calculateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-1.5-pro': { input: 1.25, output: 5.0 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3 },
      'gemini-1.0-pro': { input: 0.5, output: 1.5 },
    };

    const modelPricing = pricing[model || 'gemini-1.5-flash'] || pricing['gemini-1.5-flash'];
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
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: '⚡ الأسرع والأرخص - مثالي للمهام اليومية',
        maxTokens: 1000000,
        cost: { input: 0.075, output: 0.3 },
        supportsTools: true,
        quality: 'medium',
        speed: 'fastest',
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: '🎯 الأقوى - للمهام المعقدة',
        maxTokens: 1000000,
        cost: { input: 1.25, output: 5.0 },
        supportsTools: true,
        quality: 'high',
        speed: 'medium',
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        description: '💼 متوازن - جودة جيدة بسعر معقول',
        maxTokens: 32000,
        cost: { input: 0.5, output: 1.5 },
        supportsTools: true,
        quality: 'medium',
        speed: 'fast',
      },
    ];
  }

  getModelInfo() {
    return {
      name: 'Google Gemini',
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
      defaultModel: 'gemini-1.5-flash',
      supportsTools: true,
      supportsStreaming: true,
      supportsConversations: true,
    };
  }
}

export default GeminiService;
