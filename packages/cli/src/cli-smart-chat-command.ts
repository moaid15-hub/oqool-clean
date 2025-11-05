/**
 * CLI Smart Chat Command
 *
 * دمج نظام Smart Chat الكامل في CLI
 * يجمع جميع المكونات الستة:
 * 1. Intent Parser
 * 2. Smart Context Builder
 * 3. Enhanced AI Adapter
 * 4. Change Reviewer
 * 5. Smart Chat
 * 6. File Manager
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ContextManager, VersionGuardian } from '@oqool/shared/core';
import { UnifiedAIAdapter } from '@oqool/shared/ai-gateway';
import { FileManager, createFileManager } from './file-manager.js';
import { SmartChat, createSmartChat } from './smart-chat.js';
import { SmartContextBuilder } from './smart-context-builder.js';
import { EnhancedAIAdapter } from './enhanced-ai-adapter.js';
import { ChangeReviewer, createChangeReviewer } from './change-reviewer.js';
import { intentParser } from './intent-parser.js';

/**
 * Register Smart Chat command
 */
export function registerSmartChatCommand(program: Command): void {
  program
    .command('chat [message]')
    .description('💬 محادثة ذكية مع AI - Smart Chat with context awareness')
    .option('-v, --verbose', 'عرض معلومات تفصيلية')
    .option('-i, --interactive', 'وضع المحادثة التفاعلي')
    .option('--auto-apply', 'تطبيق التغييرات تلقائياً بدون مراجعة')
    .option('--no-embeddings', 'تعطيل البحث الدلالي')
    .option('--max-tokens <number>', 'حد أقصى للـ tokens', '100000')
    .option('--max-history <number>', 'حد أقصى لتاريخ المحادثة', '20')
    .action(async (message: string | undefined, options: any) => {
      try {
        // التحقق من وجود رسالة أو تفعيل الوضع التفاعلي
        if (!message && !options.interactive) {
          console.log(chalk.yellow('\n⚠️  يجب توفير رسالة أو استخدام --interactive\n'));
          console.log(chalk.gray('مثال: oqool chat "create authentication system"'));
          console.log(chalk.gray('أو: oqool chat --interactive\n'));
          return;
        }

        // إنشاء المكونات
        const spinner = ora('جاري تهيئة Smart Chat...').start();

        const fileManager = createFileManager();
        const contextManager = new ContextManager(process.cwd());
        const versionGuardian = new VersionGuardian({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          projectPath: process.cwd(),
          autoBackup: false,
          maxSnapshots: 50
        });

        // ملاحظة: يجب توفير UnifiedAIAdapter من التكوين
        // هنا نفترض أنه تم إنشاؤه مسبقاً
        const unifiedAdapter = await createAIAdapter();

        // Smart Context Builder
        const contextBuilder = new SmartContextBuilder(
          fileManager,
          undefined, // embeddings يمكن إضافته لاحقاً
          undefined, // treeSitter يمكن إضافته لاحقاً
          {
            maxTokens: parseInt(options.maxTokens),
            useEmbeddings: !options.noEmbeddings,
            maxFiles: 25,
            minSimilarity: 0.5,
          }
        );

        // Create Smart Chat
        const chat = createSmartChat(
          contextManager,
          unifiedAdapter,
          fileManager,
          versionGuardian,
          contextBuilder,
          {
            maxHistory: parseInt(options.maxHistory),
            autoApply: options.autoApply,
            verbose: options.verbose,
          }
        );

        spinner.succeed('Smart Chat جاهز!');

        // Interactive mode
        if (options.interactive) {
          await runInteractiveMode(chat);
        } else {
          // Single message mode
          await chat.chat(message!);
        }

      } catch (error: any) {
        console.error(chalk.red(`\n❌ خطأ: ${error.message}\n`));
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // أمر لعرض تاريخ المحادثة
  program
    .command('chat-history')
    .description('📜 عرض تاريخ المحادثة')
    .option('--export <file>', 'تصدير التاريخ إلى ملف')
    .option('--clear', 'مسح التاريخ')
    .action(async (options: any) => {
      // TODO: Implement history management
      console.log(chalk.yellow('⚠️  هذه الميزة قيد التطوير'));
    });
}

/**
 * Run interactive chat mode
 */
async function runInteractiveMode(chat: SmartChat): Promise<void> {
  console.log(chalk.cyan('\n💬 وضع المحادثة التفاعلي'));
  console.log(chalk.gray('اكتب رسالتك، أو "exit" للخروج، أو "clear" لمسح التاريخ\n'));

  let running = true;

  while (running) {
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: chalk.blue('أنت:'),
        validate: (input: string) => {
          if (!input.trim()) {
            return 'الرجاء إدخال رسالة';
          }
          return true;
        },
      },
    ]);

    const trimmed = message.trim().toLowerCase();

    if (trimmed === 'exit' || trimmed === 'quit') {
      running = false;
      console.log(chalk.gray('\n👋 وداعاً!\n'));
    } else if (trimmed === 'clear') {
      chat.clearHistory();
    } else if (trimmed === 'history') {
      const history = chat.getHistory();
      console.log(chalk.cyan(`\n📜 التاريخ (${history.length} رسالة):\n`));
      history.forEach((msg, i) => {
        const label = msg.role === 'user' ? chalk.blue('أنت') : chalk.green('Claude');
        console.log(`${i + 1}. ${label}: ${msg.content.substring(0, 100)}...`);
      });
      console.log();
    } else {
      await chat.chat(message);
      console.log(); // فاصل
    }
  }
}

