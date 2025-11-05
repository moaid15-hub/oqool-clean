// test-runner.ts
// ============================================
// 🧪 Test Runner & Debugger
// ============================================

import { spawn } from 'child_process';
import chalk from 'chalk';
import fs from 'fs-extra';
import { join } from 'path';

export interface TestResult {
  passed: boolean;
  total: number;
  passed_count: number;
  failed_count: number;
  duration: number;
  output: string;
  errors: string[];
}

export class TestRunner {
  private workingDirectory: string;
  private testFramework?: 'jest' | 'mocha' | 'vitest' | 'node:test';

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  // ============================================
  // 🔍 اكتشاف Test Framework
  // ============================================
  async detectTestFramework(): Promise<string | null> {
    try {
      const packageJsonPath = join(this.workingDirectory, 'package.json');

      if (!(await fs.pathExists(packageJsonPath))) {
        return null;
      }

      const packageJson = await fs.readJSON(packageJsonPath);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['jest']) {
        this.testFramework = 'jest';
        return 'jest';
      } else if (deps['mocha']) {
        this.testFramework = 'mocha';
        return 'mocha';
      } else if (deps['vitest']) {
        this.testFramework = 'vitest';
        return 'vitest';
      }

      // Node.js built-in test runner (Node 18+)
      this.testFramework = 'node:test';
      return 'node:test';
    } catch (error) {
      return null;
    }
  }

  // ============================================
  // 🧪 تشغيل الاختبارات
  // ============================================
  async runTests(testFile?: string): Promise<TestResult> {
    console.log(chalk.cyan('\n🧪 تشغيل الاختبارات...'));

    const framework = await this.detectTestFramework();

    if (!framework) {
      return {
        passed: false,
        total: 0,
        passed_count: 0,
        failed_count: 0,
        duration: 0,
        output: '',
        errors: ['لم يتم العثور على test framework'],
      };
    }

    console.log(chalk.gray(`📦 Framework: ${framework}`));

    const startTime = Date.now();

    try {
      const result = await this.executeTests(framework, testFile);
      const duration = Date.now() - startTime;

      // تحليل النتائج
      const testResult = this.parseTestOutput(result.output, framework);
      testResult.duration = duration;

      // عرض النتائج
      this.displayResults(testResult);

      return testResult;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل تشغيل الاختبارات: ${error.message}`));

      return {
        passed: false,
        total: 0,
        passed_count: 0,
        failed_count: 0,
        duration: Date.now() - startTime,
        output: '',
        errors: [error.message],
      };
    }
  }

  // ============================================
  // ⚙️ تنفيذ الاختبارات
  // ============================================
  private executeTests(
    framework: string,
    testFile?: string
  ): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[] = [];

      switch (framework) {
        case 'jest':
          command = 'npx';
          args = ['jest'];
          if (testFile) args.push(testFile);
          break;

        case 'mocha':
          command = 'npx';
          args = ['mocha'];
          if (testFile) args.push(testFile);
          break;

        case 'vitest':
          command = 'npx';
          args = ['vitest', 'run'];
          if (testFile) args.push(testFile);
          break;

        case 'node:test':
          command = 'node';
          args = ['--test'];
          if (testFile) args.push(testFile);
          break;

        default:
          reject(new Error(`Framework غير مدعوم: ${framework}`));
          return;
      }

      const child = spawn(command, args, {
        cwd: this.workingDirectory,
        shell: true,
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Timeout بعد دقيقتين
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('انتهى الوقت المسموح للاختبارات'));
      }, 120000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          output: output + errorOutput,
          exitCode: code || 0,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // ============================================
  // 📊 تحليل نتائج الاختبارات
  // ============================================
  private parseTestOutput(output: string, framework: string): TestResult {
    const result: TestResult = {
      passed: false,
      total: 0,
      passed_count: 0,
      failed_count: 0,
      duration: 0,
      output: output,
      errors: [],
    };

    // Jest
    if (framework === 'jest') {
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const totalMatch = output.match(/(\d+) total/);

      if (passedMatch) result.passed_count = parseInt(passedMatch[1]);
      if (failedMatch) result.failed_count = parseInt(failedMatch[1]);
      if (totalMatch) result.total = parseInt(totalMatch[1]);

      result.passed = result.failed_count === 0 && result.total > 0;

      // استخراج الأخطاء
      const errorMatches = output.match(/● .+?\n\n/g);
      if (errorMatches) {
        result.errors = errorMatches.map((e) => e.trim());
      }
    }

    // Mocha
    else if (framework === 'mocha') {
      const passingMatch = output.match(/(\d+) passing/);
      const failingMatch = output.match(/(\d+) failing/);

      if (passingMatch) result.passed_count = parseInt(passingMatch[1]);
      if (failingMatch) result.failed_count = parseInt(failingMatch[1]);

      result.total = result.passed_count + result.failed_count;
      result.passed = result.failed_count === 0 && result.total > 0;
    }

    // Node:test
    else if (framework === 'node:test') {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('✔') || line.includes('ok')) result.passed_count++;
        if (line.includes('✖') || line.includes('not ok')) result.failed_count++;
      }

      result.total = result.passed_count + result.failed_count;
      result.passed = result.failed_count === 0 && result.total > 0;
    }

    return result;
  }

  // ============================================
  // 🎨 عرض النتائج
  // ============================================
  private displayResults(result: TestResult): void {
    console.log('\n' + chalk.gray('━'.repeat(60)));

    if (result.passed) {
      console.log(chalk.green(`✅ جميع الاختبارات نجحت!`));
    } else {
      console.log(chalk.red(`❌ بعض الاختبارات فشلت`));
    }

    console.log(chalk.blue(`📊 النتائج:`));
    console.log(chalk.gray(`   الإجمالي: ${result.total}`));
    console.log(chalk.green(`   ✅ نجح: ${result.passed_count}`));

    if (result.failed_count > 0) {
      console.log(chalk.red(`   ❌ فشل: ${result.failed_count}`));
    }

    console.log(chalk.gray(`   ⏱️  الوقت: ${result.duration}ms`));

    if (result.errors.length > 0) {
      console.log(chalk.red(`\n🔍 الأخطاء:`));
      for (const error of result.errors.slice(0, 3)) {
        console.log(chalk.gray(error));
      }
    }

    console.log(chalk.gray('━'.repeat(60)) + '\n');
  }

  // ============================================
  // 🐛 اقتراحات لإصلاح الأخطاء
  // ============================================
  async suggestFixes(testResult: TestResult): Promise<string[]> {
    const suggestions: string[] = [];

    if (testResult.failed_count === 0) {
      return suggestions;
    }

    // تحليل الأخطاء الشائعة
    for (const error of testResult.errors) {
      if (error.includes('Cannot find module')) {
        suggestions.push('تحقق من أن جميع الوحدات مثبتة: npm install');
      }

      if (error.includes('TypeError') || error.includes('ReferenceError')) {
        suggestions.push('تحقق من أن جميع المتغيرات معرّفة بشكل صحيح');
      }

      if (error.includes('timeout')) {
        suggestions.push('قد تحتاج لزيادة timeout للاختبارات الطويلة');
      }

      if (error.includes('ENOENT')) {
        suggestions.push('تحقق من أن جميع الملفات المطلوبة موجودة');
      }
    }

    return [...new Set(suggestions)]; // إزالة التكرار
  }
}
