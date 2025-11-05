// api-client.ts
// ============================================
// 🌐 عميل API للاتصال بـ Backend
// ============================================

import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';
import { loadConfig } from './auth.js';
import { createLocalClaudeClient } from './local-oqool-client.js';
import dotenv from 'dotenv';

// تحميل متغيرات البيئة
dotenv.config();

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  provider?: string;
  temperature?: number;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  usedProvider?: string;
  error?: string;
}

export interface VerifyKeyResponse {
  success: boolean;
  userId?: string;
  email?: string;
  plan?: string;
  remainingMessages?: number;
  error?: string;
}

export class OqoolAPIClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = 'https://oqool.net') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-Client': 'oqool-code-cli',
        'X-Client-Version': '1.0.0',
      },
    });
  }

  // التحقق من صحة API Key
  async verifyApiKey(): Promise<VerifyKeyResponse> {
    try {
      // وضع التطوير
      if (this.apiKey === 'dev_mode') {
        return {
          success: true,
          userId: 'dev_user',
          email: 'developer@oqool.net',
          plan: 'Development (Unlimited)',
          remainingMessages: 999999,
        };
      }

      const response = await this.client.post('/api/verify-key', {
        apiKey: this.apiKey,
      });

      return response.data;
    } catch (error: any) {
      console.error(chalk.red('❌ خطأ في التحقق من المفتاح:'), error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // إرسال رسالة للذكاء الاصطناعي
  async sendChatMessage(messages: Message[], provider?: string): Promise<ChatResponse> {
    try {
      const response = await this.client.post('/api/chat', {
        messages,
        provider: provider || 'auto', // استخدام الاختيار الذكي
      });

      return response.data;
    } catch (error: any) {
      console.error(chalk.red('❌ خطأ في إرسال الرسالة:'), error.message);
      return {
        success: false,
        message: '',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // إرسال كود مع سياق الملفات
  async generateCode(
    prompt: string,
    fileContext: { path: string; content: string }[]
  ): Promise<ChatResponse> {
    try {
      // بناء رسالة System مع سياق الملفات
      const contextMessage = this.buildContextMessage(fileContext);

      const messages: Message[] = [
        {
          role: 'system',
          content: `أنت مساعد برمجة ذكي. مهمتك كتابة وتعديل الأكواد بشكل احترافي.

${contextMessage}

تعليمات مهمة:
1. اكتب كود نظيف ومنظم
2. أضف تعليقات عربية واضحة
3. استخدم أفضل الممارسات
4. إذا طلب المستخدم تعديل ملف موجود، احتفظ بالبنية العامة
5. اذكر أسماء الملفات بوضوح في ردك`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      return await this.sendChatMessage(messages, 'claude'); // نستخدم Claude للبرمجة
    } catch (error: any) {
      console.error(chalk.red('❌ خطأ في توليد الكود:'), error.message);
      return {
        success: false,
        message: '',
        error: error.message,
      };
    }
  }

  // بناء رسالة السياق من الملفات
  private buildContextMessage(fileContext: { path: string; content: string }[]): string {
    if (fileContext.length === 0) {
      return 'لا توجد ملفات في السياق الحالي.';
    }

    let context = '📂 الملفات الموجودة في المشروع:\n\n';

    for (const file of fileContext) {
      context += `### ${file.path}\n`;
      context += '```\n';
      context += file.content.substring(0, 5000); // حد أقصى 5000 حرف لكل ملف
      if (file.content.length > 5000) {
        context += '\n... (الملف أطول من ذلك)';
      }
      context += '\n```\n\n';
    }

    return context;
  }
}

// إنشاء عميل API من التكوين المحفوظ
export async function createClientFromConfig(): Promise<any | null> {
  // الأولوية لـ ANTHROPIC_API_KEY (اتصال مباشر بـ Claude)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log(chalk.cyan('🔗 استخدام Claude API مباشرة...\n'));
    const localClient = createLocalClaudeClient();
    if (localClient) {
      return localClient;
    }
  }

  // إذا لم يتوفر، استخدام backend server
  const config = await loadConfig();

  if (!config || !config.apiKey) {
    console.log(chalk.yellow('⚠️  لم تسجل دخول بعد'));
    console.log(chalk.cyan('استخدم: oqool login <API_KEY>'));
    console.log(chalk.gray('أو أضف ANTHROPIC_API_KEY في ملف .env'));
    return null;
  }

  return new OqoolAPIClient(config.apiKey, config.apiUrl);
}
