// multi-provider-agent.ts
// ============================================
// 🤖 Multi-Provider Agent - يدعم جميع AI Providers
// ============================================

import { UnifiedAIAdapter, UnifiedAIAdapterConfig } from '@oqool/shared/ai-gateway';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { ContextManager } from './context-manager.js';
import { IntelligentPlanner } from './planner.js';
import { LearningSystem } from './learning-system.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

export interface MultiProviderAgentConfig {
  provider?: 'gemini' | 'deepseek' | 'openai' | 'claude' | 'ollama' | 'auto';
  maxIterations?: number;
  workingDirectory?: string;
  enablePlanning?: boolean;
  enableContext?: boolean;
  enableLearning?: boolean;
}

export class MultiProviderAgent {
  private aiAdapter: UnifiedAIAdapter;
  private config: MultiProviderAgentConfig;
  private conversationHistory: Array<any> = [];
  private contextManager?: ContextManager;
  private planner?: IntelligentPlanner;
  private learningSystem?: LearningSystem;
  private provider: string;

  constructor(config: MultiProviderAgentConfig = {}) {
    this.config = {
      provider: 'auto',
      maxIterations: 25,
      workingDirectory: process.cwd(),
      enablePlanning: true,
      enableContext: true,
      enableLearning: true,
      ...config,
    };

    // إنشاء UnifiedAIAdapter من متغيرات البيئة
    const adapterConfig: UnifiedAIAdapterConfig = {
      gemini: process.env.GEMINI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      claude: process.env.ANTHROPIC_API_KEY,
      ollama: process.env.USE_OLLAMA === 'true' ? {
        baseURL: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL,
      } : undefined,
      defaultProvider: this.config.provider === 'auto'
        ? (process.env.DEFAULT_AI_PROVIDER as any) || 'gemini'
        : this.config.provider,
    };

    this.aiAdapter = new UnifiedAIAdapter(adapterConfig);
    this.provider = this.config.provider || 'auto';

    console.log(chalk.cyan(`\n🤖 Multi-Provider Agent initialized`));
    console.log(chalk.gray(`   Provider: ${adapterConfig.defaultProvider}`));
    console.log(chalk.gray(`   Available: ${this.getAvailableProviders()}\n`));

    // تهيئة الأنظمة الذكية
    if (this.config.enableContext) {
      this.contextManager = new ContextManager(this.config.workingDirectory!);
    }

    if (this.config.enablePlanning) {
      // Planner يحتاج API key - استخدم أي key متاح
      const anyKey = process.env.GEMINI_API_KEY ||
                     process.env.DEEPSEEK_API_KEY ||
                     process.env.OPENAI_API_KEY ||
                     process.env.ANTHROPIC_API_KEY ||
                     'dummy_key';
      this.planner = new IntelligentPlanner(anyKey);
    }

    if (this.config.enableLearning) {
      const anyKey = process.env.GEMINI_API_KEY ||
                     process.env.DEEPSEEK_API_KEY ||
                     'dummy_key';
      this.learningSystem = new LearningSystem(this.config.workingDirectory!, anyKey);
      this.learningSystem.load().catch(() => {});
    }
  }

  private getAvailableProviders(): string {
    const available: string[] = [];
    if (process.env.GEMINI_API_KEY) available.push('Gemini');
    if (process.env.DEEPSEEK_API_KEY) available.push('DeepSeek');
    if (process.env.OPENAI_API_KEY) available.push('OpenAI');
    if (process.env.ANTHROPIC_API_KEY) available.push('Claude');
    if (process.env.USE_OLLAMA === 'true') available.push('Ollama');
    return available.join(', ') || 'None';
  }

  // ============================================
  // 🎯 الطريقة الرئيسية - تشغيل Agent
  // ============================================
  async run(userMessage: string): Promise<string> {
    console.log(chalk.cyan('\n🧠 Oqool AI Agent يعمل الآن...'));
    console.log(chalk.gray('━'.repeat(50)));

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
      try {
        await this.planner.createPlan(userMessage, projectContext);
      } catch (error) {
        console.log(chalk.yellow('⚠️ تعذر إنشاء خطة، المتابعة مباشرة'));
      }
    }

