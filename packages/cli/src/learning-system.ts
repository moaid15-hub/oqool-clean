// learning-system.ts
// ============================================
// 🧠 Learning System - التعلم من الأخطاء
// ============================================

import fs from 'fs-extra';
import { join } from 'path';
import chalk from 'chalk';
import Anthropic from '@anthropic-ai/sdk';

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface ErrorRecord {
  id: string;
  timestamp: number;
  error: string;
  context: {
    file?: string;
    code?: string;
    command?: string;
    stackTrace?: string;
  };
  solution?: string;
  successful: boolean;
  attemptCount: number;
}

export interface LearningPattern {
  errorType: string;
  pattern: string;
  frequency: number;
  solutions: Array<{
    solution: string;
    successRate: number;
    timesUsed: number;
  }>;
  lastSeen: number;
}

export interface LearningStats {
  totalErrors: number;
  solvedErrors: number;
  patterns: number;
  successRate: number;
  topErrors: Array<{
    type: string;
    count: number;
  }>;
}

// ============================================
// 🧠 نظام التعلم
// ============================================

export class LearningSystem {
  private workingDirectory: string;
  private learningPath: string;
  private errorHistory: ErrorRecord[] = [];
  private patterns: Map<string, LearningPattern> = new Map();
  private client?: Anthropic;

  constructor(workingDirectory: string, apiKey?: string) {
    this.workingDirectory = workingDirectory;
    this.learningPath = join(workingDirectory, '.oqool', 'learning');

    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  // ============================================
  // 📚 تحميل البيانات المحفوظة
  // ============================================
  async load(): Promise<void> {
    try {
      await fs.ensureDir(this.learningPath);

      // تحميل تاريخ الأخطاء
      const historyPath = join(this.learningPath, 'error-history.json');
      if (await fs.pathExists(historyPath)) {
        this.errorHistory = await fs.readJSON(historyPath);
      }

      // تحميل الأنماط
      const patternsPath = join(this.learningPath, 'patterns.json');
      if (await fs.pathExists(patternsPath)) {
        const patternsArray = await fs.readJSON(patternsPath);
        this.patterns = new Map(patternsArray);
      }

      console.log(chalk.white('    📚 تم تحميل بيانات التعلم'));
    } catch (error) {
      console.log(chalk.yellow('    ⚠️ تعذر تحميل بيانات التعلم'));
    }
  }

  // ============================================
  // 💾 حفظ البيانات
  // ============================================
  async save(): Promise<void> {
    try {
      await fs.ensureDir(this.learningPath);

      // حفظ تاريخ الأخطاء (آخر 1000 خطأ فقط)
      const historyPath = join(this.learningPath, 'error-history.json');
      await fs.writeJSON(historyPath, this.errorHistory.slice(-1000), { spaces: 2 });

      // حفظ الأنماط
      const patternsPath = join(this.learningPath, 'patterns.json');
      await fs.writeJSON(patternsPath, Array.from(this.patterns.entries()), { spaces: 2 });

      console.log(chalk.gray('💾 تم حفظ بيانات التعلم'));
    } catch (error) {
      console.log(chalk.yellow('⚠️ تعذر حفظ بيانات التعلم'));
    }
  }

  // ============================================
  // 📝 تسجيل خطأ
  // ============================================
  async recordError(error: string, context: ErrorRecord['context'] = {}): Promise<string> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const record: ErrorRecord = {
      id: errorId,
      timestamp: Date.now(),
      error,
      context,
      successful: false,
      attemptCount: 0,
    };

    this.errorHistory.push(record);

    // تحديث الأنماط
    await this.updatePatterns(error);

    // حفظ تلقائي
    await this.save();

    console.log(chalk.red(`❌ تم تسجيل خطأ: ${errorId}`));

    return errorId;
  }

  // ============================================
  // 🔍 البحث عن حلول سابقة
  // ============================================
  async findSolution(error: string): Promise<string | null> {
    console.log(chalk.cyan('🔍 البحث عن حلول سابقة...'));

    // 1. البحث في الأخطاء المماثلة
    const similarErrors = this.errorHistory.filter(
      (record) =>
        record.successful && record.solution && this.calculateSimilarity(error, record.error) > 0.7
    );

    if (similarErrors.length > 0) {
      // استخدام أكثر حل ناجح
      const bestSolution = similarErrors.sort((a, b) => b.timestamp - a.timestamp)[0];

      console.log(chalk.green(`✅ وجدت حل سابق ناجح!`));
      return bestSolution.solution!;
    }

    // 2. البحث في الأنماط
    const errorType = this.classifyError(error);
    const pattern = this.patterns.get(errorType);

    if (pattern && pattern.solutions.length > 0) {
      // استخدام الحل الأكثر نجاحاً
      const bestSolution = pattern.solutions.sort((a, b) => b.successRate - a.successRate)[0];

      if (bestSolution.successRate > 0.5) {
        console.log(chalk.green(`✅ وجدت حل من الأنماط!`));
        return bestSolution.solution;
      }
    }

    // 3. طلب حل من AI
    if (this.client) {
      console.log(chalk.cyan('🤖 طلب حل من AI...'));
      return await this.generateSolution(error);
    }

    console.log(chalk.yellow('⚠️ لم أجد حل مناسب'));
    return null;
  }

