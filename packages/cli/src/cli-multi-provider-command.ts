// cli-multi-provider-command.ts
// ============================================
// 🤖 CLI Command للـ Multi-Provider Agent
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';
import { createMultiProviderAgent, MultiProviderAgentConfig } from './multi-provider-agent.js';
import ora from 'ora';
import dotenv from 'dotenv';

dotenv.config();

export function registerMultiProviderCommand(program: Command) {
  // ============================================
  // أمر: oqool ai <prompt>
  // ============================================
  program
    .command('ai <prompt>')
    .description('🤖 استخدام AI مع دعم جميع المزودين (Gemini, DeepSeek, OpenAI, Claude)')
    .option('-p, --provider <name>', 'مزود AI محدد (gemini|deepseek|openai|claude|ollama|auto)', 'auto')
    .option('--no-context', 'تعطيل تحليل سياق المشروع')
    .option('--no-planning', 'تعطيل التخطيط الذكي')
    .option('--no-learning', 'تعطيل نظام التعلم')
    .action(async (prompt: string, options: any) => {
      try {
        // عرض معلومات المزودين المتاحة
        displayAvailableProviders();

        // إنشاء Agent
        const config: MultiProviderAgentConfig = {
          provider: options.provider,
          enableContext: options.context !== false,
          enablePlanning: options.planning !== false,
          enableLearning: options.learning !== false,
        };

        const agent = createMultiProviderAgent(config);

        // تشغيل Agent
        const spinner = ora('⏳ معالجة طلبك...').start();

        try {
          const response = await agent.run(prompt);

          spinner.succeed(chalk.green('✅ تمت المعالجة بنجاح'));

          // عرض الرد
          console.log(chalk.white('\n╭─────────────────────────────────────────────╮'));
          console.log(chalk.white('│ ') + chalk.cyan.bold('📝 النتيجة:') + ' '.repeat(32) + chalk.white('│'));
          console.log(chalk.white('╰─────────────────────────────────────────────╯\n'));

          console.log(response);

          console.log(chalk.white('\n╰─────────────────────────────────────────────╯\n'));
        } catch (error: any) {
          spinner.fail(chalk.red('❌ فشلت المعالجة'));
          console.error(chalk.red('\n⚠️ خطأ:'), error.message);

          // نصائح لحل المشكلة
          if (error.message.includes('API') || error.message.includes('key')) {
            console.log(chalk.yellow('\n💡 نصائح:'));
            console.log(chalk.gray('   1. تأكد من وجود API Keys في ملف .env'));
            console.log(chalk.gray('   2. تحقق من صلاحية المفاتيح'));
            console.log(chalk.gray('   3. جرب مزود آخر باستخدام --provider'));
          }

          process.exit(1);
        }
      } catch (error: any) {
        console.error(chalk.red('❌ خطأ غير متوقع:'), error.message);
        process.exit(1);
      }
    });

  // ============================================
  // أمر: oqool providers
  // ============================================
  program
    .command('providers')
    .description('📋 عرض معلومات مزودي AI المتاحين')
    .action(() => {
      displayProviderDetails();
    });

  // ============================================
  // أمر: oqool test-provider <name>
  // ============================================
  program
    .command('test-provider <name>')
    .description('🧪 اختبار مزود AI محدد')
    .action(async (name: string) => {
      await testProvider(name);
    });
}

// ============================================
// 📊 عرض المزودين المتاحين
// ============================================
function displayAvailableProviders() {
  const providers = [
    {
      name: 'Gemini',
      key: 'GEMINI_API_KEY',
      status: !!process.env.GEMINI_API_KEY,
      speed: '⚡⚡⚡',
      cost: '💰',
    },
    {
      name: 'DeepSeek',
      key: 'DEEPSEEK_API_KEY',
      status: !!process.env.DEEPSEEK_API_KEY,
      speed: '⚡',
      cost: '💰',
    },
    {
      name: 'OpenAI',
      key: 'OPENAI_API_KEY',
      status: !!process.env.OPENAI_API_KEY,
      speed: '⚡⚡',
      cost: '💰💰',
    },
    {
      name: 'Claude',
      key: 'ANTHROPIC_API_KEY',
      status: !!process.env.ANTHROPIC_API_KEY,
      speed: '⚡⚡',
      cost: '💰💰💰',
    },
    {
      name: 'Ollama',
      key: 'USE_OLLAMA',
      status: process.env.USE_OLLAMA === 'true',
      speed: '⚡',
      cost: '🆓',
    },
  ];

  const available = providers.filter(p => p.status);
  const unavailable = providers.filter(p => !p.status);

  console.log(chalk.cyan('\n🤖 مزودي AI المتاحين:\n'));

  if (available.length > 0) {
    available.forEach(p => {
      console.log(
        chalk.green('  ✓ ') +
        chalk.white.bold(p.name.padEnd(12)) +
        chalk.gray(` السرعة: ${p.speed}  التكلفة: ${p.cost}`)
      );
    });
  }

  if (unavailable.length > 0) {
    console.log(chalk.yellow('\n⚠️  مزودين غير متاحين:\n'));
    unavailable.forEach(p => {
      console.log(
        chalk.red('  ✗ ') +
        chalk.gray(p.name.padEnd(12)) +
        chalk.gray(` (${p.key} غير موجود)`)
      );
    });
  }

  console.log('');
}

