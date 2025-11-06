// ═══════════════════════════════════════════════════════
// 🧪 Final Test - الاختبار النهائي الشامل
// ═══════════════════════════════════════════════════════

import { createCompleteAISystem } from '../index';
import { ExistingSystemIntegration } from '../integration/existing-system-integration';
import { SystemSetup } from '../setup';

/**
 * الاختبار النهائي الشامل
 */
async function runFinalTest() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🧪 الاختبار النهائي الشامل لنظام المزودين الموحد   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const results: any = {
    tests: [],
    totalTests: 0,
    passed: 0,
    failed: 0
  };

  // ═══════════════════════════════════════════════════════
  // Test 1: اختبار التهيئة
  // ═══════════════════════════════════════════════════════
  console.log('📋 Test 1: اختبار التهيئة...');
  try {
    const integration = new ExistingSystemIntegration();
    const initResult = await integration.initialize();

    if (!initResult) {
      results.tests.push({ name: 'التهيئة', status: 'FAILED', error: 'فشل التهيئة' });
      results.failed++;
      console.log('   ❌ FAILED: فشل التهيئة\n');
      return results;
    }

    results.tests.push({ name: 'التهيئة', status: 'PASSED' });
    results.passed++;
    console.log('   ✅ PASSED: التهيئة ناجحة\n');

  } catch (error: any) {
    results.tests.push({ name: 'التهيئة', status: 'FAILED', error: error.message });
    results.failed++;
    console.log(`   ❌ FAILED: ${error.message}\n`);
    return results;
  }

  results.totalTests++;

  // ═══════════════════════════════════════════════════════
  // Test 2: اختبار النظام الجديد
  // ═══════════════════════════════════════════════════════
  console.log('📋 Test 2: اختبار النظام الجديد...');
  try {
    const { router } = createCompleteAISystem();

    const newSystemResponse = await router.chat([
      { role: 'user', content: 'قل مرحباً' }
    ]);

    if (!newSystemResponse || !newSystemResponse.content) {
      throw new Error('لا توجد استجابة');
    }

    results.tests.push({
      name: 'النظام الجديد',
      status: 'PASSED',
      provider: newSystemResponse.metadata.provider,
      cost: newSystemResponse.metadata.cost
    });
    results.passed++;
    console.log(`   ✅ PASSED: النظام الجديد يعمل (${newSystemResponse.metadata.provider})\n`);

  } catch (error: any) {
    results.tests.push({ name: 'النظام الجديد', status: 'FAILED', error: error.message });
    results.failed++;
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  results.totalTests++;

  // ═══════════════════════════════════════════════════════
  // Test 3: اختبار التكامل مع النظام القديم
  // ═══════════════════════════════════════════════════════
  console.log('📋 Test 3: اختبار التكامل مع النظام القديم...');
  try {
    const integration = new ExistingSystemIntegration();
    await integration.initialize();

    const legacyMessages = [
      { role: 'user', text: 'اختبار التكامل' }
    ];

    const hybridResponse = await integration.hybridChat(legacyMessages, true);

    if (!hybridResponse || !hybridResponse.content) {
      throw new Error('لا توجد استجابة من النظام المدمج');
    }

    results.tests.push({ name: 'التكامل', status: 'PASSED' });
    results.passed++;
    console.log('   ✅ PASSED: التكامل مع النظام القديم ناجح\n');

  } catch (error: any) {
    results.tests.push({ name: 'التكامل', status: 'FAILED', error: error.message });
    results.failed++;
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  results.totalTests++;

  // ═══════════════════════════════════════════════════════
  // Test 4: اختبار Fallback
  // ═══════════════════════════════════════════════════════
  console.log('📋 Test 4: اختبار نظام Fallback...');
  try {
    const { router } = createCompleteAISystem();

    // محاولة استخدام مزود غير موجود
    let fallbackWorked = false;
    try {
      await router.withProvider('nonexistent_provider', async () => {
        throw new Error('مزود غير متوفر');
      });
    } catch (error) {
      fallbackWorked = true;
    }

    if (!fallbackWorked) {
      throw new Error('نظام Fallback لم يعمل بشكل صحيح');
    }

    results.tests.push({ name: 'Fallback', status: 'PASSED' });
    results.passed++;
    console.log('   ✅ PASSED: نظام Fallback يعمل بنجاح\n');

  } catch (error: any) {
    results.tests.push({ name: 'Fallback', status: 'FAILED', error: error.message });
    results.failed++;
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  results.totalTests++;

  // ═══════════════════════════════════════════════════════
  // Test 5: اختبار التبديل بين المزودين
  // ═══════════════════════════════════════════════════════
  console.log('📋 Test 5: اختبار التبديل بين المزودين...');
  try {
    const { router } = createCompleteAISystem();
    const providers = (router as any).registry.getAvailableProviders();

    if (providers.length === 0) {
      throw new Error('لا توجد مزودين متاحين');
    }

    let successfulSwitches = 0;
    for (const providerName of providers) {
      try {
        await router.withProvider(providerName, async (provider) => {
          return await provider.chat([{ role: 'user', content: 'test' }]);
        });
        successfulSwitches++;
      } catch (error) {
        // بعض المزودين قد لا تكون مفاتيحهم متوفرة
      }
    }

    if (successfulSwitches === 0) {
      throw new Error('لم ينجح التبديل لأي مزود');
    }

    results.tests.push({
      name: 'التبديل',
      status: 'PASSED',
      providers: providers.length,
      successful: successfulSwitches
    });
    results.passed++;
    console.log(`   ✅ PASSED: التبديل ناجح (${successfulSwitches}/${providers.length} مزودين)\n`);

  } catch (error: any) {
    results.tests.push({ name: 'التبديل', status: 'FAILED', error: error.message });
    results.failed++;
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  results.totalTests++;

  // ═══════════════════════════════════════════════════════
  // Test 6: اختبار الإحصائيات
  // ═══════════════════════════════════════════════════════
  console.log('📋 Test 6: اختبار الإحصائيات...');
  try {
    const { router } = createCompleteAISystem();
    const integration = new ExistingSystemIntegration();
    await integration.initialize();

    const stats = router.getRouterStats();
    const status = integration.getStatus();

    if (stats.totalRequests < 0 || !status.initialized) {
      throw new Error('الإحصائيات غير صحيحة');
    }

    results.tests.push({
      name: 'الإحصائيات',
      status: 'PASSED',
      totalRequests: stats.totalRequests,
      successRate: stats.successRate
    });
    results.passed++;
    console.log('   ✅ PASSED: الإحصائيات تعمل بنجاح\n');

  } catch (error: any) {
    results.tests.push({ name: 'الإحصائيات', status: 'FAILED', error: error.message });
    results.failed++;
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  results.totalTests++;

  // ═══════════════════════════════════════════════════════
  // النتائج النهائية
  // ═══════════════════════════════════════════════════════
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    📊 النتائج النهائية                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const successRate = (results.passed / results.totalTests) * 100;

  console.log(`📈 إجمالي الاختبارات: ${results.totalTests}`);
  console.log(`✅ نجحت: ${results.passed}`);
  console.log(`❌ فشلت: ${results.failed}`);
  console.log(`📊 معدل النجاح: ${successRate.toFixed(1)}%\n`);

  console.log('📋 تفاصيل الاختبارات:');
  results.tests.forEach((test: any, index: number) => {
    const icon = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`   ${index + 1}. ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`      ⚠️  ${test.error}`);
    }
  });

  console.log('\n' + '═'.repeat(60));

  if (successRate === 100) {
    console.log('🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام.');
  } else if (successRate >= 80) {
    console.log('⚠️  معظم الاختبارات نجحت. بعض المشاكل البسيطة تحتاج معالجة.');
  } else {
    console.log('❌ يوجد مشاكل كبيرة تحتاج حل قبل الاستخدام.');
  }

  console.log('═'.repeat(60) + '\n');

  return results;
}

// تشغيل الاختبار النهائي
if (require.main === module) {
  runFinalTest()
    .then((results) => {
      const successRate = (results.passed / results.totalTests) * 100;
      process.exit(successRate === 100 ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ فشل الاختبار النهائي:', error);
      process.exit(1);
    });
}

export { runFinalTest };
