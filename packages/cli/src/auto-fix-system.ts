// auto-fix-system.ts
// ============================================
// 🔧 نظام الإصلاح التلقائي المتقدم بالمراحل
// ============================================

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { SyntaxFixer } from './fix-stages/syntax-fixer.js';
import { TypeFixer } from './fix-stages/type-fixer.js';
import { SecurityFixer } from './fix-stages/security-fixer.js';
import { PerformanceOptimizer } from './fix-stages/performance-optimizer.js';
import { StyleFixer } from './fix-stages/style-fixer.js';
import { createFileManager } from './file-manager.js';
import { createClientFromConfig } from './api-client.js';

// ============================================
// 📊 واجهات البيانات
// ============================================

export type Priority = 'P1' | 'P2' | 'P3';
export type FixAction = 'auto' | 'ask' | 'suggest';

export interface FixStage {
  name: string;
  priority: Priority;
  action: FixAction;
  description: string;
}

export interface FixIssue {
  stage: string;
  priority: Priority;
  type: string;
  message: string;
  line?: number;
  column?: number;
  fix?: string;
  suggestion?: string;
}

export interface FixResult {
  success: boolean;
  totalIssues: number;
  fixedIssues: number;
  suggestedIssues: number;
  skippedIssues: number;
  stages: {
    [key: string]: {
      issues: number;
      fixed: number;
      suggested: number;
      skipped: number;
    };
  };
  finalCode?: string;
}

export interface AutoFixOptions {
  file: string;
  autoApply?: boolean;
  skipStages?: string[];
  onlyStages?: string[];
  interactive?: boolean;
}

// ============================================
// 🔧 نظام الإصلاح التلقائي
// ============================================

export class AutoFixSystem {
  private workingDir: string;
  private fileManager: any;
  private stages: Map<string, FixStage>;

  private syntaxFixer: SyntaxFixer;
  private typeFixer: TypeFixer;
  private securityFixer: SecurityFixer;
  private performanceOptimizer: PerformanceOptimizer;
  private styleFixer: StyleFixer;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.fileManager = createFileManager(workingDir);
    this.stages = new Map();

    // تهيئة المراحل
    this.initializeStages();

