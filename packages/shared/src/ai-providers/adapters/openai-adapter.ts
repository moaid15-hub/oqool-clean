// ============================================
// 🤖 OpenAI Adapter - محول OpenAI
// ============================================

import type {
  IAIProvider,
  ProviderCapabilities,
  PricingInfo,
  ProviderStatus,
  CostEstimate
} from '../interfaces/iai-provider.interface.js';
import type { UnifiedMessage, UnifiedTool, UnifiedResponse } from '../interfaces/unified-types.interface.js';
import { ErrorHandler } from '../utils/error-handler.js';

export class OpenAIAdapter implements IAIProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.defaultModel = model;
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      return {
        content: data.choices[0].message.content,
        metadata: {
          provider: 'openai',
          model: data.model,
          cost: this.calculateCostFromUsage(data.usage),
          tokens: data.usage.total_tokens,
          duration,
          stopReason: data.choices[0].finish_reason
        }
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          tools: this.toOpenAITools(tools)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      return {
        content: data.choices[0].message.content || '',
        toolCalls: this.extractToolCalls(data.choices[0].message),
        metadata: {
          provider: 'openai',
          model: data.model,
          cost: this.calculateCostFromUsage(data.usage),
          tokens: data.usage.total_tokens,
          duration,
          stopReason: data.choices[0].finish_reason
        }
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    throw new Error('Streaming not yet implemented for OpenAI');
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: this.defaultModel.includes('vision'),
      availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      maxTokens: 128000,
      maxToolsPerCall: 20
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.15 / 1_000_000,
      outputCostPerToken: 0.6 / 1_000_000,
      currency: 'USD',
      modelPricing: {
        'gpt-4o-mini': { input: 0.15, output: 0.6 },
        'gpt-4o': { input: 2.5, output: 10 },
        'gpt-4-turbo': { input: 10, output: 30 }
      }
    };
  }

  getStatus(): ProviderStatus {
    return {
      available: true,
      latency: 0,
      lastChecked: new Date(),
      rateLimitRemaining: 10000
    };
  }

  async validate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  estimateCost(messages: UnifiedMessage[]): CostEstimate {
    const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(totalChars / 4);
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.5);

    const pricing = this.getPricing();
    const modelPricing = pricing.modelPricing[this.defaultModel] || { input: 0.15, output: 0.6 };
    const estimatedCost =
      (estimatedInputTokens * modelPricing.input / 1_000_000) +
      (estimatedOutputTokens * modelPricing.output / 1_000_000);

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost,
      currency: 'USD'
    };
  }

  private toOpenAITools(tools: UnifiedTool[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: tool.required || []
        }
      }
    }));
  }

  private extractToolCalls(message: any): any[] | undefined {
    if (!message.tool_calls) return undefined;

    return message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }));
  }

  private calculateCostFromUsage(usage: any): number {
    const pricing = this.getPricing();
    const modelPricing = pricing.modelPricing[this.defaultModel] || { input: 0.15, output: 0.6 };

    return ((usage.prompt_tokens * modelPricing.input) +
            (usage.completion_tokens * modelPricing.output)) / 1_000_000;
  }

  private normalizeError(error: any): Error {
    return ErrorHandler.normalizeError(error, 'openai');
  }
}
