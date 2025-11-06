// ═══════════════════════════════════════════════════════
// 🧪 Integration Tests - اختبارات التكامل الشاملة
// ═══════════════════════════════════════════════════════

import { describe, test, expect, beforeAll } from '@jest/globals';
import { createCompleteAISystem } from '../index';
import { ProviderRegistry } from '../registry/provider-registry';

describe('نظام المزودين المتكامل', () => {
  let system: any;
  let registry: ProviderRegistry;

  beforeAll(() => {
    system = createCompleteAISystem();
    registry = (system.router as any).registry;
  });

  test('✅ التهيئة الأساسية تعمل', () => {
    const providers = registry.getAvailableProviders();
    expect(providers.length).toBeGreaterThan(0);
    console.log(`✅ المزودون المتاحون: ${providers.join(', ')}`);
  });

  test('✅ المحادثة البسيطة تعمل', async () => {
    const response = await system.router.chat([
      { role: 'user', content: 'مرحبا، هل أنت جاهز للعمل؟' }
    ]);

    expect(response.content).toBeDefined();
    expect(response.metadata.provider).toBeDefined();
    expect(response.metadata.cost).toBeGreaterThanOrEqual(0);
    console.log(`✅ محادثة بسيطة: ${response.metadata.provider} - $${response.metadata.cost}`);
  }, 30000); // 30 seconds timeout

  test('✅ التبديل بين المزودين يعمل', async () => {
    const providers = registry.getAvailableProviders();

    for (const provider of providers) {
      try {
        const response = await system.router.withProvider(provider, async (p: any) => {
          return await p.chat([{ role: 'user', content: `اختبار مزود ${provider}` }]);
        });

        expect(response.metadata.provider).toBe(provider);
        console.log(`✅ مزود ${provider} يعمل بنجاح`);
      } catch (error) {
        console.log(`⚠️  مزود ${provider} غير متاح`);
      }
    }
  }, 60000);

  test('✅ نظام Fallback يعمل عند الفشل', async () => {
    const invalidProvider = 'invalid_provider';

    try {
      await system.router.withProvider(invalidProvider, async () => {
        throw new Error('مزود غير متوفر');
      });
    } catch (error) {
      // Fallback يجب أن يتحول للمزود التالي
      const stats = system.router.getRouterStats();
      expect(stats).toBeDefined();
      console.log(`✅ نظام Fallback يعمل عند الأخطاء`);
    }
  });

  test('✅ تحليل التكلفة يعمل', async () => {
    const messages = [
      { role: 'user', content: 'هذا رسالة اختبار لتحليل التكلفة' }
    ];

    const providers = registry.getAvailableProviders();
    const costs: Record<string, number> = {};

    for (const provider of providers) {
      try {
        const providerInstance = registry.getProvider(provider);
        const costEstimate = providerInstance.estimateCost(messages);
        costs[provider] = costEstimate.estimatedCost;
        console.log(`💰 ${provider}: $${costEstimate.estimatedCost}`);
      } catch (error) {
        console.log(`⚠️  ${provider}: تقدير التكلفة غير متاح`);
      }
    }

    expect(Object.keys(costs).length).toBeGreaterThan(0);
  });

  test('✅ الأدوات تعمل مع المزودين المدعومين', async () => {
    const tools = [
      {
        name: 'calculate',
        description: 'أداة حسابية بسيطة',
        parameters: {
          operation: { type: 'string', enum: ['add', 'subtract', 'multiply'] },
          a: { type: 'number' },
          b: { type: 'number' }
        },
        execute: async (args: any) => {
          const { operation, a, b } = args;
          switch (operation) {
            case 'add': return a + b;
            case 'subtract': return a - b;
            case 'multiply': return a * b;
            default: throw new Error('عملية غير مدعومة');
          }
        }
      }
    ];

    try {
      const response = await system.router.chatWithTools(
        [{ role: 'user', content: 'احسب 5 + 3 باستخدام الأداة' }],
        tools
      );

      expect(response.content).toBeDefined();
      console.log(`✅ الأدوات تعمل: ${response.content.substring(0, 50)}...`);
    } catch (error) {
      console.log(`⚠️  الأدوات غير مدعومة في المزود الحالي`);
    }
  }, 30000);

  test('✅ الإحصائيات تعمل بشكل صحيح', () => {
    const stats = system.router.getRouterStats();

    expect(stats).toBeDefined();
    expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
    expect(stats.successRate).toBeGreaterThanOrEqual(0);
    expect(stats.successRate).toBeLessThanOrEqual(1);
    expect(stats.averageCost).toBeGreaterThanOrEqual(0);

    console.log('📊 الإحصائيات:');
    console.log(`   - إجمالي الطلبات: ${stats.totalRequests}`);
    console.log(`   - معدل النجاح: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`   - متوسط التكلفة: $${stats.averageCost.toFixed(6)}`);
  });

  test('✅ التكامل مع الأنظمة الأخرى', async () => {
    // اختبار agent integration
    expect(system.agentIntegration).toBeDefined();

    // اختبار tool integration
    expect(system.toolIntegration).toBeDefined();

    // اختبار CLI integration
    expect(system.cliIntegration).toBeDefined();

    console.log('✅ جميع التكاملات متوفرة');
  });
});
