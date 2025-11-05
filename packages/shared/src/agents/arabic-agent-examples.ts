// arabic-agent-examples.ts
// ============================================
// 📚 Arabic Agent Usage Examples
// أمثلة استخدام الوكيل العربي
// ============================================

import { ArabicAgent, type MultiProviderConfig } from './arabic-agent.js';

// ============================================
// 🔧 إعداد الوكيل العربي
// Setting Up Arabic Agent
// ============================================

/**
 * مثال 1: إعداد بسيط مع مزود واحد
 */
function example1_SimpleSetup() {
  const config: MultiProviderConfig = {
    providers: [
      {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key',
        model: 'claude-sonnet-4-20250514',
      },
    ],
    defaultProvider: 'anthropic',
  };

  const agent = new ArabicAgent(config);
  return agent;
}

/**
 * مثال 2: إعداد متقدم مع مزودين متعددين (توفير 70-80%)
 */
function example2_MultiProviderSetup() {
  const config: MultiProviderConfig = {
    providers: [
      // DeepSeek - الأرخص للمهام البسيطة
      {
        name: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY || 'your-deepseek-key',
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-coder',
      },
      // OpenAI - متوسط السعر والجودة
      {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'your-openai-key',
        model: 'gpt-4o',
      },
      // Anthropic Claude - الأفضل جودة للمهام المعقدة
      {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key',
        model: 'claude-sonnet-4-20250514',
      },
    ],
    defaultProvider: 'deepseek', // الأرخص كافتراضي
    fallbackEnabled: true, // تفعيل Fallback
    costOptimization: true, // تفعيل توفير التكاليف
    retryAttempts: 3, // 3 محاولات
    timeout: 30000, // 30 ثانية
  };

  const agent = new ArabicAgent(config);
  console.log('✅ تم إعداد Arabic Agent مع توفير 70-80% من التكاليف!');

  return agent;
}

// ============================================
// 📝 أمثلة الاستخدام الأساسية
// Basic Usage Examples
// ============================================

/**
 * مثال 3: فهم متطلب عربي وتحويله لمعمارية
 */
