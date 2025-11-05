// cli-core-systems-commands.ts
// ============================================
// 🔧 أوامر الأنظمة الأساسية
// Cache Manager, Context System, Validation Pipeline
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';
import { ValidationPipeline } from '@oqool/shared/core';
import { createFileManager } from './file-manager.js';
import { hasApiKey } from './auth.js';

/**
 * إضافة أوامر الأنظمة الأساسية
 */
export function addCoreSystemsCommands(program: Command) {
  // ========================================
  // أوامر Validation Pipeline
  // ========================================

  program
    .command('validate <file>')
    .description('🔍 تشغيل Validation Pipeline على ملف')
    .option('-s, --stages <stages>', 'المراحل المطلوبة (مفصولة بفواصل)')
    .option('--auto-fix', 'تطبيق الإصلاحات التلقائية')
    .action(async (file: string, options: any) => {
      try {
        if (!(await hasApiKey())) {
          console.log(chalk.yellow('\n⚠️  يجب تسجيل الدخول أولاً'));
          console.log(chalk.cyan('استخدم: oqool-code login <API_KEY>\n'));
          return;
        }

        const fileManager = createFileManager();
        const code = await fileManager.readFile(file);

        if (!code) {
          console.log(chalk.red(`\n❌ لم يتم العثور على الملف: ${file}\n`));
          return;
        }

        console.log(chalk.cyan('\n🔍 ═══════════════════════════════'));
        console.log(chalk.cyan('   Validation Pipeline'));
        console.log(chalk.cyan('═══════════════════════════════\n'));

        const pipeline = new ValidationPipeline({
          stages: {
            syntax: {
              enabled: true,
              priority: 'P1',
              autoFix: options.autoFix || false,
              stopOnError: false,
            },
            types: {
              enabled: true,
              priority: 'P2',
              autoFix: options.autoFix || false,
              stopOnError: false,
            },
            security: { enabled: true, priority: 'P1', autoFix: false, stopOnError: false },
            performance: { enabled: true, priority: 'P3', autoFix: false, stopOnError: false },
            style: {
              enabled: true,
              priority: 'P3',
              autoFix: options.autoFix || false,
              stopOnError: false,
            },
          },
        });

        const result = await pipeline.validate(code, file);

        console.log(chalk.white(`📊 المشاكل الكلية: ${result.totalIssues}`));
        console.log(chalk.white(`🔴 حرجة: ${result.criticalIssues}`));

        if (result.success) {
          console.log(chalk.green('\n✅ نجح التحقق!\n'));
        } else {
          console.log(chalk.red('\n❌ فشل التحقق!\n'));

          // Show stages results
          result.stages.forEach((stage) => {
            const icon = stage.passed ? '✅' : '❌';
            console.log(
              chalk.white(
                `${icon} ${stage.stage}: ${stage.errors.length} أخطاء, ${stage.warnings.length} تحذيرات`
              )
            );
          });
          console.log();
        }
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('validate-info')
    .description('ℹ️  معلومات Validation Pipeline')
    .action(async () => {
      try {
        console.log(chalk.cyan('\n📊 ═══════════════════════════════'));
        console.log(chalk.cyan('   Validation Pipeline Info'));
        console.log(chalk.cyan('═══════════════════════════════\n'));

        console.log(chalk.white('المراحل المتاحة:'));
        console.log(chalk.gray('  • Syntax - التحقق من الأخطاء النحوية'));
        console.log(chalk.gray('  • Types - التحقق من الأنواع'));
        console.log(chalk.gray('  • Security - فحص الثغرات الأمنية'));
        console.log(chalk.gray('  • Performance - تحليل الأداء'));
        console.log(chalk.gray('  • Style - التحقق من الأسلوب\n'));

        console.log(chalk.cyan('استخدم: oqool-code validate <file> لفحص ملف\n'));
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });
}

/**
 * Export
 */
export { addCoreSystemsCommands as default };
