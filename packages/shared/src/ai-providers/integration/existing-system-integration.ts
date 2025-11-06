// ═══════════════════════════════════════════════════════
// 🔄 Existing System Integration - التكامل مع النظام الحالي
// ═══════════════════════════════════════════════════════

import { IntelligentRouter } from '../router/intelligent-router';
import { ProviderRegistry } from '../registry/provider-registry';

/**
 * تكامل سلس مع النظام الحالي بدون كسر أي وظائف
 *
 * هذا النظام يسمح بالترقية التدريجية من النظام القديم للنظام الجديد
 * بدون الحاجة لإعادة كتابة كل الكود دفعة واحدة
 */
export class ExistingSystemIntegration {
  private router!: IntelligentRouter;
  private isInitialized: boolean = false;

  constructor() {
    // التهيئة المؤجلة - لا تبدأ حتى يتم استدعاء initialize()
  }

  /**
   * التهيئة الآمنة - لا تؤثر على النظام الحالي حتى يتم استدعاؤها
   */
  async initialize(): Promise<boolean> {
    try {
      const registry = new ProviderRegistry();

      // التسجيل الآمن - فقط المزودين المتاحين
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const { ClaudeAdapter } = await import('../adapters/claude-adapter');
          registry.registerProvider('claude', new ClaudeAdapter(process.env.ANTHROPIC_API_KEY));
          console.log('✅ Claude adapter registered');
        } catch (error) {
          console.warn('⚠️  Claude adapter failed to load:', error);
        }
      }

      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const { DeepSeekAdapter } = await import('../adapters/deepseek-adapter');
          registry.registerProvider('deepseek', new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY));
          console.log('✅ DeepSeek adapter registered');
        } catch (error) {
          console.warn('⚠️  DeepSeek adapter failed to load:', error);
        }
      }

      if (process.env.OPENAI_API_KEY) {
        try {
          const { OpenAIAdapter } = await import('../adapters/openai-adapter');
          registry.registerProvider('openai', new OpenAIAdapter(process.env.OPENAI_API_KEY));
          console.log('✅ OpenAI adapter registered');
        } catch (error) {
          console.warn('⚠️  OpenAI adapter failed to load:', error);
        }
      }

      if (process.env.GEMINI_API_KEY) {
        try {
          const { GeminiAdapter } = await import('../adapters/gemini-adapter');
          registry.registerProvider('gemini', new GeminiAdapter(process.env.GEMINI_API_KEY));
          console.log('✅ Gemini adapter registered');
        } catch (error) {
          console.warn('⚠️  Gemini adapter failed to load:', error);
        }
      }

      this.router = new IntelligentRouter(registry);
      this.isInitialized = true;

      console.log('🚀 Unified Provider System initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Unified Provider System:', error);
      return false;
    }
  }

  /**
   * استبدال آمن للدوال الحالية
   */
  async replaceLegacyChat(
    messages: any[],
    options: any = {}
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('System not initialized. Call initialize() first.');
    }

    // تحويل من الصيغة القديمة للصيغة الموحدة
    const unifiedMessages = this.convertFromLegacyFormat(messages);

    const response = await this.router.chat(unifiedMessages, {
      providerPreference: options.provider,
      budget: options.budget,
      speedPriority: options.speedPriority,
      qualityPriority: options.qualityPriority
    });

    // تحويل للصيغة القديمة للحفاظ على التوافق
    return this.convertToLegacyFormat(response);
  }

  /**
   * الترقية التدريجية - تعمل مع النظام القديم والجديد
   */
  async hybridChat(
    messages: any[],
    useNewSystem: boolean = false,
    options: any = {}
  ): Promise<any> {
    if (useNewSystem && this.isInitialized) {
      return await this.replaceLegacyChat(messages, options);
    } else {
      // استخدام النظام القديم
      return await this.legacyChat(messages, options);
    }
  }

  /**
   * محاكاة النظام القديم (للتوافق)
   */
  private async legacyChat(messages: any[], options: any): Promise<any> {
    // هذه محاكاة للنظام القديم - في الواقع ستستدعي الدوال الحالية
    console.log('🔧 Using legacy system...');

    // محاكاة استدعاء النظام القديم
    return {
      content: 'رد من النظام القديم',
      metadata: {
        provider: 'legacy',
        cost: 0,
        tokens: 0,
        duration: 0
      }
    };
  }

  /**
   * تحويل من الصيغة القديمة للصيغة الموحدة
   */
  private convertFromLegacyFormat(messages: any[]): any[] {
    return messages.map(msg => ({
      role: this.mapLegacyRole(msg.role),
      content: msg.content || msg.text || '',
      metadata: {
        ...(msg.metadata || {}),
        legacy: true // علامة أن هذه من النظام القديم
      }
    }));
  }

  /**
   * تحويل للصيغة القديمة للحفاظ على التوافق
   */
  private convertToLegacyFormat(response: any): any {
    return {
      content: response.content,
      text: response.content, // للحفاظ على التوافق
      tool_calls: response.toolCalls,
      metadata: {
        ...response.metadata,
        converted: true // علامة أنها محولة من النظام الجديد
      }
    };
  }

  private mapLegacyRole(role: string): 'system' | 'user' | 'assistant' {
    const mapping: Record<string, 'system' | 'user' | 'assistant'> = {
      'system': 'system',
      'user': 'user',
      'assistant': 'assistant',
      'ai': 'assistant',
      'human': 'user',
      'bot': 'assistant'
    };

    return mapping[role.toLowerCase()] || 'user';
  }

  /**
   * التحول التدريجي - تحويل وظيفة واحدة كل مرة
   */
  async migrateFunction(
    functionName: string,
    ...args: any[]
  ): Promise<any> {
    console.log(`🔄 Migrating function: ${functionName}`);

    switch (functionName) {
      case 'simple_chat':
        return await this.replaceLegacyChat(args[0], args[1]);

      case 'chat_with_tools':
        // سيتم تنفيذ لاحقاً
        throw new Error('Migration not implemented yet');

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  /**
   * حالة النظام
   */
  getStatus(): any {
    if (!this.isInitialized) {
      return {
        initialized: false,
        availableProviders: {},
        migration: {
          simple_chat: 'not_initialized',
          chat_with_tools: 'not_initialized',
          streaming: 'not_initialized'
        }
      };
    }

    const stats = this.router.getRouterStats();

    return {
      initialized: this.isInitialized,
      availableProviders: stats.providerPerformance,
      migration: {
        simple_chat: 'ready',
        chat_with_tools: 'pending',
        streaming: 'pending'
      },
      stats: {
        totalRequests: stats.totalRequests,
        successRate: stats.successRate,
        averageCost: stats.averageCost
      }
    };
  }

  /**
   * الحصول على Router مباشرة (للاستخدام المتقدم)
   */
  getRouter(): IntelligentRouter {
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }
    return this.router;
  }
}
