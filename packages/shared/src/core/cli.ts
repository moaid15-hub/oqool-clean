// cli.ts
// ============================================
// 🎮 معالج الأوامر - CLI Handler
// ============================================

import dotenv from 'dotenv';
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { BRANDING } from './branding.js';

// تحميل متغيرات البيئة
dotenv.config();
import {
  saveConfig,
  loadConfig,
  logout,
  validateApiKey,
  displayAccountInfo,
  hasApiKey,
} from './auth.js';
import { OqoolAPIClient, createClientFromConfig } from './api-client.js';
import { FileManager, createFileManager } from './file-manager.js';
import { createAgentClient } from './agent-client.js';
import { ui } from './ui.js';
import { createCodeAnalyzer } from './code-analyzer.js';
import { createCodeExecutor } from './code-executor.js';
import { createGitManager } from './git-manager.js';
import { createHistoryManager } from './history-manager.js';
import { createTemplateManager } from './template-manager.js';
import { createEnhancedExecutor } from './enhanced-executor.js';
import { createPRManager } from './pr-manager.js';
import { createAIDocumentation } from './ai-response-documentation.js';
import { createCollaborativeFeatures } from './collaborative-features.js';
import { createSecurityEnhancements } from './security-enhancements.js';
import { createMultiPersonalityAITeam } from './multi-personality-ai-team.js';
import { createCollectiveIntelligenceSystem } from './collective-intelligence.js';
import { createCodeDNASystem } from './code-dna-system.js';
import { createVoiceFirstInterface } from './voice-first-interface.js';
import { createDocsGenerator } from './docs-generator.js';
import { createTestGenerator } from './test-generator.js';
import { createConfigWizard } from './config-wizard.js';
import { createProgressTracker } from './progress-tracker.js';
import { createAICodeCompletion } from './ai-code-completion.js';
import { createDatabaseIntegration } from './database-integration.js';
import { createAPITesting } from './api-testing.js';
import { createCodeLibrary } from './code-library.js';
import { createAgentTeam } from './agent-team.js';
import { createGodMode } from './god-mode.js';
import { createAnalytics } from './analytics.js';
import { createSelfLearningSystem } from './self-learning-system.js';
import { registerNewCommands } from './cli-new-commands.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

// معلومات البرنامج
program
  .name('oqool')
  .description('🧠 oqool - أداة ذكاء اصطناعي متقدمة لتوليد وتعديل الأكواد')
  .version(packageJson.version);

// أمر تسجيل الدخول
program
  .command('login [apiKey]')
  .description('تسجيل الدخول باستخدام API Key (اختياري في وضع التطوير)')
  .option('--dev', 'وضع التطوير (بدون مصادقة)')
  .action(async (apiKey: string | undefined, options: { dev?: boolean }) => {
    try {
      // وضع التطوير
      if (options.dev || !apiKey || apiKey === 'dev') {
        console.log(chalk.yellow('⚠️  وضع التطوير - بدون مصادقة\n'));

        await saveConfig({
          apiKey: 'dev_mode',
          apiUrl: 'http://localhost:3000', // أو https://oqool.net
          userId: 'dev_user',
          email: 'developer@oqool.net',
          plan: 'Development (Unlimited)',
          lastSync: new Date().toISOString(),
        });

        console.log(chalk.green('✅ تم التفعيل في وضع التطوير!\n'));
        console.log(chalk.cyan('🚀 يمكنك الآن استخدام الأداة بدون قيود\n'));
        console.log(chalk.gray('ابدأ الآن: oqool-code "اصنع API بسيط"\n'));
        return;
      }

      ui.startSpinner('جاري التحقق من المفتاح...');

      // التحقق من صيغة المفتاح
      if (!validateApiKey(apiKey)) {
        ui.failSpinner('صيغة API Key غير صحيحة');
        console.log(chalk.yellow('\nالصيغة الصحيحة: oqool_xxxxxxxxxxxx'));
        console.log(chalk.cyan('أو استخدم: oqool-code login --dev (للتطوير)\n'));
        return;
      }

      // التحقق من صحة المفتاح مع Backend
      const client = new OqoolAPIClient(apiKey, 'https://oqool.net');
      const verification = await client.verifyApiKey();

      if (!verification.success) {
        ui.failSpinner('فشل التحقق من المفتاح');
        console.log(chalk.red(`\n❌ ${verification.error}`));
        console.log(chalk.cyan('\n💡 للتطوير: oqool-code login --dev\n'));
        return;
      }

      // حفظ التكوين
      await saveConfig({
        apiKey,
        apiUrl: 'https://oqool.net',
        userId: verification.userId,
        email: verification.email,
        plan: verification.plan,
        lastSync: new Date().toISOString(),
      });

      ui.succeedSpinner('تم تسجيل الدخول بنجاح!');

      console.log(chalk.green('\n✅ أهلاً بك في Oqool Code!\n'));
      if (verification.email) {
        console.log(chalk.white('البريد:'), chalk.cyan(verification.email));
      }
      if (verification.plan) {
        console.log(chalk.white('الباقة:'), chalk.magenta(verification.plan));
      }
      if (verification.remainingMessages !== undefined) {
        console.log(
          chalk.white('الرسائل المتبقية اليوم:'),
          chalk.yellow(verification.remainingMessages.toString())
        );
      }

      console.log(chalk.gray('\nابدأ الآن: oqool-code "اصنع API بسيط"\n'));
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
      console.log(chalk.cyan('\n💡 للتطوير: oqool-code login --dev\n'));
    }
  });

// أمر تسجيل الخروج
program
  .command('logout')
  .description('تسجيل الخروج وحذف الإعدادات')
  .action(async () => {
    await logout();
  });

// أمر عرض حالة الحساب
program
  .command('status')
  .description('عرض معلومات الحساب والاشتراك')
  .action(async () => {
    await displayAccountInfo();
  });

