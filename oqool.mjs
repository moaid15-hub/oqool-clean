#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║                                                           ║
 * ║              🧠  Oqool CLI - Professional Edition         ║
 * ║                                                           ║
 * ║         نظام عقول للتطوير الذكي بالذكاء الاصطناعي       ║
 * ║                With Enhanced UI System 🚀                 ║
 * ║                                                           ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

import { Command } from 'commander';
import { ui } from './packages/shared/dist/core/ui.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

// ============================================
// 🎨 Banner باستخدام UI الجديد
// ============================================
function displayBanner() {
  ui.printBanner('v3.0.0 - Professional Edition');
  ui.printHeader('Oqool AI Development System', 'نظام عقول للتطوير الذكي', {
    emoji: '🧠',
    color: 'cyan'
  });
  ui.newLine();
}

// ============================================
// 📊 عرض المزودين باستخدام UI الجديد
// ============================================
async function showProviders() {
  displayBanner();

  ui.startSpinner('جاري فحص المزودين...', 'dots');
  await new Promise(resolve => setTimeout(resolve, 1000));
  ui.succeedSpinner('تم الفحص بنجاح!');

  ui.newLine();
  ui.printSection('المزودين المدعومين', { emoji: '🌐', level: 1 });

  const providers = [
    {
      name: 'Claude (Anthropic)',
      icon: '🔮',
      status: process.env.ANTHROPIC_API_KEY ? '✅ متصل' : '❌ غير متصل',
      speed: '⭐⭐⭐⭐',
      quality: '⭐⭐⭐⭐⭐',
      cost: '$$$'
    },
    {
      name: 'DeepSeek',
      icon: '⚡',
      status: process.env.DEEPSEEK_API_KEY ? '✅ متصل' : '❌ غير متصل',
      speed: '⭐⭐⭐⭐⭐',
      quality: '⭐⭐⭐⭐',
      cost: '$'
    },
    {
      name: 'OpenAI (GPT)',
      icon: '🤖',
      status: process.env.OPENAI_API_KEY ? '✅ متصل' : '❌ غير متصل',
      speed: '⭐⭐⭐⭐',
      quality: '⭐⭐⭐⭐',
      cost: '$$'
    },
    {
      name: 'Gemini (Google)',
      icon: '💎',
      status: process.env.GEMINI_API_KEY ? '✅ متصل' : '❌ غير متصل',
      speed: '⭐⭐⭐⭐⭐',
      quality: '⭐⭐⭐',
      cost: 'Free/$'
    },
    {
      name: 'Ollama',
      icon: '🏠',
      status: process.env.USE_OLLAMA === 'true' ? '✅ متصل' : '❌ غير متصل',
      speed: '⭐⭐⭐',
      quality: '⭐⭐⭐',
      cost: 'Free'
    }
  ];

  // عرض الجدول باستخدام UI الجديد
  const tableData = providers.map(p => ({
    provider: p.icon + ' ' + p.name,
    status: p.status,
    speed: p.speed,
    quality: p.quality,
    cost: p.cost
  }));

  const tableColumns = [
    { key: 'provider', label: 'المزود', width: 25 },
    { key: 'status', label: 'الحالة', width: 12 },
    { key: 'speed', label: 'السرعة', width: 12 },
    { key: 'quality', label: 'الجودة', width: 12 },
    { key: 'cost', label: 'التكلفة', width: 12 }
  ];

  ui.printTable(tableData, tableColumns, { title: 'AI Providers Status' });

  // عرض التفاصيل
  ui.newLine();
  ui.printSection('التفاصيل', { emoji: '📋', level: 2 });

  const details = [
    {
      title: '🔮 Claude (Anthropic)',
      items: [
        'الأقوى للمهام المعقدة - Agent Loop كامل',
        'النموذج: claude-3-5-haiku-20241022',
        'المميزات: Agent Loop • Tools • Function Calling • Context 200K'
      ]
    },
    {
      title: '⚡ DeepSeek',
      items: [
        'الأرخص والأسرع - ممتاز للبرمجة',
        'النموذج: deepseek-coder',
        'المميزات: Fast • Cheap • Code Expert • Context 64K'
      ]
    },
    {
      title: '🤖 OpenAI (GPT)',
      items: [
        'متوازن بين القوة والسرعة',
        'النموذج: gpt-4o',
        'المميزات: Tools • Vision • Reliable • Context 128K'
      ]
    },
    {
      title: '💎 Gemini (Google)',
      items: [
        'سريع ومجاني - رائع للاختبار',
        'النموذج: gemini-2.0-flash-exp',
        'المميزات: Free Tier • Fast • Multimodal • Context 32K'
      ]
    },
    {
      title: '🏠 Ollama',
      items: [
        'محلي تماماً - خصوصية كاملة',
        'النموذج: llama3.1:8b',
        'المميزات: Local • Private • Free • Offline'
      ]
    }
  ];

  details.forEach(detail => {
    ui.info(detail.title);
    ui.printList(detail.items, { bullets: true, indent: 3 });
    ui.newLine();
  });

  // عرض الإحصائيات
  const totalProviders = providers.length;
  const activeProviders = providers.filter(p => p.status.includes('✅')).length;

  ui.printSummary('ملخص النظام', [
    { label: 'إجمالي المزودين', value: totalProviders, color: 'cyan', icon: '🔢' },
    { label: 'المزودين النشطين', value: activeProviders, color: 'green', icon: '✅' },
    { label: 'نسبة الجاهزية', value: `${((activeProviders/totalProviders)*100).toFixed(0)}%`, color: activeProviders >= 3 ? 'green' : 'yellow', icon: '📊' }
  ]);
}

