// ui.ts
// ============================================
// 🎨 واجهة المستخدم في الطرفية - محسّنة
// ============================================

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import gradient from 'gradient-string';
import { BRANDING } from './branding.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class UI {
  private spinner: Ora | null = null;

  // لوحة الألوان الاحترافية
  private colors = {
    primary: chalk.hex('#3b82f6'), // أزرق
    gold: chalk.hex('#fbbf24'), // ذهبي
    success: chalk.hex('#10b981'), // أخضر
    error: chalk.hex('#ef4444'), // أحمر
    warning: chalk.hex('#f59e0b'), // برتقالي
    info: chalk.hex('#06b6d4'), // سماوي
    dim: chalk.gray,
    bold: chalk.bold,
  };

  // التدرجات اللونية
  private gradients = {
    ocean: gradient(['#0ea5e9', '#3b82f6', '#6366f1']),
    gold: gradient(['#fbbf24', '#f59e0b', '#d97706']),
    success: gradient(['#10b981', '#059669', '#047857']),
    rainbow: gradient.rainbow,
  };

  // عرض شعار احترافي مع ASCII Art
  showBanner(): void {
    // استخدام نظام Branding الجديد
    console.log(BRANDING.logo);
    console.log('');
    console.log('');
    console.log(BRANDING.infoBox);
  }

  // رسالة ترحيب محسّنة
  showWelcome(): void {
    const welcomeBox = boxen(
      this.gradients.success('مرحباً في Oqool!') +
        '\n\n' +
        chalk.white('الأوامر الأساسية:') +
        '\n' +
        this.colors.primary('  • oqool login <API_KEY>') +
        this.colors.dim('  - تسجيل الدخول') +
        '\n' +
        this.colors.primary('  • oqool "اصنع API"') +
        this.colors.dim('       - توليد كود') +
        '\n' +
        this.colors.primary('  • oqool chat') +
        this.colors.dim('                - محادثة تفاعلية') +
        '\n' +
        this.colors.primary('  • oqool status') +
        this.colors.dim('              - حالة الحساب') +
        '\n' +
        this.colors.primary('  • oqool logout') +
        this.colors.dim('              - تسجيل الخروج') +
        '\n\n' +
        this.colors.gold('💡 للمساعدة: ') +
        this.colors.info('oqool --help'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: '#10b981',
      }
    );
    console.log(welcomeBox);
  }

  // بدء Spinner محسّن
  startSpinner(text: string): void {
    this.spinner = ora({
      text: this.colors.primary(text),
      color: 'blue',
      spinner: 'dots12',
    }).start();
  }

  // تحديث نص Spinner
  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = this.colors.primary(text);
    }
  }

  // نجاح Spinner محسّن
  succeedSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.succeed(this.colors.success(text));
      this.spinner = null;
    }
  }

  // فشل Spinner محسّن
  failSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.fail(this.colors.error(text));
      this.spinner = null;
    }
  }

  // إيقاف Spinner
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  // رسالة نجاح محسّنة
  success(message: string): void {
    console.log(`\n${this.colors.success('✔')} ${this.colors.success(message)}\n`);
  }

  // رسالة خطأ محسّنة
  error(message: string): void {
    console.log(`\n${this.colors.error('✖')} ${this.colors.error(message)}\n`);
  }

  // رسالة تحذير محسّنة
  warning(message: string): void {
    console.log(`\n${this.colors.warning('⚠')} ${this.colors.warning(message)}\n`);
  }

  // رسالة معلومات محسّنة
  info(message: string): void {
    console.log(`\n${this.colors.info('ℹ')} ${this.colors.info(message)}\n`);
  }

  // عرض رد AI
  showAIResponse(response: string, provider?: string): void {
    console.log(chalk.gray('\n' + '─'.repeat(60)));

    if (provider) {
      const providerLabel = this.getProviderLabel(provider);
      console.log(chalk.magenta(`\n🤖 ${providerLabel}\n`));
    }

    // تنسيق الرد
    const formatted = this.formatResponse(response);
    console.log(formatted);

    console.log(chalk.gray('\n' + '─'.repeat(60) + '\n'));
  }

  // تنسيق رد AI
  private formatResponse(response: string): string {
    // تلوين الكود blocks
    let formatted = response.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang || 'code';
      return (
        chalk.gray('```') + chalk.yellow(language) + '\n' + chalk.white(code) + chalk.gray('```')
      );
    });

    // تلوين العناوين
    formatted = formatted.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) =>
      chalk.cyan.bold(title)
    );

    return formatted;
  }

  // تسمية المزود
  private getProviderLabel(provider: string): string {
    const labels: Record<string, string> = {
      openai: 'Oqool AI (OpenAI)',
      claude: 'Oqool AI (Claude)',
      deepseek: 'Oqool AI (DeepSeek)',
      auto: 'اختيار تلقائي',
    };
    return labels[provider] || provider;
  }

  // عرض معلومات المشروع
  showProjectInfo(totalFiles: number, totalSize: number): void {
    console.log(chalk.blue('\n📊 معلومات المشروع:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.white(`📁 عدد الملفات: ${chalk.cyan(totalFiles.toString())}`));
    console.log(chalk.white(`💾 الحجم الإجمالي: ${chalk.cyan(this.formatBytes(totalSize))}`));
    console.log(chalk.gray('─'.repeat(40) + '\n'));
  }

  // عرض قائمة الملفات
  showFilesList(files: Array<{ path: string; size: number }>): void {
    console.log(chalk.blue('\n📂 الملفات المضمنة:'));
    console.log(chalk.gray('─'.repeat(40)));

    files.forEach((file, index) => {
      const num = chalk.gray(`${index + 1}.`);
      const path = chalk.cyan(file.path);
      const size = chalk.gray(`(${this.formatBytes(file.size)})`);
      console.log(`  ${num} ${path} ${size}`);
    });

    console.log(chalk.gray('─'.repeat(40) + '\n'));
  }

  // تنسيق حجم الملف
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // عرض بنية المشروع
  showProjectStructure(structure: string): void {
    console.log(chalk.blue('\n🌳 بنية المشروع:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.white(structure));
    console.log(chalk.gray('─'.repeat(40) + '\n'));
  }

  // سؤال تأكيد
  showConfirmation(message: string): void {
    console.log(chalk.yellow(`\n❓ ${message}`));
    console.log(chalk.gray('(اضغط Enter للمتابعة، Ctrl+C للإلغاء)\n'));
  }

  // فاصل
  divider(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }

  // سطر فارغ
  newLine(): void {
    console.log();
  }

  // ============================================
  // 🆕 وظائف احترافية جديدة
  // ============================================

  // إنشاء صندوق احترافي
  createBox(
    content: string,
    title?: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info'
  ): string {
    const borderColors: Record<string, string> = {
      info: '#3b82f6',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
    };

    return boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: borderColors[type],
      title: title ? this.colors.gold.bold(title) : undefined,
      titleAlignment: 'center',
    });
  }

  // صندوق نجاح
  successBox(content: string): void {
    const box = boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: '#10b981',
      backgroundColor: '#064e3b',
    });
    console.log(box);
  }

  // صندوق خطأ
  errorBox(content: string): void {
    const box = boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: '#ef4444',
      backgroundColor: '#7f1d1d',
    });
    console.log(box);
  }

  // إنشاء جدول احترافي
  createTable(headers: string[]): Table.Table {
    return new Table({
      head: headers.map((h) => this.colors.gold.bold(h)),
      style: {
        head: [],
        border: ['gray'],
      },
      chars: {
        top: '─',
        'top-mid': '┬',
        'top-left': '╭',
        'top-right': '╮',
        bottom: '─',
        'bottom-mid': '┴',
        'bottom-left': '╰',
        'bottom-right': '╯',
        left: '│',
        'left-mid': '├',
        mid: '─',
        'mid-mid': '┼',
        right: '│',
        'right-mid': '┤',
        middle: '│',
      },
    });
  }

  // عرض جدول المزايا
  showFeatures(): void {
    const table = this.createTable(['الميزة', 'الوصف', 'الأمر']);

    table.push(
      [this.colors.gold('🥇 AI Code Completion'), 'إكمال كود ذكي', this.colors.dim('mg complete')],
      [
        this.colors.gold('🥈 Database Integration'),
        '7 قواعد بيانات',
        this.colors.dim('mg db-schema'),
      ],
      [this.colors.gold('🥉 API Testing'), 'اختبار API متقدم', this.colors.dim('mg api-test')],
      [this.colors.gold('🎨 Multi-Language'), '7 لغات برمجة', this.colors.dim('mg --help')]
    );

    console.log('\n' + table.toString() + '\n');
  }

  // عنوان بتدرج لوني
  heading(text: string): void {
    console.log(`\n${this.gradients.ocean(chalk.bold(text))}\n`);
  }

  // عنوان فرعي
  subheading(text: string): void {
    console.log(`${this.colors.primary.bold(text)}`);
  }

  // فاصل بألوان
  separator(): void {
    console.log(this.colors.dim('─'.repeat(60)));
  }

  // رسالة بصندوق
  boxMessage(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    console.log(this.createBox(message, undefined, type));
  }
}

// تصدير instance واحد
export const ui = new UI();
