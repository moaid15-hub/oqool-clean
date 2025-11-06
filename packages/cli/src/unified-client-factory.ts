// unified-client-factory.ts
// ============================================
// 🏭 مصنع موحد للـ AI Clients - يدعم جميع المزودين
// ============================================

import { UnifiedAIAdapter, UnifiedAIAdapterConfig } from '@oqool/shared/ai-gateway';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Client موحد يحاكي واجهة OqoolAPIClient
 * لكن يستخدم UnifiedAIAdapter داخلياً
 */
export class UnifiedOqoolClient {
  private adapter: UnifiedAIAdapter;
  private provider: string;

  constructor(adapter: UnifiedAIAdapter, provider: string = 'auto') {
    this.adapter = adapter;
    this.provider = provider;
  }

  /**
   * توليد كود مع سياق الملفات
   */
  async generateCode(
    prompt: string,
    fileContext: { path: string; content: string }[]
  ): Promise<{
    success: boolean;
    message: string;
    usedProvider?: string;
    error?: string;
  }> {
    try {
      // بناء السياق
      const contextMessage = this.buildContextMessage(fileContext);

      // بناء الـ prompt الكامل
      const fullPrompt = `${contextMessage}\n\n**المهمة:**\n${prompt}`;

      const systemPrompt = `أنت Oqool - أداة ذكاء اصطناعي متخصصة بالبرمجة.

## 🎯 مهمتك:
كتابة وتعديل الأكواد بشكل احترافي بناءً على طلب المستخدم.

## 📋 قواعد الرد:
1. اكتب كود نظيف ومنظم
2. أضف تعليقات عربية واضحة
3. استخدم أفضل الممارسات
4. احتفظ بالبنية العامة للملفات الموجودة
5. اذكر أسماء الملفات بوضوح

## 💡 تنسيق الكود:
عند كتابة كود جديد أو تعديل موجود، استخدم هذا التنسيق:

\`\`\`لغة:مسار/الملف
// الكود هنا
\`\`\`

مثال:
\`\`\`typescript:src/utils/helper.ts
export function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

كن مساعد برمجة محترف!`;

      // إرسال للـ AI
      const response = await this.adapter.process(fullPrompt, systemPrompt, this.provider as any);

      return {
        success: true,
        message: response.response,
        usedProvider: `${response.provider} (${response.model})`,
      };
    } catch (error: any) {
      console.error(chalk.red('❌ خطأ في توليد الكود:'), error.message);
      return {
        success: false,
        message: '',
        error: error.message,
      };
    }
  }

  /**
   * إرسال رسالة عادية للـ AI
   */
  async sendChatMessage(
    messages: Array<{ role: string; content: string }>,
    provider?: string
  ): Promise<{
    success: boolean;
    message: string;
    usedProvider?: string;
    error?: string;
  }> {
    try {
      // استخراج آخر رسالة من المستخدم
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        throw new Error('لا توجد رسالة من المستخدم');
      }

      // استخراج system message إذا وجدت
      const systemMessage = messages.find(m => m.role === 'system');
      const context = systemMessage?.content || '';

      // إرسال للـ AI
      const response = await this.adapter.process(
        lastUserMessage.content,
        context,
        (provider || this.provider) as any
      );

      return {
        success: true,
        message: response.response,
        usedProvider: `${response.provider} (${response.model})`,
      };
    } catch (error: any) {
      console.error(chalk.red('❌ خطأ في إرسال الرسالة:'), error.message);
      return {
        success: false,
        message: '',
        error: error.message,
      };
    }
  }

  /**
   * بناء رسالة السياق من الملفات
   */
  private buildContextMessage(fileContext: { path: string; content: string }[]): string {
    if (fileContext.length === 0) {
      return '📂 **السياق**: مشروع جديد بدون ملفات موجودة.';
    }

    let context = '📂 **الملفات الموجودة في المشروع**:\n\n';

    for (const file of fileContext) {
      context += `### 📄 \`${file.path}\`\n`;
      context += '```\n';
      // حد أقصى 3000 حرف لكل ملف لتوفير tokens
      const maxLength = 3000;
      context += file.content.substring(0, maxLength);
      if (file.content.length > maxLength) {
        context += '\n... (الملف أطول - تم اختصاره)';
      }
      context += '\n```\n\n';
    }

    return context;
  }

  /**
   * التحقق من صحة الاتصال
   */
  async verifyApiKey(): Promise<{
    success: boolean;
    userId?: string;
    email?: string;
    plan?: string;
    error?: string;
  }> {
    try {
      // اختبار بسيط
      const response = await this.adapter.process('قل مرحباً', '', this.provider as any);

      return {
        success: true,
        userId: 'unified_client',
        email: 'user@oqool.ai',
        plan: `Multi-Provider (${response.provider})`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * إنشاء Unified Client من متغيرات البيئة
 */
export async function createUnifiedClient(): Promise<UnifiedOqoolClient | null> {
  try {
    // تجميع جميع API Keys المتاحة
    const config: UnifiedAIAdapterConfig = {
      gemini: process.env.GEMINI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      claude: process.env.ANTHROPIC_API_KEY,
      ollama: process.env.USE_OLLAMA === 'true' ? {
        baseURL: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL,
      } : undefined,
      defaultProvider: (process.env.DEFAULT_AI_PROVIDER as any) || 'gemini',
    };

    // التحقق من وجود أي API key
    const hasAnyKey = !!(
      config.gemini ||
      config.deepseek ||
      config.openai ||
      config.claude ||
      config.ollama
    );

    if (!hasAnyKey) {
      console.log(chalk.yellow('\n⚠️  لم يتم العثور على أي API Keys'));
      console.log(chalk.cyan('\n💡 أضف واحد من المفاتيح التالية في ملف .env:\n'));
      console.log(chalk.gray('   GEMINI_API_KEY=...      (موصى به - الأسرع!)'));
      console.log(chalk.gray('   DEEPSEEK_API_KEY=...    (رخيص)'));
      console.log(chalk.gray('   OPENAI_API_KEY=...      (متوازن)'));
      console.log(chalk.gray('   ANTHROPIC_API_KEY=...   (الأذكى)'));
      console.log(chalk.gray('   USE_OLLAMA=true         (مجاني - محلي)\n'));
      return null;
    }

    // إنشاء Adapter
    const adapter = new UnifiedAIAdapter(config);
    const client = new UnifiedOqoolClient(adapter, config.defaultProvider || 'auto');

    // عرض المزود المستخدم
    const availableProviders = [];
    if (config.gemini) availableProviders.push('Gemini ⚡');
    if (config.deepseek) availableProviders.push('DeepSeek 💰');
    if (config.openai) availableProviders.push('OpenAI 🧠');
    if (config.claude) availableProviders.push('Claude 👑');
    if (config.ollama) availableProviders.push('Ollama 🏠');

    console.log(chalk.cyan(`\n🤖 AI Provider: ${config.defaultProvider}`));
    console.log(chalk.gray(`   المتاحين: ${availableProviders.join(', ')}\n`));

    return client;
  } catch (error: any) {
    console.error(chalk.red('❌ خطأ في إنشاء Unified Client:'), error.message);
    return null;
  }
}

/**
 * إنشاء Client موحد (يستبدل createClientFromConfig)
 */
export async function createSmartClient(): Promise<any> {
  // محاولة إنشاء Unified Client
  const unifiedClient = await createUnifiedClient();
  if (unifiedClient) {
    return unifiedClient;
  }

  // Fallback: محاولة استخدام Client القديم
  const { createClientFromConfig } = await import('./api-client.js');
  return createClientFromConfig();
}