/**
 * Create AI Adapter (يجب أن يكون من التكوين الفعلي)
 */
async function createAIAdapter(): Promise<UnifiedAIAdapter> {
  // ملاحظة: هذه دالة مؤقتة
  // يجب استبدالها بإنشاء UnifiedAIAdapter من التكوين الفعلي

  try {
    // محاولة تحميل من التكوين
    const { createClientFromConfig } = await import('./api-client.js');
    const client = await createClientFromConfig();

    // إنشاء UnifiedAIAdapter من client
    // TODO: استخدام factory method صحيح
    return new UnifiedAIAdapter({
      claude: process.env.ANTHROPIC_API_KEY || '',
      defaultProvider: 'claude',
    });
  } catch (error) {
    throw new Error('فشل إنشاء AI Adapter. تأكد من تكوين API keys.');
  }
}

/**
 * Test Intent Parser (للاختبار)
 */
export async function testIntentParser(): Promise<void> {
  console.log(chalk.cyan('\n🧪 اختبار Intent Parser:\n'));

  const testMessages = [
    'create a new React component',
    'fix the bug in auth.ts',
    'explain how JWT works',
    'أنشئ نظام مصادقة',
    'راجع الكود في api.ts',
  ];

  for (const message of testMessages) {
    const intent = intentParser.parse(message);
    console.log(chalk.gray(`"${message}"`));
    console.log(chalk.green(`  → Intent: ${intent.type} (${Math.round(intent.confidence * 100)}%)`));
    console.log(chalk.blue(`  → Language: ${intent.language}`));
    if (intent.entities.files) {
      console.log(chalk.yellow(`  → Files: ${intent.entities.files.join(', ')}`));
    }
    console.log();
  }
}

/**
 * Demo Smart Chat (للعرض التوضيحي)
 */
export async function demoSmartChat(): Promise<void> {
  console.log(chalk.cyan('\n🎯 عرض توضيحي لـ Smart Chat\n'));

  try {
    const fileManager = createFileManager();
    const contextManager = new ContextManager(process.cwd());
    const versionGuardian = new VersionGuardian({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      projectPath: process.cwd(),
      autoBackup: false,
      maxSnapshots: 50
    });
    const unifiedAdapter = await createAIAdapter();

    const contextBuilder = new SmartContextBuilder(fileManager, undefined, undefined);

    const chat = createSmartChat(
      contextManager,
      unifiedAdapter,
      fileManager,
      versionGuardian,
      contextBuilder,
      { verbose: true }
    );

    // مثال بسيط
    console.log(chalk.yellow('المستخدم: create a simple hello world function\n'));
    await chat.chat('create a simple hello world function');

  } catch (error: any) {
    console.error(chalk.red(`❌ خطأ في العرض التوضيحي: ${error.message}`));
  }
}

/**
 * Show Smart Chat info
 */
export function showSmartChatInfo(): void {
  console.log(chalk.cyan('\n📚 Smart Chat System\n'));

  console.log(chalk.bold('المكونات الستة:'));
  console.log(chalk.gray('  1. Intent Parser       - تحليل نوايا المستخدم'));
  console.log(chalk.gray('  2. Context Builder     - بناء السياق الذكي'));
  console.log(chalk.gray('  3. AI Adapter          - التواصل مع AI'));
  console.log(chalk.gray('  4. Change Reviewer     - مراجعة التغييرات'));
  console.log(chalk.gray('  5. Smart Chat          - المنظم الرئيسي'));
  console.log(chalk.gray('  6. File Manager        - إدارة الملفات'));

  console.log(chalk.bold('\n\nالميزات:'));
  console.log(chalk.green('  ✓ دعم 12 نوع من النوايا'));
  console.log(chalk.green('  ✓ بحث دلالي مع embeddings'));
  console.log(chalk.green('  ✓ ضغط السياق (3 مستويات)'));
  console.log(chalk.green('  ✓ مراجعة تفاعلية'));
  console.log(chalk.green('  ✓ Snapshot & Rollback'));
  console.log(chalk.green('  ✓ دعم العربية والإنجليزية'));

  console.log(chalk.bold('\n\nالاستخدام:'));
  console.log(chalk.yellow('  oqool chat "create authentication system"'));
  console.log(chalk.yellow('  oqool chat --interactive'));
  console.log(chalk.yellow('  oqool chat --verbose "fix bug in auth.ts"'));

  console.log(chalk.bold('\n\nالمزيد:'));
  console.log(chalk.gray('  راجع SMART_CHAT_SYSTEM_README.md للتفاصيل الكاملة\n'));
}

// Export للاستخدام في CLI
export default {
  registerSmartChatCommand,
  testIntentParser,
  demoSmartChat,
  showSmartChatInfo,
};
