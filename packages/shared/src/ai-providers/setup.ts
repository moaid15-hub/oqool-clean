// ═══════════════════════════════════════════════════════
// 🛠️  System Setup - التهيئة الآلية للنظام
// ═══════════════════════════════════════════════════════

import { createCompleteAISystem } from './index';
import { ExistingSystemIntegration } from './integration/existing-system-integration';

/**
 * برنامج التثبيت والتهيئة الآلي
 */
export class SystemSetup {
  /**
   * التهيئة الكاملة للنظام
   */
  static async setup(): Promise<boolean> {
    console.log('🛠️  بدء تهيئة نظام المزودين الموحد...\n');

    try {
      // 1. التحقق من المفاتيح
      console.log('1. 🔑 التحقق من مفاتيح API...');
      const keysStatus = this.checkAPIKeys();
      if (!keysStatus.hasValidKeys) {
        console.log('❌ لا توجد مفاتيح API صالحة');
        console.log('💡 تلميح: أضف مفاتيح API في ملف .env:');
        console.log('   ANTHROPIC_API_KEY=your_key');
        console.log('   DEEPSEEK_API_KEY=your_key');
        console.log('   OPENAI_API_KEY=your_key');
        console.log('   GEMINI_API_KEY=your_key');
        return false;
      }
      console.log(`✅ المفاتيح صالحة: ${keysStatus.availableProviders.join(', ')}\n`);

      // 2. تهيئة النظام
      console.log('2. 🔧 تهيئة النظام...');
      const integration = new ExistingSystemIntegration();
      const initResult = await integration.initialize();

      if (!initResult) {
        console.log('❌ فشل تهيئة النظام');
        return false;
      }
      console.log('✅ تمت تهيئة النظام\n');

      // 3. الاختبار الأولي
      console.log('3. 🧪 اختبار النظام...');
      const testResult = await this.runInitialTests();

      if (!testResult.success) {
        console.log('❌ فشل الاختبار الأولي');
        console.log('   تفاصيل:', testResult.details);
        return false;
      }
      console.log('✅ اجتاز النظام جميع الاختبارات\n');

      // 4. التقرير النهائي
      console.log('4. 📋 التقرير النهائي:');
      this.printFinalReport(keysStatus, testResult);

      console.log('\n🎉 تم تركيب النظام بنجاح! يمكنك الآن استخدام نظام المزودين الموحد.');
      console.log('📚 لمزيد من المعلومات، راجع التوثيق في /docs');

      return true;

    } catch (error: any) {
      console.error('❌ فشل التهيئة:', error.message);
      return false;
    }
  }

  /**
   * التحقق من مفاتيح API
   */
  private static checkAPIKeys(): { hasValidKeys: boolean; availableProviders: string[] } {
    const availableProviders: string[] = [];

    if (process.env.ANTHROPIC_API_KEY) {
      availableProviders.push('claude');
    }

    if (process.env.DEEPSEEK_API_KEY) {
      availableProviders.push('deepseek');
    }

    if (process.env.OPENAI_API_KEY) {
      availableProviders.push('openai');
    }

    if (process.env.GEMINI_API_KEY) {
      availableProviders.push('gemini');
    }

    return {
      hasValidKeys: availableProviders.length > 0,
      availableProviders
    };
  }

  /**
   * تشغيل الاختبارات الأولية
   */
  private static async runInitialTests(): Promise<{ success: boolean; details: any }> {
    const details: any = {};

    try {
      const { router } = createCompleteAISystem();

      // اختبار محادثة بسيطة
      try {
        const chatTest = await router.chat([{ role: 'user', content: 'test' }]);
        details.chatTest = {
          success: !!chatTest.content,
          provider: chatTest.metadata.provider,
          cost: chatTest.metadata.cost
        };
      } catch (error: any) {
        details.chatTest = {
          success: false,
          error: error.message
        };
      }

      // اختبار التبديل
      try {
        const providers = (router as any).registry.getAvailableProviders();
        details.switchTest = {
          success: providers.length > 0,
          providers
        };
      } catch (error: any) {
        details.switchTest = {
          success: false,
          error: error.message
        };
      }

      const success = details.chatTest?.success && details.switchTest?.success;
      return { success, details };

    } catch (error: any) {
      return {
        success: false,
        details: { error: error.message }
      };
    }
  }

  /**
   * طباعة التقرير النهائي
   */
  private static printFinalReport(keysStatus: any, testResult: any): void {
    console.log('   🔑 المفاتيح المتاحة:');
    keysStatus.availableProviders.forEach((provider: string) => {
      console.log(`      - ${provider}: ✅`);
    });

    console.log('   🧪 نتائج الاختبار:');
    console.log(`      - المحادثة: ${testResult.details.chatTest?.success ? '✅' : '❌'}`);
    console.log(`      - التبديل: ${testResult.details.switchTest?.success ? '✅' : '❌'}`);

    if (testResult.details.chatTest?.success) {
      console.log(`      - مزود افتراضي: ${testResult.details.chatTest.provider}`);
      console.log(`      - تكلفة الاختبار: $${testResult.details.chatTest.cost.toFixed(6)}`);
    }

    if (testResult.details.switchTest?.success) {
      console.log(`      - عدد المزودين: ${testResult.details.switchTest.providers.length}`);
    }
  }

  /**
   * التهيئة السريعة (بدون طباعة تفصيلية)
   */
  static async quickSetup(): Promise<{ success: boolean; router?: any; integration?: any }> {
    try {
      const keysStatus = this.checkAPIKeys();
      if (!keysStatus.hasValidKeys) {
        return { success: false };
      }

      const integration = new ExistingSystemIntegration();
      const initResult = await integration.initialize();

      if (!initResult) {
        return { success: false };
      }

      const { router } = createCompleteAISystem();

      return {
        success: true,
        router,
        integration
      };

    } catch (error) {
      return { success: false };
    }
  }

  /**
   * التحقق من الحالة فقط (بدون تهيئة)
   */
  static checkStatus(): {
    hasKeys: boolean;
    availableProviders: string[];
    recommendations: string[];
  } {
    const keysStatus = this.checkAPIKeys();
    const recommendations: string[] = [];

    if (!keysStatus.hasValidKeys) {
      recommendations.push('أضف على الأقل مفتاح API واحد في ملف .env');
    }

    if (keysStatus.availableProviders.length === 1) {
      recommendations.push('أضف مزودين إضافيين للاستفادة من نظام Fallback');
    }

    if (!keysStatus.availableProviders.includes('deepseek')) {
      recommendations.push('أضف DeepSeek للحصول على أقل تكلفة');
    }

    if (!keysStatus.availableProviders.includes('claude')) {
      recommendations.push('أضف Claude للحصول على أفضل جودة');
    }

    return {
      hasKeys: keysStatus.hasValidKeys,
      availableProviders: keysStatus.availableProviders,
      recommendations
    };
  }
}

// التهيئة التلقائية عند الاستيراد (اختياري - معطل افتراضياً)
// لتفعيل التهيئة التلقائية، قم بإلغاء التعليق عن السطر التالي:
// SystemSetup.setup().catch(console.error);
