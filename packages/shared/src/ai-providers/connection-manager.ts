// connection-manager.ts
// ============================================
// 🔗 مدير الاتصالات - Connection Manager
// الربط الثابت للبنية التحتية
// ============================================

import { ui } from '../core/ui.js';
import { executeTool, TOOL_DEFINITIONS } from '../core/tools.js';
import type { IAIProvider } from './interfaces/iai-provider.interface.js';

/**
 * الاتصالات الثابتة للنظام
 *
 * البنية الأساسية التي تعمل دائماً:
 * 1. UI → متاح لكل المكونات
 * 2. Tools → جاهزة للتنفيذ
 * 3. AI Gateway → جاهز للاتصال
 */
export class ConnectionManager {
  private static instance: ConnectionManager;

  // الاتصالات الثابتة
  private uiConnection = ui;
  private toolsConnection = {
    execute: executeTool,
    definitions: TOOL_DEFINITIONS
  };

  private aiProviders: Map<string, IAIProvider> = new Map();
  private isInitialized = false;

  private constructor() {}

  /**
   * الحصول على Instance واحدة فقط
   */
  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * تهيئة الاتصالات الثابتة
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.uiConnection.debug('Connection Manager already initialized');
      return;
    }

    this.uiConnection.info('Initializing Connection Manager...');

    // تحميل AI Providers
    await this.loadAIProviders();

    this.isInitialized = true;
    this.uiConnection.success('Connection Manager initialized');
  }

  /**
   * تحميل AI Providers المتاحة من .env
   */
  private async loadAIProviders(): Promise<void> {
    try {
      // تحميل المزودين البسطاء من environment variables
      const {
        SimpleClaudeProvider,
        SimpleGeminiProvider,
        SimpleOpenAIProvider,
        SimpleDeepSeekProvider
      } = await import('./simple-providers.js');

      // 1. Claude (Anthropic)
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const claude = new SimpleClaudeProvider(
            process.env.ANTHROPIC_API_KEY,
            'claude-3-5-haiku-20241022'
          );
          this.aiProviders.set('claude', claude);
          this.uiConnection.debug('✅ Loaded AI Provider: claude');
        } catch (e: any) {
          this.uiConnection.warning(`❌ Failed to load Claude: ${e.message}`);
        }
      }

      // 2. Gemini (Google)
      if (process.env.GEMINI_API_KEY) {
        try {
          const gemini = new SimpleGeminiProvider(
            process.env.GEMINI_API_KEY,
            'gemini-1.5-flash-latest'
          );
          this.aiProviders.set('gemini', gemini);
          this.uiConnection.debug('✅ Loaded AI Provider: gemini');
        } catch (e: any) {
          this.uiConnection.warning(`❌ Failed to load Gemini: ${e.message}`);
        }
      }

      // 3. OpenAI
      if (process.env.OPENAI_API_KEY) {
        try {
          const openai = new SimpleOpenAIProvider(
            process.env.OPENAI_API_KEY,
            'gpt-4o-mini'
          );
          this.aiProviders.set('openai', openai);
          this.uiConnection.debug('✅ Loaded AI Provider: openai');
        } catch (e: any) {
          this.uiConnection.warning(`❌ Failed to load OpenAI: ${e.message}`);
        }
      }

      // 4. DeepSeek
      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const deepseek = new SimpleDeepSeekProvider(
            process.env.DEEPSEEK_API_KEY,
            'deepseek-chat'
          );
          this.aiProviders.set('deepseek', deepseek);
          this.uiConnection.debug('✅ Loaded AI Provider: deepseek');
        } catch (e: any) {
          this.uiConnection.warning(`❌ Failed to load DeepSeek: ${e.message}`);
        }
      }

      this.uiConnection.success(`✅ Loaded ${this.aiProviders.size} AI Providers successfully`);
    } catch (error) {
      this.uiConnection.warning('❌ AI Providers loading failed', String(error));
    }
  }

  /**
   * الحصول على اتصال UI (ثابت)
   */
  getUI() {
    return this.uiConnection;
  }

  /**
   * الحصول على اتصال Tools (ثابت)
   */
  getTools() {
    return this.toolsConnection;
  }

  /**
   * الحصول على AI Provider محدد
   */
  getAIProvider(name: string): IAIProvider | undefined {
    return this.aiProviders.get(name);
  }

  /**
   * الحصول على جميع AI Providers المتاحة
   */
  getAvailableProviders(): string[] {
    return Array.from(this.aiProviders.keys());
  }

  /**
   * التحقق من جاهزية النظام
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * عرض حالة الاتصالات
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      ui: !!this.uiConnection,
      tools: this.toolsConnection.definitions.length,
      aiProviders: this.aiProviders.size,
      providers: this.getAvailableProviders()
    };
  }
}

/**
 * الحصول على مدير الاتصالات
 */
export function getConnectionManager(): ConnectionManager {
  return ConnectionManager.getInstance();
}

/**
 * تهيئة سريعة
 */
export async function initializeConnections(): Promise<ConnectionManager> {
  const manager = getConnectionManager();
  await manager.initialize();
  return manager;
}