// أمر توليد كود
program
  .command('generate <prompt>')
  .alias('gen')
  .description('توليد كود بناءً على الطلب')
  .option('-f, --files <paths...>', 'ملفات محددة للسياق')
  .option('-m, --max-files <number>', 'الحد الأقصى للملفات', '10')
  .option('-p, --provider <name>', 'مزود AI محدد (openai, claude, deepseek)')
  .option('--no-git', 'تعطيل Git integration')
  .action(async (prompt: string, options) => {
    try {
      // التحقق من تسجيل الدخول
      if (!(await hasApiKey())) {
        ui.warning('يجب تسجيل الدخول أولاً');
        console.log(chalk.cyan('استخدم: oqool-code login <API_KEY>\n'));
        return;
      }

      const client = await createClientFromConfig();
      if (!client) return;

      const fileManager = createFileManager();

      ui.startSpinner('فحص المشروع...');

      // جمع سياق الملفات
      let fileContext: Array<{ path: string; content: string }> = [];

      if (options.files && options.files.length > 0) {
        // قراءة ملفات محددة
        for (const filePath of options.files) {
          const content = await fileManager.readFile(filePath);
          if (content) {
            fileContext.push({ path: filePath, content });
          }
        }
      } else {
        // فحص المشروع تلقائياً
        const context = await fileManager.getProjectContext(parseInt(options.maxFiles));
        fileContext = context.files.map((f) => ({
          path: f.path,
          content: f.content,
        }));

        ui.stopSpinner();
        ui.showProjectInfo(context.totalFiles, context.totalSize);
        ui.showFilesList(context.files.map((f) => ({ path: f.path, size: f.size })));
      }

      ui.startSpinner('جاري توليد الكود...');

      // إرسال للـ AI
      const response = await client.generateCode(prompt, fileContext);

      if (!response.success) {
        ui.failSpinner('فشل توليد الكود');
        console.log(chalk.red(`\n❌ ${response.error}\n`));
        return;
      }

      ui.succeedSpinner('تم توليد الكود بنجاح!');
      ui.showAIResponse(response.message, response.usedProvider);

      // استخراج الملفات من الرد
      const generatedFiles = fileManager.extractFilesFromResponse(response.message);

      if (generatedFiles.length === 0) {
        ui.info('لم يتم العثور على ملفات للكتابة');
        return;
      }

      // سؤال المستخدم عن الكتابة
      console.log(chalk.yellow(`\n📝 تم اكتشاف ${generatedFiles.length} ملف(ات):\n`));
      generatedFiles.forEach((file, i) => {
        console.log(chalk.cyan(`  ${i + 1}. ${file.path}`));
      });

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'هل تريد كتابة هذه الملفات؟',
          default: true,
        },
      ]);

      if (confirm) {
        ui.startSpinner('كتابة الملفات...');

        for (const file of generatedFiles) {
          await fileManager.writeFile(file.path, file.content);
        }

        ui.succeedSpinner('تم كتابة جميع الملفات بنجاح! ✨');

        // Git Integration
        if (options.git !== false) {
          const gitManager = createGitManager();

          // التحقق من git repo
          if (await gitManager.isGitRepo()) {
            const changedFiles = fileManager.getChangedFiles();

            if (changedFiles.length > 0) {
              console.log(chalk.cyan('\n🔀 Git Integration\n'));

              // سؤال: هل تريد عمل commit؟
              const { doCommit } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'doCommit',
                  message: 'هل تريد عمل commit وpush تلقائي؟',
                  default: true,
                },
              ]);

              if (doCommit) {
                // تشغيل Git workflow
                await gitManager.autoWorkflow(changedFiles, prompt, {
                  autoCommit: true,
                  autoPush: false,
                });

                // سؤال عن push
                const { doPush } = await inquirer.prompt([
                  {
                    type: 'confirm',
                    name: 'doPush',
                    message: '🚀 هل تريد push للـ remote؟',
                    default: false,
                  },
                ]);

                if (doPush) {
                  const branchInfo = await gitManager.getCurrentBranch();
                  if (branchInfo) {
                    ui.startSpinner('Push إلى remote...');
                    const pushResult = await gitManager.push(branchInfo.current, true);

                    if (pushResult.success) {
                      ui.succeedSpinner(pushResult.message!);
                    } else {
                      ui.failSpinner('فشل Push');
                      console.log(chalk.yellow(`\n⚠️  ${pushResult.error}\n`));
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        ui.info('تم إلغاء الكتابة');
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر المحادثة التفاعلية مع Agent Tools
program
  .command('chat')
  .description('بدء محادثة تفاعلية مع AI مع أدوات حقيقية')
  .action(async () => {
    try {
      // التحقق من وجود ANTHROPIC_API_KEY
      if (!process.env.ANTHROPIC_API_KEY) {
        ui.warning('ANTHROPIC_API_KEY غير موجود');
        console.log(chalk.cyan('أضف المفتاح في ملف .env:'));
        console.log(chalk.gray('ANTHROPIC_API_KEY=sk-ant-...\n'));
        return;
      }

      // إنشاء Agent مع Tools
      const agent = createAgentClient({
        apiKey: process.env.ANTHROPIC_API_KEY,
        workingDirectory: process.cwd(),
        enablePlanning: true,
        enableContext: true,
        enableLearning: true,
      });

      ui.showBanner();

      console.log('');
      console.log('');
      console.log(BRANDING.commandsBox);
      console.log('');
      console.log('');
      console.log(BRANDING.warningBox);
      console.log('');
      console.log(
        chalk.green.bold('   💬 محادثة تفاعلية مع Agent Tools') +
          chalk.gray(' - اكتب ') +
          chalk.yellow('"exit"') +
          chalk.gray(' للخروج\n')
      );

      // حلقة المحادثة
      while (true) {
        const { message } = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: chalk.white('    أنت:'),
            validate: (input) => input.trim().length > 0 || 'الرسالة لا يمكن أن تكون فارغة',
          },
        ]);

        const userMessage = message.trim();

        if (userMessage.toLowerCase() === 'exit' || userMessage === 'خروج') {
          console.log(chalk.yellow('\n👋 إلى اللقاء!\n'));
          break;
        }

        // 🔥 اكتشاف ذكي: هل المهمة كبيرة؟
        const isComplexTask =
          /\b(build|create|make|generate|develop|implement)\s+(full|complete|entire|whole|saas|platform|app|application|system|project)/i.test(
            userMessage
          );

        if (isComplexTask) {
          // استخدام God Mode تلقائياً
          console.log(chalk.bold.red('\n🔥 مهمة معقدة مكتشفة - تفعيل GOD MODE!\n'));

          const team = createAgentTeam({
            apiKey: process.env.ANTHROPIC_API_KEY,
            verbose: false, // quiet mode في chat
          });

          const result = await team.collaborate(userMessage);

          console.log(chalk.magenta('\n🤖 Oqool (God Mode):'));
          console.log(chalk.green('\n✅ المشروع جاهز!\n'));
          console.log(chalk.white(result.finalCode.substring(0, 500) + '...\n'));
          console.log(chalk.cyan('💡 للحصول على المشروع الكامل، استخدم:\n'));
          console.log(chalk.yellow(`   oqool god "${userMessage}"\n`));
        } else {
          // استخدام Agent عادي للمهام البسيطة
          const response = await agent.chat(userMessage);

          console.log(chalk.magenta('\n🤖 Oqool:'));
          console.log(chalk.white(response));
          console.log();
        }
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض بنية المشروع
program
  .command('structure')
  .alias('tree')
  .description('عرض بنية المشروع')
  .option('-d, --depth <number>', 'عمق البنية', '3')
  .action(async (options) => {
    try {
      const fileManager = createFileManager();
      const structure = await fileManager.getDirectoryStructure(parseInt(options.depth));
      ui.showProjectStructure(structure);
    } catch (error: any) {
      ui.error('فشل عرض البنية');
      console.error(chalk.red(error.message));
    }
  });

// أمر تحليل الكود
program
  .command('analyze <files...>')
  .description('تحليل ذكي للكود باستخدام AST')
  .option('-o, --output <format>', 'صيغة المخرجات (console|json)', 'console')
  .option('--no-issues', 'إخفاء المشاكل المحتملة')
  .action(async (files: string[], options) => {
    try {
      const analyzer = createCodeAnalyzer();

      for (const file of files) {
        ui.startSpinner(`تحليل ${file}...`);

        try {
          const analysis = await analyzer.analyzeFile(file);
          ui.succeedSpinner(`تم تحليل ${file}`);

          if (options.output === 'json') {
            // عرض كـ JSON
            console.log(JSON.stringify(analysis, null, 2));
          } else {
            // عرض في الـ console
            analyzer.displayAnalysis(analysis);
          }

          // إخفاء المشاكل إذا طُلب
          if (!options.issues && analysis.issues.length > 0) {
            console.log(chalk.gray(`\n💡 استخدم بدون --no-issues لعرض المشاكل المحتملة`));
          }
        } catch (error: any) {
          ui.failSpinner(`فشل تحليل ${file}`);
          console.error(chalk.red(`\n❌ ${error.message}\n`));
        }

        // فاصل بين الملفات
        if (files.length > 1) {
          console.log('\n');
        }
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تطبيق Patch على ملف
program
  .command('patch <prompt>')
  .description('تعديل دقيق للملفات باستخدام Patch')
  .option('-f, --files <paths...>', 'ملفات محددة للتعديل')
  .option('-p, --preview', 'معاينة قبل التطبيق')
  .option('--no-git', 'تعطيل Git integration')
  .action(async (prompt: string, options) => {
    try {
      // التحقق من تسجيل الدخول
      if (!(await hasApiKey())) {
        ui.warning('يجب تسجيل الدخول أولاً');
        console.log(chalk.cyan('استخدم: oqool-code login <API_KEY>\n'));
        return;
      }

      const client = await createClientFromConfig();
      if (!client) return;

      const fileManager = createFileManager();

      ui.startSpinner('تحليل الطلب...');

      // جمع سياق الملفات
      let fileContext: Array<{ path: string; content: string }> = [];

      if (options.files && options.files.length > 0) {
        for (const filePath of options.files) {
          const content = await fileManager.readFile(filePath);
          if (content) {
            fileContext.push({ path: filePath, content });
          }
        }
      }

      // إعداد رسالة للـ AI مع تعليمات Patch
      const systemPrompt = `أنت مساعد برمجة متخصص في تعديل الملفات بدقة.

عند تعديل ملف، استخدم صيغة PATCH التالية:

PATCH: path/to/file.js
LINE: 45
REMOVE: 2
ADD:
\`\`\`
const result = await db.query(...);
console.log(result);
\`\`\`

أو للاستبدال:
PATCH: path/to/file.js
LINE: 10
REPLACE:
\`\`\`
const newCode = "updated";
\`\`\`

الملفات المتاحة:
${fileContext.map((f) => `- ${f.path} (${f.content.split('\n').length} سطر)`).join('\n')}

قواعد مهمة:
1. استخدم LINE لتحديد رقم السطر بدقة
2. استخدم REMOVE لحذف أسطر
3. استخدم ADD لإضافة أسطر جديدة
4. استخدم REPLACE لاستبدال سطر واحد
5. رقم السطر يبدأ من 1 (وليس 0)`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt },
      ];

      ui.updateSpinner('جاري توليد التعديلات...');

      const response = await client.sendChatMessage(messages);

      if (!response.success) {
        ui.failSpinner('فشل توليد التعديلات');
        console.log(chalk.red(`\n❌ ${response.error}\n`));
        return;
      }

      ui.succeedSpinner('تم توليد التعديلات!');

      // استخراج الـ patches
      const filePatches = fileManager.extractPatchesFromResponse(response.message);

      if (filePatches.length === 0) {
        ui.info('لم يتم العثور على تعديلات للتطبيق');
        console.log(chalk.yellow('\n💡 تلميح: تأكد من طلب تعديلات محددة للملفات\n'));
        return;
      }

      // عرض ملخص التعديلات
      console.log(chalk.yellow(`\n📝 تم اكتشاف ${filePatches.length} ملف(ات) للتعديل:\n`));

      for (const filePatch of filePatches) {
        console.log(chalk.cyan(`  📄 ${filePatch.path} - ${filePatch.patches.length} تعديل(ات)`));
      }

      // معاينة إذا طُلب
      if (options.preview) {
        console.log(chalk.blue('\n🔍 معاينة التعديلات:\n'));
        for (const filePatch of filePatches) {
          for (const patch of filePatch.patches) {
            await fileManager.previewPatch(filePatch.path, patch);
          }
        }
      }

      // سؤال المستخدم
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'هل تريد تطبيق هذه التعديلات؟',
          default: true,
        },
      ]);

      if (confirm) {
        ui.startSpinner('تطبيق التعديلات...');

        for (const filePatch of filePatches) {
          await fileManager.applyPatches(filePatch.path, filePatch.patches);
        }

        ui.succeedSpinner('تم تطبيق جميع التعديلات بنجاح! ✨');

        // Git Integration
        if (options.git !== false) {
          const gitManager = createGitManager();

          if (await gitManager.isGitRepo()) {
            const changedFiles = fileManager.getChangedFiles();

            if (changedFiles.length > 0) {
              console.log(chalk.cyan('\n🔀 Git Integration\n'));

              const { doCommit } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'doCommit',
                  message: 'هل تريد عمل commit وpush تلقائي؟',
                  default: true,
                },
              ]);

              if (doCommit) {
                await gitManager.autoWorkflow(changedFiles, prompt, {
                  autoCommit: true,
                  autoPush: false,
                });

                const { doPush } = await inquirer.prompt([
                  {
                    type: 'confirm',
                    name: 'doPush',
                    message: '🚀 هل تريد push للـ remote؟',
                    default: false,
                  },
                ]);

                if (doPush) {
                  const branchInfo = await gitManager.getCurrentBranch();
                  if (branchInfo) {
                    ui.startSpinner('Push إلى remote...');
                    const pushResult = await gitManager.push(branchInfo.current, true);

                    if (pushResult.success) {
                      ui.succeedSpinner(pushResult.message!);
                    } else {
                      ui.failSpinner('فشل Push');
                      console.log(chalk.yellow(`\n⚠️  ${pushResult.error}\n`));
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        ui.info('تم إلغاء التعديلات');
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تشغيل الكود
program
  .command('run <file>')
  .description('تشغيل ملف كود')
  .option('-t, --timeout <ms>', 'وقت انتهاء التنفيذ', '5000')
  .option('--sandbox', 'تشغيل في وضع sandbox')
  .option('--args <args...>', 'معاملات للبرنامج')
  .action(async (file: string, options) => {
    try {
      const executor = createCodeExecutor();

      ui.startSpinner(`تشغيل ${file}...`);

      const result = await executor.executeCode({
        file,
        timeout: parseInt(options.timeout),
        env: options.sandbox ? 'sandbox' : 'normal',
        args: options.args || [],
      });

      if (result.success) {
        ui.succeedSpinner(`نجح التنفيذ! (${result.runtime}ms)`);

        if (result.output) {
          console.log(chalk.blue('\n📤 المخرجات:'));
          console.log(chalk.gray('─'.repeat(60)));
          console.log(chalk.white(result.output));
          console.log(chalk.gray('─'.repeat(60)));
        }
      } else {
        ui.failSpinner('فشل التنفيذ');

        console.log(chalk.red('\n❌ الخطأ:'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.red(result.error));
        console.log(chalk.gray('─'.repeat(60)));

        if (result.errorLine) {
          console.log(chalk.yellow(`\n💡 الخطأ في السطر: ${result.errorLine}`));
        }

        console.log(chalk.cyan('\n💡 جرب: oqool-code fix ' + file + ' --auto-apply\n'));
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إصلاح الأخطاء
program
  .command('fix <file>')
  .description('إصلاح أخطاء الكود تلقائياً')
  .option('--auto-apply', 'تطبيق التعديلات تلقائياً')
  .option('-m, --max-attempts <number>', 'أقصى عدد محاولات', '3')
  .action(async (file: string, options) => {
    try {
      // التحقق من تسجيل الدخول
      if (!(await hasApiKey())) {
        ui.warning('يجب تسجيل الدخول أولاً');
        console.log(chalk.cyan('استخدم: oqool-code login <API_KEY>\n'));
        return;
      }

      const executor = createCodeExecutor();

      // أولاً، شغل الكود لمعرفة الخطأ
      ui.startSpinner(`فحص ${file}...`);

      const result = await executor.executeCode({
        file,
        timeout: 5000,
      });

      if (result.success) {
        ui.succeedSpinner('الملف يعمل بشكل صحيح!');
        console.log(chalk.green('\n✅ لا توجد أخطاء للإصلاح\n'));
        return;
      }

      ui.failSpinner('تم اكتشاف خطأ');

      const fixResult = await executor.fixError({
        file,
        error: result.error || 'Unknown error',
        errorType: result.errorType,
        maxAttempts: parseInt(options.maxAttempts),
        autoApply: options.autoApply,
      });

      if (fixResult.fixed) {
        console.log(chalk.green(`\n✅ ${fixResult.message}\n`));
      } else {
        console.log(chalk.red(`\n❌ ${fixResult.message}\n`));
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تشغيل مع إصلاح تلقائي
program
  .command('run-fix <file>')
  .description('تشغيل الكود مع إصلاح تلقائي للأخطاء')
  .option('-t, --timeout <ms>', 'وقت انتهاء التنفيذ', '5000')
  .option('--no-auto-apply', 'عدم تطبيق التعديلات تلقائياً')
  .option('-m, --max-attempts <number>', 'أقصى عدد محاولات للإصلاح', '3')
  .action(async (file: string, options) => {
    try {
      // التحقق من تسجيل الدخول
      if (!(await hasApiKey())) {
        ui.warning('يجب تسجيل الدخول أولاً');
        console.log(chalk.cyan('استخدم: oqool-code login <API_KEY>\n'));
        return;
      }

      const executor = createCodeExecutor();

      const result = await executor.runAndFix(file, {
        timeout: parseInt(options.timeout),
        autoApply: options.autoApply ?? true,
        maxAttempts: parseInt(options.maxAttempts),
      });

      if (result.success && result.output) {
        console.log(chalk.blue('\n📤 المخرجات النهائية:'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(result.output));
        console.log(chalk.gray('─'.repeat(60) + '\n'));
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر التراجع (Undo)
program
  .command('undo')
  .description('التراجع عن آخر تعديل')
  .action(async () => {
    try {
      const historyManager = createHistoryManager();
      await historyManager.undo();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر الإعادة (Redo)
program
  .command('redo')
  .description('إعادة آخر تعديل تم التراجع عنه')
  .action(async () => {
    try {
      const historyManager = createHistoryManager();
      await historyManager.redo();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض التاريخ
program
  .command('history')
  .description('عرض تاريخ التعديلات')
  .option('-s, --stats', 'عرض الإحصائيات فقط')
  .option('--search <query>', 'البحث في التاريخ')
  .option('--clear', 'مسح التاريخ')
  .option('--export <format>', 'تصدير التاريخ (json أو csv)')
  .action(async (options) => {
    try {
      const historyManager = createHistoryManager();

      if (options.clear) {
        await historyManager.clearHistory();
        return;
      }

      if (options.export) {
        const filePath = await historyManager.exportHistory(options.export);
        console.log(chalk.green(`✅ تم التصدير إلى: ${filePath}\n`));
        return;
      }

      if (options.search) {
        historyManager.displaySearch(options.search);
        return;
      }

      if (options.stats) {
        historyManager.displayStats();
        return;
      }

      historyManager.showHistory();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إدارة القوالب (Templates)
program
  .command('template')
  .description('إدارة قوالب المشاريع')
  .action(() => {
    console.log(chalk.yellow('⚠️  استخدم: template <command>'));
    console.log(chalk.white('\nالأوامر المتاحة:'));
    console.log(chalk.cyan('  template list           - عرض جميع القوالب'));
    console.log(chalk.cyan('  template show <name>    - عرض تفاصيل قالب'));
    console.log(chalk.cyan('  template create <name>  - إنشاء مشروع من قالب'));
    console.log(chalk.cyan('  template save <name>    - حفظ مشروع كقالب'));
    console.log(chalk.cyan('  template delete <name>  - حذف قالب مخصص'));
    console.log(chalk.cyan('  template search <query> - البحث في القوالب'));
  });

// أمر عرض القوالب
program
  .command('template-list')
  .alias('templates')
  .description('عرض جميع القوالب المتاحة')
  .action(async () => {
    try {
      const templateManager = createTemplateManager();
      await templateManager.listTemplates();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض تفاصيل قالب
program
  .command('template-show <name>')
  .description('عرض تفاصيل قالب محدد')
  .action(async (name: string) => {
    try {
      const templateManager = createTemplateManager();
      await templateManager.showTemplateDetails(name);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إنشاء مشروع من قالب
program
  .command('template-create <templateName> <projectName>')
  .description('إنشاء مشروع جديد من قالب')
  .option('-o, --output <dir>', 'مجلد الإخراج')
  .option(
    '-v, --var <key=value>',
    'تعيين متغير',
    (value, previous: Record<string, string> = {}) => {
      const [key, val] = value.split('=');
      previous[key] = val;
      return previous;
    }
  )
  .option('--no-git', 'عدم تهيئة Git')
  .option('--install', 'تثبيت المكتبات تلقائياً')
  .action(async (templateName: string, projectName: string, options: any) => {
    try {
      const templateManager = createTemplateManager();

      await templateManager.createFromTemplate(templateName, {
        projectName,
        outputDir: options.output,
        variables: options.var || {},
        initGit: options.git !== false,
        installDeps: options.install,
      });
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر حفظ مشروع كقالب
program
  .command('template-save <name>')
  .description('حفظ مشروع حالي كقالب')
  .option('-p, --path <path>', 'مسار المشروع', '.')
  .option('-d, --description <desc>', 'وصف القالب', 'Custom template')
  .option('-l, --language <lang>', 'لغة البرمجة', 'typescript')
  .option(
    '-c, --category <cat>',
    'فئة القالب (backend/frontend/fullstack/library/cli/other)',
    'other'
  )
  .action(async (name: string, options: any) => {
    try {
      const templateManager = createTemplateManager();

      await templateManager.createTemplateFromProject(options.path, name, options.description, {
        language: options.language,
        category: options.category,
        variables: [],
      });
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر حذف قالب مخصص
program
  .command('template-delete <name>')
  .description('حذف قالب مخصص')
  .action(async (name: string) => {
    try {
      const templateManager = createTemplateManager();

      // تأكيد الحذف
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `هل أنت متأكد من حذف القالب "${name}"؟`,
          default: false,
        },
      ]);

      if (answers.confirm) {
        await templateManager.deleteTemplate(name);
      } else {
        console.log(chalk.yellow('⚠️  تم إلغاء الحذف'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر البحث في القوالب
program
  .command('template-search <query>')
  .description('البحث في القوالب')
  .action(async (query: string) => {
    try {
      const templateManager = createTemplateManager();
      const results = await templateManager.searchTemplates(query);
      templateManager.displaySearchResults(results, query);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تنفيذ الكود المحسن (Multi-language Support)
program
  .command('run <file>')
  .description('تنفيذ ملف كود (يدعم: JS, TS, Python, Go, Rust, Ruby, PHP)')
  .option('--args <args...>', 'معاملات إضافية للملف')
  .action(async (file: string, options: any) => {
    try {
      const executor = createEnhancedExecutor();
      const args = options.args || [];
      await executor.executeFile(file, args);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر بناء المشروع
program
  .command('build')
  .description('بناء المشروع')
  .option('-l, --language <lang>', 'اللغة (typescript, go, rust, etc.)')
  .action(async (options: any) => {
    try {
      const executor = createEnhancedExecutor();
      await executor.buildProject(options.language);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تنسيق الكود (Formatting)
program
  .command('format <files...>')
  .description('تنسيق ملفات الكود')
  .action(async (files: string[]) => {
    try {
      const executor = createEnhancedExecutor();

      for (const file of files) {
        await executor.formatFile(file);
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر فحص الكود (Linting)
program
  .command('lint <files...>')
  .description('فحص ملفات الكود')
  .option('--fix', 'إصلاح المشاكل تلقائياً')
  .action(async (files: string[], options: any) => {
    try {
      const executor = createEnhancedExecutor();

      for (const file of files) {
        await executor.lintFile(file, options.fix);
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تنسيق وفحص معاً
program
  .command('format-lint <files...>')
  .description('تنسيق وفحص ملفات الكود')
  .option('--fix', 'إصلاح المشاكل تلقائياً')
  .action(async (files: string[], options: any) => {
    try {
      const executor = createEnhancedExecutor();
      await executor.formatAndLintFiles(files, options.fix);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تشغيل الاختبارات
program
  .command('test')
  .description('تشغيل اختبارات المشروع')
  .option('-l, --language <lang>', 'اللغة (typescript, python, go, etc.)')
  .action(async (options: any) => {
    try {
      const executor = createEnhancedExecutor();
      await executor.runTests(options.language);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض اللغات المدعومة
program
  .command('languages')
  .alias('langs')
  .description('عرض اللغات المدعومة')
  .action(() => {
    try {
      const executor = createEnhancedExecutor();
      executor.listSupportedLanguages();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر التحقق من توفر أدوات اللغة
program
  .command('check-tools <language>')
  .description('التحقق من توفر أدوات اللغة')
  .action(async (language: string) => {
    try {
      const executor = createEnhancedExecutor();
      const tools = await executor.checkLanguageTools(language as any);

      console.log(chalk.cyan(`\n🔧 أدوات ${language}:\n`));
      console.log(chalk.white(`   المنفذ: ${tools.executor ? chalk.green('✓') : chalk.red('✗')}`));
      console.log(
        chalk.white(`   التنسيق: ${tools.formatter ? chalk.green('✓') : chalk.red('✗')}`)
      );
      console.log(chalk.white(`   الفحص: ${tools.linter ? chalk.green('✓') : chalk.red('✗')}`));
      console.log(
        chalk.white(`   الاختبار: ${tools.tester ? chalk.green('✓') : chalk.red('✗')}\n`)
      );
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إنشاء Pull Request
program
  .command('pr-create')
  .description('إنشاء Pull Request')
  .option('-t, --title <title>', 'عنوان PR')
  .option('-b, --body <body>', 'وصف PR')
  .option('--base <branch>', 'Base branch')
  .option('--head <branch>', 'Head branch')
  .option('--draft', 'إنشاء كـ draft')
  .option('-l, --labels <labels>', 'Labels (مفصولة بفواصل)')
  .option('--template <name>', 'استخدام قالب')
  .option('-i, --interactive', 'وضع تفاعلي')
  .action(async (options: any) => {
    try {
      const prManager = createPRManager();

      if (options.interactive) {
        await prManager.createInteractive();
      } else if (options.template) {
        const variables: Record<string, string> = {};

        // جمع المتغيرات من options
        if (options.title) variables.title = options.title;
        if (options.body) variables.description = options.body;

        await prManager.createFromTemplate(options.template, variables, {
          base: options.base,
          head: options.head,
          draft: options.draft,
          labels: options.labels ? options.labels.split(',').map((l: string) => l.trim()) : [],
        });
      } else {
        await prManager.create({
          title: options.title,
          body: options.body,
          base: options.base,
          head: options.head,
          draft: options.draft,
          labels: options.labels ? options.labels.split(',').map((l: string) => l.trim()) : [],
        });
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض Pull Requests
program
  .command('pr-list')
  .alias('prs')
  .description('عرض جميع Pull Requests')
  .option('-s, --state <state>', 'الحالة (open, closed, merged, all)', 'open')
  .option('--stats', 'عرض الإحصائيات فقط')
  .action(async (options: any) => {
    try {
      const prManager = createPRManager();

      if (options.stats) {
        await prManager.displayStats();
      } else {
        await prManager.listPRs(options.state);
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض تفاصيل PR
program
  .command('pr-view <number>')
  .description('عرض تفاصيل Pull Request')
  .action(async (number: string) => {
    try {
      const prManager = createPRManager();
      await prManager.viewPR(parseInt(number));
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر دمج PR
program
  .command('pr-merge <number>')
  .description('دمج Pull Request')
  .option('-m, --method <method>', 'طريقة الدمج (merge, squash, rebase)', 'merge')
  .action(async (number: string, options: any) => {
    try {
      const prManager = createPRManager();
      await prManager.mergePR(parseInt(number), options.method);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إغلاق PR
program
  .command('pr-close <number>')
  .description('إغلاق Pull Request')
  .action(async (number: string) => {
    try {
      const prManager = createPRManager();
      await prManager.closePR(parseInt(number));
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض قوالب PR
program
  .command('pr-templates')
  .description('عرض قوالب Pull Request المتاحة')
  .action(() => {
    try {
      const prManager = createPRManager();
      prManager.listTemplates();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر توثيق الردود
program
  .command('docs <action>')
  .description('إدارة توثيق ردود AI')
  .action(async (action: string) => {
    try {
      const docManager = createAIDocumentation();

      switch (action) {
        case 'search':
          const { query } = await inquirer.prompt([
            {
              type: 'input',
              name: 'query',
              message: 'ماذا تبحث عن؟',
              validate: (input) => input.trim().length > 0 || 'الاستعلام لا يمكن أن يكون فارغاً',
            },
          ]);

          const results = await docManager.searchDocumentation(query);
          console.log(chalk.green(`\n🔍 تم العثور على ${results.length} نتيجة:\n`));

          for (const result of results.slice(0, 5)) {
            console.log(chalk.cyan(`📅 ${new Date(result.timestamp).toLocaleString('ar')}`));
            console.log(chalk.white(`   ${result.prompt.substring(0, 100)}...`));
            console.log(
              chalk.gray(
                `   ${result.filesGenerated.length} ملف، ${result.language || 'غير محدد'}\n`
              )
            );
          }
          break;

        case 'stats':
          const stats = await docManager.getStatistics();
          console.log(chalk.green('\n📊 إحصائيات التوثيق:\n'));
          console.log(chalk.white(`   إجمالي التفاعلات: ${stats.totalInteractions}`));
          console.log(chalk.white(`   متوسط وقت التنفيذ: ${stats.averageExecutionTime}ms`));

          if (stats.languagesUsed.size > 0) {
            console.log(chalk.cyan('\n   اللغات الأكثر استخداماً:'));
            for (const [lang, count] of stats.languagesUsed.entries()) {
              console.log(chalk.gray(`     ${lang}: ${count}`));
            }
          }
          break;

        case 'export':
          const { format } = await inquirer.prompt([
            {
              type: 'list',
              name: 'format',
              message: 'اختر صيغة التصدير:',
              choices: ['json', 'csv', 'markdown'],
              default: 'json',
            },
          ]);

          const exportPath = await docManager.exportDocumentation(format as any);
          console.log(chalk.green(`\n✅ تم التصدير إلى: ${exportPath}\n`));
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: search, stats, export'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إدارة الجلسات التعاونية
program
  .command('session <action>')
  .description('إدارة جلسات التعاون')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const collabManager = createCollaborativeFeatures(client);

      switch (action) {
        case 'create':
          const { name, description, membersInput } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'اسم الجلسة:',
              validate: (input) => input.trim().length > 0 || 'الاسم مطلوب',
            },
            {
              type: 'input',
              name: 'description',
              message: 'وصف الجلسة:',
            },
            {
              type: 'input',
              name: 'membersInput',
              message: 'الأعضاء (مفصولين بفواصل):',
              validate: (input) => input.trim().length > 0 || 'يجب إضافة عضو واحد على الأقل',
            },
          ]);

          const members = membersInput.split(',').map((email: string) => email.trim());
          await collabManager.createSession(name, description, members);
          break;

        case 'list':
          await collabManager.generateCollaborationReport();
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: create, list'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إدارة المراجعات
program
  .command('review <action>')
  .description('إدارة مراجعات الكود')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const collabManager = createCollaborativeFeatures(client);

      switch (action) {
        case 'create':
          const { title, description, files, reviewer } = await inquirer.prompt([
            {
              type: 'input',
              name: 'title',
              message: 'عنوان المراجعة:',
              validate: (input) => input.trim().length > 0 || 'العنوان مطلوب',
            },
            {
              type: 'input',
              name: 'description',
              message: 'وصف المراجعة:',
            },
            {
              type: 'input',
              name: 'files',
              message: 'الملفات للمراجعة (مفصولة بفواصل):',
              validate: (input) => input.trim().length > 0 || 'يجب تحديد ملف واحد على الأقل',
            },
            {
              type: 'input',
              name: 'reviewer',
              message: 'اسم المراجع:',
              validate: (input) => input.trim().length > 0 || 'اسم المراجع مطلوب',
            },
          ]);

          const filesList = files.split(',').map((file: string) => file.trim());
          await collabManager.createCodeReview(title, description, filesList, reviewer);
          break;

        case 'list':
          console.log(chalk.green('\n📋 المراجعات المعلقة:\n'));
          console.log(
            chalk.yellow('   استخدم: oqool-code review comment <id> <file> <line> <type> <comment>')
          );
          console.log(chalk.yellow('   لإضافة تعليقات للمراجعة\n'));
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: create, list, comment'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إدارة الأمان
program
  .command('security <action>')
  .description('إدارة الأمان المتقدم')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const securityManager = createSecurityEnhancements(client);

      switch (action) {
        case 'scan':
          const { file } = await inquirer.prompt([
            {
              type: 'input',
              name: 'file',
              message: 'الملف لفحصه:',
              validate: (input) => input.trim().length > 0 || 'مسار الملف مطلوب',
            },
          ]);

          const scanResult = await securityManager.scanBeforeExecution(file);
          console.log(
            chalk.green(`\n🔍 نتيجة الفحص: ${scanResult.safe ? '✅ آمن' : '❌ غير آمن'}`)
          );
          console.log(chalk.cyan(`   الدرجة: ${scanResult.score}/100`));

          if (scanResult.issues.length > 0) {
            console.log(chalk.yellow('\n   المشاكل المكتشفة:'));
            for (const issue of scanResult.issues) {
              const severity =
                issue.severity === 'critical'
                  ? '🔴'
                  : issue.severity === 'high'
                    ? '🟠'
                    : issue.severity === 'medium'
                      ? '🟡'
                      : '🟢';
              console.log(`${severity} ${issue.description}`);
            }
          }
          break;

        case 'deps':
          await securityManager.scanDependencies();
          break;

        case 'sign':
          const { signFile, author } = await inquirer.prompt([
            {
              type: 'input',
              name: 'signFile',
              message: 'الملف لتوقيعه:',
              validate: (input) => input.trim().length > 0 || 'مسار الملف مطلوب',
            },
            {
              type: 'input',
              name: 'author',
              message: 'اسم المؤلف:',
              default: 'Oqool User',
            },
          ]);

          await securityManager.signCode(signFile, author);
          break;

        case 'encrypt':
          const { encryptFile, key } = await inquirer.prompt([
            {
              type: 'input',
              name: 'encryptFile',
              message: 'الملف لتشفيره:',
              validate: (input) => input.trim().length > 0 || 'مسار الملف مطلوب',
            },
            {
              type: 'input',
              name: 'key',
              message: 'مفتاح التشفير (اتركه فارغاً لتوليد مفتاح عشوائي):',
            },
          ]);

          const encryptedPath = await securityManager.encryptSensitiveFile(
            encryptFile,
            key || undefined
          );
          console.log(chalk.green(`\n🔐 تم التشفير: ${encryptedPath}\n`));
          break;

        case 'report':
          await securityManager.generateSecurityReport();
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: scan, deps, sign, encrypt, report'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إنشاء قوالب الفريق
program
  .command('team-template <action>')
  .description('إدارة قوالب الفريق')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const collabManager = createCollaborativeFeatures(client);

      switch (action) {
        case 'create':
          const { name, description, category, files, tags } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'اسم القالب:',
              validate: (input) => input.trim().length > 0 || 'الاسم مطلوب',
            },
            {
              type: 'input',
              name: 'description',
              message: 'وصف القالب:',
            },
            {
              type: 'list',
              name: 'category',
              message: 'الفئة:',
              choices: ['backend', 'frontend', 'fullstack', 'library', 'cli', 'other'],
              default: 'other',
            },
            {
              type: 'input',
              name: 'files',
              message: 'الملفات للقالب (مفصولة بفواصل):',
              validate: (input) => input.trim().length > 0 || 'يجب تحديد ملف واحد على الأقل',
            },
            {
              type: 'input',
              name: 'tags',
              message: 'العلامات (مفصولة بفواصل):',
            },
          ]);

          const filesList = files.split(',').map((file: string) => file.trim());
          const tagsList = tags ? tags.split(',').map((tag: string) => tag.trim()) : [];

          await collabManager.createTeamTemplate(name, description, category, filesList, tagsList);
          break;

        case 'search':
          const { query } = await inquirer.prompt([
            {
              type: 'input',
              name: 'query',
              message: 'ماذا تبحث عن؟',
              validate: (input) => input.trim().length > 0 || 'الاستعلام مطلوب',
            },
          ]);

          const results = await collabManager.searchTeamTemplates(query);
          console.log(chalk.green(`\n🔍 تم العثور على ${results.length} قالب:\n`));

          for (const template of results.slice(0, 5)) {
            console.log(chalk.cyan(`📋 ${template.name}`));
            console.log(chalk.white(`   ${template.description}`));
            console.log(
              chalk.gray(
                `   الفئة: ${template.category} | الملفات: ${template.files.length} | الاستخدام: ${template.usageCount}\n`
              )
            );
          }
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: create, search'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إدارة فرق AI متعددة الشخصيات
program
  .command('team <action>')
  .description('إدارة فرق AI متعددة الشخصيات')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const teamManager = createMultiPersonalityAITeam(client);

      switch (action) {
        case 'create':
          const { name, description, projectType, complexity } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'اسم الفريق:',
              validate: (input) => input.trim().length > 0 || 'الاسم مطلوب',
            },
            {
              type: 'input',
              name: 'description',
              message: 'وصف الفريق:',
            },
            {
              type: 'input',
              name: 'projectType',
              message: 'نوع المشروع:',
              default: 'web-application',
            },
            {
              type: 'list',
              name: 'complexity',
              message: 'مستوى التعقيد:',
              choices: ['simple', 'moderate', 'complex', 'enterprise'],
              default: 'moderate',
            },
          ]);

          await teamManager.createTeam(name, description, projectType, complexity);
          break;

        case 'list':
          await teamManager.listTeams();
          break;

        case 'personalities':
          await teamManager.listPersonalities();
          break;

        case 'discuss':
          const teams = await teamManager.getAllTeams();
          if (teams.length === 0) {
            console.log(chalk.yellow('❌ لا توجد فرق متاحة'));
            break;
          }

          const { teamId, topic, prompt } = await inquirer.prompt([
            {
              type: 'input',
              name: 'teamId',
              message: 'معرف الفريق:',
              validate: (input) => input.trim().length > 0 || 'معرف الفريق مطلوب',
            },
            {
              type: 'input',
              name: 'topic',
              message: 'موضوع النقاش:',
            },
            {
              type: 'input',
              name: 'prompt',
              message: 'السؤال أو الموضوع للنقاش:',
            },
          ]);

          await teamManager.startTeamDiscussion(teamId, topic, prompt);
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: create, list, personalities, discuss'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إدارة الذكاء الجماعي
program
  .command('collective <action>')
  .description('إدارة الذكاء الجماعي')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const collectiveManager = createCollectiveIntelligenceSystem(client);

      switch (action) {
        case 'create':
          const { topic, question } = await inquirer.prompt([
            {
              type: 'input',
              name: 'topic',
              message: 'الموضوع:',
              validate: (input) => input.trim().length > 0 || 'الموضوع مطلوب',
            },
            {
              type: 'input',
              name: 'question',
              message: 'السؤال:',
            },
          ]);

          const options = [
            { title: 'خيار 1', description: 'الوصف الأول', pros: ['مميزة 1'], cons: ['عيب 1'] },
            { title: 'خيار 2', description: 'الوصف الثاني', pros: ['مميزة 2'], cons: ['عيب 2'] },
            { title: 'خيار 3', description: 'الوصف الثالث', pros: ['مميزة 3'], cons: ['عيب 3'] },
          ];

          await collectiveManager.createCollectiveDecision(topic, question, options);
          break;

        case 'decide':
          const decisions = await collectiveManager.getAllDecisions();
          if (decisions.length === 0) {
            console.log(chalk.yellow('❌ لا توجد قرارات جماعية'));
            break;
          }

          const { decisionId } = await inquirer.prompt([
            {
              type: 'input',
              name: 'decisionId',
              message: 'معرف القرار:',
              validate: (input) => input.trim().length > 0 || 'معرف القرار مطلوب',
            },
          ]);

          await collectiveManager.collectOpinions(decisionId);
          break;

        case 'list':
          await collectiveManager.listDecisions();
          break;

        case 'cluster':
          const { clusterName, clusterTopic, participants } = await inquirer.prompt([
            {
              type: 'input',
              name: 'clusterName',
              message: 'اسم المجموعة:',
            },
            {
              type: 'input',
              name: 'clusterTopic',
              message: 'الموضوع:',
            },
            {
              type: 'input',
              name: 'participants',
              message: 'المشاركون (مفصولين بفواصل):',
            },
          ]);

          const participantList = participants.split(',').map((name: string) => ({
            id: name.trim(),
            name: name.trim(),
            type: 'ai' as const,
            expertise: ['general'],
            influence: 0.5,
            reliability: 0.8,
          }));

          await collectiveManager.createIntelligenceCluster(
            clusterName,
            clusterTopic,
            participantList
          );
          break;

        case 'knowledge':
          const clusters = await collectiveManager.getAllClusters();
          if (clusters.length === 0) {
            console.log(chalk.yellow('❌ لا توجد مجموعات ذكاء'));
            break;
          }

          const { clusterId, content, source, tags } = await inquirer.prompt([
            {
              type: 'input',
              name: 'clusterId',
              message: 'معرف المجموعة:',
            },
            {
              type: 'input',
              name: 'content',
              message: 'المحتوى:',
            },
            {
              type: 'input',
              name: 'source',
              message: 'المصدر:',
            },
            {
              type: 'input',
              name: 'tags',
              message: 'العلامات (مفصولة بفواصل):',
            },
          ]);

          const tagList = tags.split(',').map((tag: string) => tag.trim());
          await collectiveManager.addKnowledge(clusterId, content, source, tagList);
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: create, decide, list, cluster, knowledge'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إدارة DNA الكود
program
  .command('dna <action>')
  .description('إدارة DNA الكود')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const dnaManager = createCodeDNASystem(client);

      switch (action) {
        case 'extract':
          const { file } = await inquirer.prompt([
            {
              type: 'input',
              name: 'file',
              message: 'الملف لاستخراج DNA:',
              validate: (input) => input.trim().length > 0 || 'مسار الملف مطلوب',
            },
          ]);

          await dnaManager.extractCodeDNA(file);
          break;

        case 'compare':
          const { file1, file2 } = await inquirer.prompt([
            {
              type: 'input',
              name: 'file1',
              message: 'الملف الأول:',
              validate: (input) => input.trim().length > 0 || 'مسار الملف الأول مطلوب',
            },
            {
              type: 'input',
              name: 'file2',
              message: 'الملف الثاني:',
              validate: (input) => input.trim().length > 0 || 'مسار الملف الثاني مطلوب',
            },
          ]);

          await dnaManager.compareCodeDNA(file1, file2);
          break;

        case 'list':
          await dnaManager.listCodeDNA();
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: extract, compare, list'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر النظام الصوتي
program
  .command('voice <action>')
  .description('إدارة النظام الصوتي')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const voiceManager = createVoiceFirstInterface(client);

      switch (action) {
        case 'start':
          await voiceManager.startVoiceSession();
          break;

        case 'config':
          const configOptions = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'enable',
              message: 'تفعيل النظام الصوتي؟',
              default: false,
            },
            {
              type: 'list',
              name: 'language',
              message: 'اللغة:',
              choices: ['ar', 'en', 'mixed'],
              default: 'ar',
              when: (answers) => answers.enable,
            },
            {
              type: 'list',
              name: 'voice',
              message: 'نوع الصوت:',
              choices: ['male', 'female', 'neutral'],
              default: 'neutral',
              when: (answers) => answers.enable,
            },
            {
              type: 'number',
              name: 'speed',
              message: 'سرعة الكلام (0.5-2.0):',
              min: 0.5,
              max: 2.0,
              default: 1.0,
              when: (answers) => answers.enable,
            },
            {
              type: 'number',
              name: 'pitch',
              message: 'نبرة الصوت (0.5-2.0):',
              min: 0.5,
              max: 2.0,
              default: 1.0,
              when: (answers) => answers.enable,
            },
          ]);

          await voiceManager.configureVoice(configOptions);
          break;

        case 'train':
          await voiceManager.trainVoiceSystem();
          break;

        case 'sessions':
          await voiceManager.listVoiceSessions();
          break;

        case 'stats':
          await voiceManager.getVoiceStats();
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: start, config, train, sessions, stats'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر الذكاء الاصطناعي المتقدم
program
  .command('ai-team <action>')
  .description('فرق AI المتقدمة')
  .action(async (action: string) => {
    try {
      const client = await createClientFromConfig();
      if (!client) return;

      const teamManager = createMultiPersonalityAITeam(client);
      const collectiveManager = createCollectiveIntelligenceSystem(client);

      switch (action) {
        case 'personality':
          await teamManager.listPersonalities();
          break;

        case 'brainstorm':
          const { topic } = await inquirer.prompt([
            {
              type: 'input',
              name: 'topic',
              message: 'موضوع العصف الذهني:',
              validate: (input) => input.trim().length > 0 || 'الموضوع مطلوب',
            },
          ]);

          const options = [
            {
              title: 'الحل التقليدي',
              description: 'الحل المعتاد والمستخدم',
              pros: ['مختبر', 'موثوق'],
              cons: ['غير مبتكر'],
            },
            {
              title: 'الحل الإبداعي',
              description: 'حل جديد ومبتكر',
              pros: ['مبتكر', 'مميز'],
              cons: ['مخاطر', 'تعقيد'],
            },
            {
              title: 'الحل التقني',
              description: 'حل يعتمد على التقنية المتقدمة',
              pros: ['متقدم', 'قابل للتطوير'],
              cons: ['تعقيد', 'تكلفة'],
            },
          ];

          await collectiveManager.createCollectiveDecision(
            topic,
            'ما هو أفضل حل لهذا الموضوع؟',
            options
          );
          break;

        case 'debate':
          const teams = await teamManager.getAllTeams();
          if (teams.length === 0) {
            console.log(chalk.yellow('❌ لا توجد فرق AI'));
            console.log(chalk.cyan('💡 أنشئ فريق أولاً: oqool-code team create'));
            break;
          }

          const { teamId, debateTopic } = await inquirer.prompt([
            {
              type: 'input',
              name: 'teamId',
              message: 'معرف الفريق:',
            },
            {
              type: 'input',
              name: 'debateTopic',
              message: 'موضوع المناقشة:',
            },
          ]);

          await teamManager.startTeamDiscussion(teamId, debateTopic, debateTopic);
          break;

        default:
          console.log(chalk.yellow('الأوامر المتاحة: personality, brainstorm, debate'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ========================================
// أوامر توليد التوثيق (Documentation)
// ========================================

// أمر توليد التوثيق
program
  .command('generate-docs <files...>')
  .alias('docs')
  .description('توليد توثيق تلقائي للملفات')
  .option('-f, --format <format>', 'تنسيق التوثيق (markdown, html, json)', 'markdown')
  .option('--ai', 'استخدام AI لتحسين التوثيق')
  .option('--no-examples', 'عدم تضمين أمثلة')
  .option('-o, --output <dir>', 'مجلد الإخراج', 'docs')
  .option('-l, --language <lang>', 'اللغة (ar, en)', 'ar')
  .option('--level <level>', 'مستوى التفصيل (basic, detailed, comprehensive)', 'detailed')
  .action(async (files: string[], options: any) => {
    try {
      const docsGenerator = createDocsGenerator(process.cwd());

      ui.startSpinner('توليد التوثيق...');

      const result = await docsGenerator.generateDocs(files, {
        format: options.format,
        useAI: options.ai,
        includeExamples: options.examples !== false,
        outputDir: options.output,
        language: options.language,
        level: options.level,
      });

      if (result.success) {
        ui.succeedSpinner('تم توليد التوثيق بنجاح!');
        console.log(chalk.green(`\n✅ الإحصائيات:`));
        console.log(chalk.white(`   📄 الملفات: ${result.stats.filesProcessed}`));
        console.log(chalk.white(`   ⚙️  الدوال: ${result.stats.functionsDocumented}`));
        console.log(chalk.white(`   📦 الكلاسات: ${result.stats.classesDocumented}`));
        console.log(chalk.white(`   📝 الأسطر: ${result.stats.linesGenerated}`));
        if (result.outputPath) {
          console.log(chalk.cyan(`\n📁 الملف: ${result.outputPath}\n`));
        }
      } else {
        ui.failSpinner('فشل توليد التوثيق');
        if (result.errors && result.errors.length > 0) {
          console.log(chalk.red('\n❌ الأخطاء:'));
          result.errors.forEach((err) => console.log(chalk.red(`   - ${err}`)));
        }
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إضافة JSDoc للملفات
program
  .command('add-jsdoc <files...>')
  .description('إضافة تعليقات JSDoc للملفات')
  .option('--ai', 'استخدام AI للتعليقات')
  .option('-l, --language <lang>', 'اللغة (ar, en)', 'ar')
  .action(async (files: string[], options: any) => {
    try {
      const docsGenerator = createDocsGenerator(process.cwd());

      ui.startSpinner('إضافة JSDoc...');

      const result = await docsGenerator.addJSDocComments(files, {
        useAI: options.ai,
        language: options.language,
      });

      if (result.success) {
        ui.succeedSpinner('تم إضافة JSDoc بنجاح!');
        console.log(chalk.green(`\n✅ تم تعديل ${result.filesModified} ملف\n`));
      } else {
        ui.failSpinner('فشل إضافة JSDoc');
        if (result.errors && result.errors.length > 0) {
          console.log(chalk.red('\n❌ الأخطاء:'));
          result.errors.forEach((err) => console.log(chalk.red(`   - ${err}`)));
        }
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ========================================
// أوامر توليد الاختبارات (Tests)
// ========================================

// أمر توليد الاختبارات
program
  .command('generate-tests <files...>')
  .alias('gen-tests')
  .description('توليد اختبارات تلقائية للملفات')
  .option('-f, --framework <framework>', 'إطار الاختبار (jest, mocha, vitest, ava)', 'jest')
  .option('-t, --type <type>', 'نوع الاختبار (unit, integration, e2e)', 'unit')
  .option('--ai', 'استخدام AI لتوليد حالات ذكية')
  .option('--no-mocks', 'عدم توليد mocks')
  .option('--no-edge-cases', 'عدم تضمين edge cases')
  .option('-o, --output <dir>', 'مجلد الإخراج', '__tests__')
  .option('-l, --language <lang>', 'اللغة (ar, en)', 'ar')
  .action(async (files: string[], options: any) => {
    try {
      const testGenerator = createTestGenerator(process.cwd());

      ui.startSpinner('توليد الاختبارات...');

      const result = await testGenerator.generateTests(files, {
        framework: options.framework,
        type: options.type,
        useAI: options.ai,
        generateMocks: options.mocks !== false,
        includeEdgeCases: options.edgeCases !== false,
        outputDir: options.output,
        language: options.language,
      });

      if (result.success) {
        ui.succeedSpinner('تم توليد الاختبارات بنجاح!');
        console.log(chalk.green(`\n✅ الإحصائيات:`));
        console.log(chalk.white(`   📄 الملفات: ${result.testsGenerated}`));
        console.log(chalk.white(`   ⚙️  الدوال: ${result.coverage.functions}`));
        console.log(chalk.white(`   📦 الكلاسات: ${result.coverage.classes}`));
        console.log(chalk.cyan(`\n📁 المجلد: ${options.output}\n`));
      } else {
        ui.failSpinner('فشل توليد الاختبارات');
        if (result.errors && result.errors.length > 0) {
          console.log(chalk.red('\n❌ الأخطاء:'));
          result.errors.forEach((err) => console.log(chalk.red(`   - ${err}`)));
        }
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إنشاء ملف إعدادات الاختبارات
program
  .command('test-config <framework>')
  .description('إنشاء ملف إعدادات للاختبارات')
  .option('-o, --output <dir>', 'مجلد الإخراج', '.')
  .action(async (framework: string, options: any) => {
    try {
      const testGenerator = createTestGenerator(process.cwd());

      ui.startSpinner('إنشاء ملف الإعدادات...');

      const configPath = await testGenerator.generateTestConfig(framework as any, options.output);

      ui.succeedSpinner('تم إنشاء ملف الإعدادات!');
      console.log(chalk.cyan(`\n📁 الملف: ${configPath}\n`));
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تشغيل الاختبارات المولدة
program
  .command('run-tests [framework]')
  .description('تشغيل الاختبارات')
  .action(async (framework?: string) => {
    try {
      const testGenerator = createTestGenerator(process.cwd());

      ui.startSpinner('تشغيل الاختبارات...');

      const result = await testGenerator.runTests((framework as any) || 'jest');

      if (result.success) {
        ui.succeedSpinner('نجحت الاختبارات!');
        console.log(chalk.green('\n✅ النتيجة:'));
        console.log(chalk.white(result.output));
      } else {
        ui.failSpinner('فشلت الاختبارات');
        console.log(chalk.red('\n❌ النتيجة:'));
        console.log(chalk.red(result.output));
      }
    } catch (error: any) {
      ui.failSpinner('حدث خطأ');
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ========================================
// أوامر معالج الإعدادات (Config Wizard)
// ========================================

// أمر بدء معالج الإعدادات التفاعلي
program
  .command('config-init')
  .alias('config-wizard')
  .description('معالج تفاعلي لإعداد المشروع')
  .option('-l, --language <lang>', 'اللغة (ar, en)', 'ar')
  .action(async (options: any) => {
    try {
      const wizard = createConfigWizard(process.cwd());
      const result = await wizard.start(options.language);

      if (result.success) {
        console.log(chalk.green(`\n${result.message}\n`));
      } else {
        console.log(chalk.red(`\n${result.message}\n`));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إعداد سريع
program
  .command('config-quick <preset>')
  .description('إعداد سريع (minimal, recommended, full)')
  .option('-l, --language <lang>', 'اللغة (ar, en)', 'ar')
  .action(async (preset: string, options: any) => {
    try {
      const wizard = createConfigWizard(process.cwd());
      const result = await wizard.quickSetup(preset as any, options.language);

      if (result.success) {
        console.log(chalk.green(`\n${result.message}\n`));
      } else {
        console.log(chalk.red(`\n${result.message}\n`));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض الإعدادات الحالية
program
  .command('config-show')
  .description('عرض الإعدادات الحالية')
  .option('-l, --language <lang>', 'اللغة (ar, en)', 'ar')
  .action(async (options: any) => {
    try {
      const wizard = createConfigWizard(process.cwd());
      await wizard.showConfig(options.language);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر التحقق من صحة الإعدادات
program
  .command('config-validate')
  .description('التحقق من صحة الإعدادات')
  .action(async () => {
    try {
      const wizard = createConfigWizard(process.cwd());
      const result = await wizard.validateConfig();

      if (result.valid) {
        console.log(chalk.green('\n✅ الإعدادات صحيحة!\n'));
      } else {
        console.log(chalk.red('\n❌ الإعدادات غير صحيحة:\n'));
        result.errors.forEach((err) => console.log(chalk.red(`   - ${err}`)));
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  تحذيرات:\n'));
        result.warnings.forEach((warn) => console.log(chalk.yellow(`   - ${warn}`)));
      }
      console.log();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تصدير الإعدادات
program
  .command('config-export <format>')
  .description('تصدير الإعدادات (json, yaml, env)')
  .option('-o, --output <file>', 'ملف الإخراج')
  .action(async (format: string, options: any) => {
    try {
      const wizard = createConfigWizard(process.cwd());
      const content = await wizard.exportConfig(format as any);

      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, content, 'utf-8');
        console.log(chalk.green(`\n✅ تم التصدير إلى: ${options.output}\n`));
      } else {
        console.log(content);
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ========================================
// أوامر متتبع التقدم (Progress Tracker)
// ========================================

// أمر إنشاء مهمة جديدة
program
  .command('task-create <title>')
  .description('إنشاء مهمة جديدة')
  .option('-d, --description <desc>', 'وصف المهمة')
  .option('-p, --priority <priority>', 'الأولوية (low, medium, high, critical)', 'medium')
  .option('-e, --estimate <hours>', 'الوقت المقدر بالساعات')
  .option('-t, --tags <tags>', 'الوسوم (مفصولة بفواصل)')
  .option('-a, --assignee <name>', 'المسؤول')
  .action(async (title: string, options: any) => {
    try {
      const tracker = createProgressTracker(process.cwd());
      await tracker.initialize();

      const task = await tracker.createTask(title, {
        description: options.description,
        priority: options.priority,
        estimatedHours: options.estimate ? parseFloat(options.estimate) : undefined,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [],
        assignee: options.assignee,
      });

      console.log(chalk.green('\n✅ تم إنشاء المهمة!'));
      console.log(chalk.white(`   ID: ${task.id}`));
      console.log(chalk.white(`   العنوان: ${task.title}`));
      console.log(chalk.white(`   الأولوية: ${task.priority}\n`));
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض المهام
program
  .command('task-list')
  .alias('tasks')
  .description('عرض جميع المهام')
  .option('-s, --status <status>', 'الحالة (pending, in_progress, completed, blocked, cancelled)')
  .option('-p, --priority <priority>', 'الأولوية (low, medium, high, critical)')
  .option('-t, --tag <tag>', 'الوسم')
  .option('-a, --assignee <name>', 'المسؤول')
  .action(async (options: any) => {
    try {
      const tracker = createProgressTracker(process.cwd());
      await tracker.initialize();

      const tasks = tracker.getAllTasks({
        status: options.status,
        priority: options.priority,
        tag: options.tag,
        assignee: options.assignee,
      });

      if (tasks.length === 0) {
        console.log(chalk.yellow('\n⚠️  لا توجد مهام\n'));
        return;
      }

      console.log(chalk.cyan(`\n📋 المهام (${tasks.length}):\n`));

      for (const task of tasks) {
        const statusIcon =
          task.status === 'completed'
            ? '✅'
            : task.status === 'in_progress'
              ? '⏳'
              : task.status === 'blocked'
                ? '🚫'
                : task.status === 'cancelled'
                  ? '❌'
                  : '📝';

        const priorityColor =
          task.priority === 'critical'
            ? chalk.red
            : task.priority === 'high'
              ? chalk.yellow
              : task.priority === 'medium'
                ? chalk.cyan
                : chalk.gray;

        console.log(`${statusIcon} ${chalk.white(task.title)}`);
        console.log(`   ${chalk.gray(`ID: ${task.id}`)}`);
        console.log(
          `   ${priorityColor(`الأولوية: ${task.priority}`)} | ${chalk.white(`التقدم: ${task.progress}%`)}`
        );
        if (task.assignee) {
          console.log(`   ${chalk.white(`المسؤول: ${task.assignee}`)}`);
        }
        console.log();
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تحديث حالة المهمة
program
  .command('task-update <taskId> <status>')
  .description('تحديث حالة المهمة (pending, in_progress, completed, blocked, cancelled)')
  .action(async (taskId: string, status: string) => {
    try {
      const tracker = createProgressTracker(process.cwd());
      await tracker.initialize();

      await tracker.updateTaskStatus(taskId, status as any);

      console.log(chalk.green(`\n✅ تم تحديث المهمة إلى: ${status}\n`));
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تحديث تقدم المهمة
program
  .command('task-progress <taskId> <progress>')
  .description('تحديث تقدم المهمة (0-100)')
  .action(async (taskId: string, progress: string) => {
    try {
      const tracker = createProgressTracker(process.cwd());
      await tracker.initialize();

      await tracker.updateTaskProgress(taskId, parseInt(progress));

      console.log(chalk.green(`\n✅ تم تحديث التقدم إلى: ${progress}%\n`));
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إنشاء milestone
program
  .command('milestone-create <name>')
  .description('إنشاء milestone جديد')
  .option('-d, --description <desc>', 'الوصف')
  .option('--due <date>', 'التاريخ المستهدف (YYYY-MM-DD)')
  .action(async (name: string, options: any) => {
    try {
      const tracker = createProgressTracker(process.cwd());
      await tracker.initialize();

      let dueDate: number | undefined;
      if (options.due) {
        dueDate = new Date(options.due).getTime();
      }

      const milestone = await tracker.createMilestone(name, {
        description: options.description,
        dueDate,
      });

      console.log(chalk.green('\n✅ تم إنشاء Milestone!'));
      console.log(chalk.white(`   ID: ${milestone.id}`));
      console.log(chalk.white(`   الاسم: ${milestone.name}\n`));
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر توليد تقرير التقدم
program
  .command('progress-report')
  .description('توليد تقرير التقدم')
  .option('-f, --format <format>', 'التنسيق (json, markdown, html)', 'markdown')
  .option('-o, --output <file>', 'ملف الإخراج')
  .action(async (options: any) => {
    try {
      const tracker = createProgressTracker(process.cwd());
      await tracker.initialize();

      const output = await tracker.exportReport(options.format, options.output);

      if (options.output) {
        console.log(chalk.green(`\n✅ تم حفظ التقرير في: ${output}\n`));
      } else {
        console.log(output);
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض ملخص التقدم
program
  .command('progress-show')
  .alias('progress')
  .description('عرض ملخص التقدم')
  .action(async () => {
    try {
      const tracker = createProgressTracker(process.cwd());
      await tracker.initialize();

      await tracker.showSummary();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ============================================
// 🔥 GOD MODE - الوضع الخارق
// ============================================

program
  .command('god <task>')
  .description('🚀 God Mode - بناء مشروع كامل بذكاء خارق')
  .option('-o, --output <path>', 'مسار المشروع', './god-mode-project')
  .action(async (task: string, options: any) => {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log(chalk.red('\n❌ ANTHROPIC_API_KEY غير موجود في .env\n'));
        return;
      }

      const godMode = createGodMode({
        apiKey: process.env.ANTHROPIC_API_KEY,
        outputPath: options.output,
        verbose: true,
      });

      const result = await godMode.execute(task);

      // عرض النتائج
      console.log(chalk.bold.green('\n🎉 God Mode Complete!\n'));
      console.log(chalk.cyan('📊 Statistics:'));
      console.log(chalk.white(`   Files: ${result.analytics.filesGenerated}`));
      console.log(chalk.white(`   Lines: ${result.analytics.linesOfCode}`));
      console.log(
        chalk.white(
          `   Tests: ${result.analytics.testsCreated} (${result.analytics.testsPassed} passed)`
        )
      );
      console.log(chalk.white(`   Security Score: ${result.security.score}/100`));
      console.log(chalk.white(`   Quality Score: ${result.review.score}/100`));
      console.log(chalk.white(`   Duration: ${(result.duration / 1000).toFixed(2)}s`));
      console.log(chalk.cyan(`\n📁 Project: ${result.projectPath}\n`));

      console.log(chalk.yellow('🚀 Quick Start:'));
      console.log(chalk.white(`   cd ${result.projectPath}`));
      console.log(chalk.white(`   npm install`));
      console.log(chalk.white(`   npm start\n`));

      // حفظ في Analytics
      const analytics = createAnalytics(process.cwd());
      await analytics.trackUsage({
        command: 'god',
        timestamp: Date.now(),
        duration: result.duration,
        success: true,
      });

      // حفظ في Library
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      if (result.code.files.length > 0) {
        await library.saveSnippet(
          `god-${Date.now()}`,
          result.code.files[0].content,
          ['god-mode', ...result.architecture.tags],
          `God Mode: ${task}`
        );
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌ God Mode failed:'), error.message);
    }
  });

// ============================================
// 📊 Analytics Commands
// ============================================

// أمر عرض التحليلات
program
  .command('analytics')
  .alias('stats')
  .description('عرض تحليلات الاستخدام')
  .action(async () => {
    try {
      const analytics = createAnalytics(process.cwd());
      await analytics.showAnalytics();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر تصدير البيانات
program
  .command('analytics-export')
  .description('تصدير بيانات التحليلات')
  .option('-f, --format <format>', 'التنسيق (json, csv)', 'json')
  .option('-o, --output <file>', 'ملف الإخراج')
  .action(async (options: any) => {
    try {
      const analytics = createAnalytics(process.cwd());
      const data = await analytics.exportData(options.format);

      if (options.output) {
        const fs = await import('fs-extra');
        await fs.writeFile(options.output, data);
        console.log(chalk.green(`\n✅ تم التصدير إلى: ${options.output}\n`));
      } else {
        console.log(data);
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إعادة تعيين التحليلات
program
  .command('analytics-reset')
  .description('إعادة تعيين بيانات التحليلات')
  .action(async () => {
    try {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'هل أنت متأكد من إعادة تعيين جميع البيانات؟',
          default: false,
        },
      ]);

      if (confirm) {
        const analytics = createAnalytics(process.cwd());
        await analytics.reset();
      } else {
        console.log(chalk.yellow('\n⚠️ تم الإلغاء\n'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ============================================
// 🧠 Self-Learning System Commands
// ============================================

// أمر عرض إحصائيات التعلم
program
  .command('learning-stats')
  .alias('learn')
  .description('عرض إحصائيات نظام التعلم الذاتي')
  .action(async () => {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log(chalk.red('\n❌ ANTHROPIC_API_KEY غير موجود في .env\n'));
        return;
      }

      const learning = createSelfLearningSystem(process.env.ANTHROPIC_API_KEY);
      await learning.showStats();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ============================================
// 👥 Agent Team Commands
// ============================================

// أمر تشغيل فريق Agents
program
  .command('team <task>')
  .description('تشغيل فريق Agents للعمل على مهمة')
  .option('-o, --output <path>', 'مسار حفظ النتيجة', './team-output')
  .option('-q, --quiet', 'إخفاء التفاصيل (عرض النتيجة فقط)')
  .action(async (task: string, options: any) => {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log(chalk.red('\n❌ ANTHROPIC_API_KEY غير موجود في .env\n'));
        return;
      }

      const team = createAgentTeam({
        apiKey: process.env.ANTHROPIC_API_KEY,
        verbose: !options.quiet,
      });

      // بدء التعاون
      const result = await team.collaborate(task);

      // عرض الملخص
      if (!options.quiet) {
        await team.showSummary(result);
      }

      // حفظ النتيجة
      if (options.output) {
        await team.saveResult(result, options.output);
      }

      console.log(chalk.green('\n✅ انتهى الفريق من العمل بنجاح!\n'));
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// ============================================
// 📚 Code Library Commands
// ============================================

// أمر حفظ snippet
program
  .command('snippet-save <name>')
  .description('حفظ snippet في المكتبة')
  .option('-t, --tags <tags>', 'التاجات (مفصولة بفاصلة)')
  .option('-d, --description <desc>', 'وصف الـ snippet')
  .action(async (name: string, options: any) => {
    try {
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      // طلب الكود من المستخدم
      const { code } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'code',
          message: 'اكتب الكود:',
          default: '// اكتب الكود هنا...',
        },
      ]);

      const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];

      await library.saveSnippet(name, code, tags, options.description);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر البحث في snippets
program
  .command('snippet-search <query>')
  .description('البحث في مكتبة الأكواد')
  .action(async (query: string) => {
    try {
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      await library.searchSnippets(query);
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض جميع snippets
program
  .command('snippet-list')
  .alias('snippets')
  .description('عرض جميع الـ snippets المحفوظة')
  .action(async () => {
    try {
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      await library.listAllSnippets();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر مشاركة snippet
program
  .command('snippet-share <name>')
  .description('مشاركة snippet مع المجتمع')
  .action(async (name: string) => {
    try {
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      const sharedPath = await library.shareSnippet(name);

      if (sharedPath) {
        console.log(chalk.green('\n✅ جاهز للمشاركة!'));
        console.log(chalk.cyan(`\n📤 يمكنك الآن مشاركة هذا الملف:\n   ${sharedPath}\n`));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر حذف snippet
program
  .command('snippet-delete <name>')
  .description('حذف snippet من المكتبة')
  .action(async (name: string) => {
    try {
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `هل أنت متأكد من حذف "${name}"؟`,
          default: false,
        },
      ]);

      if (confirm) {
        await library.deleteSnippet(name);
      } else {
        console.log(chalk.yellow('\n⚠️ تم إلغاء الحذف\n'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر عرض snippet محدد
program
  .command('snippet-show <name>')
  .description('عرض محتوى snippet')
  .action(async (name: string) => {
    try {
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      const snippet = await library.getSnippet(name);

      if (snippet) {
        console.log(chalk.cyan(`\n📄 ${snippet.name}`));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.white(`\nاللغة: ${snippet.language}`));
        console.log(chalk.yellow(`التاجات: ${snippet.tags.join(', ')}`));
        if (snippet.description) {
          console.log(chalk.gray(`الوصف: ${snippet.description}`));
        }
        console.log(chalk.gray(`\nعدد الاستخدام: ${snippet.usageCount}`));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.white('\n' + snippet.code + '\n'));
        console.log(chalk.gray('─'.repeat(50) + '\n'));
      }
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// أمر إحصائيات المكتبة
program
  .command('snippet-stats')
  .description('عرض إحصائيات مكتبة الأكواد')
  .action(async () => {
    try {
      const library = createCodeLibrary({
        libraryPath: process.cwd(),
      });

      const stats = await library.getStats();

      console.log(chalk.cyan('\n📊 إحصائيات المكتبة:\n'));
      console.log(
        chalk.white(`📚 إجمالي الـ snippets: ${chalk.green(stats.totalSnippets.toString())}`)
      );
      console.log(chalk.white(`📈 إجمالي الاستخدام: ${chalk.green(stats.totalUsage.toString())}`));

      console.log(chalk.cyan('\n🗂️ حسب اللغة:'));
      for (const [lang, count] of Object.entries(stats.byLanguage)) {
        console.log(chalk.gray(`  ${lang}: ${count}`));
      }

      if (stats.mostUsed.length > 0) {
        console.log(chalk.cyan('\n⭐ الأكثر استخداماً:'));
        stats.mostUsed.forEach((s, i) => {
          console.log(chalk.blue(`  ${i + 1}. ${s.name}`) + chalk.gray(` (${s.usageCount} مرة)`));
        });
      }

      console.log();
    } catch (error: any) {
      console.error(chalk.red('\n❌'), error.message);
    }
  });

// تسجيل الأوامر الجديدة
registerNewCommands(program);

// معالجة الأوامر
export function runCLI(): void {
  // إذا لم يتم تمرير أي أوامر، بدء المحادثة التفاعلية تلقائياً
  if (process.argv.length === 2) {
    // إضافة أمر chat تلقائياً للدخول للأداة مباشرة
    process.argv.push('chat');
  }

  program.parse(process.argv);
}
