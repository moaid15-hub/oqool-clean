// ============================================
// 🚀 Simple AI Providers - بدون تعقيدات
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import type { IAIProvider, ProviderCapabilities, PricingInfo, ProviderStatus, CostEstimate } from './interfaces/iai-provider.interface';
import type { UnifiedMessage, UnifiedResponse, UnifiedTool } from './interfaces/unified-types.interface';

// ============================================
// 🤖 Claude Provider
// ============================================
export class SimpleClaudeProvider implements IAIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-haiku-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const systemMessage = messages.find(m => m.role === 'system')?.content;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: anthropicMessages,
      ...(systemMessage && { system: systemMessage })
    });

    const duration = Date.now() - startTime;
    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      metadata: {
        provider: 'claude',
        model: this.model,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
        tokens: response.usage.input_tokens + response.usage.output_tokens,
        duration,
        stopReason: response.stop_reason || undefined
      }
    };
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    return this.chat(messages);
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    yield* ['مرحباً'];
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      availableModels: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
      maxTokens: 8192,
      maxToolsPerCall: 10
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.25 / 1_000_000,
      outputCostPerToken: 1.25 / 1_000_000,
      currency: 'USD',
      modelPricing: {}
    };
  }

  getStatus(): ProviderStatus {
    return {
      available: true,
      latency: 0,
      lastChecked: new Date(),
      rateLimitRemaining: 1000
    };
  }

  async validate(): Promise<boolean> {
    return true;
  }

  estimateCost(messages: UnifiedMessage[]): CostEstimate {
    const estimatedInputTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0);
    return {
      estimatedInputTokens,
      estimatedOutputTokens: 500,
      estimatedCost: this.calculateCost(estimatedInputTokens, 500),
      currency: 'USD'
    };
  }
}

// ============================================
// 🤖 Gemini Provider
// ============================================
export class SimpleGeminiProvider implements IAIProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash-latest') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    const duration = Date.now() - startTime;

    // تقدير تقريبي للـ tokens
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(content.length / 4);

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
      },
      metadata: {
        provider: 'gemini',
        model: this.modelName,
        cost: this.calculateCost(inputTokens, outputTokens),
        tokens: inputTokens + outputTokens,
        duration
      }
    };
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    return this.chat(messages);
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    yield* ['مرحباً'];
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.075 + outputTokens * 0.30) / 1_000_000;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: true,
      availableModels: ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'],
      maxTokens: 8192,
      maxToolsPerCall: 10
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.075 / 1_000_000,
      outputCostPerToken: 0.30 / 1_000_000,
      currency: 'USD',
      modelPricing: {}
    };
  }

  getStatus(): ProviderStatus {
    return {
      available: true,
      latency: 0,
      lastChecked: new Date(),
      rateLimitRemaining: 1000
    };
  }

  async validate(): Promise<boolean> {
    return true;
  }

  estimateCost(messages: UnifiedMessage[]): CostEstimate {
    const estimatedInputTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0);
    return {
      estimatedInputTokens,
      estimatedOutputTokens: 500,
      estimatedCost: this.calculateCost(estimatedInputTokens, 500),
      currency: 'USD'
    };
  }
}

// ============================================
// 🤖 OpenAI Provider
// ============================================
export class SimpleOpenAIProvider implements IAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    const openaiMessages = messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      max_tokens: 1024
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      metadata: {
        provider: 'openai',
        model: this.model,
        cost: this.calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0),
        tokens: response.usage?.total_tokens || 0,
        duration,
        stopReason: response.choices[0]?.finish_reason || undefined
      }
    };
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    return this.chat(messages);
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    yield* ['مرحباً'];
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      availableModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      maxTokens: 4096,
      maxToolsPerCall: 10
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.15 / 1_000_000,
      outputCostPerToken: 0.60 / 1_000_000,
      currency: 'USD',
      modelPricing: {}
    };
  }

  getStatus(): ProviderStatus {
    return {
      available: true,
      latency: 0,
      lastChecked: new Date(),
      rateLimitRemaining: 1000
    };
  }

  async validate(): Promise<boolean> {
    return true;
  }

  estimateCost(messages: UnifiedMessage[]): CostEstimate {
    const estimatedInputTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0);
    return {
      estimatedInputTokens,
      estimatedOutputTokens: 500,
      estimatedCost: this.calculateCost(estimatedInputTokens, 500),
      currency: 'USD'
    };
  }
}

// ============================================
// 🤖 DeepSeek Provider
// ============================================
export class SimpleDeepSeekProvider implements IAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'deepseek-chat') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com'
    });
    this.model = model;
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    const deepseekMessages = messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: deepseekMessages,
      max_tokens: 1024
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      metadata: {
        provider: 'deepseek',
        model: this.model,
        cost: this.calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0),
        tokens: response.usage?.total_tokens || 0,
        duration,
        stopReason: response.choices[0]?.finish_reason || undefined
      }
    };
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    return this.chat(messages);
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    yield* ['مرحباً'];
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.14 + outputTokens * 0.28) / 1_000_000;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      availableModels: ['deepseek-chat'],
      maxTokens: 4096,
      maxToolsPerCall: 10
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.14 / 1_000_000,
      outputCostPerToken: 0.28 / 1_000_000,
      currency: 'USD',
      modelPricing: {}
    };
  }

  getStatus(): ProviderStatus {
    return {
      available: true,
      latency: 0,
      lastChecked: new Date(),
      rateLimitRemaining: 1000
    };
  }

  async validate(): Promise<boolean> {
    return true;
  }

  estimateCost(messages: UnifiedMessage[]): CostEstimate {
    const estimatedInputTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0);
    return {
      estimatedInputTokens,
      estimatedOutputTokens: 500,
      estimatedCost: this.calculateCost(estimatedInputTokens, 500),
      currency: 'USD'
    };
  }
}