    // 3. معالجة الرسالة باستخدام AI
    const systemPrompt = this.getSystemPrompt(projectContext);

    try {
      const response = await this.aiAdapter.process(
        userMessage,
        systemPrompt,
        this.provider as any
      );

      console.log(chalk.green(`\n✅ ${response.provider} استجاب بنجاح`));
      console.log(chalk.gray(`   Model: ${response.model}`));
      console.log(chalk.gray(`   Cost: $${response.cost.toFixed(4)}`));
      console.log(chalk.gray(`   Tokens: ${response.tokensUsed.input + response.tokensUsed.output}`));

      return response.response;
    } catch (error: any) {
      console.error(chalk.red(`\n❌ خطأ: ${error.message}`));

      // تسجيل الخطأ في نظام التعلم
      if (this.learningSystem) {
        await this.learningSystem.recordError(error.message, {
          command: userMessage,
        });
      }

      throw error;
    }
  }

  // ============================================
  // 📋 System Prompt
  // ============================================
  private getSystemPrompt(projectContext: string): string {
    return `أنت Oqool - أداة ذكاء اصطناعي متخصصة بالبرمجة والتطوير.

## 🎯 قدراتك:
- كتابة وتعديل الأكواد بجميع اللغات البرمجية
- تحليل وفهم المشاريع البرمجية
- حل المشاكل وتصحيح الأخطاء
- مراجعة وتحسين الكود
- بناء تطبيقات ومشاريع كاملة

${projectContext ? `## 📂 سياق المشروع:\n${projectContext}\n` : ''}

## 📋 قواعد الرد:
1. اكتب كود نظيف ومنظم
2. أضف تعليقات عربية واضحة
3. استخدم أفضل الممارسات
4. تعامل مع الأخطاء بشكل صحيح
5. اختبر الكود قبل إعطائه

## 💡 تنسيق الكود:
استخدم هذا التنسيق عند كتابة الكود:
\`\`\`لغة:اسم_الملف
// الكود هنا
\`\`\`

كن مساعد برمجة محترف وفعّال!`;
  }

  // ============================================
  // 🤔 هل نحتاج تخطيط؟
  // ============================================
  private shouldPlan(message: string): boolean {
    const keywords = [
      'مشروع',
      'تطبيق',
      'موقع',
      'نظام',
      'API',
      'قاعدة بيانات',
      'backend',
      'frontend',
      'full stack',
    ];

    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
  }

  // ============================================
  // 🔄 Streaming Response (للمستقبل)
  // ============================================
  async *runStream(userMessage: string): AsyncGenerator<string> {
    console.log(chalk.cyan('\n🧠 Oqool AI Agent (Streaming)...'));

    let projectContext = '';
    if (this.contextManager) {
      try {
        projectContext = await this.contextManager.generateProjectSummary();
      } catch (error) {}
    }

    const systemPrompt = this.getSystemPrompt(projectContext);

    try {
      const stream = this.aiAdapter.processStream(
        'coder',
        userMessage,
        systemPrompt,
        this.provider as any
      );

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error: any) {
      yield `\n\n❌ خطأ: ${error.message}\n`;
      throw error;
    }
  }

  // ============================================
  // 📊 معلومات Agent
  // ============================================
  getInfo(): any {
    return {
      provider: this.provider,
      workingDirectory: this.config.workingDirectory,
      features: {
        planning: this.config.enablePlanning,
        context: this.config.enableContext,
        learning: this.config.enableLearning,
      },
    };
  }
}

// ============================================
// 🏭 Factory Function
// ============================================
export function createMultiProviderAgent(config?: MultiProviderAgentConfig): MultiProviderAgent {
  return new MultiProviderAgent(config);
}
