import { BaseAdapter } from './base-adapter';
import { ProviderCapabilities, PricingInfo } from '../interfaces/iai-provider.interface';
import { UnifiedMessage, UnifiedTool, UnifiedResponse } from '../interfaces/unified-types.interface';
import { ErrorHandler } from '../utils/error-handler';

export class DeepSeekAdapter extends BaseAdapter {
  constructor(apiKey: string, config: any = {}) {
    super('deepseek', apiKey, config);
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
    this.defaultModel = config.defaultModel || 'deepseek-chat';
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: this.toDeepSeekFormat(messages),
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API Error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      return this.fromDeepSeekFormat(data, duration);
    } catch (error: any) {
      throw this.normalizeError(error);
    }
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    // DeepSeek D' J/9E Tools 13EJ'K F3*./E E-'C')
    const enhancedMessages = this.simulateToolsInMessages(messages, tools);
    return this.chat(enhancedMessages);
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: this.toDeepSeekFormat(messages),
          max_tokens: 4096,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // *,'GD 'D#.7'! AJ *-DJD JSON
          }
        }
      }
    } catch (error: any) {
      throw this.normalizeError(error);
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: false, // L D' J/9E Tools 13EJ'K
      supportsStreaming: true,
      supportsVision: false,
      availableModels: ['deepseek-chat', 'deepseek-coder'],
      maxTokens: 32768,
      maxToolsPerCall: 0
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.14 / 1_000_000, // $0.14 per 1M tokens
      outputCostPerToken: 0.28 / 1_000_000, // $0.28 per 1M tokens
      currency: 'USD',
      modelPricing: {
        'deepseek-chat': { input: 0.14, output: 0.28 },
        'deepseek-coder': { input: 0.14, output: 0.28 }
      }
    };
  }

  // E-'C') 'D#/H'* D@ DeepSeek
  private simulateToolsInMessages(messages: UnifiedMessage[], tools: UnifiedTool[]): UnifiedMessage[] {
    const toolDescriptions = tools.map(tool =>
      `${tool.name}: ${tool.description}`
    ).join('\n');

    const systemMessage: UnifiedMessage = {
      role: 'system',
      content: `JECFC '3*./'E 'D#/H'* 'D*'DJ):\n${toolDescriptions}\n\n9F/ 'D-',) D'3*./'E #/') '0C1 '3EG' HH3J7'*G'.`
    };

    return [systemMessage, ...messages];
  }

  private toDeepSeekFormat(messages: UnifiedMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  private fromDeepSeekFormat(response: any, duration: number): UnifiedResponse {
    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || {};

    return {
      content,
      metadata: {
        provider: 'deepseek',
        model: response.model,
        cost: this.calculateCostFromUsage(usage),
        tokens: usage.total_tokens || 0,
        duration,
        stopReason: response.choices[0]?.finish_reason
      }
    };
  }

  private calculateCostFromUsage(usage: any): number {
    const pricing = this.getPricing();
    // pricing.inputCostPerToken already divided by 1M, so just multiply by token count
    return (usage.prompt_tokens * pricing.inputCostPerToken) +
           (usage.completion_tokens * pricing.outputCostPerToken);
  }

  private normalizeError(error: any): Error {
    return ErrorHandler.normalizeError(error, 'deepseek');
  }
}
