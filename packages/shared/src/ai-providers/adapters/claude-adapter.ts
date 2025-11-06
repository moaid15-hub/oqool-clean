import Anthropic from '@anthropic-ai/sdk';
import { BaseAdapter } from './base-adapter';
import { ProviderCapabilities, PricingInfo } from '../interfaces/iai-provider.interface';
import { UnifiedMessage, UnifiedTool, UnifiedResponse, UnifiedToolCall } from '../interfaces/unified-types.interface';
import { ErrorHandler } from '../utils/error-handler';

export class ClaudeAdapter extends BaseAdapter {
  private client: Anthropic;

  constructor(apiKey: string, config: any = {}) {
    super('claude', apiKey, config);
    this.client = new Anthropic({ apiKey });
    this.defaultModel = config.defaultModel || 'claude-3-haiku-20240307';
  }

  async chat(messages: UnifiedMessage[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    try {
      const claudeMessages = this.toClaudeFormat(messages);
      const systemMessage = this.extractSystemMessage(messages);

      const response = await this.client.messages.create({
        model: this.defaultModel,
        messages: claudeMessages,
        system: systemMessage || undefined,
        max_tokens: 4096
      });

      const duration = Date.now() - startTime;
      return this.fromClaudeFormat(response, duration);
    } catch (error: any) {
      throw this.normalizeError(error);
    }
  }

  async chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse> {
    const startTime = Date.now();

    try {
      const claudeMessages = this.toClaudeFormat(messages);
      const systemMessage = this.extractSystemMessage(messages);
      const claudeTools = this.toClaudeTools(tools);

      const response = await this.client.messages.create({
        model: this.defaultModel,
        messages: claudeMessages,
        system: systemMessage || undefined,
        tools: claudeTools,
        max_tokens: 4096
      });

      const duration = Date.now() - startTime;
      return this.fromClaudeFormat(response, duration);
    } catch (error: any) {
      throw this.normalizeError(error);
    }
  }

  async *streamChat(messages: UnifiedMessage[]): AsyncGenerator<string> {
    const claudeMessages = this.toClaudeFormat(messages);
    const systemMessage = this.extractSystemMessage(messages);

    const stream = await this.client.messages.stream({
      model: this.defaultModel,
      messages: claudeMessages,
      system: systemMessage || undefined,
      max_tokens: 4096
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      availableModels: [
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229'
      ],
      maxTokens: 200000,
      maxToolsPerCall: 10
    };
  }

  getPricing(): PricingInfo {
    return {
      inputCostPerToken: 0.25 / 1_000_000, // $0.25 per 1M tokens
      outputCostPerToken: 1.25 / 1_000_000, // $1.25 per 1M tokens
      currency: 'USD',
      modelPricing: {
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
        'claude-3-opus-20240229': { input: 15.0, output: 75.0 }
      }
    };
  }

  // /H'D *-HJD .'5) (@ Claude
  private toClaudeFormat(messages: UnifiedMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  private fromClaudeFormat(response: any, duration: number): UnifiedResponse {
    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const toolCalls = this.extractToolCalls(response);

    return {
      content,
      toolCalls,
      metadata: {
        provider: 'claude',
        model: response.model,
        cost: this.calculateCostFromUsage(response.usage),
        tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0,
        duration,
        stopReason: response.stop_reason
      }
    };
  }

  private extractToolCalls(response: any): UnifiedToolCall[] | undefined {
    const toolUses = response.content.filter((c: any) => c.type === 'tool_use');
    if (toolUses.length === 0) return undefined;

    return toolUses.map((tu: any) => ({
      id: tu.id,
      name: tu.name,
      arguments: tu.input
    }));
  }

  private toClaudeTools(tools: UnifiedTool[]): any[] {
    return tools.map(tool => {
      const properties: Record<string, any> = {};

      // تحويل المعاملات لصيغة Claude
      Object.entries(tool.parameters).forEach(([key, param]) => {
        properties[key] = {
          type: param.type,
          description: param.description,
          ...(param.enum && { enum: param.enum }),
          ...(param.items && { items: param.items }),
          ...(param.properties && { properties: param.properties })
        };
      });

      return {
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object",
          properties,
          required: tool.required || []
        }
      };
    });
  }

  private calculateCostFromUsage(usage: any): number {
    const pricing = this.getPricing();
    const modelPricing = pricing.modelPricing[this.defaultModel] || { input: 0.25, output: 1.25 };

    return ((usage.input_tokens * modelPricing.input) +
            (usage.output_tokens * modelPricing.output)) / 1_000_000;
  }

  private normalizeError(error: any): Error {
    return ErrorHandler.normalizeError(error, 'claude');
  }

  // تنفيذ الدوال المطلوبة من IAIProvider
  async validate(): Promise<boolean> {
    try {
      // اختبار بسيط للتحقق من صحة API Key
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      return !!response;
    } catch (error) {
      return false;
    }
  }

  estimateCost(messages: any[]): { estimatedInputTokens: number; estimatedOutputTokens: number; estimatedCost: number; currency: string } {
    // تقدير بسيط: ~4 حرف = 1 token
    const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(totalChars / 4);
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.5); // افتراض الرد نصف حجم السؤال

    const pricing = this.getPricing();
    const modelPricing = pricing.modelPricing[this.defaultModel] || { input: 0.25, output: 1.25 };

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
}