  // ============================================
  // 💡 توليد حل باستخدام AI
  // ============================================
  private async generateSolution(error: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `أنا أواجه هذا الخطأ:
${error}

ما الحل المقترح؟ أعطني حل مباشر وواضح.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
    } catch (error) {
      console.log(chalk.red('❌ فشل في توليد حل من AI'));
    }

    return null;
  }

  // ============================================
  // ✅ تسجيل نجاح حل
  // ============================================
  async recordSuccess(errorId: string, solution: string): Promise<void> {
    const errorRecord = this.errorHistory.find((e) => e.id === errorId);

    if (errorRecord) {
      errorRecord.successful = true;
      errorRecord.solution = solution;

      // تحديث الأنماط
      const errorType = this.classifyError(errorRecord.error);
      const pattern = this.patterns.get(errorType);

      if (pattern) {
        // البحث عن الحل في القائمة
        let solutionEntry = pattern.solutions.find(
          (s) => this.calculateSimilarity(s.solution, solution) > 0.8
        );

        if (solutionEntry) {
          // تحديث معدل النجاح
          solutionEntry.timesUsed++;
          const totalAttempts = pattern.frequency;
          solutionEntry.successRate = solutionEntry.timesUsed / totalAttempts;
        } else {
          // إضافة حل جديد
          pattern.solutions.push({
            solution,
            successRate: 1.0,
            timesUsed: 1,
          });
        }
      }

      await this.save();

      console.log(chalk.green(`✅ تم تسجيل نجاح الحل: ${errorId}`));
    }
  }

  // ============================================
  // 📊 تحديث الأنماط
  // ============================================
  private async updatePatterns(error: string): Promise<void> {
    const errorType = this.classifyError(error);

    let pattern = this.patterns.get(errorType);

    if (pattern) {
      pattern.frequency++;
      pattern.lastSeen = Date.now();
    } else {
      pattern = {
        errorType,
        pattern: this.extractPattern(error),
        frequency: 1,
        solutions: [],
        lastSeen: Date.now(),
      };

      this.patterns.set(errorType, pattern);
    }
  }

  // ============================================
  // 🏷️ تصنيف الخطأ
  // ============================================
  private classifyError(error: string): string {
    const errorLower = error.toLowerCase();

    // أنواع الأخطاء الشائعة
    if (errorLower.includes('cannot find module')) return 'MODULE_NOT_FOUND';
    if (errorLower.includes('typeerror')) return 'TYPE_ERROR';
    if (errorLower.includes('referenceerror')) return 'REFERENCE_ERROR';
    if (errorLower.includes('syntaxerror')) return 'SYNTAX_ERROR';
    if (errorLower.includes('enoent')) return 'FILE_NOT_FOUND';
    if (errorLower.includes('eacces')) return 'PERMISSION_ERROR';
    if (errorLower.includes('timeout')) return 'TIMEOUT_ERROR';
    if (errorLower.includes('econnrefused')) return 'CONNECTION_ERROR';

    // افتراضي
    return 'UNKNOWN_ERROR';
  }

  // ============================================
  // 🔍 استخراج النمط
  // ============================================
  private extractPattern(error: string): string {
    // استخراج أول سطر من الخطأ
    return error.split('\n')[0].trim();
  }

  // ============================================
  // 📏 حساب التشابه بين نصين
  // ============================================
  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance مبسط
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const common = words1.filter((w) => words2.includes(w)).length;
    const total = Math.max(words1.length, words2.length);

    return common / total;
  }

  // ============================================
  // 📊 الحصول على إحصائيات
  // ============================================
  getStats(): LearningStats {
    const totalErrors = this.errorHistory.length;
    const solvedErrors = this.errorHistory.filter((e) => e.successful).length;
    const successRate = totalErrors > 0 ? solvedErrors / totalErrors : 0;

    // أكثر الأخطاء تكراراً
    const errorCounts = new Map<string, number>();
    for (const record of this.errorHistory) {
      const type = this.classifyError(record.error);
      errorCounts.set(type, (errorCounts.get(type) || 0) + 1);
    }

    const topErrors = Array.from(errorCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors,
      solvedErrors,
      patterns: this.patterns.size,
      successRate: Math.round(successRate * 100) / 100,
      topErrors,
    };
  }

  // ============================================
  // 🎨 عرض الإحصائيات
  // ============================================
  displayStats(): void {
    const stats = this.getStats();

    console.log(chalk.cyan('\n📊 إحصائيات التعلم:'));
    console.log(chalk.gray('━'.repeat(60)));

    console.log(chalk.blue(`📝 إجمالي الأخطاء: ${stats.totalErrors}`));
    console.log(chalk.green(`✅ الأخطاء المحلولة: ${stats.solvedErrors}`));
    console.log(chalk.yellow(`🎯 معدل النجاح: ${(stats.successRate * 100).toFixed(1)}%`));
    console.log(chalk.cyan(`🧩 الأنماط المكتشفة: ${stats.patterns}`));

    if (stats.topErrors.length > 0) {
      console.log(chalk.blue(`\n🔝 أكثر الأخطاء تكراراً:`));
      for (const { type, count } of stats.topErrors) {
        console.log(chalk.gray(`   ${type}: ${count}`));
      }
    }

    console.log(chalk.gray('━'.repeat(60)) + '\n');
  }

  // ============================================
  // 🧹 تنظيف البيانات القديمة
  // ============================================
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();

    // حذف الأخطاء القديمة جداً
    const beforeCount = this.errorHistory.length;
    this.errorHistory = this.errorHistory.filter((e) => now - e.timestamp < maxAge);
    const removed = beforeCount - this.errorHistory.length;

    if (removed > 0) {
      console.log(chalk.yellow(`🧹 تم حذف ${removed} خطأ قديم`));
      await this.save();
    }
  }
}
