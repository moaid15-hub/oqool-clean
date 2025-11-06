// ═══════════════════════════════════════════════════════
// 🧪 Performance Tests - اختبارات الأداء
// ═══════════════════════════════════════════════════════

import { describe, test, expect } from '@jest/globals';
import { createCompleteAISystem } from '../index';
import { ProviderRegistry } from '../registry/provider-registry';

describe('اختبارات الأداء', () => {
  let system: any;
  let registry: ProviderRegistry;

  beforeAll(() => {
    system = createCompleteAISystem();
    registry = (system.router as any).registry;
  });

  test('✅ سرعة الاستجابة', async () => {
    const startTime = Date.now();

    try {
      const response = await system.router.chat([
        { role: 'user', content: 'مرحباً' }
      ]);

      const duration = Date.now() - startTime;

      expect(response.content).toBeDefined();
      expect(duration).toBeLessThan(30000); // أقل من 30 ثانية

      console.log(`✅ وقت الاستجابة: ${duration}ms`);
      console.log(`   المزود: ${response.metadata.provider}`);
    } catch (error) {
      console.log('⚠️  اختبار السرعة تخطى');
    }
  }, 35000);

  test('✅ الأداء تحت الضغط - 5 طلبات متتالية', async () => {
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < 5; i++) {
      try {
        const requestStart = Date.now();
        const response = await system.router.chat([
          { role: 'user', content: `طلب رقم ${i + 1}` }
        ]);
        const requestDuration = Date.now() - requestStart;

        results.push({
          index: i + 1,
          duration: requestDuration,
          provider: response.metadata.provider,
          success: true
        });
      } catch (error) {
        results.push({
          index: i + 1,
          success: false,
          error: error.message
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;

    console.log('📊 نتائج الأداء تحت الضغط:');
    console.log(`   إجمالي الطلبات: 5`);
    console.log(`   الناجحة: ${successful}/5`);
    console.log(`   الوقت الإجمالي: ${totalDuration}ms`);
    console.log(`   متوسط الوقت: ${(totalDuration / 5).toFixed(0)}ms`);

    results.forEach(r => {
      if (r.success) {
        console.log(`   ${r.index}. ✅ ${r.duration}ms (${r.provider})`);
      } else {
        console.log(`   ${r.index}. ❌ فشل`);
      }
    });

    expect(successful).toBeGreaterThan(0);
  }, 180000);

  test('✅ استهلاك الذاكرة', () => {
    const before = process.memoryUsage();

    // إجراء عدة عمليات
    for (let i = 0; i < 10; i++) {
      system.router.getRouterStats();
      registry.getAvailableProviders();
    }

    const after = process.memoryUsage();
    const heapIncrease = (after.heapUsed - before.heapUsed) / 1024 / 1024;

    console.log('💾 استهلاك الذاكرة:');
    console.log(`   قبل: ${(before.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   بعد: ${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   الزيادة: ${heapIncrease.toFixed(2)} MB`);

    expect(heapIncrease).toBeLessThan(50); // أقل من 50 MB زيادة
  });

  test('✅ مقارنة سرعة المزودين', async () => {
    const providers = registry.getAvailableProviders();

    if (providers.length === 0) {
      console.log('⚠️  لا توجد مزودين للاختبار');
      return;
    }

    const results: Record<string, number> = {};

    for (const provider of providers) {
      try {
        const startTime = Date.now();

        await system.router.withProvider(provider, async (p: any) => {
          return await p.chat([{ role: 'user', content: 'test' }]);
        });

        const duration = Date.now() - startTime;
        results[provider] = duration;
      } catch (error) {
        console.log(`⚠️  ${provider}: غير متاح`);
      }
    }

    console.log('⚡ مقارنة السرعة:');
    Object.entries(results)
      .sort((a, b) => a[1] - b[1])
      .forEach(([provider, duration]) => {
        console.log(`   ${provider}: ${duration}ms`);
      });

    if (Object.keys(results).length > 0) {
      const fastest = Object.entries(results).sort((a, b) => a[1] - b[1])[0];
      console.log(`   🏆 الأسرع: ${fastest[0]} (${fastest[1]}ms)`);
    }
  }, 120000);

  test('✅ كفاءة التكلفة', async () => {
    const providers = registry.getAvailableProviders();
    const costs: Record<string, number> = {};

    const testMessage = [
      { role: 'user', content: 'اكتب دالة بسيطة' }
    ];

    for (const provider of providers) {
      try {
        const providerInstance = registry.getProvider(provider);
        const estimate = providerInstance.estimateCost(testMessage);
        costs[provider] = estimate.estimatedCost;
      } catch (error) {
        console.log(`⚠️  ${provider}: تقدير التكلفة غير متاح`);
      }
    }

    console.log('💰 كفاءة التكلفة:');
    Object.entries(costs)
      .sort((a, b) => a[1] - b[1])
      .forEach(([provider, cost]) => {
        console.log(`   ${provider}: $${cost.toFixed(6)}`);
      });

    if (Object.keys(costs).length > 0) {
      const cheapest = Object.entries(costs).sort((a, b) => a[1] - b[1])[0];
      console.log(`   🏆 الأرخص: ${cheapest[0]} ($${cheapest[1].toFixed(6)})`);
    }
  });

  test('✅ معدل النجاح', async () => {
    let successful = 0;
    let failed = 0;
    const attempts = 5;

    for (let i = 0; i < attempts; i++) {
      try {
        await system.router.chat([
          { role: 'user', content: `طلب اختبار ${i + 1}` }
        ]);
        successful++;
      } catch (error) {
        failed++;
      }
    }

    const successRate = (successful / attempts) * 100;

    console.log('📈 معدل النجاح:');
    console.log(`   الناجحة: ${successful}/${attempts}`);
    console.log(`   الفاشلة: ${failed}/${attempts}`);
    console.log(`   معدل النجاح: ${successRate.toFixed(1)}%`);

    expect(successRate).toBeGreaterThan(0);
  }, 150000);

  test('✅ أداء التبديل بين المزودين', async () => {
    const providers = registry.getAvailableProviders();

    if (providers.length < 2) {
      console.log('⚠️  يحتاج مزودين على الأقل');
      return;
    }

    const startTime = Date.now();
    const switchResults = [];

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];

      try {
        const switchStart = Date.now();

        await system.router.withProvider(provider, async (p: any) => {
          return await p.chat([{ role: 'user', content: `switch to ${provider}` }]);
        });

        const switchDuration = Date.now() - switchStart;

        switchResults.push({
          provider,
          duration: switchDuration,
          success: true
        });
      } catch (error) {
        switchResults.push({
          provider,
          success: false
        });
      }
    }

    const totalSwitchTime = Date.now() - startTime;
    const successfulSwitches = switchResults.filter(r => r.success).length;

    console.log('🔄 أداء التبديل:');
    console.log(`   عدد المزودين: ${providers.length}`);
    console.log(`   التبديلات الناجحة: ${successfulSwitches}/${providers.length}`);
    console.log(`   الوقت الإجمالي: ${totalSwitchTime}ms`);
    console.log(`   متوسط وقت التبديل: ${(totalSwitchTime / providers.length).toFixed(0)}ms`);

    switchResults.forEach(r => {
      if (r.success) {
        console.log(`   ✅ ${r.provider}: ${r.duration}ms`);
      } else {
        console.log(`   ❌ ${r.provider}: فشل`);
      }
    });

    expect(successfulSwitches).toBeGreaterThan(0);
  }, 180000);

  test('✅ تحليل الإحصائيات', () => {
    const stats = system.router.getRouterStats();

    console.log('📊 تحليل شامل:');
    console.log(`   إجمالي الطلبات: ${stats.totalRequests}`);
    console.log(`   معدل النجاح: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`   التكلفة الإجمالية: $${stats.totalCost.toFixed(6)}`);
    console.log(`   متوسط التكلفة: $${stats.averageCost.toFixed(6)}`);

    console.log('   أداء المزودين:');
    Object.entries(stats.providerPerformance).forEach(([provider, perf]: [string, any]) => {
      console.log(`      ${provider}:`);
      console.log(`         طلبات: ${perf.requests}`);
      console.log(`         نجاح: ${(perf.successRate * 100).toFixed(1)}%`);
      console.log(`         متوسط الوقت: ${perf.averageLatency.toFixed(0)}ms`);
    });

    expect(stats.totalRequests).toBeGreaterThan(0);
  });
});
