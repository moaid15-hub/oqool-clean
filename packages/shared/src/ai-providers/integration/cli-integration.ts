import { IntelligentRouter } from '../router/intelligent-router';
import { ProviderRegistry } from '../registry/provider-registry';
import { UnifiedMessage } from '../interfaces/unified-types.interface';

/**
 * تكامل النظام الجديد مع CLI الحالي
 */
export class CLIIntegration {
  private router: IntelligentRouter;
  private registry: ProviderRegistry;
  private conversationHistory: UnifiedMessage[] = [];
  private currentProvider?: string;

  constructor(registry: ProviderRegistry, router: IntelligentRouter) {
    this.registry = registry;
    this.router = router;
  }

  /**
   * تهيئة النظام الجديد في CLI
   */
  async initialize(): Promise<InitializationResult> {
    console.log('🚀 Initializing Unified Provider System...');
    
    const availableProviders = this.registry.getAvailableProviders();
    console.log(`✅ Available providers: ${availableProviders.join(', ')}`);
    
    // التحقق من صحة جميع المزودين
    const validations = await this.validateProviders();
    
    console.log('🔍 Provider validations:');
    Object.entries(validations).forEach(([provider, isValid]) => {
      console.log(`   ${provider}: ${isValid ? '✅' : '❌'}`);
    });

    const validProviders = Object.entries(validations)
      .filter(([_, isValid]) => isValid)
      .map(([provider]) => provider);

    return {
      success: validProviders.length > 0,
      availableProviders,
      validProviders,
      validations
    };
  }

