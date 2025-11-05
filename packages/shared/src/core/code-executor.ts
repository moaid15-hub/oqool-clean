// code-executor.ts
// ============================================
// 🏃 نظام تنفيذ الكود والإصلاح التلقائي
// ============================================

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { createCodeAnalyzer } from './code-analyzer.js';
import { createClientFromConfig } from './api-client.js';
import { createFileManager } from './file-manager.js';

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface ExecutionOptions {
  file: string;
  env?: 'sandbox' | 'normal';
  timeout?: number;
  args?: string[];
  cwd?: string;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  runtime?: number;
  errorType?: 'syntax' | 'runtime' | 'timeout' | 'other';
  errorLine?: number;
  errorStack?: string;
}

export interface FixOptions {
  file: string;
  error: string;
  errorType?: string;
  maxAttempts?: number;
  autoApply?: boolean;
}

export interface FixResult {
  success: boolean;
  fixed: boolean;
  message: string;
  attempts: number;
  patches?: any[];
}

// ============================================
// 🏃 مُنفذ الكود
// ============================================

export class CodeExecutor {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * تنفيذ ملف كود
   */
  async executeCode(options: ExecutionOptions): Promise<CodeExecutionResult> {
    const { file, env = 'normal', timeout = 5000, args = [], cwd } = options;

    const fullPath = path.join(this.workingDir, file);

    // التحقق من وجود الملف
    if (!(await fs.pathExists(fullPath))) {
      return {
        success: false,
        error: `الملف غير موجود: ${file}`,
        errorType: 'other',
      };
    }

    const startTime = Date.now();

    // تحديد المُفسر حسب الامتداد
    const ext = path.extname(file).toLowerCase();
    let command: string;
    let commandArgs: string[];

    if (ext === '.js' || ext === '.mjs') {
      command = 'node';
      commandArgs = [fullPath, ...args];
    } else if (ext === '.ts') {
      // التحقق من وجود ts-node
      try {
        command = 'npx';
        commandArgs = ['ts-node', fullPath, ...args];
      } catch {
        return {
          success: false,
          error: 'ts-node غير مثبت. قم بتثبيته: npm install -g ts-node',
          errorType: 'other',
        };
      }
    } else if (ext === '.py') {
      command = 'python3';
      commandArgs = [fullPath, ...args];
    } else {
      return {
        success: false,
        error: `امتداد غير مدعوم: ${ext}`,
        errorType: 'other',
      };
    }

    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';
      let killed = false;

      const childProcess = spawn(command, commandArgs, {
        cwd: cwd || this.workingDir,
        env: env === 'sandbox' ? { ...process.env, NODE_ENV: 'sandbox' } : process.env,
        timeout,
      });

      // جمع المخرجات
      childProcess.stdout.on('data', (data: any) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      // Timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        childProcess.kill();
        resolve({
          success: false,
          error: `تجاوز الوقت المحدد (${timeout}ms)`,
          errorType: 'timeout',
          runtime: Date.now() - startTime,
        });
      }, timeout);

      // الانتهاء
      childProcess.on('close', (code: any) => {
        clearTimeout(timeoutId);

        if (killed) return; // تم التعامل معه في timeout

        const runtime = Date.now() - startTime;

        if (code === 0) {
          // نجح التنفيذ
          resolve({
            success: true,
            output: output.trim(),
            exitCode: code,
            runtime,
          });
        } else {
          // فشل التنفيذ
          const parsedError = this.parseError(errorOutput);

          resolve({
            success: false,
            output: output.trim(),
            error: errorOutput.trim(),
            exitCode: code,
            runtime,
            errorType: parsedError.type,
            errorLine: parsedError.line,
            errorStack: parsedError.stack,
          });
        }
      });

