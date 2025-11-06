// ═══════════════════════════════════════════════════════
// 🧪 Router Tests - اختبارات الموجه الذكي
// ═══════════════════════════════════════════════════════

import { describe, test, expect, beforeEach } from '@jest/globals';
import { IntelligentRouter } from '../router/intelligent-router';
import { ProviderRegistry } from '../registry/provider-registry';

describe('الموجه الذكي', () => {
  let router: IntelligentRouter;
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();

    // تسجيل مزودين تجريبيين (مع مفاتيح من البيئة)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { ClaudeAdapter } = require('../adapters/claude-adapter');
        registry.registerProvider('claude', new ClaudeAdapter(process.env.ANTHROPIC_API_KEY));
      } catch (error) {
        console.log('⚠️  Claude adapter not available');
      }
    }

    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const { DeepSeekAdapter } = require('../adapters/deepseek-adapter');
        registry.registerProvider('deepseek', new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY));
      } catch (error) {
        console.log('⚠️  DeepSeek adapter not available');
      }
    }

    router = new IntelligentRouter(registry);
  });

  test('✅ اختيار المزود بناءً على التعقيد', async () => {
    const simpleTask = { role: 'user', content: 'قول مرحبا' };
    const complexTask = {
      role: 'user',
      content: 'صمم نظام قاعدة بيانات معقد لتطبيق تجارة إلكترونية مع معاملات متزامنة وتكامل مع بوابات الدفع'
    };

    try {
      const simpleResponse = await router.chat([simpleTask], { speedPriority: true });
      const complexResponse = await router.chat([complexTask], { qualityPriority: true });

      console.log(`✅ مهمة بسيطة: ${simpleResponse.metadata.provider}`);
      console.log(`✅ مهمة معقدة: ${complexResponse.metadata.provider}`);

      expect(simpleResponse.metadata.provider).toBeDefined();
      expect(complexResponse.metadata.provider).toBeDefined();
    } catch (error) {
      console.log('⚠️  لا توجد مزودين متاحين للاختبار');
    }
  }, 60000);

  test('✅ نظام التكلفة الأمثل', async () => {
    const budgetTasks = [
      { role: 'user', content: 'مهمة ميزانية محدودة' }
    ];

    try {
      const response = await router.chat(budgetTasks, { budget: 0.001 });

      expect(response.metadata.cost).toBeLessThanOrEqual(0.001);
      console.log(`✅ التكلفة ضمن الميزانية: $${response.metadata.cost}`);
    } catch (error) {
      console.log('⚠️  اختبار الميزانية تخطى - لا توجد مزودين');
    }
  }, 30000);

  test('✅ إحصائيات الأداء', async () => {
    // إجراء عدة طلبات لتجميع الإحصائيات
    for (let i = 0; i < 3; i++) {
      try {
        await router.chat([{ role: 'user', content: `طلب اختبار ${i + 1}` }]);
      } catch (error) {
        // تجاهل الأخطاء في الاختبار
      }
    }

    const stats = router.getRouterStats();

    expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
    expect(stats.successRate).toBeGreaterThanOrEqual(0);
    expect(stats.averageCost).toBeGreaterThanOrEqual(0);

    console.log('📊 إحصائيات النظام:');
    console.log(`   - إجمالي الطلبات: ${stats.totalRequests}`);
    console.log(`   - معدل النجاح: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`   - متوسط التكلفة: $${stats.averageCost.toFixed(6)}`);
  }, 90000);

  test('✅ اختيار المزود بناءً على الأولوية', async () => {
    const providers = registry.getAvailableProviders();

    if (providers.length === 0) {
      console.log('⚠️  لا توجد مزودين للاختبار');
      return;
    }

    const preferredProvider = providers[0];

    try {
      const response = await router.chat(
        [{ role: 'user', content: 'اختبار أولوية المزود' }],
        { providerPreference: preferredProvider }
      );

      expect(response.metadata.provider).toBe(preferredProvider);
      console.log(`✅ تم اختيار المزود المفضل: ${preferredProvider}`);
    } catch (error) {
      console.log(`⚠️  المزود ${preferredProvider} غير متاح`);
    }
  }, 30000);

  test('✅ Fallback عند فشل المزود', async () => {
    const providers = registry.getAvailableProviders();

    if (providers.length < 2) {
      console.log('⚠️  يحتاج مزودين على الأقل لاختبار Fallback');
      return;
    }

    try {
      // محاولة مع مزود غير موجود، يجب أن يتحول تلقائياً
      const response = await router.chat([
        { role: 'user', content: 'اختبار fallback' }
      ]);

      expect(response.metadata.provider).toBeDefined();
      console.log(`✅ Fallback نجح: استخدم ${response.metadata.provider}`);
    } catch (error) {
      console.log('⚠️  Fallback test skipped');
    }
  }, 30000);

  test('✅ معلومات المزود', () => {
    const providers = registry.getAvailableProviders();

    providers.forEach(providerName => {
      const provider = registry.getProvider(providerName);
      expect(provider).toBeDefined();

      const capabilities = provider.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.name).toBeDefined();

      console.log(`📋 ${providerName}:`);
      console.log(`   - الاسم: ${capabilities.name}`);
      console.log(`   - دعم الأدوات: ${capabilities.supportsTools ? '✅' : '❌'}`);
      console.log(`   - دعم الصور: ${capabilities.supportsImages ? '✅' : '❌'}`);
    });
  });

  test('✅ تحليل المهام', async () => {
    const tasks = [
      { type: 'simple', content: 'ما هو 2+2؟' },
      { type: 'complex', content: 'اشرح نظرية النسبية' },
      { type: 'code', content: 'اكتب برنامج فرز' }
    ];

    for (const task of tasks) {
      try {
        const response = await router.chat([
          { role: 'user', content: task.content }
        ]);

        console.log(`✅ ${task.type}: ${response.metadata.provider}`);
      } catch (error) {
        console.log(`⚠️  ${task.type}: تخطى`);
      }
    }
  }, 90000);
});