// ============================================
// 📋 عرض تفاصيل المزودين
// ============================================
function displayProviderDetails() {
  console.log(chalk.cyan('\n╭─────────────────────────────────────────────────────╮'));
  console.log(chalk.cyan('│ ') + chalk.white.bold('🤖 مزودي AI المدعومين') + ' '.repeat(28) + chalk.cyan('│'));
  console.log(chalk.cyan('╰─────────────────────────────────────────────────────╯\n'));

  const providers = [
    {
      name: 'Gemini (Google)',
      emoji: '⚡',
      description: 'الأسرع والأرخص - موصى به بشدة',
      speed: 'سريع جداً (10-20x أسرع من DeepSeek)',
      cost: '$0.10/$0.40 per 1M tokens',
      key: 'GEMINI_API_KEY',
      link: 'https://aistudio.google.com/app/apikey',
      status: !!process.env.GEMINI_API_KEY,
    },
    {
      name: 'DeepSeek',
      emoji: '💰',
      description: 'رخيص لكن بطيء',
      speed: 'بطيء',
      cost: '$0.14/$0.28 per 1M tokens',
      key: 'DEEPSEEK_API_KEY',
      link: 'https://platform.deepseek.com',
      status: !!process.env.DEEPSEEK_API_KEY,
    },
    {
      name: 'OpenAI (GPT-4)',
      emoji: '🧠',
      description: 'متوازن بين الجودة والسرعة',
      speed: 'متوسط',
      cost: '$5/$15 per 1M tokens',
      key: 'OPENAI_API_KEY',
      link: 'https://platform.openai.com',
      status: !!process.env.OPENAI_API_KEY,
    },
    {
      name: 'Claude (Anthropic)',
      emoji: '👑',
      description: 'الأذكى - ممتاز في التصميم والمراجعة',
      speed: 'متوسط',
      cost: '$3/$15 per 1M tokens',
      key: 'ANTHROPIC_API_KEY',
      link: 'https://console.anthropic.com',
      status: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      name: 'Ollama (Local)',
      emoji: '🏠',
      description: 'مجاني تماماً - يعمل محلياً',
      speed: 'يعتمد على جهازك',
      cost: 'مجاني 🆓',
      key: 'USE_OLLAMA=true',
      link: 'https://ollama.ai',
      status: process.env.USE_OLLAMA === 'true',
    },
  ];

  providers.forEach((p, i) => {
    const statusIcon = p.status ? chalk.green('✓') : chalk.red('✗');
    const statusText = p.status ? chalk.green('متاح') : chalk.red('غير متاح');

    console.log(chalk.white.bold(`${i + 1}. ${p.emoji} ${p.name}`));
    console.log(chalk.gray(`   الحالة: ${statusIcon} ${statusText}`));
    console.log(chalk.gray(`   الوصف: ${p.description}`));
    console.log(chalk.gray(`   السرعة: ${p.speed}`));
    console.log(chalk.gray(`   التكلفة: ${p.cost}`));
    console.log(chalk.gray(`   المفتاح: ${p.key}`));
    console.log(chalk.gray(`   الرابط: ${p.link}`));
    console.log('');
  });

  console.log(chalk.yellow('💡 نصيحة: ') + chalk.gray('استخدم Gemini للحصول على أفضل أداء وأقل تكلفة!'));
  console.log('');
}

// ============================================
// 🧪 اختبار مزود محدد
// ============================================
async function testProvider(providerName: string) {
  console.log(chalk.cyan(`\n🧪 اختبار ${providerName}...\n`));

  const validProviders = ['gemini', 'deepseek', 'openai', 'claude', 'ollama'];

  if (!validProviders.includes(providerName.toLowerCase())) {
    console.error(chalk.red(`❌ مزود غير صالح: ${providerName}`));
    console.log(chalk.gray(`المزودين المتاحين: ${validProviders.join(', ')}`));
    return;
  }

  try {
    const agent = createMultiProviderAgent({
      provider: providerName as any,
      enableContext: false,
      enablePlanning: false,
      enableLearning: false,
    });

    const spinner = ora('⏳ جاري الاختبار...').start();

    const testPrompt = 'قل "مرحباً" فقط';
    const response = await agent.run(testPrompt);

    spinner.succeed(chalk.green(`✅ ${providerName} يعمل بشكل صحيح!`));
    console.log(chalk.gray('\nالرد:'), response.substring(0, 100));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ فشل الاختبار: ${error.message}`));

    // نصائح
    console.log(chalk.yellow('\n💡 تحقق من:'));
    console.log(chalk.gray('   1. وجود API Key في ملف .env'));
    console.log(chalk.gray('   2. صلاحية المفتاح'));
    console.log(chalk.gray('   3. اتصالك بالإنترنت'));
  }
}