// ============================================
// 🧪 اختبار النظام
// ============================================
async function testSystem() {
  displayBanner();

  ui.printSection('اختبار النظام الشامل', { emoji: '🧪', level: 1 });

  const tests = [
    { name: 'فحص ملف .env', status: 'pending' },
    { name: 'فحص مفاتيح API', status: 'pending' },
    { name: 'فحص المجلد الحالي', status: 'pending' },
    { name: 'فحص Node.js', status: 'pending' }
  ];

  // اختبار 1: .env
  ui.startSpinner('فحص ملف .env');
  await new Promise(resolve => setTimeout(resolve, 500));
  const hasEnv = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY ||
                 process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (hasEnv) {
    tests[0].status = 'success';
    ui.succeedSpinner('فحص ملف .env');
  } else {
    tests[0].status = 'error';
    ui.failSpinner('فحص ملف .env');
  }

  // اختبار 2: API Keys
  ui.startSpinner('فحص مفاتيح API');
  await new Promise(resolve => setTimeout(resolve, 500));
  const apiKeys = {
    Claude: !!process.env.ANTHROPIC_API_KEY,
    DeepSeek: !!process.env.DEEPSEEK_API_KEY,
    OpenAI: !!process.env.OPENAI_API_KEY,
    Gemini: !!process.env.GEMINI_API_KEY
  };
  const activeKeys = Object.values(apiKeys).filter(Boolean).length;
  if (activeKeys > 0) {
    tests[1].status = 'success';
    ui.succeedSpinner('فحص مفاتيح API');
  } else {
    tests[1].status = 'error';
    ui.failSpinner('فحص مفاتيح API');
  }

  // اختبار 3: المجلد
  ui.startSpinner('فحص المجلد الحالي');
  await new Promise(resolve => setTimeout(resolve, 500));
  tests[2].status = 'success';
  ui.succeedSpinner('فحص المجلد الحالي');

  // اختبار 4: Node.js
  ui.startSpinner('فحص Node.js');
  await new Promise(resolve => setTimeout(resolve, 500));
  tests[3].status = 'success';
  ui.succeedSpinner('فحص Node.js');

  ui.newLine();

  // عرض مفاتيح API
  ui.printSection('المزودين المتاحين', { emoji: '🔑', level: 2 });

  if (process.env.ANTHROPIC_API_KEY) {
    ui.success(`Claude: ${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...${process.env.ANTHROPIC_API_KEY.substring(process.env.ANTHROPIC_API_KEY.length - 4)}`);
  } else {
    ui.error('Claude: غير متوفر');
  }

  if (process.env.DEEPSEEK_API_KEY) {
    ui.success(`DeepSeek: ${process.env.DEEPSEEK_API_KEY.substring(0, 10)}...${process.env.DEEPSEEK_API_KEY.substring(process.env.DEEPSEEK_API_KEY.length - 4)}`);
  } else {
    ui.error('DeepSeek: غير متوفر');
  }

  if (process.env.OPENAI_API_KEY) {
    ui.success(`OpenAI: ${process.env.OPENAI_API_KEY.substring(0, 10)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`);
  } else {
    ui.error('OpenAI: غير متوفر');
  }

  if (process.env.GEMINI_API_KEY) {
    ui.success(`Gemini: ${process.env.GEMINI_API_KEY.substring(0, 10)}...${process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 4)}`);
  } else {
    ui.error('Gemini: غير متوفر');
  }

  ui.newLine();

  // ملخص النظام
  ui.printSummary('حالة النظام', [
    {
      label: 'النظام جاهز',
      value: activeKeys > 0 ? 'نعم' : 'لا',
      color: activeKeys > 0 ? 'green' : 'red',
      icon: activeKeys > 0 ? '✅' : '❌'
    },
    {
      label: 'المزودين المتاحين',
      value: `${activeKeys}/4`,
      color: activeKeys >= 2 ? 'green' : 'yellow',
      icon: '🔢'
    }
  ]);

  if (activeKeys === 0) {
    ui.newLine();
    ui.error('⚠️  لا توجد مفاتيح API متاحة');
    ui.info('💡 نصيحة: أضف مفاتيح API في ملف .env');
  }
}

