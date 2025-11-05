// enhanced-executor.ts
// ============================================
// 🌍 نظام التنفيذ المحسن متعدد اللغات
// ============================================

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { FileManager } from './file-manager.js';

const execAsync = promisify(exec);

// ============================================
// 📊 واجهات البيانات
// ============================================

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php';

export interface LanguageConfig {
  name: string;
  extensions: string[];
  executor: string;
  buildCommand?: string;
  formatCommand?: string;
  lintCommand?: string;
  testCommand?: string;
}

export interface EnhancedExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

export interface FormatResult {
  success: boolean;
  formatted: boolean;
  changes?: string;
  error?: string;
}

export interface LintResult {
  success: boolean;
  issues: LintIssue[];
  fixedCount: number;
  error?: string;
}

export interface LintIssue {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
}

// ============================================
// 🌍 محرك التنفيذ المحسن
// ============================================

export class EnhancedExecutor {
  private workingDir: string;
  private fileManager: FileManager;
  private languageConfigs: Map<SupportedLanguage, LanguageConfig>;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.fileManager = new FileManager(workingDir);
    this.languageConfigs = new Map();

    this.initializeLanguageConfigs();
  }

  /**
   * تهيئة إعدادات اللغات
   */
  private initializeLanguageConfigs(): void {
    // JavaScript / Node.js
    this.languageConfigs.set('javascript', {
      name: 'JavaScript',
      extensions: ['.js', '.mjs', '.cjs'],
      executor: 'node',
      formatCommand: 'prettier --write',
      lintCommand: 'eslint --fix',
      testCommand: 'npm test',
    });

    // TypeScript
    this.languageConfigs.set('typescript', {
      name: 'TypeScript',
      extensions: ['.ts', '.tsx'],
      executor: 'tsx',
      buildCommand: 'tsc',
      formatCommand: 'prettier --write',
      lintCommand: 'eslint --fix',
      testCommand: 'npm test',
    });

    // Python
    this.languageConfigs.set('python', {
      name: 'Python',
      extensions: ['.py'],
      executor: 'python3',
      formatCommand: 'black',
      lintCommand: 'pylint --output-format=json',
      testCommand: 'pytest',
    });

    // Go
    this.languageConfigs.set('go', {
      name: 'Go',
      extensions: ['.go'],
      executor: 'go run',
      buildCommand: 'go build',
      formatCommand: 'gofmt -w',
      lintCommand: 'golangci-lint run --fix',
      testCommand: 'go test ./...',
    });

    // Rust
    this.languageConfigs.set('rust', {
      name: 'Rust',
      extensions: ['.rs'],
      executor: 'cargo run',
      buildCommand: 'cargo build',
      formatCommand: 'rustfmt',
      lintCommand: 'cargo clippy --fix --allow-dirty',
      testCommand: 'cargo test',
    });

    // Ruby
    this.languageConfigs.set('ruby', {
      name: 'Ruby',
      extensions: ['.rb'],
      executor: 'ruby',
      formatCommand: 'rubocop --auto-correct-all',
      lintCommand: 'rubocop',
      testCommand: 'rspec',
    });

    // PHP
    this.languageConfigs.set('php', {
      name: 'PHP',
      extensions: ['.php'],
      executor: 'php',
      formatCommand: 'php-cs-fixer fix',
      lintCommand: 'phpcs',
      testCommand: 'phpunit',
    });
  }

  /**
   * كشف لغة الملف
   */
  detectLanguage(filePath: string): SupportedLanguage | undefined {
    const ext = path.extname(filePath);

    for (const [lang, config] of this.languageConfigs.entries()) {
      if (config.extensions.includes(ext)) {
        return lang;
      }
    }

    return undefined;
  }

  /**
   * تنفيذ ملف
   */
  async executeFile(filePath: string, args: string[] = []): Promise<EnhancedExecutionResult> {
    const startTime = Date.now();

    try {
      const language = this.detectLanguage(filePath);

      if (!language) {
        return {
          success: false,
          output: '',
          error: `Unsupported file type: ${path.extname(filePath)}`,
          exitCode: 1,
          duration: Date.now() - startTime,
        };
      }

      const config = this.languageConfigs.get(language)!;
      const fullPath = path.join(this.workingDir, filePath);

      // التحقق من وجود الملف
      if (!(await fs.pathExists(fullPath))) {
        return {
          success: false,
          output: '',
          error: `File not found: ${filePath}`,
          exitCode: 1,
          duration: Date.now() - startTime,
        };
      }

      console.log(chalk.cyan(`\n▶️  تنفيذ ${config.name}: ${filePath}\n`));

      // بناء الأمر
      let command = `${config.executor} ${fullPath}`;
      if (args.length > 0) {
        command += ` ${args.join(' ')}`;
      }

      // تنفيذ الأمر
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workingDir,
        timeout: 60000, // 60 seconds
      });

      const duration = Date.now() - startTime;

      if (stdout) {
        console.log(chalk.white(stdout));
      }

      if (stderr) {
        console.log(chalk.yellow(stderr));
      }

      console.log(chalk.green(`\n✅ اكتمل التنفيذ في ${(duration / 1000).toFixed(2)}s\n`));

      return {
        success: true,
        output: stdout,
        error: stderr,
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.log(chalk.red(`\n❌ فشل التنفيذ: ${error.message}\n`));

      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.code || 1,
        duration,
      };
    }
  }

  /**
   * بناء مشروع
   */
  async buildProject(language?: SupportedLanguage): Promise<EnhancedExecutionResult> {
    const startTime = Date.now();

    try {
      // كشف اللغة تلقائياً إذا لم تحدد
      if (!language) {
        language = await this.detectProjectLanguage();
      }

      if (!language) {
        return {
          success: false,
          output: '',
          error: 'Could not detect project language',
          exitCode: 1,
          duration: Date.now() - startTime,
        };
      }

      const config = this.languageConfigs.get(language)!;

      if (!config.buildCommand) {
        return {
          success: false,
          output: '',
          error: `Build command not configured for ${config.name}`,
          exitCode: 1,
          duration: Date.now() - startTime,
        };
      }

      console.log(chalk.cyan(`\n🔨 بناء مشروع ${config.name}...\n`));

      const { stdout, stderr } = await execAsync(config.buildCommand, {
        cwd: this.workingDir,
        timeout: 300000, // 5 minutes
      });

      const duration = Date.now() - startTime;

      if (stdout) {
        console.log(chalk.white(stdout));
      }

      console.log(chalk.green(`\n✅ اكتمل البناء في ${(duration / 1000).toFixed(2)}s\n`));

      return {
        success: true,
        output: stdout,
        error: stderr,
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.log(chalk.red(`\n❌ فشل البناء: ${error.message}\n`));

      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.code || 1,
        duration,
      };
    }
  }

  /**
   * تنسيق الكود (Formatting)
   */
  async formatFile(filePath: string): Promise<FormatResult> {
    try {
      const language = this.detectLanguage(filePath);

      if (!language) {
        return {
          success: false,
          formatted: false,
          error: `Unsupported file type: ${path.extname(filePath)}`,
        };
      }

      const config = this.languageConfigs.get(language)!;

      if (!config.formatCommand) {
        return {
          success: false,
          formatted: false,
          error: `Format command not configured for ${config.name}`,
        };
      }

      const fullPath = path.join(this.workingDir, filePath);

      // قراءة المحتوى قبل التنسيق
      const before = await fs.readFile(fullPath, 'utf8');

      console.log(chalk.cyan(`\n✨ تنسيق ${config.name}: ${filePath}\n`));

      // تنفيذ أمر التنسيق
      const command = `${config.formatCommand} ${fullPath}`;

      try {
        await execAsync(command, { cwd: this.workingDir });

        // قراءة المحتوى بعد التنسيق
        const after = await fs.readFile(fullPath, 'utf8');

        const formatted = before !== after;

        if (formatted) {
          console.log(chalk.green(`✅ تم تنسيق الملف بنجاح\n`));
        } else {
          console.log(chalk.gray(`ℹ️  الملف منسق بالفعل\n`));
        }

        return {
          success: true,
          formatted,
          changes: formatted
            ? `Before: ${before.length} chars, After: ${after.length} chars`
            : undefined,
        };
      } catch (error: any) {
        // بعض أدوات التنسيق ترجع exit code غير صفر حتى عند النجاح
        console.log(chalk.yellow(`⚠️  ${error.message}\n`));

        return {
          success: true,
          formatted: false,
          error: error.message,
        };
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل التنسيق: ${error.message}\n`));

      return {
        success: false,
        formatted: false,
        error: error.message,
      };
    }
  }

  /**
   * فحص الكود (Linting)
   */
  async lintFile(filePath: string, autoFix: boolean = false): Promise<LintResult> {
    try {
      const language = this.detectLanguage(filePath);

      if (!language) {
        return {
          success: false,
          issues: [],
          fixedCount: 0,
          error: `Unsupported file type: ${path.extname(filePath)}`,
        };
      }

      const config = this.languageConfigs.get(language)!;

      if (!config.lintCommand) {
        return {
          success: false,
          issues: [],
          fixedCount: 0,
          error: `Lint command not configured for ${config.name}`,
        };
      }

      const fullPath = path.join(this.workingDir, filePath);

      console.log(chalk.cyan(`\n🔍 فحص ${config.name}: ${filePath}\n`));

      // بناء الأمر
      let command = config.lintCommand;
      if (autoFix) {
        command = command.replace('--output-format=json', '--fix');
      }
      command += ` ${fullPath}`;

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: this.workingDir,
        });

        // محاولة تحليل JSON للنتائج
        let issues: LintIssue[] = [];

        if (language === 'python' && stdout) {
          // Pylint JSON format
          try {
            const pylintResults = JSON.parse(stdout);
            issues = pylintResults.map((issue: any) => ({
              file: filePath,
              line: issue.line,
              column: issue.column,
              severity: issue.type === 'error' ? 'error' : 'warning',
              message: issue.message,
              rule: issue.symbol,
            }));
          } catch {
            // تجاهل أخطاء التحليل
          }
        }

        if (issues.length === 0) {
          console.log(chalk.green(`✅ لم يتم العثور على مشاكل\n`));
        } else {
          console.log(chalk.yellow(`⚠️  تم العثور على ${issues.length} مشكلة\n`));

          // عرض المشاكل
          for (const issue of issues) {
            const severity = issue.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️');
            console.log(
              `${severity} ${issue.file}:${issue.line}${issue.column ? `:${issue.column}` : ''}`
            );
            console.log(chalk.gray(`   ${issue.message}`));
            if (issue.rule) {
              console.log(chalk.gray(`   Rule: ${issue.rule}`));
            }
            console.log('');
          }
        }

        return {
          success: true,
          issues,
          fixedCount: autoFix ? issues.length : 0,
        };
      } catch (error: any) {
        // بعض linters ترجع exit code غير صفر عند وجود مشاكل
        console.log(chalk.yellow(`⚠️  ${error.message}\n`));

        return {
          success: true,
          issues: [],
          fixedCount: 0,
          error: error.message,
        };
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل الفحص: ${error.message}\n`));

      return {
        success: false,
        issues: [],
        fixedCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * تنسيق وفحص ملفات متعددة
   */
  async formatAndLintFiles(
    files: string[],
    autoFix: boolean = false
  ): Promise<{
    formatted: number;
    linted: number;
    issues: LintIssue[];
  }> {
    let formatted = 0;
    let linted = 0;
    const allIssues: LintIssue[] = [];

    console.log(chalk.cyan(`\n🔧 معالجة ${files.length} ملف...\n`));

    for (const file of files) {
      // تنسيق
      const formatResult = await this.formatFile(file);
      if (formatResult.success && formatResult.formatted) {
        formatted++;
      }

      // فحص
      const lintResult = await this.lintFile(file, autoFix);
      if (lintResult.success) {
        linted++;
        allIssues.push(...lintResult.issues);
      }
    }

    console.log(chalk.green(`\n✅ تمت معالجة ${files.length} ملف`));
    console.log(chalk.white(`   منسق: ${formatted}`));
    console.log(chalk.white(`   مفحوص: ${linted}`));
    console.log(chalk.white(`   مشاكل: ${allIssues.length}\n`));

    return {
      formatted,
      linted,
      issues: allIssues,
    };
  }

  /**
   * تشغيل الاختبارات
   */
  async runTests(language?: SupportedLanguage): Promise<EnhancedExecutionResult> {
    const startTime = Date.now();

    try {
      // كشف اللغة تلقائياً إذا لم تحدد
      if (!language) {
        language = await this.detectProjectLanguage();
      }

      if (!language) {
        return {
          success: false,
          output: '',
          error: 'Could not detect project language',
          exitCode: 1,
          duration: Date.now() - startTime,
        };
      }

      const config = this.languageConfigs.get(language)!;

      if (!config.testCommand) {
        return {
          success: false,
          output: '',
          error: `Test command not configured for ${config.name}`,
          exitCode: 1,
          duration: Date.now() - startTime,
        };
      }

      console.log(chalk.cyan(`\n🧪 تشغيل اختبارات ${config.name}...\n`));

      const { stdout, stderr } = await execAsync(config.testCommand, {
        cwd: this.workingDir,
        timeout: 300000, // 5 minutes
      });

      const duration = Date.now() - startTime;

      if (stdout) {
        console.log(chalk.white(stdout));
      }

      console.log(chalk.green(`\n✅ اكتملت الاختبارات في ${(duration / 1000).toFixed(2)}s\n`));

      return {
        success: true,
        output: stdout,
        error: stderr,
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.log(chalk.red(`\n❌ فشلت الاختبارات: ${error.message}\n`));

      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.code || 1,
        duration,
      };
    }
  }

  /**
   * كشف لغة المشروع
   */
  private async detectProjectLanguage(): Promise<SupportedLanguage | undefined> {
    // فحص ملفات التكوين
    const configFiles = {
      'package.json': 'typescript' as SupportedLanguage,
      'requirements.txt': 'python' as SupportedLanguage,
      'go.mod': 'go' as SupportedLanguage,
      'Cargo.toml': 'rust' as SupportedLanguage,
      Gemfile: 'ruby' as SupportedLanguage,
      'composer.json': 'php' as SupportedLanguage,
    };

    for (const [file, lang] of Object.entries(configFiles)) {
      if (await fs.pathExists(path.join(this.workingDir, file))) {
        return lang;
      }
    }

    return undefined;
  }

  /**
   * عرض اللغات المدعومة
   */
  listSupportedLanguages(): void {
    console.log(chalk.cyan('\n🌍 اللغات المدعومة:\n'));
    console.log(chalk.gray('═'.repeat(80)));

    for (const [lang, config] of this.languageConfigs.entries()) {
      console.log(chalk.green(`\n📝 ${config.name}`));
      console.log(chalk.white(`   الامتدادات: ${config.extensions.join(', ')}`));
      console.log(chalk.white(`   المنفذ: ${config.executor}`));

      if (config.buildCommand) {
        console.log(chalk.gray(`   بناء: ${config.buildCommand}`));
      }

      if (config.formatCommand) {
        console.log(chalk.gray(`   تنسيق: ${config.formatCommand}`));
      }

      if (config.lintCommand) {
        console.log(chalk.gray(`   فحص: ${config.lintCommand}`));
      }

      if (config.testCommand) {
        console.log(chalk.gray(`   اختبار: ${config.testCommand}`));
      }
    }

    console.log(chalk.gray('\n═'.repeat(80) + '\n'));
  }

  /**
   * التحقق من توفر أدوات اللغة
   */
  async checkLanguageTools(language: SupportedLanguage): Promise<{
    executor: boolean;
    formatter: boolean;
    linter: boolean;
    tester: boolean;
  }> {
    const config = this.languageConfigs.get(language);

    if (!config) {
      return {
        executor: false,
        formatter: false,
        linter: false,
        tester: false,
      };
    }

    const checkCommand = async (cmd: string): Promise<boolean> => {
      try {
        await execAsync(`which ${cmd.split(' ')[0]}`, { cwd: this.workingDir });
        return true;
      } catch {
        return false;
      }
    };

    return {
      executor: await checkCommand(config.executor),
      formatter: config.formatCommand ? await checkCommand(config.formatCommand) : false,
      linter: config.lintCommand ? await checkCommand(config.lintCommand) : false,
      tester: config.testCommand ? await checkCommand(config.testCommand) : false,
    };
  }
}

// تصدير instance
export function createEnhancedExecutor(workingDir?: string): EnhancedExecutor {
  return new EnhancedExecutor(workingDir);
}
