// agent-client.ts
// ============================================
// 🤖 Agent Loop - المحرك الحقيقي (مع دعم جميع المزودين)
// ============================================

import { UnifiedAIAdapterWithTools } from '../ai-gateway/unified-ai-adapter.js';
import type { AIProvider } from '../ai-gateway/unified-ai-adapter.js';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { ContextManager } from './context-manager.js';
import { IntelligentPlanner } from './planner.js';
import { LearningSystem } from './learning-system.js';
import chalk from 'chalk';

export type AIProviderName = 'claude' | 'gemini' | 'openai' | 'deepseek';

export interface AgentConfig {
  apiKey?: string;
  claudeKey?: string;
  geminiKey?: string;
  openaiKey?: string;
  deepseekKey?: string;
  provider?: AIProviderName;
  model?: string;
  maxIterations?: number;
  workingDirectory?: string;
  enablePlanning?: boolean;
  enableContext?: boolean;
  enableLearning?: boolean;
}

export class AgentClient {
  private aiAdapter: UnifiedAIAdapterWithTools;
  private config: AgentConfig;
  private conversationHistory: Array<any> = [];
  private contextManager?: ContextManager;
  private planner?: IntelligentPlanner;
  private learningSystem?: LearningSystem;
  private currentProvider: AIProviderName;

  constructor(config: AgentConfig) {
    this.config = {
      provider: 'claude',
      maxIterations: 25,
      workingDirectory: process.cwd(),
      enablePlanning: true,
      enableContext: true,
      enableLearning: true,
      ...config,
    };

    this.currentProvider = this.config.provider!;

    // إنشاء UnifiedAIAdapter مع جميع المفاتيح
    this.aiAdapter = new UnifiedAIAdapterWithTools({
      claude: config.claudeKey || config.apiKey,
      gemini: config.geminiKey,
      openai: config.openaiKey,
      deepseek: config.deepseekKey,
    });

    // تهيئة Context Manager
    if (this.config.enableContext) {
      this.contextManager = new ContextManager(this.config.workingDirectory!);
    }

    // تهيئة Planner
    if (this.config.enablePlanning) {
      const plannerKey = config.claudeKey || config.apiKey || '';
      this.planner = new IntelligentPlanner(plannerKey);
    }

    // تهيئة Learning System
    if (this.config.enableLearning) {
      const learningKey = config.claudeKey || config.apiKey || '';
      this.learningSystem = new LearningSystem(this.config.workingDirectory!, learningKey);
      this.learningSystem.load().catch(() => {});
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
        // استدعاء AI عبر UnifiedAdapter مع Tools
        const tools = TOOL_DEFINITIONS.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema.properties
        }));

        const response = await this.aiAdapter.executeWithTools(
          this.conversationHistory,
          tools,
          async (toolName: string, args: any) => {
            console.log(chalk.yellow(`\n🔧 استخدام أداة: ${toolName}`));
            console.log(chalk.gray(JSON.stringify(args, null, 2)));

            const result = await executeTool(toolName, args);

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

            return result;
          },
          10,
          this.currentProvider as AIProvider
        );

        // النتيجة النهائية
        if (response.text && response.text.trim()) {
          finalResponse = response.text;
          break;
        }

        // إذا لم تكن هناك نتيجة، نستمر
        if (response.iterations >= 10) {
          finalResponse = 'تم الوصول للحد الأقصى من التكرارات';
          break;
        }

      } catch (error: any) {
        console.error(chalk.red(`\n❌ خطأ: ${error.message}`));

        // تسجيل الخطأ في نظام التعلم
        if (this.learningSystem) {
          const errorId = await this.learningSystem.recordError(error.message, {
            command: userMessage,
          });

          const solution = await this.learningSystem.findSolution(error.message);

          if (solution) {
            console.log(chalk.green('💡 وجدت حل من الخبرة السابقة!'));
            console.log(chalk.gray(solution));
            await this.learningSystem.recordSuccess(errorId, solution);
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
    let prompt = `أنت مساعد AI للبرمجة.

## ❗ هويتك (للاختبار):
- **IMPORTANT**: عرّف عن نفسك بوضوح! قل من أنت (Claude/Gemini/GPT/DeepSeek)
- اذكر اسمك الحقيقي في كل رد
- مثال: "أنا Claude من Anthropic" أو "أنا Gemini من Google"

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
- ✅ **عرّف عن نفسك في كل رد!** (اختبار: أنا Claude/Gemini/GPT/etc)

## 📊 عند الانتهاء:
قدم ملخص احترافي:
- ✅ ما تم إنجازه
- 🛠️ الأدوات المستخدمة
- 📁 الملفات المعدلة/المنشأة
- ⚡ أي تحديات واجهتها وكيف حللتها`;

    return prompt;
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
      await this.aiAdapter.chat(
        [{ role: 'user', content: 'test' }],
        this.currentProvider as AIProvider
      );
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
