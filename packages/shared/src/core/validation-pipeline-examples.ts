// validation-pipeline-examples.ts
// ============================================
// 📚 أمثلة استخدام Validation Pipeline
// ============================================

import {
  ValidationPipeline,
  getValidationPipeline,
  ValidationResult,
  ValidationIssue,
} from './validation-pipeline.js';

// ============================================
// 🎯 مثال 1: استخدام بسيط
// ============================================

async function example1_basicUsage() {
  console.log('='.repeat(50));
  console.log('📝 مثال 1: الاستخدام الأساسي');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline();

  const code = `
function login(username, password) {
  var query = 'SELECT * FROM users WHERE username=' + username;
  document.getElementById('result').innerHTML = response;
  console.log('User logged in');
  return eval(password);
}
  `;

  const result = await pipeline.validate(code, 'auth.js');

  console.log('\n📊 النتيجة:');
  console.log(`✅ نجح: ${result.success}`);
  console.log(`📊 إجمالي المشاكل: ${result.totalIssues}`);
  console.log(`🔴 مشاكل حرجة: ${result.criticalIssues}`);
  console.log(`⏱️  الوقت: ${result.duration}ms`);

  console.log('\n🔍 المراحل:');
  result.stages.forEach((stage) => {
    const icon = stage.passed ? '✅' : '❌';
    console.log(
      `${icon} ${stage.stage}: ${stage.errors.length} errors, ${stage.warnings.length} warnings`
    );

    if (stage.errors.length > 0) {
      stage.errors.forEach((err) => {
        console.log(`   🔴 [${err.severity}] ${err.message}`);
        if (err.line) console.log(`      📍 Line ${err.line}:${err.column}`);
        if (err.cwe) console.log(`      🔖 ${err.cwe}`);
      });
    }
  });

  console.log('\n📝 الملخص:');
  console.log(result.summary);
}

// ============================================
// 🎯 مثال 2: مع Auto-Fix
// ============================================

async function example2_withAutoFix() {
  console.log('\n' + '='.repeat(50));
  console.log('🔧 مثال 2: التصليح التلقائي');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline({
    stages: {
      style: {
        enabled: true,
        priority: 'P3',
        autoFix: true,
        stopOnError: false,
        confirm: false,
      },
    },
  });

  const dirtyCode = `
var name = "John";
var age == 25;
console.log("Hello");
if (name == "John") {
	console.log("Match");
}
  `;

  console.log('📝 الكود الأصلي:');
  console.log(dirtyCode);

  const result = await pipeline.validate(dirtyCode, 'example.js');

  console.log('\n✨ الكود بعد التصليح:');
  console.log(result.finalCode);

  console.log('\n📊 التغييرات:');
  result.stages.forEach((stage) => {
    if (stage.autoFixApplied) {
      console.log(`✅ ${stage.stage}: تم تطبيق ${stage.errors.length} إصلاح تلقائي`);
    }
  });
}

// ============================================
// 🎯 مثال 3: مع Confirmation
// ============================================

async function example3_withConfirmation() {
  console.log('\n' + '='.repeat(50));
  console.log('⚠️  مثال 3: طلب التأكيد للإصلاحات الحرجة');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline({
    stages: {
      security: {
        enabled: true,
        priority: 'P1',
        autoFix: true,
        stopOnError: false,
        confirm: true,
      },
    },
  });

  const unsafeCode = `
function processData(input) {
  return eval(input); // خطر!
}
  `;

  let confirmCount = 0;

  const result = await pipeline.validate(unsafeCode, 'unsafe.js', {
    onConfirm: async (issue: ValidationIssue) => {
      confirmCount++;
      console.log(`\n⚠️  يطلب تأكيد (#${confirmCount}):`);
      console.log(`   المشكلة: ${issue.message}`);
      console.log(`   الشدة: ${issue.severity}`);
      console.log(`   الإصلاح: ${issue.fix?.description}`);

      // في الحقيقة، يجب أن تسأل المستخدم
      // هنا سنوافق تلقائياً للعرض
      return true;
    },
  });

  console.log(`\n✅ تم التأكيد على ${confirmCount} إصلاح`);
}

// ============================================
// 🎯 مثال 4: مراقبة التقدم
// ============================================

async function example4_withProgress() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 مثال 4: مراقبة التقدم');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline();

  const code = `
function calculate(x, y) {
  return x + y;
}
  `;

  console.log('⏳ جاري التحقق...\n');

  await pipeline.validate(code, 'math.js', {
    onProgress: (stage, progress) => {
      const percentage = Math.round(progress * 100);
      const bar =
        '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
      console.log(`${stage.padEnd(15)} [${bar}] ${percentage}%`);
    },
  });

  console.log('\n✅ اكتمل!');
}

// ============================================
// 🎯 مثال 5: Custom Configuration
// ============================================