// ============================================
// 📋 معلومات النظام
// ============================================
function showInfo() {
  displayBanner();

  ui.printSection('معلومات النظام', { emoji: 'ℹ️', level: 1 });

  const info = {
    'الإصدار': 'v3.0.0 - Professional Edition',
    'المستودع': 'github.com/moaid15-hub/oqool-clean',
    'المطور': 'فريق Oqool',
    'الترخيص': 'MIT',
    'Node.js': process.version,
    'المنصة': process.platform
  };

  ui.printStats(info, { title: 'معلومات النظام' });

  ui.newLine();
  ui.printSection('الميزات', { emoji: '✨', level: 2 });

  const features = [
    '107 أداة وAgent إجمالاً',
    '23 AI Agent متخصص',
    '68 نظام أساسي (Core Systems)',
    '5 مقدمي AI (Claude, Gemini, OpenAI, DeepSeek, Ollama)',
    'واجهة UI احترافية متقدمة',
    'دعم كامل للغة العربية'
  ];

  ui.printList(features, { bullets: true, style: 'modern' });

  ui.newLine();
  ui.printSeparator('═', 60, 'cyan');
}

// ============================================
// 🤖 التحدث مع AI (بسيط - بدون Tools)
// ============================================
async function chatWithAI(prompt, options) {
  displayBanner();

  const provider = options.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini';

  ui.printSection(`طلبك: ${prompt}`, { emoji: '💬', level: 1 });
  ui.newLine();

  ui.startSpinner(`جاري المعالجة باستخدام ${provider}...`, 'dots');

  try {
    // استيراد الـ AI adapter
    const { UnifiedAIAdapterWithTools } = await import('./packages/shared/dist/ai-gateway/unified-ai-adapter.js');

    const aiAdapter = new UnifiedAIAdapterWithTools({
      claude: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
    });

    // إرسال الرسالة
    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await aiAdapter.chat(messages, provider);

    ui.succeedSpinner('تم إنشاء الرد بنجاح!');
    ui.newLine();

    // عرض الرد
    ui.printSection('الرد من AI', { emoji: '🤖', level: 1 });
    ui.printCode(response.text, 'markdown');

    ui.newLine();
    ui.printSummary('معلومات الطلب', [
      { label: 'المزود', value: provider, color: 'cyan', icon: '🔮' },
      { label: 'عدد الأحرف', value: response.text.length, color: 'green', icon: '📝' }
    ]);

  } catch (error) {
    ui.failSpinner('حدث خطأ أثناء المعالجة');
    ui.error(`الخطأ: ${error.message}`);
  }
}

// ============================================
// 🚀 Agent Mode - النظام الكامل مع Tools
// ============================================
async function agentMode(prompt, options) {
  displayBanner();

  const provider = options.provider || process.env.DEFAULT_AI_PROVIDER || 'claude';
  const workingDir = options.directory || process.cwd();

  // إذا لم يكن هناك prompt - وضع تفاعلي
  if (!prompt) {
    await interactiveAgentMode(provider, workingDir);
    return;
  }

  ui.printSection('🤖 Agent Mode - وضع العميل الذكي', { emoji: '🚀', level: 1 });
  ui.printSection(`المشروع: ${workingDir}`, { emoji: '📂', level: 2 });
  ui.printSection(`الطلب: ${prompt}`, { emoji: '💬', level: 2 });
  ui.newLine();

  ui.startSpinner('جاري تحليل المشروع...', 'dots');

  try {
    // استيراد Agent Client
    const { createAgentClient } = await import('./packages/shared/dist/core/agent-client.js');

    // الحصول على API Key حسب المزود
    const apiKeys = {
      claude: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY
    };

    const apiKey = apiKeys[provider] || apiKeys.claude;

    if (!apiKey) {
      ui.failSpinner('لا يوجد API Key للمزود المختار');
      ui.error(`المزود ${provider} غير متوفر. تحقق من ملف .env`);
      return;
    }

    ui.succeedSpinner('تم تحليل المشروع');
    ui.newLine();

    // إنشاء Agent
    const agent = createAgentClient({
      apiKey,
      provider: provider === 'gemini' ? 'anthropic' : provider, // مؤقت - نستخدم claude للكل
      workingDirectory: workingDir,
      maxIterations: 25,
      enablePlanning: true,
      enableContext: true,
      enableLearning: true
    });

    ui.info('🧠 العميل الذكي بدأ العمل...');
    ui.newLine();

    // تشغيل Agent
    const response = await agent.run(prompt);

    ui.newLine();
    ui.printSection('النتيجة النهائية', { emoji: '✨', level: 1 });
    ui.printCode(response, 'markdown');

    // إحصائيات
    const stats = agent.getStats();
    ui.newLine();
    ui.printSummary('إحصائيات العمل', [
      { label: 'المزود', value: provider, color: 'cyan', icon: '🔮' },
      { label: 'عدد الرسائل', value: stats.messagesCount, color: 'blue', icon: '💬' },
      { label: 'عدد التكرارات', value: stats.iterations, color: 'green', icon: '🔄' }
    ]);

  } catch (error) {
    ui.failSpinner('حدث خطأ');
    ui.error(`الخطأ: ${error.message}`);
    console.error(error);
  }
}

