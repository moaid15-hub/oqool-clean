// code-reviewer.ts
// ============================================
// 🔍 Code Review Automation
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs-extra';
import { glob } from 'glob';
import chalk from 'chalk';
import { join } from 'path';

export interface ReviewResult {
  overallScore: number;
  security: SecurityReview;
  performance: PerformanceReview;
  quality: QualityReview;
  documentation: DocumentationReview;
  testing: TestingReview;
  recommendations: string[];
}

export interface SecurityReview {
  score: number;
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string;
    line?: number;
    description: string;
    suggestion: string;
  }>;
}

export interface PerformanceReview {
  score: number;
  hotspots: Array<{
    file: string;
    function: string;
    complexity: string;
    suggestion: string;
  }>;
}

export interface QualityReview {
  score: number;
  smells: Array<{
    type: string;
    file: string;
    description: string;
  }>;
}

export interface DocumentationReview {
  score: number;
  missing: string[];
  outdated: string[];
}

export interface TestingReview {
  score: number;
  coverage?: number;
  missingTests: string[];
}

export class CodeReviewer {
  private client: Anthropic;
  private workingDirectory: string;

  constructor(apiKey: string, workingDirectory: string) {
    this.client = new Anthropic({ apiKey });
    this.workingDirectory = workingDirectory;
  }

  // ============================================
  // 🔍 المراجعة الشاملة
  // ============================================
  async review(): Promise<ReviewResult> {
    console.log(chalk.cyan('\n🔍 بدء المراجعة الشاملة للكود...\n'));

    // جمع الملفات
    const files = await this.getProjectFiles();
    console.log(chalk.gray(`📁 وجدت ${files.length} ملف للمراجعة`));

    const result: ReviewResult = {
      overallScore: 0,
      security: await this.reviewSecurity(files),
      performance: await this.reviewPerformance(files),
      quality: await this.reviewQuality(files),
      documentation: await this.reviewDocumentation(),
      testing: await this.reviewTesting(),
      recommendations: [],
    };

    // حساب النتيجة الإجمالية
    result.overallScore = Math.round(
      (result.security.score +
        result.performance.score +
        result.quality.score +
        result.documentation.score +
        result.testing.score) /
        5
    );

    // توليد التوصيات
    result.recommendations = await this.generateRecommendations(result);

    // عرض النتائج
    this.displayResults(result);

    return result;
  }

