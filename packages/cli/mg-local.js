#!/usr/bin/env node
// mg-local.js
// ============================================
// 🚀 oqool المحلي المبسط
// ============================================

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

// تحميل متغيرات البيئة
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// وضع المحادثة التفاعلي
async function chatMode(client) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[33m👤 أنت:\x1b[0m ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    // الخروج
    if (!input || input.toLowerCase() === 'exit' || input === 'خروج') {
      console.log('\n\x1b[33m👋 إلى اللقاء!\x1b[0m\n');
      rl.close();
      process.exit(0);
    }

    // إرسال للـ API مع Agent
    try {
      const response = await client.run(input);

      // عرض الرد
      const hasCode = response.includes('```');
      const label = hasCode ? '✨ الكود:' : '💬 الرد:';
      console.log(`\x1b[32m${label}\x1b[0m`);
      console.log('\x1b[37m' + response + '\x1b[0m\n');
      console.log('\x1b[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
    } catch (error) {
      console.log(`\x1b[31m❌ خطأ: ${error.message}\x1b[0m\n`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n\x1b[33m👋 إلى اللقاء!\x1b[0m\n');
    process.exit(0);
  });
}

// استيراد الوحدات المبنية
import('./dist/agent-client.js')
  .then(async (claudeModule) => {
    const { createAgentClient } = claudeModule;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your-api-key-here') {
      console.log('\x1b[33m⚠️  ANTHROPIC_API_KEY غير موجود أو غير صحيح\x1b[0m');
      console.log('\x1b[36mأضف المفتاح في ملف .env:\x1b[0m');
      console.log('\x1b[90mANTHROPIC_API_KEY=sk-ant-...\x1b[0m\n');
      process.exit(1);
    }

    const client = createAgentClient({
      apiKey: apiKey,
      workingDirectory: process.cwd(),
    });

    // عرض Banner جميل
    console.log('\x1b[36m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log(
      '\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m'
    );
    console.log(
      '\x1b[36m║\x1b[0m     \x1b[1m\x1b[35m🧠  oqool - مولّد الأكواد الذكي  🚀\x1b[0m        \x1b[36m║\x1b[0m'
    );
    console.log(
      '\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m'
    );
    console.log(
      '\x1b[36m║\x1b[0m     \x1b[33mأداة ذكية لكتابة الأكواد بواسطة Dr. Muayad\x1b[0m     \x1b[36m║\x1b[0m'
    );
    console.log(
      '\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m'
    );
    console.log('\x1b[36m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');

    // التحقق من الاتصال
    console.log('\x1b[36m🔍 التحقق من الاتصال...\x1b[0m');
    const isValid = await client.verifyApiKey();

    if (!isValid) {
      console.log('\x1b[31m❌ فشل في الاتصال\x1b[0m');
      console.log('\x1b[33mتحقق من صحة API Key في ملف .env\x1b[0m\n');
      process.exit(1);
    }

    console.log('\x1b[32m✅ جاهز للعمل!\x1b[0m\n');

    // الحصول على الأمر
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log('\x1b[36m╔══════════════════════════════════════════════════════════╗\x1b[0m');
      console.log(
        '\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m'
      );
      console.log(
        '\x1b[36m║\x1b[0m         \x1b[1m\x1b[35m💬 وضع المحادثة التفاعلي 💬\x1b[0m                \x1b[36m║\x1b[0m'
      );
      console.log(
        '\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m'
      );
      console.log(
        '\x1b[36m║\x1b[0m     \x1b[90mاكتب طلبك البرمجي واضغط Enter\x1b[0m                  \x1b[36m║\x1b[0m'
      );
      console.log(
        '\x1b[36m║\x1b[0m     \x1b[90mللخروج: اكتب "exit" أو "خروج"\x1b[0m                  \x1b[36m║\x1b[0m'
      );
      console.log(
        '\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m'
      );
      console.log('\x1b[36m╚══════════════════════════════════════════════════════════╝\x1b[0m');
      console.log('');

      // الدخول في وضع المحادثة التفاعلي
      await chatMode(client);
      return;
    }

    const prompt = args.join(' ');

    console.log(`\x1b[36m📝 الطلب: ${prompt}\x1b[0m\n`);

    // إرسال الطلب مع Agent
    try {
      const response = await client.run(prompt);

      // عرض الرد
      const hasCode = response.includes('```');
      const label = hasCode ? '✨ الكود المُولّد:' : '💬 الرد:';
      console.log(`\x1b[32m${label}\x1b[0m\n`);
      console.log('\x1b[37m' + response + '\x1b[0m\n');

      console.log('\x1b[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
    } catch (error) {
      console.log(`\x1b[31m❌ خطأ: ${error.message}\x1b[0m\n`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\x1b[31m❌ خطأ في التحميل:\x1b[0m', error.message);
    process.exit(1);
  });
