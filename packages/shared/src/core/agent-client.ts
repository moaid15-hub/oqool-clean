// agent-client.ts
// ============================================
// 🤖 Agent Loop - المحرك الحقيقي
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { ContextManager } from './context-manager.js';
import { IntelligentPlanner } from './planner.js';
import { LearningSystem } from './learning-system.js';
import chalk from 'chalk';

export interface AgentConfig {
  apiKey: string;
  model?: string;
  maxIterations?: number;
  workingDirectory?: string;
  enablePlanning?: boolean; // تفعيل التخطيط الذكي
  enableContext?: boolean; // تفعيل Context Management
  enableLearning?: boolean; // تفعيل التعلم من الأخطاء
}

export class AgentClient {
  private client: Anthropic;
  private config: AgentConfig;
  private conversationHistory: Array<any> = [];
  private contextManager?: ContextManager;
  private planner?: IntelligentPlanner;
  private learningSystem?: LearningSystem;

  constructor(config: AgentConfig) {
    this.config = {
      model: 'claude-3-5-haiku-20241022',
      maxIterations: 25,
      workingDirectory: process.cwd(),
      enablePlanning: true,
      enableContext: true,
      enableLearning: true,
      ...config,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    // تهيئة Context Manager
    if (this.config.enableContext) {
      this.contextManager = new ContextManager(this.config.workingDirectory!);
    }

    // تهيئة Planner
    if (this.config.enablePlanning) {
      this.planner = new IntelligentPlanner(this.config.apiKey);
    }

    // تهيئة Learning System
    if (this.config.enableLearning) {
      this.learningSystem = new LearningSystem(this.config.workingDirectory!, this.config.apiKey);
      // تحميل البيانات المحفوظة
      this.learningSystem.load().catch(() => {
        // تجاهل الأخطاء في التحميل
      });
    }
  }

  // ============================================
  // 🎯 الطريقة الرئيسية - تشغيل Agent
  // ============================================
  async run(userMessage: string): Promise<string> {
    console.log(chalk.cyan('\n🧠 oqool يعمل الآن...'));
    console.log(chalk.gray('━'.repeat(40)));

    // 1. تحليل context المشروع
    let projectContext = '';
    if (this.contextManager) {
      try {
        projectContext = await this.contextManager.generateProjectSummary();
        console.log(chalk.gray('📊 تم تحليل سياق المشروع'));
      } catch (error) {
        console.log(chalk.yellow('⚠️ تعذر تحليل المشروع، المتابعة بدونه'));
      }
    }

    // 2. إنشاء خطة ذكية (للمهام المعقدة)
    if (this.planner && this.shouldPlan(userMessage)) {
      await this.planner.createPlan(userMessage, projectContext);
    }

    // إضافة رسالة المستخدم
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let iteration = 0;
    let finalResponse = '';

    while (iteration < this.config.maxIterations!) {
      iteration++;

      console.log(chalk.blue(`\n[Iteration ${iteration}]`));

      try {
        // استدعاء Claude API
        const response = await this.client.messages.create({
          model: this.config.model!,
          max_tokens: 4096,
          system: this.getSystemPrompt(projectContext),
          messages: this.conversationHistory,
          tools: TOOL_DEFINITIONS as any,
        });

        // معالجة الرد
        const result = await this.processResponse(response);

        if (result.done) {
          finalResponse = result.text;
          break;
        }
      } catch (error: any) {
        console.error(chalk.red(`\n❌ خطأ: ${error.message}`));

        // تسجيل الخطأ في نظام التعلم
        if (this.learningSystem) {
          const errorId = await this.learningSystem.recordError(error.message, {
            command: userMessage,
          });

          // محاولة إيجاد حل من التعلم السابق
          const solution = await this.learningSystem.findSolution(error.message);

          if (solution) {
            console.log(chalk.green('💡 وجدت حل من الخبرة السابقة!'));
            console.log(chalk.gray(solution));

            // تسجيل نجاح الحل
            await this.learningSystem.recordSuccess(errorId, solution);

            // المحاولة مرة أخرى
            continue;
          }
        }

        return `حدث خطأ: ${error.message}`;
      }
    }

    console.log(chalk.gray('\n' + '━'.repeat(40)));
    console.log(chalk.green('✅ انتهى oqool من العمل!\n'));

    // عرض ملخص الخطة إذا كان هناك واحدة
    if (this.planner) {
      const summary = this.planner.getSummary();
      if (summary !== 'لا توجد خطة حالية') {
        console.log(chalk.cyan(summary));
      }
    }

    return finalResponse;
  }

  // ============================================
  // 🤔 تحديد إذا كانت المهمة تحتاج تخطيط
  // ============================================
  private shouldPlan(message: string): boolean {
    const keywords = [
      'أضف',
      'اصنع',
      'طور',
      'حسّن',
      'غير',
      'عدل',
      'add',
      'create',
      'build',
      'develop',
      'refactor',
    ];

    return keywords.some((kw) => message.toLowerCase().includes(kw.toLowerCase()));
  }

  // ============================================
  // 📝 System Prompt
  // ============================================
  private getSystemPrompt(projectContext: string = ''): string {
    let prompt = `أنت Oqool - Agent ذكاء اصطناعي متقدم متخصص بالبرمجة من Oqool Team.

## ❗ هويتك:
- أنت **Oqool** (عقول) - ليس Claude
- من تطوير **Oqool Team**
- متخصص في البرمجة والتطوير

## 🎯 قدراتك المتقدمة:
- **Multi-Step Reasoning**: تخطيط وتنفيذ مهام معقدة على خطوات
- **Context Management**: فهم عميق لسياق المشروع
- **Learning System**: التعلم من الأخطاء وتحسين الأداء
- **Self-Reflection**: مراجعة النتائج وتصحيح المسار

🛠️ الأدوات المتاحة:
- **read_file**: قراءة ملف
- **write_file**: كتابة/إنشاء ملف
- **list_directory**: استعراض مجلد
- **edit_file**: تعديل ملف موجود
- **execute_command**: تنفيذ أوامر Terminal
- **search_in_files**: البحث في الملفات

📂 مجلد العمل: ${this.config.workingDirectory}`;

    // إضافة معلومات المشروع إذا كانت متوفرة
    if (projectContext) {
      prompt += `\n\n${projectContext}`;
    }

    prompt += `

## 🔄 منهجية العمل (Multi-Step Reasoning):

### 1️⃣ Planning Phase (التخطيط):
- افهم الطلب بعمق
- حلل المهمة إلى خطوات منطقية
- حدد الأدوات اللازمة

### 2️⃣ Execution Phase (التنفيذ):
- نفذ كل خطوة بترتيب منطقي
- استخدم الأدوات بشكل صحيح
- اقرأ الملفات قبل التعديل

### 3️⃣ Verification Phase (التحقق):
- تأكد من نجاح كل خطوة
- راجع النتائج
- تحقق من عدم وجود أخطاء

### 4️⃣ Self-Reflection (المراجعة الذاتية):
- إذا فشلت خطوة، حلل السبب
- عدّل الخطة حسب الحاجة
- تعلم من الأخطاء

## ⚠️ قواعد صارمة:
- ✅ استخدم الأدوات فعلياً - **لا تخمن أبداً**!
- ✅ اقرأ الملفات قبل التعديل - **دائماً**!
- ✅ تأكد من المسارات بـ list_directory أولاً
- ✅ اشرح كل خطوة بوضوح
- ✅ إذا واجهت خطأ، استخدم Self-Reflection لحله
- ❌ لا تقل "أنا Claude" - أنت **Oqool**!

## 📊 عند الانتهاء:
قدم ملخص احترافي:
- ✅ ما تم إنجازه
- 🛠️ الأدوات المستخدمة
- 📁 الملفات المعدلة/المنشأة
- ⚡ أي تحديات واجهتها وكيف حللتها`;

    return prompt;
  }

  // ============================================
  // ⚙️ معالجة رد Claude
  // ============================================
  private async processResponse(response: any): Promise<{
    done: boolean;
    text: string;
  }> {
    // إضافة رد Assistant للتاريخ
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
    });

