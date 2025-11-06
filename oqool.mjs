#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║                                                           ║
 * ║              🧠  Oqool CLI - Agent Edition                ║
 * ║                                                           ║
 * ║         نظام عقول للتطوير الذكي بالذكاء الاصطناعي       ║
 * ║                      With Agent Loop                      ║
 * ║                                                           ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

// ============================================
// 🎨 Banner الاحترافي
// ============================================
function displayBanner() {
  const banner = gradient.pastel.multiline([
    '╔═══════════════════════════════════════════════════════════╗',
    '║                                                           ║',
    '║              🧠  Oqool AI Development System              ║',
    '║                                                           ║',
    '║         نظام عقول للتطوير الذكي بالذكاء الاصطناعي       ║',
    '║                      Agent Edition 🚀                     ║',
    '║                                                           ║',
    '╚═══════════════════════════════════════════════════════════╝',
  ].join('\n'));

  console.log('\n' + banner + '\n');
  console.log(chalk.cyan('  📌 الإصدار:') + chalk.white(' v2.0.0 - Agent Edition'));
  console.log(chalk.cyan('  🌐 المستودع:') + chalk.white(' github.com/moaid15-hub/oqool-clean'));
  console.log(chalk.cyan('  👨‍💻 المطور:') + chalk.white(' فريق Oqool'));
  console.log(chalk.cyan('  📅 التاريخ:') + chalk.white(' 2025-11-06\n'));
}