async function example5_customConfig() {
  console.log('\n' + '='.repeat(50));
  console.log('⚙️  مثال 5: إعدادات مخصصة');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline({
    stages: {
      security: {
        enabled: true,
        priority: 'P1',
        autoFix: false,
        stopOnError: true,
        confirm: false,
      },
      performance: {
        enabled: false, // تعطيل فحص الأداء
        priority: 'P3',
        autoFix: false,
        stopOnError: false,
      },
      style: {
        enabled: true,
        priority: 'P3',
        autoFix: true,
        stopOnError: false,
      },
    },
    cache: {
      enabled: true,
      ttl: 1800, // 30 دقيقة
    },
  });

  console.log('📋 الإعدادات:');
  const config = pipeline.getConfig();
  Object.entries(config.stages).forEach(([stage, conf]) => {
    if (conf.enabled) {
      console.log(`✅ ${stage}: ${conf.priority}, autoFix=${conf.autoFix}`);
    } else {
      console.log(`❌ ${stage}: معطل`);
    }
  });

  const code = `function test() { return 1; }`;
  const result = await pipeline.validate(code, 'test.js');

  console.log(`\n✅ تم التحقق من ${result.stages.length} مراحل فقط (performance معطل)`);
}

// ============================================
// 🎯 مثال 6: Cache Performance
// ============================================

async function example6_cachePerformance() {
  console.log('\n' + '='.repeat(50));
  console.log('⚡ مثال 6: أداء الـ Cache');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline({
    cache: {
      enabled: true,
      ttl: 3600,
    },
  });

  const code = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
  `;

  // المرة الأولى
  console.log('🔍 التحقق الأول (بدون cache)...');
  const start1 = Date.now();
  const result1 = await pipeline.validate(code, 'fib.js');
  const time1 = Date.now() - start1;
  console.log(`⏱️  الوقت: ${time1}ms`);

  // المرة الثانية
  console.log('\n🔍 التحقق الثاني (من الـ cache)...');
  const start2 = Date.now();
  const result2 = await pipeline.validate(code, 'fib.js');
  const time2 = Date.now() - start2;
  console.log(`⏱️  الوقت: ${time2}ms`);

  console.log(`\n⚡ التسريع: ${Math.round(time1 / time2)}x أسرع!`);
}

// ============================================
// 🎯 مثال 7: TypeScript Code
// ============================================

async function example7_typescript() {
  console.log('\n' + '='.repeat(50));
  console.log('📘 مثال 7: كود TypeScript');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline();

  const tsCode = `
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  var user = { id: id, name: "Test" };
  return user;
}

const result = getUser("123"); // خطأ في النوع!
  `;

  const result = await pipeline.validate(tsCode, 'user.ts');

  console.log('📊 نتائج فحص TypeScript:');
  const typeStage = result.stages.find((s) => s.stage === 'types');

  if (typeStage) {
    console.log(`\n${typeStage.passed ? '✅' : '❌'} Type Check:`);
    console.log(`   أخطاء: ${typeStage.errors.length}`);
    console.log(`   تحذيرات: ${typeStage.warnings.length}`);

    typeStage.errors.forEach((err) => {
      console.log(`\n   🔴 ${err.message}`);
      console.log(`      📍 السطر ${err.line}`);
      console.log(`      🔧 ${err.fix?.description}`);
    });
  }
}

// ============================================
// 🎯 مثال 8: Security-First Pipeline
// ============================================

async function example8_securityFirst() {
  console.log('\n' + '='.repeat(50));
  console.log('🔒 مثال 8: الأمان أولاً');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline({
    stages: {
      security: {
        enabled: true,
        priority: 'P1',
        autoFix: false,
        stopOnError: true, // توقف عند أول مشكلة أمنية
        confirm: true,
      },
      syntax: {
        enabled: true,
        priority: 'P2',
        autoFix: true,
        stopOnError: false,
      },
    },
  });

  const vulnerableCode = `
