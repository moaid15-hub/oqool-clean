/**
 * Gemini AI Service (Google)
 * الأسرع والأرخص - ممتاز للمهام المتوسطة والمعقدة
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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

export class GeminiService {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * إرسال رسالة للـ AI
   */
  async chatCompletion(messages: Message[], options: ChatCompletionOptions = {}): Promise<string> {
    const {
      model = 'gemini-2.0-flash-exp', // الأسرع: $0.10/$0.40 per 1M tokens
      maxTokens = 8192,
      temperature = 0.7,
      systemPrompt,
    } = options;

    try {
      // إنشاء model instance
      const genAI = this.client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      // تحويل الرسائل لصيغة Gemini
      const history = messages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const lastMessage = messages[messages.length - 1].content;

      // إضافة system prompt إذا موجود
      const prompt = systemPrompt ? `${systemPrompt}\n\n${lastMessage}` : lastMessage;

      // Start chat with history
      const chat = genAI.startChat({
        history,
      });

      // إرسال الرسالة
      const result = await chat.sendMessage(prompt);
      const response = await result.response;

      return response.text();
    } catch (error: any) {
      // 🔍 تحسين معالجة الأخطاء
      const enhancedError = this.enhanceError(error);
      console.error('Gemini Error:', enhancedError);
      throw new Error(`Gemini failed: ${enhancedError}`);
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
      model = 'gemini-2.0-flash-exp',
      maxTokens = 8192,
      temperature = 0.7,
      systemPrompt,
    } = options;

    try {
      const genAI = this.client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      const history = messages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const lastMessage = messages[messages.length - 1].content;
      const prompt = systemPrompt ? `${systemPrompt}\n\n${lastMessage}` : lastMessage;

      const chat = genAI.startChat({ history });
      const result = await chat.sendMessageStream(prompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error: any) {
      console.error('Gemini Stream Error:', error);
      throw error;
    }
  }

  /**
   * حساب التكلفة التقريبية
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string = 'gemini-2.0-flash-exp'
  ): number {
    // Gemini pricing
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-2.0-flash-exp': {
        input: 0.1, // $0.10 per 1M tokens - الأسرع والأرخص! 💰⚡
        output: 0.4, // $0.40 per 1M tokens
      },
      'gemini-1.5-flash': {
        input: 0.075, // $0.075 per 1M tokens
        output: 0.3, // $0.30 per 1M tokens
      },
      'gemini-1.5-pro': {
        input: 1.25, // $1.25 per 1M tokens
        output: 5.0, // $5.00 per 1M tokens
      },
      'gemini-1.0-pro': {
        input: 0.5, // $0.50 per 1M tokens
        output: 1.5, // $1.50 per 1M tokens
      },
    };

    const modelPricing = pricing[model] || pricing['gemini-2.0-flash-exp'];
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
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        description: '⚡💰 الأسرع والأرخص - موصى به!',
        maxTokens: 1000000,
        cost: { input: 0.1, output: 0.4 },
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'سريع ورخيص - ممتاز للمهام المتوسطة',
        maxTokens: 1000000,
        cost: { input: 0.075, output: 0.3 },
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'قوي للمهام المعقدة',
        maxTokens: 2000000,
        cost: { input: 1.25, output: 5.0 },
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        description: 'متوازن بين السعر والجودة',
        maxTokens: 30720,
        cost: { input: 0.5, output: 1.5 },
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
    if (statusCode === 401 || errorMsg.includes('API key') || errorMsg.includes('authentication')) {
      return '401 Invalid API key - Check your Gemini API key';
    }
    if (statusCode === 403) {
      return '403 Access Forbidden - Check API key permissions';
    }
    if (statusCode === 429) {
      return '429 Rate Limit Exceeded - Too many requests';
    }
    if (statusCode === 500 || statusCode === 503) {
      return `${statusCode} Server Error - Gemini API is temporarily unavailable`;
    }

    // رسائل الخطأ من الـ API
    if (error.error?.message) {
      return `${statusCode || 'Unknown'} ${error.error.message}`;
    }

    // أخطاء الشبكة
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
      return 'Network Error - Cannot reach Gemini API';
    }

    return errorMsg || 'Unknown error occurred';
  }

  /**
   * الحصول على معلومات النموذج
   */
  getModelInfo() {
    return {
      name: 'Gemini (Google)',
      model: 'gemini-2.0-flash-exp',
      maxTokens: 1000000,
      costPer1MTokens: {
        input: 0.1,
        output: 0.4,
      },
      description: '⚡💰 الأسرع والأرخص - ممتاز للبرمجة',
      strengths: ['سريع جداً', 'رخيص جداً', 'ممتاز في البرمجة', 'context كبير (1M tokens)'],
      weaknesses: ['أقل ذكاءً من GPT-4o/Claude Opus'],
    };
  }
}

export default GeminiService;
