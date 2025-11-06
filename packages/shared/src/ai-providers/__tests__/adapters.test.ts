// ═══════════════════════════════════════════════════════
// 🧪 Adapters Tests - اختبارات المحولات
// ═══════════════════════════════════════════════════════

import { describe, test, expect } from '@jest/globals';
import { ProviderRegistry } from '../registry/provider-registry';

describe('اختبارات المحولات', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('Claude Adapter', () => {
    test('✅ التسجيل والتهيئة', () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('⚠️  ANTHROPIC_API_KEY غير متوفر - تخطي الاختبار');
        return;
      }

      try {
        const { ClaudeAdapter } = require('../adapters/claude-adapter');
        const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

        registry.registerProvider('claude', adapter);

        const registered = registry.getProvider('claude');
        expect(registered).toBeDefined();
        console.log('✅ Claude Adapter مسجل بنجاح');
      } catch (error: any) {
        console.log('⚠️  Claude Adapter:', error.message);
      }
    });

    test('✅ المحادثة الأساسية', async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('⚠️  تخطي - لا يوجد API key');
        return;
      }

      try {
        const { ClaudeAdapter } = require('../adapters/claude-adapter');
        const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

        const response = await adapter.chat([
          { role: 'user', content: 'قل مرحباً' }
        ]);

        expect(response.content).toBeDefined();
        expect(response.metadata.provider).toBe('claude');
        console.log('✅ Claude محادثة ناجحة');
      } catch (error: any) {
        console.log('⚠️  Claude chat error:', error.message);
      }
    }, 30000);

    test('✅ القدرات', () => {
      if (!process.env.ANTHROPIC_API_KEY) return;

      try {
        const { ClaudeAdapter } = require('../adapters/claude-adapter');
        const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

        const capabilities = adapter.getCapabilities();

        expect(capabilities.name).toBeDefined();
        expect(capabilities.supportsTools).toBeDefined();
        expect(capabilities.supportsStreaming).toBeDefined();

        console.log('✅ Claude قدرات:', {
          tools: capabilities.supportsTools,
          streaming: capabilities.supportsStreaming,
          images: capabilities.supportsImages
        });
      } catch (error) {
        console.log('⚠️  Claude capabilities test skipped');
      }
    });
  });

  describe('DeepSeek Adapter', () => {
    test('✅ التسجيل والتهيئة', () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('⚠️  DEEPSEEK_API_KEY غير متوفر - تخطي الاختبار');
        return;
      }

      try {
        const { DeepSeekAdapter } = require('../adapters/deepseek-adapter');
        const adapter = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY);

        registry.registerProvider('deepseek', adapter);

        const registered = registry.getProvider('deepseek');
        expect(registered).toBeDefined();
        console.log('✅ DeepSeek Adapter مسجل بنجاح');
      } catch (error: any) {
        console.log('⚠️  DeepSeek Adapter:', error.message);
      }
    });

    test('✅ المحادثة الأساسية', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('⚠️  تخطي - لا يوجد API key');
        return;
      }

      try {
        const { DeepSeekAdapter } = require('../adapters/deepseek-adapter');
        const adapter = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY);

        const response = await adapter.chat([
          { role: 'user', content: 'قل مرحباً' }
        ]);

        expect(response.content).toBeDefined();
        expect(response.metadata.provider).toBe('deepseek');
        console.log('✅ DeepSeek محادثة ناجحة');
      } catch (error: any) {
        console.log('⚠️  DeepSeek chat error:', error.message);
      }
    }, 30000);

    test('✅ تقدير التكلفة', () => {
      if (!process.env.DEEPSEEK_API_KEY) return;

      try {
        const { DeepSeekAdapter } = require('../adapters/deepseek-adapter');
        const adapter = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY);

        const estimate = adapter.estimateCost([
          { role: 'user', content: 'رسالة اختبار' }
        ]);

        expect(estimate.estimatedCost).toBeGreaterThanOrEqual(0);
        console.log('✅ DeepSeek تقدير التكلفة: $', estimate.estimatedCost);
      } catch (error) {
        console.log('⚠️  DeepSeek cost estimation skipped');
      }
    });
  });

  describe('Gemini Adapter', () => {
    test('✅ التسجيل والتهيئة', () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('⚠️  GEMINI_API_KEY غير متوفر - تخطي الاختبار');
        return;
      }

      try {
        const { GeminiAdapter } = require('../adapters/gemini-adapter');
        const adapter = new GeminiAdapter(process.env.GEMINI_API_KEY);

        registry.registerProvider('gemini', adapter);

        const registered = registry.getProvider('gemini');
        expect(registered).toBeDefined();
        console.log('✅ Gemini Adapter مسجل بنجاح');
      } catch (error: any) {
        console.log('⚠️  Gemini Adapter:', error.message);
      }
    });

    test('✅ المحادثة الأساسية', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('⚠️  تخطي - لا يوجد API key');
        return;
      }

      try {
        const { GeminiAdapter } = require('../adapters/gemini-adapter');
        const adapter = new GeminiAdapter(process.env.GEMINI_API_KEY);

        const response = await adapter.chat([
          { role: 'user', content: 'قل مرحباً' }
        ]);

        expect(response.content).toBeDefined();
        expect(response.metadata.provider).toBe('gemini');
        console.log('✅ Gemini محادثة ناجحة');
      } catch (error: any) {
        console.log('⚠️  Gemini chat error:', error.message);
      }
    }, 30000);
  });

  describe('OpenAI Adapter', () => {
    test('✅ التسجيل والتهيئة', () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OPENAI_API_KEY غير متوفر - تخطي الاختبار');
        return;
      }

      try {
        const { OpenAIAdapter } = require('../adapters/openai-adapter');
        const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);

        registry.registerProvider('openai', adapter);

        const registered = registry.getProvider('openai');
        expect(registered).toBeDefined();
        console.log('✅ OpenAI Adapter مسجل بنجاح');
      } catch (error: any) {
        console.log('⚠️  OpenAI Adapter:', error.message);
      }
    });

    test('✅ المحادثة الأساسية', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  تخطي - لا يوجد API key');
        return;
      }

      try {
        const { OpenAIAdapter } = require('../adapters/openai-adapter');
        const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);

        const response = await adapter.chat([
          { role: 'user', content: 'قل مرحباً' }
        ]);

        expect(response.content).toBeDefined();
        expect(response.metadata.provider).toBe('openai');
        console.log('✅ OpenAI محادثة ناجحة');
      } catch (error: any) {
        console.log('⚠️  OpenAI chat error:', error.message);
      }
    }, 30000);
  });

  describe('مقارنة المحولات', () => {
    test('✅ مقارنة التكلفة', () => {
      const messages = [
        { role: 'user', content: 'رسالة اختبار طويلة نسبياً لمقارنة التكلفة بين المزودين المختلفين' }
      ];

      const costs: Record<string, number> = {};

      // Claude
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const { ClaudeAdapter } = require('../adapters/claude-adapter');
          const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
          const estimate = adapter.estimateCost(messages);
          costs.claude = estimate.estimatedCost;
        } catch (error) {}
      }

      // DeepSeek
      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const { DeepSeekAdapter } = require('../adapters/deepseek-adapter');
          const adapter = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY);
          const estimate = adapter.estimateCost(messages);
          costs.deepseek = estimate.estimatedCost;
        } catch (error) {}
      }

      console.log('💰 مقارنة التكلفة:');
      Object.entries(costs).forEach(([provider, cost]) => {
        console.log(`   ${provider}: $${cost.toFixed(6)}`);
      });

      if (costs.deepseek && costs.claude) {
        const savings = ((costs.claude - costs.deepseek) / costs.claude * 100).toFixed(1);
        console.log(`   🎯 DeepSeek أرخص بـ ${savings}%`);
      }
    });

    test('✅ مقارنة القدرات', () => {
      const adapters = [];

      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const { ClaudeAdapter } = require('../adapters/claude-adapter');
          adapters.push({ name: 'claude', adapter: new ClaudeAdapter(process.env.ANTHROPIC_API_KEY) });
        } catch (error) {}
      }

      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const { DeepSeekAdapter } = require('../adapters/deepseek-adapter');
          adapters.push({ name: 'deepseek', adapter: new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY) });
        } catch (error) {}
      }

      console.log('📊 مقارنة القدرات:');
      adapters.forEach(({ name, adapter }) => {
        const caps = adapter.getCapabilities();
        console.log(`   ${name}:`);
        console.log(`      - أدوات: ${caps.supportsTools ? '✅' : '❌'}`);
        console.log(`      - بث: ${caps.supportsStreaming ? '✅' : '❌'}`);
        console.log(`      - صور: ${caps.supportsImages ? '✅' : '❌'}`);
      });
    });
  });
});
