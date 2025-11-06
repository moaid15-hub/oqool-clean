import dotenv from 'dotenv';
import path from 'path';

// تحميل المتغيرات البيئية
dotenv.config({ 
  path: path.resolve(__dirname, '../../../../.env') 
});

// واجهة مفاتيح API
export interface ApiKeys {
  gemini: string;
  anthropic: string;
  deepseek: string;
  openai: string;
  ollama?: string;
}

// فئة إدارة المفاتيح
export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private keys: ApiKeys;

  private constructor() {
    this.keys = {
      gemini: process.env.GEMINI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      ollama: process.env.OLLAMA_BASE_URL || ''
    };
  }

  // singleton pattern
  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  // التحقق من صحة المفاتيح
  public validateKeys(): boolean {
    return !!(
      this.keys.gemini && 
      this.keys.anthropic && 
      this.keys.deepseek && 
      this.keys.openai
    );
  }

  // استرجاع مفتاح محدد
  public getKey(provider: keyof ApiKeys): string {
    return this.keys[provider] || '';
  }

  // طباعة معلومات المزودين
  public getProvidersInfo() {
    return {
      gemini: { configured: !!this.keys.gemini, type: 'AI Studio' },
      anthropic: { configured: !!this.keys.anthropic, type: 'Claude' },
      deepseek: { configured: !!this.keys.deepseek, type: 'DeepSeek' },
      openai: { configured: !!this.keys.openai, type: 'OpenAI GPT' },
      ollama: { configured: !!this.keys.ollama, type: 'Local AI' }
    };
  }

  // اختيار مزود تلقائي
  public getDefaultProvider(): string {
    const providers = ['gemini', 'anthropic', 'deepseek', 'openai'];
    for (const provider of providers) {
      if (this.keys[provider as keyof ApiKeys]) {
        return provider;
      }
    }
    throw new Error('No API provider configured');
  }
}

// إنشاء نسخة واحدة
export const apiKeyManager = ApiKeyManager.getInstance();

// التصدير للاستخدام في المشروع
export default apiKeyManager;