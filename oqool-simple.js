#!/usr/bin/env node

/**
 * Oqool CLI - نسخة مبسطة للاختبار
 * Simple version that works without TypeScript compilation
 */

console.log(`
╔═══════════════════════════════════════╗
║         🧠 Oqool CLI v1.0.0          ║
║    AI-Powered Development Assistant   ║
╚═══════════════════════════════════════╝
`);

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
📚 الأوامر المتاحة (Available Commands):

  oqool chat <message>       - محادثة مع AI
  oqool providers            - عرض المزودين المتاحين
  oqool test                 - اختبار الاتصال
  oqool --version, -v        - عرض الإصدار
  oqool --help, -h           - عرض المساعدة

💡 أمثلة (Examples):
  oqool chat "اكتب دالة JavaScript"
  oqool providers
  oqool test

🌐 المزودين المدعومين:
  • Claude (Anthropic)
  • DeepSeek
  • OpenAI
  • Gemini (Google)
  • Ollama (Local)

© فريق Oqool - 2025
  `);
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log('Oqool CLI v1.0.0');
  process.exit(0);
}

if (command === 'test') {
  console.log('✅ جاري اختبار النظام...\n');

  // Check .env
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');

  if (fs.existsSync(envPath)) {
    console.log('✅ ملف .env موجود');

    require('dotenv').config();

    const providers = {
      'Claude (Anthropic)': process.env.ANTHROPIC_API_KEY,
      'DeepSeek': process.env.DEEPSEEK_API_KEY,
      'OpenAI': process.env.OPENAI_API_KEY,
      'Gemini': process.env.GEMINI_API_KEY
    };

    console.log('\n🔑 المزودين المتاحين:\n');
    Object.entries(providers).forEach(([name, key]) => {
      if (key) {
        const masked = key.substring(0, 8) + '...' + key.substring(key.length - 4);
        console.log(`  ✅ ${name}: ${masked}`);
      } else {
        console.log(`  ❌ ${name}: غير متوفر`);
      }
    });

    console.log('\n✨ النظام جاهز للعمل!');
  } else {
    console.log('❌ ملف .env غير موجود');
    console.log('💡 قم بإنشاء ملف .env وإضافة مفاتيح API');
  }

  process.exit(0);
}

if (command === 'providers') {
  require('dotenv').config();

  console.log('🌐 المزودين المدعومين:\n');

  const providers = [
    {
      name: 'Claude (Anthropic)',
      env: 'ANTHROPIC_API_KEY',
      description: 'الأقوى للمهام المعقدة',
      available: !!process.env.ANTHROPIC_API_KEY
    },
    {
      name: 'DeepSeek',
      env: 'DEEPSEEK_API_KEY',
      description: 'الأرخص والأسرع',
      available: !!process.env.DEEPSEEK_API_KEY
    },
    {
      name: 'OpenAI (GPT)',
      env: 'OPENAI_API_KEY',
      description: 'متوازن بين القوة والسرعة',
      available: !!process.env.OPENAI_API_KEY
    },
    {
      name: 'Gemini (Google)',
      env: 'GEMINI_API_KEY',
      description: 'سريع ومجاني',
      available: !!process.env.GEMINI_API_KEY
    },
    {
      name: 'Ollama',
      env: 'Local',
      description: 'محلي ومجاني',
      available: false // يحتاج تثبيت
    }
  ];

  providers.forEach(p => {
    const status = p.available ? '✅' : '❌';
    console.log(`${status} ${p.name}`);
    console.log(`   ${p.description}`);
    if (!p.available && p.env !== 'Local') {
      console.log(`   💡 قم بإضافة ${p.env} في ملف .env`);
    }
    console.log('');
  });

  process.exit(0);
}

if (command === 'chat') {
  const message = args.slice(1).join(' ');

  if (!message) {
    console.log('❌ يرجى كتابة رسالة');
    console.log('💡 مثال: oqool chat "اكتب دالة"');
    process.exit(1);
  }

  console.log(`📝 الرسالة: ${message}`);
  console.log('\n⚠️  وظيفة المحادثة قيد التطوير');
  console.log('💡 استخدم: npx tsx packages/cli/src/cli.ts');
  process.exit(0);
}

console.log(`❌ أمر غير معروف: ${command}`);
console.log('💡 استخدم: oqool --help للمساعدة');
process.exit(1);
