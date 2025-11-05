// agent-team.ts
// ============================================
// 👥 Agent Team - فريق Agents متعاونين
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';

export interface TaskResult {
  design: string;
  code: string;
  tests: string;
  review: string;
  finalCode: string;
}

export interface AgentTeamConfig {
  apiKey: string;
  model?: string;
  verbose?: boolean;
}

// ============================================
// 🏗️ Architect Agent - المصمم
// ============================================
class ArchitectAgent {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async design(task: string): Promise<string> {
    console.log(chalk.cyan('\n🏗️ Architect يصمم البنية...\n'));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `أنت Architect Agent متخصص في تصميم البنية.

مهمتك: ${task}

صمم:
1. **البنية العامة** (Architecture)
2. **الملفات المطلوبة** وأدوارها
3. **التقنيات والمكتبات**
4. **Flow Diagram** للعمل

كن واضحاً ومنظماً في التصميم.`,
        },
      ],
    });

    const design = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(chalk.green('✅ التصميم جاهز!\n'));
    return design;
  }
}

// ============================================
// 💻 Coder Agent - المبرمج
// ============================================
class CoderAgent {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async implement(design: string): Promise<string> {
    console.log(chalk.cyan('\n💻 Coder يكتب الكود...\n'));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `أنت Coder Agent متخصص في كتابة الأكواد.

التصميم المعطى:
${design}

اكتب الكود الكامل:
- اتبع التصميم بدقة
- اكتب كود نظيف ومنظم
- أضف تعليقات توضيحية
- استخدم أفضل الممارسات

ابدأ الآن بكتابة الكود:`,
        },
      ],
    });

    const code = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(chalk.green('✅ الكود جاهز!\n'));
    return code;
  }
}

// ============================================
// 🧪 Tester Agent - المختبر
// ============================================
class TesterAgent {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async test(code: string): Promise<string> {
    console.log(chalk.cyan('\n🧪 Tester يكتب الاختبارات...\n'));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `أنت Tester Agent متخصص في كتابة الاختبارات.

الكود المعطى:
${code}

اكتب:
1. **Unit Tests** شاملة
2. **Integration Tests**
3. **Edge Cases**
4. سيناريوهات اختبار مختلفة

استخدم Jest أو Mocha أو أي framework مناسب.`,
        },
      ],
    });

    const tests = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(chalk.green('✅ الاختبارات جاهزة!\n'));
    return tests;
  }
}

// ============================================
// 🔍 Reviewer Agent - المراجع
// ============================================
class ReviewerAgent {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async review(code: string): Promise<string> {
    console.log(chalk.cyan('\n🔍 Reviewer يراجع الكود...\n'));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `أنت Reviewer Agent متخصص في مراجعة الأكواد.

الكود المعطى:
${code}

راجع:
1. **جودة الكود** (Code Quality)
2. **الأمان** (Security)
3. **الأداء** (Performance)
4. **Best Practices**
5. **اقتراحات للتحسين**

قدم مراجعة شاملة ومفصلة.`,
        },
      ],
    });

    const review = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(chalk.green('✅ المراجعة جاهزة!\n'));
    return review;
  }

  async improveBased(code: string, review: string): Promise<string> {
    console.log(chalk.cyan('\n🔧 Reviewer يحسن الكود بناءً على المراجعة...\n'));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `الكود الأصلي:
${code}

المراجعة:
${review}

حسّن الكود بناءً على المراجعة وأعد كتابته محسناً.`,
        },
      ],
    });

    const improved = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(chalk.green('✅ الكود المحسن جاهز!\n'));
    return improved;
  }
}

// ============================================
// 👥 Agent Team - الفريق الكامل
// ============================================
export class AgentTeam {
  private config: AgentTeamConfig;
  private agents: {
    architect: ArchitectAgent;
    coder: CoderAgent;
    tester: TesterAgent;
    reviewer: ReviewerAgent;
  };