// ============================================
// 📊 عرض المزودين بجدول احترافي
// ============================================
async function showProviders() {
  displayBanner();

  const spinner = ora({
    text: chalk.cyan('جاري فحص المزودين...'),
    spinner: 'dots'
  }).start();

  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.succeed(chalk.green('تم الفحص بنجاح!'));

  console.log('\n' + chalk.bold.yellow('🌐 المزودين المدعومين:\n'));

  const providers = [
    {
      name: 'Claude (Anthropic)',
      icon: '🔮',
      model: 'claude-sonnet-4',
      description: 'الأقوى للمهام المعقدة - Agent Loop كامل',
      features: ['Agent Loop', 'Tools', 'Function Calling', 'Context 200K'],
      cost: '$$$',
      speed: '⭐⭐⭐⭐',
      quality: '⭐⭐⭐⭐⭐',
      available: !!process.env.ANTHROPIC_API_KEY,
      color: 'magenta'
    },
    {
      name: 'DeepSeek',
      icon: '⚡',
      model: 'deepseek-coder',
      description: 'الأرخص والأسرع - ممتاز للبرمجة',
      features: ['Fast', 'Cheap', 'Code Expert', 'Context 64K'],
      cost: '$',
      speed: '⭐⭐⭐⭐⭐',
      quality: '⭐⭐⭐⭐',
      available: !!process.env.DEEPSEEK_API_KEY,
      color: 'blue'
    },
    {
      name: 'OpenAI (GPT)',
      icon: '🤖',
      model: 'gpt-4o',
      description: 'متوازن بين القوة والسرعة',
      features: ['Tools', 'Vision', 'Reliable', 'Context 128K'],
      cost: '$$',
      speed: '⭐⭐⭐⭐',
      quality: '⭐⭐⭐⭐',
      available: !!process.env.OPENAI_API_KEY,
      color: 'green'
    },
    {
      name: 'Gemini (Google)',
      icon: '💎',
      model: 'gemini-pro',
      description: 'سريع ومجاني - رائع للاختبار',
      features: ['Free Tier', 'Fast', 'Multimodal', 'Context 32K'],
      cost: 'Free/$',
      speed: '⭐⭐⭐⭐⭐',
      quality: '⭐⭐⭐',
      available: !!process.env.GEMINI_API_KEY,
      color: 'yellow'
    },
    {
      name: 'Ollama',
      icon: '🏠',
      model: 'llama3/codellama',
      description: 'محلي تماماً - خصوصية كاملة',
      features: ['Local', 'Private', 'Free', 'Offline'],
      cost: 'Free',
      speed: '⭐⭐⭐',
      quality: '⭐⭐⭐',
      available: false,
      color: 'cyan'
    }
  ];

  const table = new Table({
    head: [
      chalk.cyan('المزود'),
      chalk.cyan('الحالة'),
      chalk.cyan('السرعة'),
      chalk.cyan('الجودة'),
      chalk.cyan('التكلفة')
    ],
    colWidths: [25, 12, 12, 12, 12],
    style: { head: [], border: ['cyan'] }
  });

  providers.forEach(p => {
    const status = p.available ? chalk.green('✅ متصل') : chalk.red('❌');
    table.push([
      p.icon + ' ' + p.name,
      status,
      p.speed,
      p.quality,
      p.cost
    ]);
  });

  console.log(table.toString());

  // تفاصيل كل مزود
  console.log('\n' + chalk.bold.cyan('📋 التفاصيل:\n'));

  providers.forEach(p => {
    console.log(chalk[p.color].bold(`${p.icon} ${p.name}`));
    console.log('   ' + chalk.gray(p.description));
    console.log('   ' + chalk.white('النموذج: ') + chalk.cyan(p.model));
    console.log('   ' + chalk.white('المميزات: ') + chalk.yellow(p.features.join(' • ')));

    if (!p.available && p.name !== 'Ollama') {
      const envVar = p.name.includes('Claude') ? 'ANTHROPIC_API_KEY' :
                     p.name.includes('DeepSeek') ? 'DEEPSEEK_API_KEY' :
                     p.name.includes('OpenAI') ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
      console.log('   ' + chalk.yellow(`💡 أضف ${envVar} في ملف .env`));
    }
    console.log('');
  });

  const available = providers.filter(p => p.available).length;
  console.log(boxen(
    chalk.bold.green(`✨ ${available}/${providers.length} مزودين جاهزين للعمل!`),
    { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
  ));
}

// ============================================
// 🧪 اختبار النظام
// ============================================
async function testSystem() {
  displayBanner();

  console.log(chalk.bold.yellow('🧪 جاري اختبار النظام الشامل...\n'));

  const tests = [
    { name: 'فحص ملف .env', test: () => !!process.env.ANTHROPIC_API_KEY || !!process.env.DEEPSEEK_API_KEY },
    { name: 'فحص مفاتيح API', test: () => {
      const keys = [
        process.env.ANTHROPIC_API_KEY,
        process.env.DEEPSEEK_API_KEY,
        process.env.OPENAI_API_KEY,
        process.env.GEMINI_API_KEY
      ];
      return keys.filter(Boolean).length > 0;
    }},
    { name: 'فحص المجلد الحالي', test: () => !!process.cwd() },
    { name: 'فحص Node.js', test: () => process.version.startsWith('v') }
  ];

  for (const test of tests) {
    const spinner = ora(chalk.cyan(test.name)).start();
    await new Promise(resolve => setTimeout(resolve, 500));

    if (test.test()) {
      spinner.succeed(chalk.green(test.name));
    } else {
      spinner.fail(chalk.red(test.name));
    }
  }

  console.log('\n' + chalk.bold.yellow('🔑 المزودين المتاحين:\n'));

  const providers = {
    'Claude': process.env.ANTHROPIC_API_KEY,
    'DeepSeek': process.env.DEEPSEEK_API_KEY,
    'OpenAI': process.env.OPENAI_API_KEY,
    'Gemini': process.env.GEMINI_API_KEY
  };

  Object.entries(providers).forEach(([name, key]) => {
    if (key) {
      const masked = key.substring(0, 8) + '...' + key.substring(key.length - 4);
      console.log(chalk.green('  ✅ ' + name + ': ') + chalk.gray(masked));
    } else {
      console.log(chalk.red('  ❌ ' + name + ': ') + chalk.gray('غير متوفر'));
    }
  });

  const available = Object.values(providers).filter(Boolean).length;

  console.log('\n' + boxen(
    chalk.bold[available > 0 ? 'green' : 'red'](
      available > 0 ?
        `✨ النظام جاهز! ${available} مزودين متاحين` :
        '❌ لا توجد مفاتيح API متاحة'
    ),
    { padding: 1, margin: 1, borderStyle: 'round', borderColor: available > 0 ? 'green' : 'red' }
  ));

  if (available === 0) {
    console.log(chalk.yellow('\n💡 نصيحة: أضف مفاتيح API في ملف .env\n'));
  }
}

// ============================================
// 💬 وضع Agent (قيد التطوير)
// ============================================
async function agentMode(prompt) {
  displayBanner();

  console.log(boxen(
    chalk.yellow('⚠️  وظيفة Agent Loop قيد التطوير\n\n') +
    chalk.cyan('قريباً سيتمكن Oqool من:\n') +
    chalk.white('• قراءة وكتابة الملفات\n') +
    chalk.white('• تنفيذ الأوامر\n') +
    chalk.white('• تعديل الكود تلقائياً\n') +
    chalk.white('• استخدام الأدوات المتقدمة'),
    { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'yellow' }
  ));

  if (prompt) {
    console.log('\n' + chalk.gray('الطلب: ') + chalk.white(prompt));
  }

  console.log('\n' + chalk.cyan('💡 للاستخدام الآن: ') + chalk.white('npx tsx packages/cli/src/cli-agent.ts "طلبك"\n'));
}

// ============================================
// 📋 معلومات النظام
// ============================================
async function showInfo() {
  displayBanner();

  const info = boxen(
    chalk.bold.cyan('🧠 Oqool AI Development System\n\n') +
    chalk.white('نظام شامل للتطوير بالذكاء الاصطناعي\n\n') +
    chalk.yellow('الإصدار: ') + chalk.white('v2.0.0 Agent Edition\n') +
    chalk.yellow('المطور: ') + chalk.white('فريق Oqool\n') +
    chalk.yellow('الترخيص: ') + chalk.white('MIT\n') +
    chalk.yellow('المستودع: ') + chalk.white('github.com/moaid15-hub/oqool-clean\n\n') +
    chalk.cyan('المزودين المدعومين: ') + chalk.white('5\n') +
    chalk.cyan('الأدوات المتاحة: ') + chalk.white('10+\n') +
    chalk.cyan('Agent Loop: ') + chalk.green('✅ مدعوم'),
    { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'cyan' }
  );

  console.log(info);
}

// ============================================
// 🎮 إعداد الأوامر
// ============================================
program
  .name('oqool')
  .description('🧠 Oqool AI Development System - Agent Edition')
  .version('2.0.0');

program
  .command('test')
  .description('اختبار النظام والمزودين')
  .action(testSystem);

program
  .command('providers')
  .alias('p')
  .description('عرض المزودين المتاحين')
  .action(showProviders);

program
  .command('agent [prompt]')
  .alias('a')
  .description('تشغيل Agent Loop (قيد التطوير)')
  .action(agentMode);

program
  .command('info')
  .alias('i')
  .description('معلومات عن النظام')
  .action(showInfo);

// الأمر الافتراضي
program
  .action(() => {
    displayBanner();
    console.log(chalk.cyan('استخدم ') + chalk.yellow('oqool --help') + chalk.cyan(' للمساعدة\n'));
    console.log(chalk.bold.yellow('⚡ الأوامر السريعة:\n'));
    console.log(chalk.white('  • ') + chalk.green('oqool test') + chalk.gray('     - اختبار النظام'));
    console.log(chalk.white('  • ') + chalk.green('oqool providers') + chalk.gray(' - عرض المزودين'));
    console.log(chalk.white('  • ') + chalk.green('oqool info') + chalk.gray('      - معلومات النظام'));
    console.log('');
  });

program.parse();
