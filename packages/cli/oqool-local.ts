#!/usr/bin/env node
// muayadgen-local.ts
// ============================================
// 🚀 MuayadGen المحلي - يستخدم Claude API مباشرة
// ============================================

import dotenv from 'dotenv';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { LocalClaudeClient, createLocalClaudeClient } from './src/local-oqool-client.js';
import { createFileManager } from './src/file-manager.js';
import { ui } from './src/ui.js';

// تحميل متغيرات البيئة
dotenv.config();

// الواجهة الرئيسية
async function main() {
  const args = process.argv.slice(2);

  // عرض الترحيب
  ui.displayBanner();

  // إنشاء عميل Claude
  const client = createLocalClaudeClient();
  if (!client) {
    console.log(chalk.red('\n❌ فشل في تهيئة Claude API'));
    console.log(chalk.yellow('تأكد من وجود ANTHROPIC_API_KEY في ملف .env\n'));
    process.exit(1);
  }

  // التحقق من صحة API Key
  ui.startSpinner('التحقق من Claude API...');
  const isValid = await client.verifyApiKey();

  if (!isValid) {
    ui.failSpinner('فشل في الاتصال بـ Claude API');
    console.log(chalk.red('\n❌ تحقق من صحة ANTHROPIC_API_KEY\n'));
    process.exit(1);
  }

  ui.succeedSpinner('تم الاتصال بـ Claude API بنجاح!');

  // إنشاء مدير الملفات
  const fileManager = createFileManager();

  // إذا لم توجد أوامر - ادخل وضع المحادثة
  if (args.length === 0 || args[0] === 'chat') {
    await chatMode(client, fileManager);
    return;
  }

  // الأمر المباشر
  const prompt = args.join(' ');
  await handlePrompt(client, fileManager, prompt);
}

// وضع المحادثة التفاعلي
async function chatMode(client: LocalClaudeClient, fileManager: any) {
  console.log(chalk.cyan('\n💬 وضع المحادثة التفاعلية'));
  console.log(chalk.gray('اكتب سؤالك أو أمرك (اكتب "exit" للخروج)\n'));

  const messages: any[] = [];

  while (true) {
    const { userInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'userInput',
        message: chalk.yellow('أنت:'),
        prefix: '👤',
      },
    ]);

    if (!userInput || userInput.toLowerCase() === 'exit') {
      console.log(chalk.yellow('\n👋 إلى اللقاء!\n'));
      break;
    }

    // إضافة رسالة المستخدم
    messages.push({
      role: 'user',
      content: userInput,
    });

    // إرسال للـ API
    ui.startSpinner('Claude يفكر...');
    const response = await client.sendChatMessage(messages);
    ui.stopSpinner();

    if (!response.success) {
      console.log(chalk.red(`\n❌ خطأ: ${response.error}\n`));
      messages.pop(); // إزالة الرسالة الأخيرة
      continue;
    }

    // إضافة رد Claude
    messages.push({
      role: 'assistant',
      content: response.message,
    });

    // عرض الرد
    console.log(chalk.green('\n🤖 Claude:'));
    console.log(chalk.white(response.message));
    console.log('');

    // فحص إذا كان الرد يحتوي على كود
    const codeBlocks = extractCodeBlocks(response.message);
    if (codeBlocks.length > 0) {
      const { shouldWrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldWrite',
          message: chalk.yellow(`هل تريد كتابة ${codeBlocks.length} ملف(ات)؟`),
          default: false,
        },
      ]);

      if (shouldWrite) {
        await writeCodeBlocks(codeBlocks, fileManager);
      }
    }
  }
}

// معالجة أمر مباشر
async function handlePrompt(client: LocalClaudeClient, fileManager: any, prompt: string) {
  console.log(chalk.cyan(`\n📝 الطلب: ${prompt}\n`));

  // قراءة سياق المشروع
  ui.startSpinner('قراءة ملفات المشروع...');
  const projectFiles = await fileManager.readProjectFiles(process.cwd(), 10);
  ui.succeedSpinner(`تم قراءة ${projectFiles.length} ملف`);

  // توليد الكود
  ui.startSpinner('Claude يعمل على طلبك...');
  const response = await client.generateCode(prompt, projectFiles);
  ui.stopSpinner();

  if (!response.success) {
    console.log(chalk.red(`\n❌ خطأ: ${response.error}\n`));
    return;
  }

  // عرض الرد
  console.log(chalk.green('\n✨ الرد:\n'));
  console.log(chalk.white(response.message));
  console.log('');

  // استخراج كتل الكود
  const codeBlocks = extractCodeBlocks(response.message);

  if (codeBlocks.length === 0) {
    console.log(chalk.yellow('ℹ️  لم يتم العثور على كود للكتابة\n'));
    return;
  }

  // السؤال عن الكتابة
  const { shouldWrite } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldWrite',
      message: chalk.yellow(`هل تريد كتابة ${codeBlocks.length} ملف(ات)؟`),
      default: true,
    },
  ]);

  if (shouldWrite) {
    await writeCodeBlocks(codeBlocks, fileManager);
  }
}

// استخراج كتل الكود من الرد
function extractCodeBlocks(text: string): Array<{ filename: string; content: string }> {
  const blocks: Array<{ filename: string; content: string }> = [];

  // نمط للبحث: ```filename:path/to/file.ext
  const pattern = /```(?:[\w]+)?(?::|\s+filename:)([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const filename = match[1].trim();
    const content = match[2].trim();
    blocks.push({ filename, content });
  }

  // إذا لم نجد نمط filename، نبحث عن كتل كود عادية ونسأل عن الاسم
  if (blocks.length === 0) {
    const simplePattern = /```[\w]*\n([\s\S]*?)```/g;
    while ((match = simplePattern.exec(text)) !== null) {
      blocks.push({
        filename: 'code.txt', // سنطلب الاسم لاحقاً
        content: match[1].trim(),
      });
    }
  }

  return blocks;
}

// كتابة كتل الكود
async function writeCodeBlocks(
  blocks: Array<{ filename: string; content: string }>,
  fileManager: any
) {
  for (const block of blocks) {
    let filename = block.filename;

    // إذا كان الاسم غير واضح، اسأل المستخدم
    if (filename === 'code.txt' || !filename.includes('/')) {
      const { newFilename } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newFilename',
          message: 'اسم الملف:',
          default: filename,
        },
      ]);
      filename = newFilename;
    }

    try {
      ui.startSpinner(`كتابة ${filename}...`);
      await fileManager.writeFile(filename, block.content);
      ui.succeedSpinner(`تم كتابة ${filename}`);
    } catch (error: any) {
      ui.failSpinner(`فشل كتابة ${filename}`);
      console.log(chalk.red(`❌ ${error.message}`));
    }
  }

  console.log(chalk.green('\n✅ تمت كتابة الملفات بنجاح!\n'));
}

// تشغيل البرنامج
main().catch((error) => {
  console.error(chalk.red('\n❌ خطأ غير متوقع:'), error.message);
  console.error(error.stack);
  process.exit(1);
});
