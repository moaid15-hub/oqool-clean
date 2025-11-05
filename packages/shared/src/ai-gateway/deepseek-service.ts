/**
 * DeepSeek AI Service
 * المزود الأرخص - مناسب للمهام البسيطة والمتوسطة
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export class DeepSeekService {
  private apiKey: string;
  private baseURL: string = 'https://api.deepseek.com/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * إرسال رسالة للـ AI
   */
  async chatCompletion(messages: Message[], options: ChatCompletionOptions = {}): Promise<string> {
    const {
      model = 'deepseek-chat',
      maxTokens = 4096,
      temperature = 0.7,
      stream = false,
    } = options;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream,
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(`DeepSeek API Error: ${error.error?.message || response.statusText}`);
      }

      const data: any = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from DeepSeek');
      }

      return data.choices[0].message.content;
    } catch (error: any) {
      console.error('DeepSeek Error:', error);
      throw new Error(`DeepSeek failed: ${error.message}`);
    }
  }

  /**
   * Streaming Response
   */
  async *chatCompletionStream(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const { model = 'deepseek-chat', maxTokens = 4096, temperature = 0.7 } = options;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      console.error('DeepSeek Stream Error:', error);
      throw error;
    }
  }

  /**
   * حساب التكلفة التقريبية
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    // DeepSeek pricing (very cheap!)
    const inputCost = (inputTokens / 1_000_000) * 0.14; // $0.14 per 1M tokens
    const outputCost = (outputTokens / 1_000_000) * 0.28; // $0.28 per 1M tokens
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
   * الحصول على معلومات النموذج
   */
  getModelInfo() {
    return {
      name: 'DeepSeek',
      model: 'deepseek-chat',
      maxTokens: 32768,
      costPer1MTokens: {
        input: 0.14,
        output: 0.28,
      },
      description: 'نموذج رخيص وسريع مناسب للمهام العامة',
      strengths: ['سعر منخفض جداً', 'سريع', 'جودة جيدة للمهام البسيطة'],
      weaknesses: ['أقل ذكاءً من Claude/GPT-4 في المهام المعقدة'],
    };
  }
}

export default DeepSeekService;