      childProcess.on('error', (err: any) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: err.message,
          errorType: 'other',
          runtime: Date.now() - startTime,
        });
      });
    });
  }

  /**
   * تحليل رسالة الخطأ
   */
  private parseError(errorOutput: string): {
    type: 'syntax' | 'runtime' | 'other';
    line?: number;
    stack?: string;
  } {
    let type: 'syntax' | 'runtime' | 'other' = 'other';
    let line: number | undefined;
    let stack: string | undefined;

    // أخطاء Syntax
    if (errorOutput.includes('SyntaxError')) {
      type = 'syntax';

      // محاولة استخراج رقم السطر
      const lineMatch = errorOutput.match(/:(\d+):/);
      if (lineMatch) {
        line = parseInt(lineMatch[1]);
      }
    }
    // أخطاء Runtime
    else if (
      errorOutput.includes('ReferenceError') ||
      errorOutput.includes('TypeError') ||
      errorOutput.includes('RangeError')
    ) {
      type = 'runtime';

      // استخراج Stack trace
      const stackMatch = errorOutput.match(/at .+:(\d+):\d+/);
      if (stackMatch) {
        line = parseInt(stackMatch[1]);
        stack = errorOutput;
      }
    }

    return { type, line, stack };
  }

  /**
   * إصلاح خطأ تلقائياً
   */
  async fixError(options: FixOptions): Promise<FixResult> {
    const { file, error, errorType, maxAttempts = 3, autoApply = false } = options;

    console.log(chalk.yellow(`\n🔧 محاولة إصلاح الخطأ في ${file}...\n`));

    const analyzer = createCodeAnalyzer(this.workingDir);
    const fileManager = createFileManager(this.workingDir);
    const client = await createClientFromConfig();

    if (!client) {
      return {
        success: false,
        fixed: false,
        message: 'فشل الاتصال بـ AI',
        attempts: 0,
      };
    }

    let attempts = 0;
    let fixed = false;

    while (attempts < maxAttempts && !fixed) {
      attempts++;

      console.log(chalk.cyan(`\n📍 محاولة ${attempts} من ${maxAttempts}...\n`));

      try {
        // قراءة الملف
        const fileContent = await fileManager.readFile(file);
        if (!fileContent) {
          return {
            success: false,
            fixed: false,
            message: 'فشل قراءة الملف',
            attempts,
          };
        }

        // تحليل الكود
        let analysis;
        try {
          analysis = await analyzer.analyzeFile(file);
        } catch (analyzeError) {
          // إذا فشل التحليل، الملف به خطأ syntax
          console.log(chalk.yellow('⚠️  فشل تحليل الملف (خطأ syntax محتمل)'));
        }

        // إعداد رسالة للـ AI
        const systemPrompt = `أنت مساعد برمجة متخصص في إصلاح الأخطاء.

الملف: ${file}
نوع الخطأ: ${errorType || 'unknown'}

الخطأ:
\`\`\`
${error}
\`\`\`

محتوى الملف الحالي:
\`\`\`
${fileContent}
\`\`\`

${
  analysis
    ? `تحليل الكود:
- الدوال: ${analysis.functions.map((f) => f.name).join(', ')}
- المتغيرات: ${analysis.variables.length}
- التعقيد: ${analysis.stats.complexity}
`
    : ''
}

المطلوب:
1. حدد سبب الخطأ بدقة
2. اقترح الحل باستخدام صيغة PATCH
3. اشرح الحل بإيجاز

استخدم صيغة PATCH:
PATCH: ${file}
LINE: [رقم السطر]
REMOVE: [عدد الأسطر للحذف]
ADD:
\`\`\`
[الكود الصحيح]
\`\`\`

أو للاستبدال:
PATCH: ${file}
LINE: [رقم السطر]
REPLACE:
\`\`\`
[السطر الصحيح]
\`\`\``;

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: 'إصلح هذا الخطأ' },
        ];

        // الحصول على الحل من AI
        console.log(chalk.cyan('🤖 جاري تحليل الخطأ وإيجاد الحل...\n'));

        const response = await client.sendChatMessage(messages);

        if (!response.success) {
          console.log(chalk.red(`❌ فشل الحصول على الحل: ${response.error}\n`));
          continue;
        }

        console.log(chalk.green('✅ تم إيجاد الحل!\n'));
        console.log(chalk.white('📝 الشرح:'));
        console.log(chalk.gray(response.message.substring(0, 300) + '...\n'));

        // استخراج الـ patches
        const filePatches = fileManager.extractPatchesFromResponse(response.message);

        if (filePatches.length === 0) {
          console.log(chalk.yellow('⚠️  لم يتم العثور على patches في الرد\n'));

          // محاولة فهم الرد كـ full file rewrite
          const fullFileMatch = response.message.match(
            /```(?:javascript|typescript|js|ts)?\n([\s\S]*?)```/
          );
          if (fullFileMatch) {
            console.log(chalk.cyan('📝 محاولة إعادة كتابة الملف كاملاً...\n'));

            if (autoApply) {
              await fileManager.writeFile(file, fullFileMatch[1].trim());
              console.log(chalk.green(`✅ تم إعادة كتابة ${file}\n`));
            } else {
              console.log(chalk.yellow('💡 استخدم --auto-apply لتطبيق التعديلات تلقائياً\n'));
              return {
                success: true,
                fixed: false,
                message: 'تم إيجاد الحل، لكن لم يتم تطبيقه',
                attempts,
              };
            }
          } else {
            continue;
          }
        } else {
          // تطبيق الـ patches
          console.log(chalk.cyan(`📝 تطبيق ${filePatches[0].patches.length} patch(es)...\n`));

          if (autoApply) {
            for (const filePatch of filePatches) {
              await fileManager.applyPatches(filePatch.path, filePatch.patches);
            }
            console.log(chalk.green('✅ تم تطبيق التعديلات\n'));
          } else {
            console.log(chalk.yellow('💡 استخدم --auto-apply لتطبيق التعديلات تلقائياً\n'));
            return {
              success: true,
              fixed: false,
              message: 'تم إيجاد الحل، لكن لم يتم تطبيقه',
              attempts,
              patches: filePatches,
            };
          }
        }

        // اختبار الحل
        console.log(chalk.cyan('🧪 اختبار الحل...\n'));

        const testResult = await this.executeCode({
          file,
          timeout: 5000,
        });

        if (testResult.success) {
          console.log(chalk.green('✅ نجح الإصلاح! الكود يعمل الآن بشكل صحيح\n'));
          fixed = true;

          return {
            success: true,
            fixed: true,
            message: 'تم إصلاح الخطأ بنجاح',
            attempts,
          };
        } else {
          console.log(chalk.yellow('⚠️  الخطأ لا يزال موجوداً:\n'));
          console.log(chalk.red(testResult.error?.substring(0, 200) + '\n'));

          // تحديث رسالة الخطأ للمحاولة التالية
          options.error = testResult.error || error;
        }
      } catch (error: any) {
        console.log(chalk.red(`❌ خطأ في المحاولة ${attempts}: ${error.message}\n`));
      }
    }

    // فشل الإصلاح بعد كل المحاولات
    return {
      success: false,
      fixed: false,
      message: `فشل الإصلاح بعد ${attempts} محاولة`,
      attempts,
    };
  }

  /**
   * تشغيل وإصلاح تلقائي
   */
  async runAndFix(
    file: string,
    options?: Partial<ExecutionOptions & FixOptions>
  ): Promise<CodeExecutionResult> {
    console.log(chalk.blue.bold(`\n🚀 تشغيل ${file}...\n`));

    // التنفيذ الأول
    const result = await this.executeCode({
      file,
      ...options,
    });

    if (result.success) {
      console.log(chalk.green('\n✅ نجح التنفيذ!\n'));
      if (result.output) {
        console.log(chalk.white('📤 المخرجات:'));
        console.log(chalk.gray(result.output));
      }
      return result;
    }

    // فشل التنفيذ، محاولة الإصلاح
    console.log(chalk.red('\n❌ فشل التنفيذ!\n'));
    console.log(chalk.yellow('⚠️  الخطأ:'));
    console.log(chalk.red(result.error));

    if (options?.autoApply ?? true) {
      const fixResult = await this.fixError({
        file,
        error: result.error || 'Unknown error',
        errorType: result.errorType,
        maxAttempts: options?.maxAttempts || 3,
        autoApply: options?.autoApply ?? true,
      });

      if (fixResult.fixed) {
        // إعادة التنفيذ بعد الإصلاح
        return await this.executeCode({ file, ...options });
      }
    }

    return result;
  }
}

// تصدير instance جاهز
export function createCodeExecutor(workingDir?: string): CodeExecutor {
  return new CodeExecutor(workingDir);
}
