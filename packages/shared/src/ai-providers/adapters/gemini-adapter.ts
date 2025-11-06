import { BaseAdapter } from './base-adapter';
import { ProviderCapabilities, PricingInfo } from '../interfaces/iai-provider.interface';
import { UnifiedMessage, UnifiedTool, UnifiedResponse } from '../interfaces/unified-types.interface';

/**
 * E-HD Gemini - ,'G2 DDE3*B(D
 * G0' 'DE-HD ,'G2 DD*C'ED E9 Google Gemini API
 */
export class GeminiAdapter extends BaseAdapter {
  constructor(apiKey: string, config: any = {}) {
    super('gemini', apiKey, config);
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1';
    this.defaultModel = config.defaultModel || 'gemini-pro';
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    throw new Error('Gemini adapter is not implemented yet. Coming soon!');
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    throw new Error('Gemini adapter is not implemented yet. Coming soon!');
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    throw new Error('Gemini adapter is not implemented yet. Coming soon!');
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: true,
      availableModels: ['gemini-pro', 'gemini-pro-vision'],
      maxTokens: 30720,
      maxToolsPerCall: 10
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.125 / 1_000_000,
      outputCostPerToken: 0.375 / 1_000_000,
      currency: 'USD',
      modelPricing: {
        'gemini-pro': { input: 0.125, output: 0.375 },
        'gemini-pro-vision': { input: 0.25, output: 0.5 }
      }
    };
  }

  async validate(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('test');
      return !!result;
    } catch (error) {
      return false;
    }
  }

  estimateCost(messages: any[]): { estimatedInputTokens: number; estimatedOutputTokens: number; estimatedCost: number; currency: string } {
    const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(totalChars / 4);
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.5);

    const pricing = this.getPricing();
    const estimatedCost =
      (estimatedInputTokens * pricing.inputCostPerToken) +
      (estimatedOutputTokens * pricing.outputCostPerToken);

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost,
      currency: 'USD'
    };
  }
}