  // ============================================
  // 🔒 مراجعة الأمان
  // ============================================
  private async reviewSecurity(files: string[]): Promise<SecurityReview> {
    console.log(chalk.blue('🔒 مراجعة الأمان...'));

    const issues: SecurityReview['issues'] = [];
    let score = 100;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // فحص SQL Injection
      if (content.match(/query\s*\([^?]*\$\{/)) {
        issues.push({
          severity: 'critical',
          file,
          description: 'احتمالية SQL Injection',
          suggestion: 'استخدم Parameterized Queries',
        });
        score -= 15;
      }

      // فحص Hardcoded Secrets
      if (content.match(/(password|secret|key)\s*=\s*['"][^'"]{8,}['"]/i)) {
        issues.push({
          severity: 'high',
          file,
          description: 'كلمات سر مخزنة في الكود',
          suggestion: 'استخدم متغيرات البيئة (.env)',
        });
        score -= 10;
      }

      // فحص eval/exec
      if (content.match(/\beval\(|exec\(/)) {
        issues.push({
          severity: 'high',
          file,
          description: 'استخدام eval/exec خطر',
          suggestion: 'تجنب eval واستخدم طرق آمنة',
        });
        score -= 10;
      }
    }

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  // ============================================
  // ⚡ مراجعة الأداء
  // ============================================
  private async reviewPerformance(files: string[]): Promise<PerformanceReview> {
    console.log(chalk.blue('⚡ مراجعة الأداء...'));

    const hotspots: PerformanceReview['hotspots'] = [];
    let score = 100;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // فحص Nested Loops
      const nestedLoops = content.match(/for\s*\([^)]*\)[^{]*{[^}]*for\s*\(/g);
      if (nestedLoops && nestedLoops.length > 0) {
        hotspots.push({
          file,
          function: 'unknown',
          complexity: 'O(n²)',
          suggestion: 'استخدم Map أو Set لتحسين الأداء',
        });
        score -= 10;
      }

      // فحص Array.includes في loop
      if (content.match(/\.includes\([^)]*\)/g)) {
        hotspots.push({
          file,
          function: 'unknown',
          complexity: 'O(n)',
          suggestion: 'استخدم Set.has() للبحث الأسرع',
        });
        score -= 5;
      }
    }

    return {
      score: Math.max(0, score),
      hotspots,
    };
  }

  // ============================================
  // ✨ مراجعة الجودة
  // ============================================
  private async reviewQuality(files: string[]): Promise<QualityReview> {
    console.log(chalk.blue('✨ مراجعة الجودة...'));

    const smells: QualityReview['smells'] = [];
    let score = 100;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // فحص Long Functions
      const functions = content.match(/function\s+\w+[^{]*{([^}]{500,})}/g);
      if (functions && functions.length > 0) {
        smells.push({
          type: 'Long Function',
          file,
          description: 'دالة طويلة جداً (500+ سطر)',
        });
        score -= 5;
      }

      // فحص Magic Numbers
      const magicNumbers = content.match(/\b\d{3,}\b/g);
      if (magicNumbers && magicNumbers.length > 5) {
        smells.push({
          type: 'Magic Numbers',
          file,
          description: 'أرقام غامضة - استخدم constants',
        });
        score -= 3;
      }

      // فحص console.log في production
      if (content.includes('console.log')) {
        smells.push({
          type: 'Console Logs',
          file,
          description: 'console.log موجود - احذفه قبل production',
        });
        score -= 2;
      }
    }

    return {
      score: Math.max(0, score),
      smells,
    };
  }

  // ============================================
  // 📚 مراجعة التوثيق
  // ============================================
  private async reviewDocumentation(): Promise<DocumentationReview> {
    console.log(chalk.blue('📚 مراجعة التوثيق...'));

    const missing: string[] = [];
    const outdated: string[] = [];
    let score = 100;

    // فحص README
    if (!(await fs.pathExists(join(this.workingDirectory, 'README.md')))) {
      missing.push('README.md');
      score -= 20;
    }

    // فحص CHANGELOG
    if (!(await fs.pathExists(join(this.workingDirectory, 'CHANGELOG.md')))) {
      missing.push('CHANGELOG.md');
      score -= 10;
    }

    // فحص LICENSE
    if (!(await fs.pathExists(join(this.workingDirectory, 'LICENSE')))) {
      missing.push('LICENSE');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      missing,
      outdated,
    };
  }

  // ============================================
  // 🧪 مراجعة الاختبارات
  // ============================================
  private async reviewTesting(): Promise<TestingReview> {
    console.log(chalk.blue('🧪 مراجعة الاختبارات...'));

    const missingTests: string[] = [];
    let score = 100;

    // فحص وجود مجلد tests
    const hasTests =
      (await fs.pathExists(join(this.workingDirectory, 'tests'))) ||
      (await fs.pathExists(join(this.workingDirectory, '__tests__')));

    if (!hasTests) {
      score = 0;
      missingTests.push('لا توجد اختبارات');
    }

    return {
      score: Math.max(0, score),
      missingTests,
    };
  }

  // ============================================
  // 💡 توليد التوصيات
  // ============================================
  private async generateRecommendations(result: ReviewResult): Promise<string[]> {
    const recommendations: string[] = [];

    if (result.security.score < 80) {
      recommendations.push('🔒 ركز على تحسين الأمان - راجع الثغرات المكتشفة');
    }

    if (result.performance.score < 80) {
      recommendations.push('⚡ حسّن الأداء - هناك اختناقات يمكن تحسينها');
    }

    if (result.documentation.score < 70) {
      recommendations.push('📚 أضف توثيق - README و CHANGELOG مهمين');
    }

    if (result.testing.score < 50) {
      recommendations.push('🧪 أضف اختبارات - التغطية منخفضة جداً');
    }

    return recommendations;
  }

  // ============================================
  // 🎨 عرض النتائج
  // ============================================
  private displayResults(result: ReviewResult): void {
    console.log(chalk.cyan('\n📊 تقرير المراجعة:'));
    console.log(chalk.gray('━'.repeat(60)));

    // Overall Score
    const scoreColor =
      result.overallScore >= 80
        ? chalk.green
        : result.overallScore >= 60
          ? chalk.yellow
          : chalk.red;

    console.log(scoreColor(`\n🎯 النتيجة الإجمالية: ${result.overallScore}/100\n`));

    // Detailed Scores
    console.log(chalk.blue('📋 التفاصيل:'));
    console.log(
      `  🔒 الأمان: ${result.security.score}/100 ${result.security.issues.length > 0 ? chalk.red(`(${result.security.issues.length} مشاكل)`) : chalk.green('✓')}`
    );
    console.log(
      `  ⚡ الأداء: ${result.performance.score}/100 ${result.performance.hotspots.length > 0 ? chalk.yellow(`(${result.performance.hotspots.length} نقاط ساخنة)`) : chalk.green('✓')}`
    );
    console.log(
      `  ✨ الجودة: ${result.quality.score}/100 ${result.quality.smells.length > 0 ? chalk.yellow(`(${result.quality.smells.length} code smells)`) : chalk.green('✓')}`
    );
    console.log(
      `  📚 التوثيق: ${result.documentation.score}/100 ${result.documentation.missing.length > 0 ? chalk.yellow(`(${result.documentation.missing.length} ملفات ناقصة)`) : chalk.green('✓')}`
    );
    console.log(`  🧪 الاختبارات: ${result.testing.score}/100\n`);

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log(chalk.yellow('💡 التوصيات:'));
      for (const rec of result.recommendations) {
        console.log(chalk.gray(`  ${rec}`));
      }
    }

    console.log(chalk.gray('\n' + '━'.repeat(60)) + '\n');
  }

  // ============================================
  // 📁 جمع ملفات المشروع
  // ============================================
  private async getProjectFiles(): Promise<string[]> {
    const patterns = ['**/*.{ts,tsx,js,jsx}', '!node_modules/**', '!dist/**', '!build/**'];
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.workingDirectory,
        absolute: true,
      });
      files.push(...matches);
    }

    return files;
  }
}