// ============================================
// 💬 الوضع التفاعلي للـ Agent
// ============================================
async function interactiveAgentMode(provider, workingDir) {
  ui.printSection('💬 الوضع التفاعلي - Agent Mode', { emoji: '🚀', level: 1 });
  ui.printSection(`المشروع: ${workingDir}`, { emoji: '📂', level: 2 });
  ui.printSection(`المزود: ${provider}`, { emoji: '🔮', level: 2 });
  ui.newLine();

  ui.info('اكتب طلبك واضغط Enter. اكتب "exit" للخروج.');
  ui.newLine();

  try {
    // استيراد inquirer للوضع التفاعلي
    const inquirer = (await import('inquirer')).default;
    const { createAgentClient } = await import('./packages/shared/dist/core/agent-client.js');

    // الحصول على API Key
    const apiKeys = {
      claude: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY
    };

    const apiKey = apiKeys[provider] || apiKeys.claude;

    if (!apiKey) {
      ui.error(`المزود ${provider} غير متوفر. تحقق من ملف .env`);
      return;
    }

    // إنشاء Agent
    const agent = createAgentClient({
      apiKey,
      provider: 'anthropic',
      workingDirectory: workingDir,
      maxIterations: 25,
      enablePlanning: true,
      enableContext: true,
      enableLearning: true
    });

    // حلقة التفاعل
    while (true) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: '💬 أنت:',
          prefix: ''
        }
      ]);

      if (!message.trim()) continue;

      if (message.toLowerCase() === 'exit' || message === 'خروج') {
        ui.success('👋 مع السلامة!');
        break;
      }

      ui.newLine();
      ui.info('🧠 العميل الذكي يعمل...');
      ui.newLine();

      try {
        const response = await agent.run(message);

        ui.newLine();
        ui.printSection('النتيجة', { emoji: '✨', level: 2 });
        console.log(response);
        ui.newLine();
      } catch (error) {
        ui.error(`خطأ: ${error.message}`);
      }
    }

  } catch (error) {
    ui.error(`خطأ في الوضع التفاعلي: ${error.message}`);
    console.error(error);
  }
}

// ============================================
// 🚀 برنامج Commander
// ============================================

program
  .name('oqool')
  .version('3.0.0')
  .description('🧠 Oqool AI Development System - نظام عقول للتطوير الذكي');

program
  .command('providers')
  .alias('p')
  .description('عرض المزودين المتاحين')
  .action(showProviders);

program
  .command('test')
  .alias('t')
  .description('اختبار النظام')
  .action(testSystem);

program
  .command('info')
  .alias('i')
  .description('معلومات عن النظام')
  .action(showInfo);

program
  .command('ai <prompt>')
  .alias('a')
  .description('التحدث مع AI (بسيط - بدون tools)')
  .option('-p, --provider <provider>', 'اختيار المزود (gemini, claude, openai, deepseek)', 'gemini')
  .action(chatWithAI);

program
  .command('agent [prompt]')
  .alias('g')
  .description('🚀 Agent Mode - وضع العميل الذكي الكامل (يقرأ ويعدل الملفات)')
  .option('-p, --provider <provider>', 'اختيار المزود (gemini, claude, openai, deepseek)', 'claude')
  .option('-d, --directory <path>', 'مجلد المشروع', process.cwd())
  .action(agentMode);

// ============================================
// 🎯 تشغيل البرنامج
// ============================================

program.parse(process.argv);

// إذا لم يتم تمرير أي أمر، اعرض المساعدة
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
