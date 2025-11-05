// cli-new-commands.ts
// الأوامر الجديدة للأنظمة الثلاثة

import { Command } from 'commander';
import chalk from 'chalk';
import { createClientFromConfig } from './api-client.js';
import { createFileManager } from './file-manager.js';
import { ui } from './ui.js';
import { createAICodeCompletion } from './ai-code-completion.js';
import { createDatabaseIntegration } from './database-integration.js';
import { createAPITesting } from './api-testing.js';
import { createVersionGuardian } from '@oqool/shared/core';
import { createFileArchaeology } from './file-archaeology.js';
import { createNotificationSystem } from './notifications.js';
import { addAutoFixCommand } from './cli-auto-fix-command.js';
import { addCoreSystemsCommands } from './cli-core-systems-commands.js';
import { createMLCLI } from './commands/ml-cli.js';

export function registerNewCommands(program: Command): void {
  // ========================================
  // أوامر AI Code Completion
  // ========================================

  program
    .command('complete <prompt>')
    .description('إكمال كود ذكي باستخدام AI')
    .option('-l, --language <lang>', 'اللغة', 'typescript')
    .option('-n, --suggestions <number>', 'عدد الاقتراحات', '5')
    .action(async (prompt: string, options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const completion = createAICodeCompletion(process.cwd(), client);
        ui.startSpinner('توليد اقتراحات...');
        const result = await completion.completeCode(prompt, {
          language: options.language,
          maxSuggestions: parseInt(options.suggestions),
        });
        if (result.success) {
          ui.succeedSpinner('تم التوليد!');
          result.suggestions.forEach((s, i) => {
            console.log(chalk.yellow(`\n${i + 1}. ${s.description}`));
            console.log(chalk.cyan('```'));
            console.log(s.code);
            console.log(chalk.cyan('```'));
          });
        }
      } catch (error: any) {
        ui.failSpinner('خطأ');
        console.error(chalk.red(error.message));
      }
    });

  program
    .command('complete-function <comment>')
    .description('توليد دالة من تعليق')
    .option('-n, --name <name>', 'اسم الدالة')
    .action(async (comment: string, options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const completion = createAICodeCompletion(process.cwd(), client);
        ui.startSpinner('توليد الدالة...');
        const result = await completion.completeFunctionFromComment(comment, options.name);
        if (result.success) {
          ui.succeedSpinner('تم!');
          console.log(chalk.cyan('```'));
          console.log(result.suggestions[0]?.code);
          console.log(chalk.cyan('```'));
        }
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  program
    .command('improve <file>')
    .description('اقتراح تحسينات')
    .action(async (file: string) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const completion = createAICodeCompletion(process.cwd(), client);
        const fileManager = createFileManager();
        const code = await fileManager.readFile(file);
        if (!code) return;
        ui.startSpinner('تحليل...');
        const result = await completion.suggestImprovements(code);
        if (result.success) {
          ui.succeedSpinner('تم!');
          result.suggestions.forEach((s, i) => {
            console.log(chalk.yellow(`\n${i + 1}. ${s.description}`));
          });
        }
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  // ========================================
  // أوامر Database
  // ========================================

  program
    .command('db-init <type>')
    .description('تهيئة قاعدة بيانات')
    .option('--orm <orm>', 'ORM')
    .action(async (type: string, options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const db = createDatabaseIntegration(process.cwd(), client);
        await db.initializeDatabase(type as any, options.orm);
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  program
    .command('db-schema <description>')
    .description('توليد schema')
    .option('--orm <orm>', 'ORM', 'none')
    .action(async (description: string, options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const db = createDatabaseIntegration(process.cwd(), client);
        ui.startSpinner('توليد Schema...');
        const tables = await db.generateSchemaFromDescription(description, {
          ormType: options.orm,
        });
        ui.succeedSpinner('تم!');
        console.log(chalk.green(`\n✅ ${tables.length} جدول`));
        await db.generateSchemaFiles(tables, options.orm);
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  program
    .command('db-migration <name>')
    .description('إنشاء migration')
    .action(async (name: string) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const db = createDatabaseIntegration(process.cwd(), client);
        await db.createMigration(name);
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  program
    .command('db-query <description>')
    .description('توليد SQL query')
    .action(async (description: string) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const db = createDatabaseIntegration(process.cwd(), client);
        ui.startSpinner('توليد...');
        const query = await db.generateQueryFromNaturalLanguage(description);
        ui.succeedSpinner('تم!');
        console.log(chalk.cyan('\n```sql'));
        console.log(query);
        console.log(chalk.cyan('```\n'));
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  // ========================================
  // أوامر API Testing
  // ========================================

  program
    .command('api-test-create <name>')
    .description('إنشاء test suite')
    .option('-u, --base-url <url>', 'Base URL')
    .action(async (name: string, options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const apiTest = createAPITesting(process.cwd(), client);
        await apiTest.createTestSuite(name, undefined, options.baseUrl);
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  program
    .command('api-load-test <url>')
    .description('Load testing')
    .option('-d, --duration <sec>', 'المدة', '30')
    .option('-c, --concurrency <num>', 'التزامن', '10')
    .action(async (url: string, options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const apiTest = createAPITesting(process.cwd(), client);
        await apiTest.runLoadTest({
          endpoint: { name: 'Test', method: 'GET', url },
          duration: parseInt(options.duration),
          concurrency: parseInt(options.concurrency),
        });
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  program
    .command('api-from-openapi <spec>')
    .description('توليد tests من OpenAPI')
    .action(async (spec: string) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;
        const apiTest = createAPITesting(process.cwd(), client);
        ui.startSpinner('توليد...');
        const suite = await apiTest.generateTestSuiteFromOpenAPI(spec, 'API Tests');
        ui.succeedSpinner('تم!');
        console.log(chalk.green(`\n✅ ${suite.testCases.length} tests\n`));
      } catch (error: any) {
        console.error(chalk.red(error.message));
      }
    });

  // ========================================
  // أوامر Version Guardian - نظام حماية الإصدارات
  // ========================================

  program
    .command('init')
    .description('🛡️ تهيئة نظام حماية الإصدارات')
    .option('--git', 'تفعيل تكامل Git', true)
    .option('--auto-backup', 'تفعيل النسخ الاحتياطي التلقائي', true)
    .option('--interval <minutes>', 'فترة النسخ الاحتياطي بالدقائق', '30')
    .action(async (options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;

        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
          enableGit: options.git,
          autoBackup: options.autoBackup,
          backupInterval: parseInt(options.interval),
        });

        await guardian.init();
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('snapshot <name>')
    .description('📸 إنشاء لقطة (snapshot) للمشروع')
    .option('-d, --description <desc>', 'وصف اللقطة')
    .action(async (name: string, options: any) => {
      try {
        const client = await createClientFromConfig();
        if (!client) return;

        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
          enableGit: true,
        });

        await guardian.createSnapshot(name, options.description);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('list')
    .alias('ls')
    .description('📋 عرض جميع اللقطات')
    .action(async () => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        const snapshots = await guardian.listSnapshots();

        if (snapshots.length === 0) {
          console.log(chalk.yellow('\n⚠️  لا توجد لقطات محفوظة'));
          return;
        }

        console.log(chalk.bold.cyan('\n📸 اللقطات المحفوظة:\n'));

        snapshots.forEach((snapshot, i) => {
          const date = new Date(snapshot.timestamp).toLocaleString('ar-EG');
          console.log(chalk.green(`${i + 1}. ${snapshot.name}`));
          console.log(chalk.gray(`   ID: ${snapshot.id}`));
          console.log(chalk.gray(`   التاريخ: ${date}`));
          console.log(chalk.gray(`   الملفات: ${snapshot.metadata.totalFiles}`));
          if (snapshot.description) {
            console.log(chalk.gray(`   الوصف: ${snapshot.description}`));
          }
          if (snapshot.gitCommit) {
            console.log(chalk.gray(`   Git: ${snapshot.gitCommit.substring(0, 7)}`));
          }
          console.log();
        });
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('rollback <snapshotId>')
    .alias('back')
    .description('⏮️ الرجوع إلى لقطة سابقة')
    .option('--no-backup', 'عدم إنشاء نسخة احتياطية قبل الرجوع')
    .option('--tag <name>', 'إنشاء Git tag بعد الرجوع')
    .action(async (snapshotId: string, options: any) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
          enableGit: true,
        });

        await guardian.rollback(snapshotId, {
          backup: options.backup !== false,
          gitTag: options.tag,
        });
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('diff <snapshot1> <snapshot2>')
    .description('🔍 مقارنة لقطتين')
    .action(async (snapshot1: string, snapshot2: string) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.showDiff(snapshot1, snapshot2);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('backup <name>')
    .description('💾 إنشاء نسخة احتياطية')
    .option('--compress', 'ضغط النسخة الاحتياطية')
    .option('--cloud', 'رفع النسخة إلى السحابة')
    .action(async (name: string, options: any) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
          cloudBackup: options.cloud,
        });

        await guardian.createBackup(name, {
          compress: options.compress,
          cloud: options.cloud,
        });
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('restore <backupName>')
    .description('📦 استعادة نسخة احتياطية')
    .action(async (backupName: string) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.restoreBackup(backupName);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('history')
    .description('📜 عرض سجل التغييرات')
    .option('-l, --limit <number>', 'عدد السجلات المعروضة')
    .action(async (options: any) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.showHistory(options.limit ? parseInt(options.limit) : undefined);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('archaeology <filePath>')
    .alias('arch')
    .description('🏺 عرض تاريخ ملف معين')
    .action(async (filePath: string) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.showFileArchaeology(filePath);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('analytics')
    .alias('stats')
    .description('📊 عرض تحليلات الإصدارات')
    .action(async () => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.showAnalytics();
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('suggestions')
    .alias('suggest')
    .description('💡 عرض اقتراحات ذكية')
    .action(async () => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.showSuggestions();
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('timeline')
    .description('📅 عرض الخط الزمني المرئي')
    .option('-d, --days <number>', 'عدد الأيام المعروضة')
    .action(async (options: any) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.showTimeline(options.days ? parseInt(options.days) : undefined);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('export <snapshotId> <outputPath>')
    .description('📤 تصدير لقطة')
    .action(async (snapshotId: string, outputPath: string) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.exportSnapshot(snapshotId, outputPath);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('import <importPath>')
    .description('📥 استيراد لقطة')
    .action(async (importPath: string) => {
      try {
        const guardian = createVersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
        });

        await guardian.importSnapshot(importPath);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  // ========================================
  // أوامر File Archaeology - علم آثار الملفات
  // ========================================

  program
    .command('archaeology <filePath>')
    .alias('arch')
    .description('🔍 تتبع تاريخ ملف معين عبر جميع الإصدارات')
    .action(async (filePath: string) => {
      try {
        const archaeology = createFileArchaeology(process.cwd());
        await archaeology.displayFileHistory(filePath);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('arch-compare <filePath> <snapshotId>')
    .description('📊 مقارنة ملف مع snapshot معينة')
    .action(async (filePath: string, snapshotId: string) => {
      try {
        const archaeology = createFileArchaeology(process.cwd());
        await archaeology.compareWithSnapshot(filePath, snapshotId);
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('most-changed')
    .description('🔥 عرض الملفات الأكثر تغييراً في المشروع')
    .option('-l, --limit <number>', 'عدد الملفات', '10')
    .action(async (options: any) => {
      try {
        const archaeology = createFileArchaeology(process.cwd());
        await archaeology.findMostChangedFiles(parseInt(options.limit));
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  // ========================================
  // أوامر Notifications - نظام الإشعارات
  // ========================================

  program
    .command('notifications-config')
    .description('⚙️ إعداد نظام الإشعارات')
    .option('--enable', 'تفعيل الإشعارات')
    .option('--disable', 'تعطيل الإشعارات')
    .option('--slack <webhookUrl>', 'تفعيل Slack')
    .option('--discord <webhookUrl>', 'تفعيل Discord')
    .option('--webhook <url>', 'تفعيل Webhook مخصص')
    .action(async (options: any) => {
      try {
        const notifications = createNotificationSystem(process.cwd());

        const config: any = {};

        if (options.enable) config.enabled = true;
        if (options.disable) config.enabled = false;

        if (options.slack) {
          config.channels = ['console', 'slack'];
          config.slack = { webhookUrl: options.slack };
        }

        if (options.discord) {
          if (!config.channels) config.channels = ['console'];
          config.channels.push('discord');
          config.discord = { webhookUrl: options.discord };
        }

        if (options.webhook) {
          if (!config.channels) config.channels = ['console'];
          config.channels.push('webhook');
          config.webhook = { url: options.webhook };
        }

        await notifications.saveConfig(config);
        console.log(chalk.green('\n✅ تم حفظ إعدادات الإشعارات'));
        console.log(chalk.cyan('\nالإعدادات الحالية:'));
        console.log(JSON.stringify(config, null, 2));
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('test-notification')
    .description('🔔 اختبار نظام الإشعارات')
    .option('-t, --type <type>', 'نوع الإشعار (info|success|warning|error)', 'info')
    .action(async (options: any) => {
      try {
        const notifications = createNotificationSystem(process.cwd());
        await notifications.send({
          type: options.type,
          title: 'إشعار تجريبي',
          message: 'هذا اختبار لنظام الإشعارات في Oqool Guardian',
        });
        console.log(chalk.green('\n✅ تم إرسال الإشعار التجريبي'));
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  program
    .command('notification-history')
    .description('📜 عرض سجل الإشعارات')
    .option('-l, --limit <number>', 'عدد الإشعارات', '20')
    .action(async (options: any) => {
      try {
        const notifications = createNotificationSystem(process.cwd());
        const history = notifications.getHistory(parseInt(options.limit));

        if (history.length === 0) {
          console.log(chalk.yellow('\n⚠️ لا توجد إشعارات في السجل'));
          return;
        }

        console.log(chalk.cyan('\n📜 سجل الإشعارات:\n'));
        history.forEach((notification, i) => {
          const icon =
            notification.type === 'success'
              ? '✅'
              : notification.type === 'error'
                ? '❌'
                : notification.type === 'warning'
                  ? '⚠️'
                  : '🔔';

          console.log(
            chalk.white(`${icon} [${new Date(notification.timestamp).toLocaleString()}]`)
          );
          console.log(chalk.yellow(`   ${notification.title}`));
          console.log(chalk.gray(`   ${notification.message}\n`));
        });
      } catch (error: any) {
        console.error(chalk.red('\n❌ خطأ:'), error.message);
      }
    });

  // ========================================
  // أوامر Auto-Fix System
  // ========================================

  addAutoFixCommand(program);

  // ========================================
  // أوامر Core Systems (Cache, Context, Validation)
  // ========================================

  addCoreSystemsCommands(program);

  // ========================================
  // أوامر ML Agent (Machine Learning)
  // ========================================

  const mlCLI = createMLCLI();
  mlCLI.setupCommands(program);
}
