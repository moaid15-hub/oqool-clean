// local-oqool-client.ts
// ============================================
// 🤖 عميل Claude المحلي - يستخدم API مباشرة
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { Message, ChatResponse } from './api-client.js';

export class LocalClaudeClient {
  private client: Anthropic;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  // إرسال رسالة لـ Claude مباشرة
  async sendChatMessage(messages: Message[]): Promise<ChatResponse> {
    try {
      // تحويل الرسائل لصيغة Claude
      const claudeMessages = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      // استخراج system message إذا وجدت
      const systemMessage = messages.find((msg) => msg.role === 'system');

      // إرسال للـ API
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 8192,
        system: systemMessage?.content,
        messages: claudeMessages,
      });

      // استخراج النص من الرد
      const content = response.content[0];
      const messageText = content.type === 'text' ? content.text : '';

      return {
        success: true,
        message: messageText,
        usedProvider: 'claude-local',
      };
    } catch (error: any) {
      console.error(chalk.red('❌ خطأ في الاتصال بـ Claude:'), error.message);
      return {
        success: false,
        message: '',
        error: error.message,
      };
    }
  }

  // توليد كود مع سياق الملفات
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
          content: `أنت Oqool - أداة ذكاء اصطناعي متخصصة بالبرمجة من Oqool Team.

${contextMessage}

## ❗ مهم جداً - هويتك:
أنت **لست Claude**. أنت **Oqool** - أداة برمجة مستقلة.
- اسمك: **Oqool** (عقول) فقط
- لا تذكر اسم "Claude" أبداً
- طورك: **Oqool Team**
- تخصصك: **البرمجة والتطوير**

## 🎯 قدراتك الكاملة:
1. **كتابة الأكواد** بجميع اللغات البرمجية
2. **التعامل مع المشاريع** - قراءة وتحليل الملفات والمجلدات
3. **إنشاء وتعديل الملفات** في المشاريع
4. **حل المشاكل البرمجية** وتصحيح الأخطاء
5. **بناء APIs وتطبيقات** كاملة
6. **مراجعة وتحسين الكود** الموجود

## 📂 التعامل مع الملفات والمشاريع:
- **تستطيع** قراءة وتحليل الملفات عندما تُعطى السياق
- **تستطيع** إنشاء ملفات جديدة وتعديل الموجودة
- **تستطيع** فهم بنية المشاريع والتعامل معها
- **تستطيع** كتابة أكواد تتكامل مع الملفات الموجودة

## 📋 قواعد الرد:
**عند السؤال عن اسمك/هويتك:**
"أنا **Oqool** - أداة ذكاء اصطناعي متخصصة بالبرمجة من فريق Oqool Team."

**عند طلب الدخول لمجلد أو مشروع:**
افهم سياق المشروع واقترح كيف يمكنك المساعدة.

**عند طلب كود:**
اكتب الكود مباشرة:
\`\`\`لغة:اسم_الملف
// الكود
\`\`\`

## ⚠️ ممنوع منعاً باتاً:
- ❌ لا تقول "أنا Claude"
- ❌ لا تذكر "Anthropic"
- ❌ لا تقل "لا أستطيع الوصول للملفات" - أنت تستطيع عند إعطاء السياق!

كن مساعد برمجة قوي وفعّال. ساعد المطورين في مشاريعهم بشكل عملي.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      return await this.sendChatMessage(messages);
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
      return '📂 **السياق**: مشروع جديد بدون ملفات موجودة.';
    }

    let context = '📂 **الملفات الموجودة في المشروع**:\n\n';

    for (const file of fileContext) {
      context += `### 📄 ${file.path}\n`;
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

  // التحقق من صحة API Key
  async verifyApiKey(): Promise<boolean> {
    try {
      // اختبار بسيط للتحقق من صحة المفتاح
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// إنشاء عميل Claude محلي من متغيرات البيئة
export function createLocalClaudeClient(): LocalClaudeClient | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log(chalk.yellow('⚠️  ANTHROPIC_API_KEY غير موجود في متغيرات البيئة'));
    console.log(chalk.cyan('أضف المفتاح في ملف .env:'));
    console.log(chalk.gray('ANTHROPIC_API_KEY=sk-ant-...'));
    return null;
  }

  return new LocalClaudeClient(apiKey);
}
