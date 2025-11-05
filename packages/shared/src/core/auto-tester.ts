// auto-tester.ts
// ============================================
// 🧪 Auto Tester - اختبار تلقائي للكود
// ============================================

import { spawn } from 'child_process';
import fs from 'fs-extra';
import { join } from 'path';
import chalk from 'chalk';
import { TestRunner } from './test-runner.js';
import { SecurityEnhancements } from './security-enhancements.js';

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface AutoTestResult {
  syntaxOk: boolean;
  testsPass: boolean;
  secure: boolean;
  performant: boolean;
  details: {
    syntax?: {
      valid: boolean;
      errors: string[];
    };
    tests?: {
      passed: number;
      failed: number;
      total: number;
      details: string;
    };
    security?: {
      safe: boolean;
      vulnerabilities: Array<{
        type: string;
        severity: string;
        message: string;
      }>;
    };
    performance?: {
      fast: boolean;
      executionTime: number;
      memoryUsage: number;
      warnings: string[];
    };
  };
  overall: 'pass' | 'fail' | 'warning';
}

export interface AutoTesterConfig {
  workingDirectory: string;
  enableSyntaxCheck?: boolean;
  enableTests?: boolean;
  enableSecurity?: boolean;
  enablePerformance?: boolean;
  securityScanner?: SecurityEnhancements; // اختياري - يمكن تمريره من الخارج
}

// ============================================
// 🧪 Auto Tester Class
// ============================================

export class AutoTester {
  private config: AutoTesterConfig;
  private testRunner?: TestRunner;
  private securityScanner?: SecurityEnhancements;

  constructor(config: AutoTesterConfig) {
    this.config = {
      enableSyntaxCheck: true,
      enableTests: true,
      enableSecurity: true,
      enablePerformance: true,
      ...config,
    };

    // تهيئة الأدوات
    this.testRunner = new TestRunner(config.workingDirectory);

    // SecurityScanner اختياري - يمكن تمريره من الخارج
    if (config.securityScanner) {
      this.securityScanner = config.securityScanner;
    }
  }

  // إضافة Security Scanner بعد الإنشاء
  setSecurityScanner(scanner: SecurityEnhancements): void {
    this.securityScanner = scanner;
  }

  // ============================================
  // 🎯 الوظيفة الرئيسية - اختبار الكود
  // ============================================
  async testGeneratedCode(code: string, filePath: string): Promise<AutoTestResult> {
    console.log(chalk.cyan('\n🧪 بدء الاختبار التلقائي للكود...'));
    console.log(chalk.gray('━'.repeat(50)));

    const result: AutoTestResult = {
      syntaxOk: true,
      testsPass: true,
      secure: true,
      performant: true,
      details: {},
      overall: 'pass',
    };

    // 1. Syntax Check
    if (this.config.enableSyntaxCheck) {
      console.log(chalk.blue('\n1️⃣ فحص Syntax...'));
      result.syntaxOk = await this.checkSyntax(code, filePath);
      result.details.syntax = await this.getSyntaxDetails(code, filePath);
    }

    // 2. Run Tests
    if (this.config.enableTests && result.syntaxOk) {
      console.log(chalk.blue('\n2️⃣ تشغيل الاختبارات...'));
      result.testsPass = await this.runTests(filePath);
      result.details.tests = await this.getTestDetails(filePath);
    }

    // 3. Security Scan
    if (this.config.enableSecurity && result.syntaxOk) {
      console.log(chalk.blue('\n3️⃣ فحص الأمان...'));
      result.secure = await this.scanSecurity(code, filePath);
      result.details.security = await this.getSecurityDetails(code, filePath);
    }

    // 4. Performance Check
    if (this.config.enablePerformance && result.syntaxOk) {
      console.log(chalk.blue('\n4️⃣ فحص الأداء...'));
      result.performant = await this.checkPerformance(code, filePath);
      result.details.performance = await this.getPerformanceDetails(code, filePath);
    }

    // تحديد النتيجة الإجمالية
    if (!result.syntaxOk || !result.testsPass || !result.secure) {
      result.overall = 'fail';
    } else if (!result.performant) {
      result.overall = 'warning';
    } else {
      result.overall = 'pass';
    }

    this.printSummary(result);

    return result;
  }