  /**
   * استبدال دالة المحادثة الحالية في CLI
   */
  async handleChatCommand(
    userInput: string, 
    options: ChatOptions = {}
  ): Promise<ChatResult> {
    const startTime = Date.now();

    try {
      // بناء الرسائل
      const messages = this.buildMessages(userInput);
      
      // تنفيذ المحادثة
      const response = await this.router.chat(messages, {
        providerPreference: options.provider || this.currentProvider,
        budget: options.budget,
        speedPriority: options.speedPriority,
        qualityPriority: options.qualityPriority
      });

      // تحديث سجل المحادثة
      this.conversationHistory.push(
        {
          role: 'user',
          content: userInput
        },
        {
          role: 'assistant',
          content: response.content
        }
      );

      const duration = Date.now() - startTime;

      return {
        success: true,
        response: response.content,
        metadata: {
          provider: response.metadata.provider,
          model: response.metadata.model,
          cost: response.metadata.cost,
          tokens: response.metadata.tokens,
          duration
        }
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.error('❌ Chat command failed:', error);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          duration
        }
      };
    }
  }

  /**
   * بناء الرسائل من المدخلات وسجل المحادثة
   */
  private buildMessages(userInput: string): UnifiedMessage[] {
    return [
      ...this.conversationHistory,
      {
        role: 'user',
        content: userInput
      }
    ];
  }

  /**
   * أمر جديد لتبديل المزود يدوياً
   */
  async switchProvider(providerName: string): Promise<SwitchResult> {
    try {
      const provider = this.registry.getProvider(providerName);
      const isValid = await provider.validate();
      
      if (isValid) {
        this.currentProvider = providerName;
        console.log(`✅ Switched to provider: ${providerName}`);
        
        return {
          success: true,
          provider: providerName,
          message: `Successfully switched to ${providerName}`
        };
      } else {
        console.log(`❌ Provider ${providerName} is not valid`);
        
        return {
          success: false,
          error: `Provider ${providerName} validation failed`
        };
      }
    } catch (error: any) {
      console.log(`❌ Failed to switch to provider: ${providerName}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * الحصول على المزود الحالي
   */
  getCurrentProvider(): string | undefined {
    return this.currentProvider;
  }

  /**
   * عرض إحصائيات النظام
   */
  showStats(): any {
    const routerStats = this.router.getRouterStats();
    
    return {
      ...routerStats,
      conversationLength: this.conversationHistory.length / 2, // قسمة 2 لأن كل تبادل = رسالتين
      currentProvider: this.currentProvider
    };
  }

  /**
   * التحقق من صحة جميع المزودين
   */
  private async validateProviders(): Promise<Record<string, boolean>> {
    return this.registry.validateAllProviders();
  }

  /**
   * مسح سجل المحادثة
   */
  clearConversation(): void {
    this.conversationHistory = [];
    console.log('🗑️  Conversation history cleared');
  }

  /**
   * الحصول على سجل المحادثة
   */
  getConversationHistory(): UnifiedMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * تصدير سجل المحادثة
   */
  exportConversation(format: 'json' | 'text' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.conversationHistory, null, 2);
    } else {
      return this.conversationHistory
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');
    }
  }

  /**
   * قائمة المزودين المتاحين
   */
  listProviders(): ProviderInfo[] {
    const availableProviders = this.registry.getAvailableProviders();
    
    return availableProviders.map(providerName => {
      const provider = this.registry.getProvider(providerName);
      const capabilities = provider.getCapabilities();
      const pricing = provider.getPricing();

      return {
        name: providerName,
        models: capabilities.availableModels,
        supportsTools: capabilities.supportsTools,
        maxTokens: capabilities.maxTokens,
        inputCost: pricing.inputCostPerToken,
        outputCost: pricing.outputCostPerToken,
        isCurrent: providerName === this.currentProvider
      };
    });
  }

  /**
   * تقدير تكلفة الرسالة
   */
  estimateCost(message: string, provider?: string): CostEstimate {
    const targetProvider = provider || this.currentProvider || this.registry.getAvailableProviders()[0];
    const providerInstance = this.registry.getProvider(targetProvider);
    const pricing = providerInstance.getPricing();

    // تقدير عدد الـ tokens (تقريبي)
    const estimatedInputTokens = Math.ceil(message.length / 4);
    const estimatedOutputTokens = 1000; // افتراضي

    const inputCost = estimatedInputTokens * pricing.inputCostPerToken;
    const outputCost = estimatedOutputTokens * pricing.outputCostPerToken;

    return {
      provider: targetProvider,
      estimatedInputTokens,
      estimatedOutputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * معاينة اختيار المزود للرسالة
   */
  async previewProviderSelection(message: string): Promise<string> {
    const messages: UnifiedMessage[] = [
      ...this.conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // استخدام نفس منطق الاختيار من الموجه الذكي
    // هذا تقريبي للمعاينة فقط
    const availableProviders = this.registry.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      return 'No providers available';
    }

    // إذا كان هناك مزود محدد حالياً
    if (this.currentProvider) {
      return this.currentProvider;
    }

    // اختيار المزود الافتراضي (أول مزود متاح)
    return availableProviders[0];
  }

  /**
   * تشغيل أمر تفاعلي
   */
  async runInteractiveSession(options: ChatOptions = {}): Promise<void> {
    console.log('🎯 Starting interactive session...');
    console.log('Type "exit" to quit, "clear" to clear history, "stats" to show statistics\n');

    // هذا مجرد مثال - سيتم ربطه مع CLI الحقيقي
    // في التطبيق الفعلي، ستكون هناك حلقة readline
  }
}

/**
 * واجهات TypeScript
 */
export interface InitializationResult {
  success: boolean;
  availableProviders: string[];
  validProviders: string[];
  validations: Record<string, boolean>;
}

export interface ChatOptions {
  provider?: string;
  budget?: number;
  speedPriority?: boolean;
  qualityPriority?: boolean;
}

export interface ChatResult {
  success: boolean;
  response?: string;
  error?: string;
  metadata: {
    provider?: string;
    model?: string;
    cost?: number;
    tokens?: any;
    duration: number;
  };
}

export interface SwitchResult {
  success: boolean;
  provider?: string;
  message?: string;
  error?: string;
}

export interface ProviderInfo {
  name: string;
  models: string[];
  supportsTools: boolean;
  maxTokens: number;
  inputCost: number;
  outputCost: number;
  isCurrent: boolean;
}

export interface CostEstimate {
  provider: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}