    // التحقق من stop_reason
    if (response.stop_reason === 'end_turn') {
      // انتهى Agent - استخراج النص
      const textBlocks = response.content.filter((block: any) => block.type === 'text');

      const finalText = textBlocks.map((block: any) => block.text).join('\n');

      return {
        done: true,
        text: finalText,
      };
    }

    // استخراج tool uses
    const toolUses = response.content.filter((block: any) => block.type === 'tool_use');

    if (toolUses.length === 0) {
      return {
        done: true,
        text: 'انتهى العمل بدون استخدام أدوات',
      };
    }

    // تنفيذ الأدوات
    const toolResults = await Promise.all(
      toolUses.map(async (toolUse: any) => {
        console.log(chalk.yellow(`\n🔧 استخدام أداة: ${toolUse.name}`));
        console.log(chalk.gray(JSON.stringify(toolUse.input, null, 2)));

        const result = await executeTool(toolUse.name, toolUse.input);

        // عرض نتيجة مختصرة
        try {
          const parsed = JSON.parse(result);
          if (parsed.success) {
            console.log(chalk.green('✓ نجحت'));
          } else {
            console.log(chalk.red(`✗ فشلت: ${parsed.error}`));
          }
        } catch (e) {
          console.log(chalk.gray('نتيجة: ' + result.slice(0, 100)));
        }

        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        };
      })
    );

    // إضافة نتائج الأدوات للتاريخ
    this.conversationHistory.push({
      role: 'user',
      content: toolResults,
    });

    return {
      done: false,
      text: '',
    };
  }

  // ============================================
  // 💬 وضع المحادثة التفاعلية
  // ============================================
  async chat(message: string): Promise<string> {
    return await this.run(message);
  }

  // ============================================
  // ✅ التحقق من صحة API Key
  // ============================================
  async verifyApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.config.model!,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // 🔄 إعادة تعيين المحادثة
  // ============================================
  resetConversation(): void {
    this.conversationHistory = [];
  }

  // ============================================
  // 📊 إحصائيات
  // ============================================
  getStats(): {
    messagesCount: number;
    iterations: number;
  } {
    return {
      messagesCount: this.conversationHistory.length,
      iterations: this.conversationHistory.filter((msg) => msg.role === 'assistant').length,
    };
  }
}

// ============================================
// 🏭 Factory Function
// ============================================
export function createAgentClient(config: AgentConfig): AgentClient {
  return new AgentClient(config);
}