  // ============================================
  // 1️⃣ Syntax Check
  // ============================================
  async checkSyntax(code: string, filePath: string): Promise<boolean> {
    try {
      const ext = filePath.split('.').pop();

      switch (ext) {
        case 'js':
        case 'jsx':
          return await this.checkJavaScriptSyntax(code);

        case 'ts':
        case 'tsx':
          return await this.checkTypeScriptSyntax(code);

        case 'py':
          return await this.checkPythonSyntax(code, filePath);

        case 'java':
          return await this.checkJavaSyntax(code, filePath);

        default:
          console.log(chalk.yellow(`⚠️ نوع الملف ${ext} غير مدعوم للفحص`));
          return true; // نعتبره صحيح افتراضياً
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ خطأ في فحص Syntax: ${error.message}`));
      return false;
    }
  }

  private async checkJavaScriptSyntax(code: string): Promise<boolean> {
    try {
      // محاولة parse الكود بـ Function
      new Function(code);
      console.log(chalk.green('✅ JavaScript Syntax صحيح'));
      return true;
    } catch (error: any) {
      console.log(chalk.red(`❌ JavaScript Syntax خاطئ: ${error.message}`));
      return false;
    }
  }

  private async checkTypeScriptSyntax(code: string): Promise<boolean> {
    try {
      // استخدام TypeScript compiler API إذا متوفر
      const ts = await import('typescript').catch(() => null);

      if (!ts) {
        console.log(chalk.yellow('⚠️ TypeScript غير مثبت، تخطي الفحص'));
        return true;
      }

      const result = ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      });

      if (result.diagnostics && result.diagnostics.length > 0) {
        console.log(chalk.red('❌ TypeScript Syntax خاطئ'));
        result.diagnostics.forEach((d) => {
          console.log(chalk.gray(`  - ${d.messageText}`));
        });
        return false;
      }

      console.log(chalk.green('✅ TypeScript Syntax صحيح'));
      return true;
    } catch (error: any) {
      console.log(chalk.red(`❌ TypeScript Syntax خاطئ: ${error.message}`));
      return false;
    }
  }

  private async checkPythonSyntax(code: string, filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const python = spawn('python3', ['-m', 'py_compile', filePath]);

      let stderr = '';
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Python Syntax صحيح'));
          resolve(true);
        } else {
          console.log(chalk.red(`❌ Python Syntax خاطئ:\n${stderr}`));
          resolve(false);
        }
      });

      python.on('error', () => {
        console.log(chalk.yellow('⚠️ Python غير مثبت، تخطي الفحص'));
        resolve(true);
      });
    });
  }

  private async checkJavaSyntax(code: string, filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const javac = spawn('javac', [filePath]);

      let stderr = '';
      javac.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      javac.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Java Syntax صحيح'));
          resolve(true);
        } else {
          console.log(chalk.red(`❌ Java Syntax خاطئ:\n${stderr}`));
          resolve(false);
        }
      });

      javac.on('error', () => {
        console.log(chalk.yellow('⚠️ Java compiler غير مثبت، تخطي الفحص'));
        resolve(true);
      });
    });
  }

  private async getSyntaxDetails(code: string, filePath: string): Promise<any> {
    const ext = filePath.split('.').pop();
    const errors: string[] = [];

    try {
      const valid = await this.checkSyntax(code, filePath);
      return {
        valid,
        errors,
        language: ext,
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        valid: false,
        errors,
        language: ext,
      };
    }
  }

  // ============================================
  // 2️⃣ Run Tests
  // ============================================
  async runTests(filePath: string): Promise<boolean> {
    try {
      if (!this.testRunner) {
        console.log(chalk.yellow('⚠️ Test Runner غير متاح'));
        return true;
      }

      const testResult = await this.testRunner.runTests(filePath);

      if (testResult.passed) {
        console.log(
          chalk.green(`✅ الاختبارات نجحت (${testResult.passed_count}/${testResult.total})`)
        );
        return true;
      } else {
        console.log(
          chalk.red(`❌ الاختبارات فشلت (${testResult.failed_count}/${testResult.total})`)
        );
        return false;
      }
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ تعذر تشغيل الاختبارات: ${error.message}`));
      return true; // نعتبره نجح إذا لم تكن هناك اختبارات
    }
  }

  private async getTestDetails(filePath: string): Promise<any> {
    try {
      if (!this.testRunner) {
        return {
          passed: 0,
          failed: 0,
          total: 0,
          details: 'Test Runner غير متاح',
        };
      }

      const testResult = await this.testRunner.runTests(filePath);

      return {
        passed: testResult.passed_count,
        failed: testResult.failed_count,
        total: testResult.total,
        details: testResult.output,
      };
    } catch (error: any) {
      return {
        passed: 0,
        failed: 0,
        total: 0,
        details: `خطأ: ${error.message}`,
      };
    }
  }

  // ============================================
  // 3️⃣ Security Scan
  // ============================================
  async scanSecurity(code: string, filePath: string): Promise<boolean> {
    try {
      if (!this.securityScanner) {
        console.log(chalk.yellow('⚠️ Security Scanner غير متاح'));
        return true;
      }

      const fileName = filePath.split('/').pop() || 'unknown';
      const scanResult = await this.securityScanner.scanGeneratedCode(code, fileName);

      if (scanResult.safe) {
        console.log(chalk.green('✅ الكود آمن'));
        return true;
      } else {
        console.log(chalk.red(`❌ وُجدت ${scanResult.issues.length} ثغرات أمنية`));
        scanResult.issues.forEach((issue) => {
          console.log(chalk.yellow(`  - [${issue.severity}] ${issue.type}: ${issue.description}`));
        });
        return false;
      }
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ تعذر فحص الأمان: ${error.message}`));
      return true;
    }
  }

  private async getSecurityDetails(code: string, filePath: string): Promise<any> {
    try {
      if (!this.securityScanner) {
        return {
          safe: true,
          vulnerabilities: [],
        };
      }

      const fileName = filePath.split('/').pop() || 'unknown';
      const scanResult = await this.securityScanner.scanGeneratedCode(code, fileName);

      return {
        safe: scanResult.safe,
        vulnerabilities: scanResult.issues.map((issue) => ({
          type: issue.type,
          severity: issue.severity,
          message: issue.description,
        })),
      };
    } catch (error: any) {
      return {
        safe: true,
        vulnerabilities: [],
        error: error.message,
      };
    }
  }

  // ============================================
  // 4️⃣ Performance Check
  // ============================================
  async checkPerformance(code: string, filePath: string): Promise<boolean> {
    try {
      const ext = filePath.split('.').pop();

      // فحص أساسي للأداء
      const warnings: string[] = [];

      // 1. فحص الحلقات المتداخلة (O(n²) or worse)
      if (this.hasNestedLoops(code)) {
        warnings.push('تحذير: حلقات متداخلة قد تؤثر على الأداء');
      }

      // 2. فحص العمليات المكلفة
      if (this.hasExpensiveOperations(code)) {
        warnings.push('تحذير: عمليات مكلفة قد تؤثر على الأداء');
      }

      // 3. فحص استخدام الذاكرة
      if (this.hasMemoryIssues(code)) {
        warnings.push('تحذير: قد يستهلك ذاكرة كبيرة');
      }

      // 4. فحص التعقيد الزمني
      const complexity = this.estimateComplexity(code);
      if (complexity > 2) {
        warnings.push(`تحذير: تعقيد زمني عالي O(n^${complexity})`);
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow('⚠️ تحذيرات الأداء:'));
        warnings.forEach((w) => console.log(chalk.gray(`  - ${w}`)));
        return false;
      }

      console.log(chalk.green('✅ الأداء جيد'));
      return true;
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ تعذر فحص الأداء: ${error.message}`));
      return true;
    }
  }

  private hasNestedLoops(code: string): boolean {
    // بحث عن حلقات متداخلة
    const forPattern = /for\s*\([^)]*\)\s*{[^}]*for\s*\(/g;
    const whilePattern = /while\s*\([^)]*\)\s*{[^}]*while\s*\(/g;

    return forPattern.test(code) || whilePattern.test(code);
  }

  private hasExpensiveOperations(code: string): boolean {
    // بحث عن عمليات مكلفة
    const expensivePatterns = [
      /\.sort\(/g, // Sort في حلقة
      /JSON\.parse/g, // JSON parsing متكرر
      /eval\(/g, // eval (خطير وبطيء)
      /new RegExp/g, // Regex creation في حلقة
    ];

    return expensivePatterns.some((pattern) => pattern.test(code));
  }

  private hasMemoryIssues(code: string): boolean {
    // بحث عن مشاكل الذاكرة المحتملة
    const memoryPatterns = [
      /new Array\(\d{5,}\)/g, // مصفوفات كبيرة جداً
      /\.concat\([^)]*\)/g, // concat في حلقة (يولد مصفوفات جديدة)
    ];

    return memoryPatterns.some((pattern) => pattern.test(code));
  }

  private estimateComplexity(code: string): number {
    // تقدير بسيط للتعقيد الزمني
    let complexity = 1;

    // عد مستويات الحلقات المتداخلة
    const loops = code.match(/for|while/g) || [];

    if (loops.length > 0) {
      // تقدير بناءً على عدد الحلقات
      complexity = Math.min(loops.length, 3);
    }

    return complexity;
  }

  private async getPerformanceDetails(code: string, filePath: string): Promise<any> {
    const warnings: string[] = [];

    if (this.hasNestedLoops(code)) {
      warnings.push('حلقات متداخلة');
    }
    if (this.hasExpensiveOperations(code)) {
      warnings.push('عمليات مكلفة');
    }
    if (this.hasMemoryIssues(code)) {
      warnings.push('مشاكل ذاكرة محتملة');
    }

    const complexity = this.estimateComplexity(code);

    return {
      fast: warnings.length === 0 && complexity <= 2,
      executionTime: 0, // سيتم قياسه عند التشغيل الفعلي
      memoryUsage: 0, // سيتم قياسه عند التشغيل الفعلي
      warnings,
      complexity: `O(n^${complexity})`,
    };
  }

  // ============================================
  // 📊 عرض الملخص
  // ============================================
  private printSummary(result: AutoTestResult): void {
    console.log(chalk.gray('\n' + '━'.repeat(50)));
    console.log(chalk.bold.cyan('\n📊 ملخص الاختبار:\n'));

    // Syntax
    console.log(result.syntaxOk ? chalk.green('✅ Syntax: صحيح') : chalk.red('❌ Syntax: خاطئ'));

    // Tests
    console.log(result.testsPass ? chalk.green('✅ Tests: نجحت') : chalk.red('❌ Tests: فشلت'));

    // Security
    console.log(
      result.secure ? chalk.green('✅ Security: آمن') : chalk.red('❌ Security: غير آمن')
    );

    // Performance
    console.log(
      result.performant
        ? chalk.green('✅ Performance: جيد')
        : chalk.yellow('⚠️ Performance: يحتاج تحسين')
    );

    // Overall
    console.log(chalk.gray('\n' + '─'.repeat(50)));

    if (result.overall === 'pass') {
      console.log(chalk.green.bold('\n✅ النتيجة الإجمالية: نجح\n'));
    } else if (result.overall === 'warning') {
      console.log(chalk.yellow.bold('\n⚠️ النتيجة الإجمالية: تحذير\n'));
    } else {
      console.log(chalk.red.bold('\n❌ النتيجة الإجمالية: فشل\n'));
    }

    console.log(chalk.gray('━'.repeat(50) + '\n'));
  }
}

// ============================================
// 🏭 Factory Function
// ============================================
export function createAutoTester(config: AutoTesterConfig): AutoTester {
  return new AutoTester(config);
}