function login(username, password) {
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE username='" + username + "'";
  
  // XSS vulnerability
  document.getElementById('welcome').innerHTML = "Hello " + username;
  
  // Dangerous eval
  const result = eval(password);
  
  return result;
}
  `;

  console.log('🔍 فحص الكود...');

  const result = await pipeline.validate(vulnerableCode, 'auth.js', {
    onConfirm: async (issue) => {
      console.log(`\n⚠️  ثغرة أمنية مكتشفة!`);
      console.log(`   النوع: ${issue.type}`);
      console.log(`   ${issue.cwe}`);
      console.log(`   الرسالة: ${issue.message}`);
      return false; // لا توافق على الإصلاح
    },
  });

  console.log('\n📊 التقرير الأمني:');
  const securityStage = result.stages.find((s) => s.stage === 'security');

  if (securityStage) {
    console.log(
      `🔴 ثغرات حرجة: ${securityStage.errors.filter((e) => e.severity === 'critical').length}`
    );
    console.log(
      `🟠 ثغرات عالية: ${securityStage.errors.filter((e) => e.severity === 'high').length}`
    );
    console.log(
      `🟡 ثغرات متوسطة: ${securityStage.warnings.filter((w) => w.severity === 'medium').length}`
    );

    console.log('\n🔍 تفاصيل الثغرات:');
    securityStage.errors.forEach((err, i) => {
      console.log(`\n${i + 1}. [${err.severity.toUpperCase()}] ${err.type}`);
      console.log(`   ${err.message}`);
      console.log(`   السطر: ${err.line}`);
      console.log(`   CWE: ${err.cwe}`);
      console.log(`   الحل: ${err.fix?.description}`);
    });
  }
}

// ============================================
// 🎯 مثال 9: Performance Analysis
// ============================================

async function example9_performanceAnalysis() {
  console.log('\n' + '='.repeat(50));
  console.log('⚡ مثال 9: تحليل الأداء');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline({
    stages: {
      performance: {
        enabled: true,
        priority: 'P2',
        autoFix: false,
        stopOnError: false,
      },
    },
  });

  const inefficientCode = `
function findUser(id) {
  // O(n²) complexity - nested loops
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users[i].permissions.length; j++) {
      if (users[i].permissions[j].id === id) {
        return users[i];
      }
    }
  }
  
  // Large array allocation
  const bigArray = new Array(100000);
  
  // Inefficient deep clone
  const clone = JSON.parse(JSON.stringify(users));
  
  return null;
}
  `;

  const result = await pipeline.validate(inefficientCode, 'search.js');

  console.log('📊 تحليل الأداء:');
  const perfStage = result.stages.find((s) => s.stage === 'performance');

  if (perfStage) {
    console.log(`\n⚠️  تحذيرات: ${perfStage.warnings.length}`);
    console.log(`💡 اقتراحات: ${perfStage.suggestions.length}`);

    perfStage.warnings.forEach((warn) => {
      console.log(`\n🟡 ${warn.message}`);
      console.log(`   السطر: ${warn.line}`);
      console.log(`   💡 ${warn.fix?.description}`);
    });
  }
}

// ============================================
// 🎯 مثال 10: Batch Validation
// ============================================

async function example10_batchValidation() {
  console.log('\n' + '='.repeat(50));
  console.log('📦 مثال 10: التحقق من ملفات متعددة');
  console.log('='.repeat(50));

  const pipeline = new ValidationPipeline();

  const files = [
    { path: 'auth.js', code: 'function login() { eval("test"); }' },
    { path: 'user.js', code: 'var x = 1; console.log(x);' },
    { path: 'api.js', code: 'function api() { return 42; }' },
  ];

  console.log(`🔍 فحص ${files.length} ملفات...\n`);

  const results = await Promise.all(files.map((file) => pipeline.validate(file.code, file.path)));

  console.log('📊 النتائج:');
  results.forEach((result, i) => {
    const file = files[i];
    const icon = result.success ? '✅' : '❌';
    console.log(
      `${icon} ${file.path}: ${result.totalIssues} issues (${result.criticalIssues} critical)`
    );
  });

  const totalIssues = results.reduce((sum, r) => sum + r.totalIssues, 0);
  const totalCritical = results.reduce((sum, r) => sum + r.criticalIssues, 0);

  console.log(`\n📊 الإجمالي:`);
  console.log(`   مشاكل: ${totalIssues}`);
  console.log(`   حرجة: ${totalCritical}`);
  console.log(`   نجح: ${results.filter((r) => r.success).length}/${results.length}`);
}

// ============================================
// 🚀 تشغيل جميع الأمثلة
// ============================================

async function runAllExamples() {
  console.log('\n');
  console.log('🎯 Validation Pipeline - أمثلة الاستخدام');
  console.log('='.repeat(50));

  try {
    await example1_basicUsage();
    await example2_withAutoFix();
    await example3_withConfirmation();
    await example4_withProgress();
    await example5_customConfig();
    await example6_cachePerformance();
    await example7_typescript();
    await example8_securityFirst();
    await example9_performanceAnalysis();
    await example10_batchValidation();

    console.log('\n' + '='.repeat(50));
    console.log('✅ جميع الأمثلة اكتملت بنجاح!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

// تشغيل عند استدعاء الملف مباشرة
// Commented for ES modules compatibility
// if (require.main === module) {
//   runAllExamples().catch(console.error);
// }

// تصدير للاستخدام في ملفات أخرى
export {
  example1_basicUsage,
  example2_withAutoFix,
  example3_withConfirmation,
  example4_withProgress,
  example5_customConfig,
  example6_cachePerformance,
  example7_typescript,
  example8_securityFirst,
  example9_performanceAnalysis,
  example10_batchValidation,
  runAllExamples,
};