async function example3_UnderstandRequirement() {
  const agent = example2_MultiProviderSetup();

  const requirement = `
أريد نظام لإدارة المكتبة يتضمن:
- تسجيل الكتب والمؤلفين
- استعارة وإرجاع الكتب
- تتبع المستخدمين والاشتراكات
- تقارير عن الكتب الأكثر استعارة
- واجهة ويب للموظفين والأعضاء
- نظام إشعارات للتذكير بموعد الإرجاع
`;

  try {
    console.log('\n📋 تحليل المتطلب العربي...\n');

    const architecture = await agent.understandArabicRequirement(requirement);

    console.log('✅ المعمارية المقترحة:\n');
    console.log('المكونات:', architecture.components);
    console.log('API Endpoints:', architecture.api?.endpoints?.length || 0);
    console.log('جداول قاعدة البيانات:', architecture.database?.tables?.length || 0);
    console.log('إطار الواجهة:', architecture.frontend?.framework || 'N/A');

    return architecture;
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * مثال 4: تحويل فكرة عربية إلى كود
 */
async function example4_IdeaToCode() {
  const agent = example2_MultiProviderSetup();

  const idea = `
اكتب دالة JavaScript تأخذ مصفوفة من الأرقام وترجع مصفوفة جديدة تحتوي فقط على الأرقام الزوجية مضروبة في 2
`;

  try {
    console.log('\n💻 تحويل الفكرة إلى كود...\n');

    const codeFile = await agent.ideaToCode(idea, 'javascript', 'simple');

    console.log('✅ الكود المولد:\n');
    console.log('الملف:', codeFile.path);
    console.log('عدد الأسطر:', codeFile.lines);
    console.log('\nالكود:\n');
    console.log(codeFile.content);

    return codeFile;
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * مثال 5: شرح كود موجود بالعربية
 */
async function example5_ExplainCode() {
  const agent = example2_MultiProviderSetup();

  const code = {
    path: 'quick-sort.js',
    language: 'javascript',
    lines: 15,
    content: `
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log(quickSort(numbers));
`,
  };

  try {
    console.log('\n📖 شرح الكود بالعربية...\n');

    const explanation = await agent.explainCodeInArabic(code, 'intermediate');

    console.log(explanation);
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * مثال 6: تحليل خطأ برمجي وشرحه بالعربية
 */
async function example6_ExplainError() {
  const agent = example2_MultiProviderSetup();

  const errorMessage = "TypeError: Cannot read property 'name' of undefined";
  const code = `
const users = [
  { id: 1, name: 'أحمد' },
  { id: 2, name: 'فاطمة' }
];

function getUserName(userId) {
  const user = users.find(u => u.id === userId);
  return user.name; // الخطأ هنا
}

console.log(getUserName(3)); // undefined
`;

  try {
    console.log('\n🐛 تحليل الخطأ...\n');

    const analysis = await agent.explainError(errorMessage, code, 'javascript');

    console.log(analysis);
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * مثال 7: توليد مثال عملي
 */
async function example7_GenerateExample() {
  const agent = example2_MultiProviderSetup();

  try {
    console.log('\n💡 توليد مثال عن Promises...\n');

    const example = await agent.generateExample('Promises في JavaScript', 'javascript', 'backend');

    console.log('الكود:\n');
    console.log(example.code);
    console.log('\n\nالشرح:\n');
    console.log(example.explanation);
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * مثال 8: استخراج النية من جملة عربية
 */
async function example8_ExtractIntent() {
  const agent = example2_MultiProviderSetup();

  const texts = [
    'اكتب لي API بسيط بـ Express.js',
    'كيف أصلح هذا الخطأ في React؟',
    'اشرح لي مفهوم Closures في JavaScript',
    'حسّن أداء هذا الكود',
    'اكتب اختبارات لهذه الدالة',
  ];

  try {
    console.log('\n🧠 استخراج النية من الجمل العربية...\n');

    for (const text of texts) {
      const result = await agent.extractIntent(text);

      console.log(`📝 النص: "${text}"`);
      console.log(`🎯 النية: ${result.intent}`);
      console.log(`📊 الثقة: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`🔖 الكيانات:`, result.entities);
      console.log('---\n');
    }
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * مثال 9: ترجمة مصطلحات برمجية
 */
function example9_TranslateTerms() {
  const agent = example2_MultiProviderSetup();

  const arabicTerms = ['دالة', 'مصفوفة', 'حلقة', 'شرط', 'كائن', 'متغير'];

  console.log('\n🔤 ترجمة المصطلحات البرمجية:\n');

  arabicTerms.forEach((term) => {
    const english = agent.translateTerm(term);
    console.log(`${term} → ${english}`);
  });

  // ترجمة نص كامل
  const arabicCode = 'أنشئ دالة تأخذ مصفوفة وترجع الكائن';
  const englishCode = agent.translateCodeText(arabicCode);

  console.log('\n📄 ترجمة النص:\n');
  console.log(`عربي: ${arabicCode}`);
  console.log(`إنجليزي: ${englishCode}`);
}

/**
 * مثال 10: محادثة تفاعلية
 */
async function example10_InteractiveChat() {
  const agent = example2_MultiProviderSetup();

  const conversation = [
    'ما هو الفرق بين let و const في JavaScript؟',
    'وما هو الفرق بين var و let؟',
    'متى يجب استخدام كل واحد منهم؟',
    'هل يمكنك إعطائي مثال عملي؟',
  ];

  try {
    console.log('\n💬 محادثة تفاعلية مع السياق:\n');

    for (const message of conversation) {
      console.log(`\n👤 أنت: ${message}\n`);

      const response = await agent.chat(message);

      console.log(`🤖 المساعد: ${response}\n`);
      console.log('─'.repeat(60));
    }
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

// ============================================
// 📊 أمثلة الإحصائيات والتحليلات
// Statistics & Analytics Examples
// ============================================

/**
 * مثال 11: عرض إحصائيات الاستخدام والتكلفة
 */
async function example11_DisplayStatistics() {
  const agent = example2_MultiProviderSetup();

  // تنفيذ بعض العمليات
  await agent.ideaToCode('اكتب دالة للبحث في مصفوفة', 'javascript', 'simple');
  await agent.chat('ما هو React؟');
  await agent.extractIntent('اكتب API بـ Node.js');

  // عرض الإحصائيات
  console.log('\n📊 إحصائيات الاستخدام:\n');
  agent.displayStatistics();

  // الحصول على المقاييس
  const metrics = agent.getMetrics();
  console.log('\n📈 مقاييس الأداء التفصيلية:\n');
  console.log('إجمالي الطلبات:', metrics.totalRequests);
  console.log(
    'نسبة النجاح:',
    ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1) + '%'
  );
  console.log(
    'Cache Hit Rate:',
    ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1) + '%'
  );
}

/**
 * مثال 12: مثال متكامل - مشروع كامل
 */
async function example12_CompleteProjectWorkflow() {
  const agent = example2_MultiProviderSetup();

  console.log('\n🚀 سير عمل مشروع متكامل\n');
  console.log('═'.repeat(60) + '\n');

  try {
    // 1. فهم المتطلب
    console.log('📋 المرحلة 1: فهم المتطلب\n');
    const requirement = 'أريد تطبيق TODO List بسيط مع React و Express';
    const architecture = await agent.understandArabicRequirement(requirement);
    console.log('✅ تم تحليل المعمارية\n');

    // 2. توليد كود Backend
    console.log('🔧 المرحلة 2: توليد Backend\n');
    const backendCode = await agent.ideaToCode(
      'اكتب Express API لإدارة المهام (CRUD)',
      'javascript',
      'medium'
    );
    console.log('✅ تم توليد Backend\n');

    // 3. توليد كود Frontend
    console.log('🎨 المرحلة 3: توليد Frontend\n');
    const frontendCode = await agent.ideaToCode(
      'اكتب React component لعرض وإدارة قائمة المهام',
      'javascript',
      'medium'
    );
    console.log('✅ تم توليد Frontend\n');

    // 4. شرح الكود
    console.log('📖 المرحلة 4: شرح الكود\n');
    const explanation = await agent.explainCodeInArabic(backendCode, 'intermediate');
    console.log('✅ تم شرح الكود\n');

    // 5. عرض الإحصائيات
    console.log('📊 المرحلة 5: إحصائيات المشروع\n');
    agent.displayStatistics();

    console.log('\n🎉 اكتمل المشروع بنجاح!\n');
    console.log('═'.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ خطأ في المشروع:', error);
  }
}

// ============================================
// 🎯 أمثلة متقدمة
// Advanced Examples
// ============================================

/**
 * مثال 13: مقارنة التكلفة بين الاستراتيجيات
 */
async function example13_CostComparison() {
  console.log('\n💰 مقارنة تكلفة الاستراتيجيات المختلفة\n');
  console.log('═'.repeat(60) + '\n');

  // استراتيجية 1: استخدام Claude فقط (تكلفة عالية)
  const config1: MultiProviderConfig = {
    providers: [
      {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'key',
        model: 'claude-sonnet-4-20250514',
      },
    ],
    defaultProvider: 'anthropic',
    costOptimization: false,
  };

  const agent1 = new ArabicAgent(config1);

  // استراتيجية 2: Multi-Provider مع تحسين التكلفة
  const agent2 = example2_MultiProviderSetup();

  // تنفيذ نفس المهام
  const tasks = ['اكتب دالة بسيطة', 'اشرح مفهوم Promises', 'صمم API متقدم', 'حلل هذا الكود المعقد'];

  for (const task of tasks) {
    await agent1.chat(task);
    await agent2.chat(task);
  }

  console.log('\n📊 النتائج:\n');
  console.log('🔴 استراتيجية Claude فقط:');
  const metrics1 = agent1.getMetrics();
  console.log(`   التكلفة: $${metrics1.totalCost.toFixed(4)}`);

  console.log('\n🟢 استراتيجية Multi-Provider:');
  const metrics2 = agent2.getMetrics();
  console.log(`   التكلفة: $${metrics2.totalCost.toFixed(4)}`);

  const savings = ((metrics1.totalCost - metrics2.totalCost) / metrics1.totalCost) * 100;
  console.log(`\n💰 التوفير: ${savings.toFixed(1)}%`);
}

/**
 * مثال 14: استخدام الكاش لتوفير التكاليف
 */
async function example14_CachingExample() {
  const agent = example2_MultiProviderSetup();

  console.log('\n💾 تجربة نظام الكاش\n');
  console.log('═'.repeat(60) + '\n');

  const prompt = 'ما هو React؟';

  // الطلب الأول (بدون كاش)
  console.log('📥 الطلب الأول (بدون كاش)...');
  const start1 = Date.now();
  await agent.chat(prompt);
  const time1 = Date.now() - start1;
  console.log(`⏱️  الوقت: ${time1}ms\n`);

  // الطلب الثاني (من الكاش)
  console.log('📥 الطلب الثاني (من الكاش)...');
  const start2 = Date.now();
  await agent.chat(prompt);
  const time2 = Date.now() - start2;
  console.log(`⏱️  الوقت: ${time2}ms\n`);

  console.log(`🚀 تحسن السرعة: ${(((time1 - time2) / time1) * 100).toFixed(1)}%`);

  const metrics = agent.getMetrics();
  console.log(
    `💰 توفير التكلفة من الكاش: ${((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1)}%`
  );
}

// ============================================
// 🎬 تشغيل الأمثلة
// Run Examples
// ============================================

async function runAllExamples() {
  console.log('\n' + '═'.repeat(60));
  console.log('🌟 أمثلة استخدام Arabic Agent');
  console.log('═'.repeat(60) + '\n');

  // تشغيل الأمثلة بالترتيب
  await example3_UnderstandRequirement();
  await example4_IdeaToCode();
  await example5_ExplainCode();
  await example6_ExplainError();
  await example7_GenerateExample();
  await example8_ExtractIntent();
  example9_TranslateTerms();
  await example10_InteractiveChat();
  await example11_DisplayStatistics();
  await example12_CompleteProjectWorkflow();

  console.log('\n✅ اكتملت جميع الأمثلة!\n');
}

// Export للاستخدام
export {
  example1_SimpleSetup,
  example2_MultiProviderSetup,
  example3_UnderstandRequirement,
  example4_IdeaToCode,
  example5_ExplainCode,
  example6_ExplainError,
  example7_GenerateExample,
  example8_ExtractIntent,
  example9_TranslateTerms,
  example10_InteractiveChat,
  example11_DisplayStatistics,
  example12_CompleteProjectWorkflow,
  example13_CostComparison,
  example14_CachingExample,
  runAllExamples,
};

// تشغيل تلقائي إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
