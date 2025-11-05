/**
 * Claude AI Service (Anthropic)
 * الأفضل جودة - للمهام المعقدة والحرجة
 */

import Anthropic from '@anthropic-ai/sdk';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class ClaudeService {
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * إرسال رسالة للـ AI
   */
  async chatCompletion(messages: Message[], options: ChatCompletionOptions = {}): Promise<string> {
    const {
      model = 'claude-3-haiku-20240307', // الأرخص: $0.25/$1.25 per 1M tokens
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt,
    } = options;

    try {
      // تحويل الرسائل لصيغة Claude
      const claudeMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt && { system: systemPrompt }),
        messages: claudeMessages,
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error: any) {
      // 🔍 تحسين معالجة الأخطاء
      const enhancedError = this.enhanceError(error);
      console.error('Claude Error:', enhancedError);
      throw new Error(`Claude failed: ${enhancedError}`);
    }
  }

  /**
   * Streaming Response
   */
  async *chatCompletionStream(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      model = 'claude-3-haiku-20240307', // الأرخص: $0.25/$1.25 per 1M tokens
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt,
    } = options;

    try {
      const claudeMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const stream = await this.client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
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

  /**
   * حساب التكلفة التقريبية
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string = 'claude-3-haiku-20240307'
  ): number {
    // Claude pricing
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-haiku-20240307': {
        input: 0.25, // $0.25 per 1M tokens - الأرخص! 💰
        output: 1.25, // $1.25 per 1M tokens
      },
      'claude-3-5-sonnet-20241022': {
        input: 3.0, // $3 per 1M tokens
        output: 15.0, // $15 per 1M tokens
      },
      'claude-3-opus-20240229': {
        input: 15.0, // $15 per 1M tokens
        output: 75.0, // $75 per 1M tokens
      },
      'claude-3-sonnet-20240229': {
        input: 3.0, // $3 per 1M tokens
        output: 15.0, // $15 per 1M tokens
      },
    };

    const modelPricing = pricing[model] || pricing['claude-3-haiku-20240307'];
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * التحقق من صلاحية الـ API Key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.chatCompletion([{ role: 'user', content: 'Hello' }], { maxTokens: 10 });
      return true;
    } catch (error) {
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
        description: '💰 الأرخص والأسرع - موصى به للاختبار',
        maxTokens: 200000,
        cost: { input: 0.25, output: 1.25 },
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'الأذكى - للمهام المعقدة',
        maxTokens: 200000,
        cost: { input: 3.0, output: 15.0 },
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'الأقوى للمهام شديدة التعقيد',
        maxTokens: 200000,
        cost: { input: 15.0, output: 75.0 },
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'متوازن بين الجودة والسرعة',
        maxTokens: 200000,
        cost: { input: 3.0, output: 15.0 },
      },
    ];
  }

  /**
   * 🔍 تحسين رسائل الخطأ
   */
  private enhanceError(error: any): string {
    const errorMsg = error.message || '';
    const statusCode = error.status || error.statusCode;

    // معالجة أخطاء API المعروفة
    if (
      statusCode === 401 ||
      errorMsg.includes('authentication') ||
      errorMsg.includes('invalid x-api-key')
    ) {
      return '401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}';
    }
    if (statusCode === 403) {
      return '403 Access Forbidden - Check API key permissions';
    }
    if (statusCode === 429) {
      return '429 Rate Limit Exceeded - Too many requests or insufficient credits';
    }
    if (statusCode === 500 || statusCode === 503) {
      return `${statusCode} Server Error - Claude API is temporarily unavailable`;
    }

    // رسائل الخطأ من الـ API
    if (error.error?.message) {
      return `${statusCode || 'Unknown'} ${JSON.stringify(error.error)}`;
    }

    // أخطاء الشبكة
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
      return 'Network Error - Cannot reach Claude API';
    }

    return errorMsg || 'Unknown error occurred';
  }

  /**
   * الحصول على معلومات النموذج
   */
  getModelInfo() {
    return {
      name: 'Claude (Anthropic)',
      model: 'claude-3-haiku-20240307',
      maxTokens: 200000,
      costPer1MTokens: {
        input: 0.25,
        output: 1.25,
      },
      description: '💰 أرخص نموذج Claude - ممتاز للاختبار',
      strengths: ['رخيص جداً', 'سريع', 'جيد في البرمجة', 'أرخص 12x من Sonnet'],
      weaknesses: ['أقل ذكاءً من Sonnet/Opus'],
    };
  }
}

export default ClaudeService;