    // تهيئة الأدوات
    this.syntaxFixer = new SyntaxFixer(workingDir);
    this.typeFixer = new TypeFixer(workingDir);
    this.securityFixer = new SecurityFixer(workingDir);
    this.performanceOptimizer = new PerformanceOptimizer(workingDir);
    this.styleFixer = new StyleFixer(workingDir);
  }

  /**
   * تهيئة المراحل
   */
  private initializeStages() {
    // ✅ المرحلة 1 (P1): Syntax + Security - إصلاح تلقائي
    this.stages.set('syntax', {
      name: 'Syntax Fixing',
      priority: 'P1',
      action: 'auto',
      description: 'إصلاح أخطاء البناء اللغوي تلقائياً',
    });

    this.stages.set('security', {
      name: 'Security Fixing',
      priority: 'P1',
      action: 'ask',
      description: 'إصلاح الثغرات الأمنية (يسأل المستخدم)',
    });

    // ✅ المرحلة 2 (P2): Types - إصلاح تلقائي
    this.stages.set('types', {
      name: 'Type Fixing',
      priority: 'P2',
      action: 'auto',
      description: 'إصلاح أخطاء الأنواع تلقائياً',
    });

    // ✅ المرحلة 3 (P3): Performance + Style - اقتراحات
    this.stages.set('performance', {
      name: 'Performance Optimization',
      priority: 'P3',
      action: 'suggest',
      description: 'اقتراحات لتحسين الأداء',
    });

    this.stages.set('style', {
      name: 'Style Fixing',
      priority: 'P3',
      action: 'auto',
      description: 'إصلاح أسلوب الكود تلقائياً',
    });
  }

  /**
   * تشغيل نظام الإصلاح التلقائي
   */
  async fix(options: AutoFixOptions): Promise<FixResult> {
    const {
      file,
      autoApply = false,
      skipStages = [],
      onlyStages = [],
      interactive = true,
    } = options;

    console.log(chalk.cyan('\n🔧 ════════════════════════════════════════════════'));
    console.log(chalk.cyan('   نظام الإصلاح التلقائي المتقدم'));
    console.log(chalk.cyan('════════════════════════════════════════════════\n'));

    // قراءة الملف
    const fileContent = await this.fileManager.readFile(file);
    if (!fileContent) {
      throw new Error(`فشل في قراءة الملف: ${file}`);
    }

    let currentCode = fileContent;
    const result: FixResult = {
      success: true,
      totalIssues: 0,
      fixedIssues: 0,
      suggestedIssues: 0,
      skippedIssues: 0,
      stages: {},
    };

    // تحديد المراحل المطلوبة
    let stagesToRun: string[] = [];
    if (onlyStages.length > 0) {
      stagesToRun = onlyStages;
    } else {
      stagesToRun = Array.from(this.stages.keys()).filter((s) => !skipStages.includes(s));
    }

    // ترتيب المراحل حسب الأولوية
    stagesToRun.sort((a, b) => {
      const priorityOrder = { P1: 1, P2: 2, P3: 3 };
      const stageA = this.stages.get(a)!;
      const stageB = this.stages.get(b)!;
      return priorityOrder[stageA.priority] - priorityOrder[stageB.priority];
    });

    console.log(chalk.yellow('📋 المراحل المحددة:\n'));
    stagesToRun.forEach((stageName, index) => {
      const stage = this.stages.get(stageName)!;
      const priorityColor =
        stage.priority === 'P1' ? chalk.red : stage.priority === 'P2' ? chalk.yellow : chalk.blue;
      const actionEmoji = stage.action === 'auto' ? '⚡' : stage.action === 'ask' ? '❓' : '💡';
      console.log(
        `   ${index + 1}. ${actionEmoji} ${stage.name} ${priorityColor(`[${stage.priority}]`)} - ${stage.description}`
      );
    });
    console.log('');

    // تشغيل المراحل
    for (const stageName of stagesToRun) {
      const stage = this.stages.get(stageName)!;

      console.log(
        chalk.cyan(
          `\n▶️  المرحلة ${stagesToRun.indexOf(stageName) + 1}/${stagesToRun.length}: ${stage.name}`
        )
      );
      console.log(chalk.gray('─'.repeat(50)));

      try {
        const stageResult = await this.runStage(
          stageName,
          currentCode,
          file,
          stage.action,
          interactive && !autoApply
        );

        // تحديث الإحصائيات
        result.totalIssues += stageResult.issuesFound;
        result.fixedIssues += stageResult.issuesFixed;
        result.suggestedIssues += stageResult.issuesSuggested;
        result.skippedIssues += stageResult.issuesSkipped;

        result.stages[stageName] = {
          issues: stageResult.issuesFound,
          fixed: stageResult.issuesFixed,
          suggested: stageResult.issuesSuggested,
          skipped: stageResult.issuesSkipped,
        };

        // تحديث الكود
        if (stageResult.modifiedCode) {
          currentCode = stageResult.modifiedCode;
        }

        // عرض النتائج
        this.displayStageResults(stage, stageResult);
      } catch (error: any) {
        console.log(chalk.red(`❌ خطأ في المرحلة ${stage.name}: ${error.message}`));
      }
    }

    // النتيجة النهائية
    result.finalCode = currentCode;

    console.log(chalk.cyan('\n════════════════════════════════════════════════'));
    console.log(chalk.cyan('   📊 ملخص النتائج'));
    console.log(chalk.cyan('════════════════════════════════════════════════\n'));

    this.displayFinalResults(result);

    // حفظ التعديلات
    if (result.fixedIssues > 0) {
      if (autoApply || (await this.confirmSave(result))) {
        await this.fileManager.writeFile(file, currentCode);
        console.log(chalk.green(`\n✅ تم حفظ التعديلات في: ${file}`));
      } else {
        console.log(chalk.yellow('\n⏭️  تم إلغاء حفظ التعديلات'));
      }
    }

    return result;
  }

  /**
   * تشغيل مرحلة واحدة
   */
  private async runStage(
    stageName: string,
    code: string,
    file: string,
    action: FixAction,
    interactive: boolean
  ): Promise<{
    issuesFound: number;
    issuesFixed: number;
    issuesSuggested: number;
    issuesSkipped: number;
    modifiedCode?: string;
  }> {
    const spinner = ora('جاري الفحص...').start();

    try {
      let issues: FixIssue[] = [];
      let modifiedCode = code;

      // تشغيل الفاحص المناسب
      switch (stageName) {
        case 'syntax':
          issues = await this.syntaxFixer.analyze(code, file);
          if (action === 'auto' && issues.length > 0) {
            spinner.text = 'جاري الإصلاح التلقائي...';
            modifiedCode = await this.syntaxFixer.fix(code, issues);
          }
          break;

        case 'security':
          issues = await this.securityFixer.analyze(code, file);
          if (action === 'ask' && issues.length > 0 && interactive) {
            spinner.stop();
            modifiedCode = await this.handleInteractiveSecurityFixes(code, issues);
            spinner.start();
          }
          break;

        case 'types':
          issues = await this.typeFixer.analyze(code, file);
          if (action === 'auto' && issues.length > 0) {
            spinner.text = 'جاري إصلاح الأنواع...';
            modifiedCode = await this.typeFixer.fix(code, issues);
          }
          break;

        case 'performance':
          issues = await this.performanceOptimizer.analyze(code, file);
          // فقط اقتراحات - لا إصلاح
          break;

        case 'style':
          issues = await this.styleFixer.analyze(code, file);
          if (action === 'auto' && issues.length > 0) {
            spinner.text = 'جاري تحسين الأسلوب...';
            modifiedCode = await this.styleFixer.fix(code, issues);
          }
          break;
      }

      spinner.succeed(`تم الفحص - وجد ${issues.length} مشكلة`);

      // حساب النتائج
      const issuesFound = issues.length;
      let issuesFixed = 0;
      let issuesSuggested = 0;
      let issuesSkipped = 0;

      if (action === 'auto' && modifiedCode !== code) {
        issuesFixed = issuesFound;
      } else if (action === 'suggest') {
        issuesSuggested = issuesFound;
      } else if (action === 'ask') {
        issuesFixed = issues.filter((i) => i.fix).length;
        issuesSkipped = issuesFound - issuesFixed;
      }

      return {
        issuesFound,
        issuesFixed,
        issuesSuggested,
        issuesSkipped,
        modifiedCode: modifiedCode !== code ? modifiedCode : undefined,
      };
    } catch (error: any) {
      spinner.fail(`فشل الفحص: ${error.message}`);
      throw error;
    }
  }

  /**
   * معالجة إصلاحات الأمان التفاعلية
   */
  private async handleInteractiveSecurityFixes(code: string, issues: FixIssue[]): Promise<string> {
    console.log(chalk.yellow('\n⚠️  تم اكتشاف مشاكل أمنية:\n'));

    for (const issue of issues) {
      console.log(chalk.red(`   🔴 ${issue.message}`));
      if (issue.line) {
        console.log(chalk.gray(`      السطر: ${issue.line}`));
      }
      if (issue.suggestion) {
        console.log(chalk.cyan(`      💡 الحل المقترح: ${issue.suggestion}`));
      }
      console.log('');
    }

    const { shouldFix } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldFix',
        message: 'هل تريد إصلاح هذه المشاكل الأمنية؟',
        default: true,
      },
    ]);

    if (shouldFix) {
      return await this.securityFixer.fix(code, issues);
    }

    return code;
  }

  /**
   * عرض نتائج المرحلة
   */
  private displayStageResults(stage: FixStage, result: any) {
    if (result.issuesFound === 0) {
      console.log(chalk.green('   ✅ لا توجد مشاكل'));
      return;
    }

    if (result.issuesFixed > 0) {
      console.log(chalk.green(`   ✅ تم إصلاح ${result.issuesFixed} مشكلة`));
    }

    if (result.issuesSuggested > 0) {
      console.log(chalk.cyan(`   💡 ${result.issuesSuggested} اقتراح للتحسين`));
    }

    if (result.issuesSkipped > 0) {
      console.log(chalk.yellow(`   ⏭️  تم تخطي ${result.issuesSkipped} مشكلة`));
    }
  }

  /**
   * عرض النتائج النهائية
   */
  private displayFinalResults(result: FixResult) {
    console.log(chalk.white(`📊 إجمالي المشاكل المكتشفة: ${result.totalIssues}`));
    console.log(chalk.green(`✅ تم الإصلاح: ${result.fixedIssues}`));
    console.log(chalk.cyan(`💡 الاقتراحات: ${result.suggestedIssues}`));
    console.log(chalk.yellow(`⏭️  المتخطى: ${result.skippedIssues}`));

    console.log(chalk.gray('\n───────────────────────────────────────────────\n'));

    // تفاصيل كل مرحلة
    for (const [stageName, stageResult] of Object.entries(result.stages)) {
      const stage = this.stages.get(stageName)!;
      if (stageResult.issues > 0) {
        console.log(chalk.white(`${stage.name}:`));
        console.log(chalk.gray(`   المشاكل: ${stageResult.issues}`));
        console.log(chalk.gray(`   المصلحة: ${stageResult.fixed}`));
        console.log(chalk.gray(`   الاقتراحات: ${stageResult.suggested}`));
        console.log('');
      }
    }
  }

  /**
   * تأكيد الحفظ
   */
  private async confirmSave(result: FixResult): Promise<boolean> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `هل تريد حفظ التعديلات؟ (${result.fixedIssues} إصلاح)`,
        default: true,
      },
    ]);

    return confirm;
  }

  /**
   * الحصول على معلومات المراحل
   */
  getStages(): FixStage[] {
    return Array.from(this.stages.values());
  }

  /**
   * الحصول على مرحلة محددة
   */
  getStage(name: string): FixStage | undefined {
    return this.stages.get(name);
  }
}

/**
 * إنشاء نظام الإصلاح التلقائي
 */
export function createAutoFixSystem(workingDir?: string): AutoFixSystem {
  return new AutoFixSystem(workingDir);
}