  constructor(config: AgentTeamConfig) {
    this.config = {
      model: 'claude-3-5-haiku-20241022',
      verbose: true,
      ...config,
    };

    // تهيئة جميع الـ Agents
    this.agents = {
      architect: new ArchitectAgent(this.config.apiKey, this.config.model!),
      coder: new CoderAgent(this.config.apiKey, this.config.model!),
      tester: new TesterAgent(this.config.apiKey, this.config.model!),
      reviewer: new ReviewerAgent(this.config.apiKey, this.config.model!),
    };
  }

  // ============================================
  // 🤝 التعاون على المهمة
  // ============================================
  async collaborate(task: string): Promise<TaskResult> {
    console.log(chalk.bold.cyan('\n👥 فريق Agents يبدأ العمل...\n'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.yellow(`\n📋 المهمة: ${task}\n`));
    console.log(chalk.gray('═'.repeat(60)));

    try {
      // 1️⃣ Architect يصمم
      const design = await this.agents.architect.design(task);
      if (this.config.verbose) {
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(design));
        console.log(chalk.gray('─'.repeat(60)));
      }

      // 2️⃣ Coder يكتب
      const code = await this.agents.coder.implement(design);
      if (this.config.verbose) {
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(code));
        console.log(chalk.gray('─'.repeat(60)));
      }

      // 3️⃣ Tester يختبر
      const tests = await this.agents.tester.test(code);
      if (this.config.verbose) {
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(tests));
        console.log(chalk.gray('─'.repeat(60)));
      }

      // 4️⃣ Reviewer يراجع
      const review = await this.agents.reviewer.review(code);
      if (this.config.verbose) {
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(review));
        console.log(chalk.gray('─'.repeat(60)));
      }

      // 5️⃣ تحسين الكود بناءً على المراجعة
      const finalCode = await this.agents.reviewer.improveBased(code, review);

      console.log(chalk.gray('═'.repeat(60)));
      console.log(chalk.bold.green('\n✅ انتهى الفريق من العمل!\n'));

      return {
        design,
        code,
        tests,
        review,
        finalCode,
      };
    } catch (error: any) {
      console.error(chalk.red(`\n❌ خطأ في التعاون: ${error.message}\n`));
      throw error;
    }
  }

  // ============================================
  // 📊 عرض ملخص النتيجة
  // ============================================
  async showSummary(result: TaskResult): Promise<void> {
    console.log(chalk.cyan('\n📊 ملخص النتيجة:\n'));
    console.log(chalk.gray('═'.repeat(60)));

    console.log(chalk.blue('\n🏗️ التصميم:'));
    console.log(chalk.gray(result.design.substring(0, 200) + '...'));

    console.log(chalk.blue('\n💻 الكود:'));
    console.log(chalk.gray(result.code.substring(0, 200) + '...'));

    console.log(chalk.blue('\n🧪 الاختبارات:'));
    console.log(chalk.gray(result.tests.substring(0, 200) + '...'));

    console.log(chalk.blue('\n🔍 المراجعة:'));
    console.log(chalk.gray(result.review.substring(0, 200) + '...'));

    console.log(chalk.green('\n✅ الكود النهائي المحسن:'));
    console.log(chalk.white(result.finalCode));

    console.log(chalk.gray('\n═'.repeat(60) + '\n'));
  }

  // ============================================
  // 💾 حفظ النتيجة
  // ============================================
  async saveResult(result: TaskResult, outputPath: string): Promise<void> {
    const fs = await import('fs-extra');
    const path = await import('path');

    // حفظ كل جزء في ملف منفصل
    await fs.ensureDir(outputPath);

    await fs.writeFile(path.join(outputPath, 'design.md'), result.design);

    await fs.writeFile(path.join(outputPath, 'code.js'), result.code);

    await fs.writeFile(path.join(outputPath, 'tests.js'), result.tests);

    await fs.writeFile(path.join(outputPath, 'review.md'), result.review);

    await fs.writeFile(path.join(outputPath, 'final-code.js'), result.finalCode);

    console.log(chalk.green(`\n✅ تم حفظ النتيجة في: ${outputPath}\n`));
  }
}

// ============================================
// 🏭 Factory Function
// ============================================
export function createAgentTeam(config: AgentTeamConfig): AgentTeam {
  return new AgentTeam(config);
}
