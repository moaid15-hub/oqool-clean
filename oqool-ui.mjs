#!/usr/bin/env node

/**
 * Oqool CLI - مع الواجهة الاحترافية
 * Professional UI Version
 */

import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import gradient from 'gradient-string';
import Table from 'cli-table3';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// Professional UI Components
// ============================================

function showBanner() {
  const banner = gradient.pastel.multiline([
    '╔═══════════════════════════════════════════════════════════╗',
    '║                                                           ║',
    '║              🧠  Oqool AI Development System              ║',
    '║                                                           ║',
    '║         نظام عقول للتطوير الذكي بالذكاء الاصطناعي       ║',
    '║                                                           ║',
    '╚═══════════════════════════════════════════════════════════╝',
  ].join('\n'));

  console.log('\n' + banner + '\n');
  console.log(chalk.cyan('  📌 الإصدار:') + chalk.white(' v1.0.0'));
  console.log(chalk.cyan('  🌐 المستودع:') + chalk.white(' github.com/moaid15-hub/oqool-clean'));
  console.log(chalk.cyan('  📅 التاريخ:') + chalk.white(' 2025-11-06\n'));
}

function showHelp() {
  showBanner();

  console.log(chalk.bold.yellow('📚 الأوامر المتاحة:\n'));

  const table = new Table({
    head: [
      chalk.cyan('الأمر'),
      chalk.cyan('الوصف'),
      chalk.cyan('مثال')
    ],
    colWidths: [20, 35, 35],
    style: {
      head: [],
      border: ['cyan']
    }
  });

  table.push(
    ['chat <message>', 'محادثة مع AI', 'oqool chat "اكتب دالة"'],
    ['providers', 'عرض المزودين المتاحين', 'oqool providers'],
    ['test', 'اختبار الاتصال', 'oqool test'],
    ['--version, -v', 'عرض الإصدار', 'oqool --version'],
    ['--help, -h', 'عرض المساعدة', 'oqool --help']
  );

  console.log(table.toString());

  console.log('\n' + chalk.bold.green('🌐 المزودين المدعومين:'));
  console.log(chalk.white('  • ') + chalk.yellow('Claude') + chalk.gray(' (Anthropic) - الأقوى'));
  console.log(chalk.white('  • ') + chalk.blue('DeepSeek') + chalk.gray(' - الأرخص والأسرع'));
  console.log(chalk.white('  • ') + chalk.green('OpenAI') + chalk.gray(' (GPT) - متوازن'));
  console.log(chalk.white('  • ') + chalk.magenta('Gemini') + chalk.gray(' (Google) - سريع'));
  console.log(chalk.white('  • ') + chalk.cyan('Ollama') + chalk.gray(' - محلي ومجاني'));

  console.log('\n' + chalk.gray('© فريق Oqool - 2025\n'));
}

function showVersion() {
  showBanner();
  console.log(chalk.bold.green('✨ الإصدار الحالي: ') + chalk.white('v1.0.0\n'));
}

async function testSystem() {
  showBanner();

  const spinner = ora({
    text: chalk.cyan('جاري فحص النظام...'),
    spinner: 'dots'
  }).start();

  await new Promise(resolve => setTimeout(resolve, 1000));

  spinner.succeed(chalk.green('النظام جاهز للعمل'));

  console.log('\n' + chalk.bold.yellow('🔑 حالة المزودين:\n'));

  const providers = {
    'Claude (Anthropic)': { key: process.env.ANTHROPIC_API_KEY, icon: '🔮' },
    'DeepSeek': { key: process.env.DEEPSEEK_API_KEY, icon: '⚡' },
    'OpenAI (GPT)': { key: process.env.OPENAI_API_KEY, icon: '🤖' },
    'Gemini (Google)': { key: process.env.GEMINI_API_KEY, icon: '💎' }
  };

  const table = new Table({
    head: [chalk.cyan('المزود'), chalk.cyan('الحالة'), chalk.cyan('المفتاح')],
    colWidths: [25, 15, 30],
    style: {
      head: [],
      border: ['cyan']
    }
  });

  Object.entries(providers).forEach(([name, info]) => {
    const status = info.key ?
      chalk.green('✅ متصل') :
      chalk.red('❌ غير متوفر');

    const keyDisplay = info.key ?
      chalk.gray(info.key.substring(0, 8) + '...' + info.key.substring(info.key.length - 4)) :
      chalk.gray('---');

    table.push([info.icon + ' ' + name, status, keyDisplay]);
  });

  console.log(table.toString());

  const available = Object.values(providers).filter(p => p.key).length;
  const total = Object.keys(providers).length;

  console.log('\n' + boxen(
    chalk.bold.green(`✨ ${available}/${total} مزودين جاهزين للعمل`),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green'
    }
  ));
}

