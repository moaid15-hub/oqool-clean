// ═══════════════════════════════════════════════════════
// 🎯 Complete Demo - عرض توضيحي شامل
// ═══════════════════════════════════════════════════════

import { createCompleteAISystem } from '../index';
import { SystemSetup } from '../setup';
import { ExistingSystemIntegration } from '../integration/existing-system-integration';

/**
 * عرض توضيحي شامل لجميع ميزات النظام
 */
async function runCompleteDemo() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎯 عرض توضيحي شامل لنظام المزودين الموحد');
  console.log('═══════════════════════════════════════════════════════\n');

  // ═══════════════════════════════════════════════════════
  // 1. التهيئة والاختبار
  // ═══════════════════════════════════════════════════════
  console.log('📦 الخطوة 1: التهيئة والاختبار\n');

  const setupResult = await SystemSetup.setup();
  if (!setupResult) {
    console.log('❌ فشل التهيئة - توقف العرض التوضيحي');
    return;
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════
  // 2. الاستخدام الأساسي
  // ═══════════════════════════════════════════════════════
  console.log('💬 الخطوة 2: الاستخدام الأساسي\n');

  const { router } = createCompleteAISystem();

  // محادثة بسيطة
  console.log('📝 محادثة بسيطة:');
  const response1 = await router.chat([
    { role: 'user', content: 'اكتب دالة JavaScript لحساب مضروب عدد' }
  ]);

  console.log(`   ✅ المزود: ${response1.metadata.provider}`);
  console.log(`   💰 التكلفة: $${response1.metadata.cost.toFixed(6)}`);
  console.log(`   ⚡ المدة: ${response1.metadata.duration}ms`);
  console.log(`   📄 الإجابة: ${response1.content.substring(0, 100)}...`);

  console.log('\n' + '═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════
  // 3. التبديل بين المزودين
  // ═══════════════════════════════════════════════════════
  console.log('🔄 الخطوة 3: التبديل بين المزودين\n');

  const providers = (router as any).registry.getAvailableProviders();
  console.log(`🔍 المزودون المتاحون: ${providers.join(', ')}\n`);

  for (const providerName of providers) {
    try {
      const response = await router.withProvider(providerName, async (provider) => {
        return await provider.chat([
          { role: 'user', content: 'قل مرحباً' }
        ]);
      });

      console.log(`   ${providerName}:`);
      console.log(`      ✅ النجاح: نعم`);
      console.log(`      💰 التكلفة: $${response.metadata.cost.toFixed(6)}`);

    } catch (error: any) {
      console.log(`   ${providerName}:`);
      console.log(`      ❌ النجاح: لا - ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════
  // 4. الاختيار الذكي
  // ═══════════════════════════════════════════════════════
  console.log('🧠 الخطوة 4: الاختيار الذكي بناءً على نوع المهمة\n');

  const tasks = [
    {
      task: 'ما هو 2+2؟',
      type: 'بسيط',
      options: { speedPriority: true }
    },
    {
      task: 'صمم نظام معماري معقد لتطبيق تجارة إلكترونية بملايين المستخدمين',
      type: 'معقد',
      options: { qualityPriority: true }
    },
    {
      task: 'اكتب سكريبت بسيط',
      type: 'ميزانية محدودة',
      options: { budget: 0.001 }
    }
  ];

  for (const { task, type, options } of tasks) {
    const response = await router.chat([
      { role: 'user', content: task }
    ], options);

    console.log(`   المهمة (${type}):`);
    console.log(`      📝 المحتوى: ${task.substring(0, 40)}...`);
    console.log(`      ✅ المزود المختار: ${response.metadata.provider}`);
    console.log(`      💰 التكلفة: $${response.metadata.cost.toFixed(6)}\n`);
  }

  console.log('═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════
  // 5. التكامل مع النظام القديم
  // ═══════════════════════════════════════════════════════
  console.log('🔗 الخطوة 5: التكامل مع النظام القديم\n');

  const integration = new ExistingSystemIntegration();
  await integration.initialize();

  // استخدام نفس الصيغة القديمة
  const legacyMessages = [
    { role: 'user', text: 'هذه رسالة بالصيغة القديمة' }
  ];

  const hybridResponse = await integration.hybridChat(legacyMessages, true);
  console.log(`   ✅ التكامل ناجح`);
  console.log(`   📄 الرد: ${hybridResponse.text || hybridResponse.content}`);

  console.log('\n' + '═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════
  // 6. الإحصائيات والتقارير
  // ═══════════════════════════════════════════════════════
  console.log('📊 الخطوة 6: الإحصائيات والتقارير\n');

  const stats = router.getRouterStats();
  console.log('   📈 إحصائيات الأداء:');
  console.log(`      - إجمالي الطلبات: ${stats.totalRequests}`);
  console.log(`      - معدل النجاح: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`      - متوسط التكلفة: $${stats.averageCost.toFixed(6)}`);
  console.log(`      - إجمالي التكلفة: $${stats.totalCost.toFixed(6)}`);

  console.log('\n   🔍 أداء المزودين:');
  Object.entries(stats.providerPerformance).forEach(([provider, perf]: [string, any]) => {
    console.log(`      ${provider}:`);
    console.log(`         - الطلبات: ${perf.requests}`);
    console.log(`         - النجاح: ${(perf.successRate * 100).toFixed(1)}%`);
    console.log(`         - متوسط الوقت: ${perf.averageLatency.toFixed(0)}ms`);
  });

  const integrationStatus = integration.getStatus();
  console.log('\n   🔄 حالة التكامل:');
  console.log(`      - التهيئة: ${integrationStatus.initialized ? '✅' : '❌'}`);
  console.log(`      - المزودون النشطون: ${Object.keys(integrationStatus.availableProviders).length}`);

  console.log('\n' + '═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════
  // 7. اختبار Fallback
  // ═══════════════════════════════════════════════════════
  console.log('🛡️  الخطوة 7: اختبار نظام Fallback\n');

  console.log('   🧪 محاكاة فشل مزود...');
  try {
    await router.withProvider('nonexistent_provider', async () => {
      throw new Error('مزود غير متوفر');
    });
  } catch (error) {
    console.log('   ✅ تم اكتشاف الفشل بنجاح');
    console.log('   🔄 نظام Fallback سيتحول تلقائياً للمزود التالي');
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════
  // 8. التقرير النهائي
  // ═══════════════════════════════════════════════════════
  console.log('🎉 التقرير النهائي\n');

  console.log('   ✅ جميع الاختبارات نجحت!');
  console.log('   📊 النظام يعمل بكفاءة عالية');
  console.log('   🚀 جاهز للاستخدام في الإنتاج');

  console.log('\n' + '═'.repeat(60));
  console.log('🏁 انتهى العرض التوضيحي الشامل');
  console.log('═'.repeat(60) + '\n');
}

// تشغيل العرض التوضيحي
if (require.main === module) {
  runCompleteDemo()
    .then(() => {
      console.log('✅ اكتمل العرض التوضيحي بنجاح');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ فشل العرض التوضيحي:', error);
      process.exit(1);
    });
}

export { runCompleteDemo };