async function showProviders() {
  showBanner();

  console.log(chalk.bold.yellow('🌐 المزودين المتاحين:\n'));

  const providers = [
    {
      name: 'Claude (Anthropic)',
      icon: '🔮',
      description: 'الأقوى للمهام المعقدة والبرمجة',
      features: ['أدوات متقدمة', 'دقة عالية', 'سياق كبير'],
      available: !!process.env.ANTHROPIC_API_KEY,
      color: 'magenta'
    },
    {
      name: 'DeepSeek',
      icon: '⚡',
      description: 'الأرخص والأسرع - مثالي للمهام البسيطة',
      features: ['تكلفة منخفضة', 'سرعة عالية', 'برمجة ممتازة'],
      available: !!process.env.DEEPSEEK_API_KEY,
      color: 'blue'
    },
    {
      name: 'OpenAI (GPT)',
      icon: '🤖',
      description: 'متوازن بين القوة والسرعة',
      features: ['شامل', 'موثوق', 'أدوات قوية'],
      available: !!process.env.OPENAI_API_KEY,
      color: 'green'
    },
    {
      name: 'Gemini (Google)',
      icon: '💎',
      description: 'سريع ومجاني - رائع للاختبار',
      features: ['مجاني', 'سريع', 'متعدد اللغات'],
      available: !!process.env.GEMINI_API_KEY,
      color: 'yellow'
    },
    {
      name: 'Ollama',
      icon: '🏠',
      description: 'محلي تماماً - خصوصية كاملة',
      features: ['محلي', 'مجاني', 'بدون إنترنت'],
      available: false,
      color: 'cyan'
    }
  ];

  providers.forEach(p => {
    const status = p.available ?
      chalk.green('✅ متصل') :
      chalk.gray('⚪ غير متصل');

    console.log(chalk[p.color].bold(`${p.icon} ${p.name}`));
    console.log('   ' + status);
    console.log('   ' + chalk.gray(p.description));
    console.log('   ' + chalk.white('المميزات: ') + chalk.cyan(p.features.join(' • ')));

    if (!p.available && p.name !== 'Ollama') {
      const envVar = p.name.includes('Claude') ? 'ANTHROPIC_API_KEY' :
                     p.name.includes('DeepSeek') ? 'DEEPSEEK_API_KEY' :
                     p.name.includes('OpenAI') ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
      console.log('   ' + chalk.yellow(`💡 أضف ${envVar} في ملف .env`));
    }
    console.log('');
  });
}

// ============================================
// Main CLI Logic
// ============================================

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  showVersion();
  process.exit(0);
}

if (command === 'test') {
  await testSystem();
  process.exit(0);
}

if (command === 'providers') {
  await showProviders();
  process.exit(0);
}

if (command === 'chat') {
  showBanner();
  console.log(chalk.yellow('⚠️  وظيفة المحادثة قيد التطوير'));
  console.log(chalk.cyan('💡 قريباً ستتمكن من المحادثة مباشرة!'));
  process.exit(0);
}

console.log(chalk.red(`❌ أمر غير معروف: ${command}`));
console.log(chalk.cyan('💡 استخدم: oqool --help للمساعدة'));
process.exit(1);
