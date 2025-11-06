import { IntelligentRouter } from '../router/intelligent-router';
import { ProviderRegistry } from '../registry/provider-registry';
import { UnifiedMessage, UnifiedTool } from '../interfaces/unified-types.interface';

/**
 * تكامل النظام الجديد مع Agent Loop الحالي
 */
export class AgentLoopIntegration {
  private router: IntelligentRouter;

  constructor(router: IntelligentRouter) {
    this.router = router;
  }

  /**
   * استبدال الدالة الحالية للـ Agent Loop
   */
  async executeAgentLoop(
    messages: any[], // الرسائل بالصيغة الحالية
    tools: any[] = [], // الأدوات بالصيغة الحالية
    options: any = {}
  ): Promise<any> {
    try {
      // تحويل الرسائل للصيغة الموحدة
      const unifiedMessages = this.convertToUnifiedMessages(messages);
      const unifiedTools = this.convertToUnifiedTools(tools);

      let response;
      
      if (unifiedTools.length > 0) {
        // استخدام الأدوات إذا كانت متاحة
        response = await this.router.chatWithTools(unifiedMessages, unifiedTools, {
          providerPreference: options.provider,
          budget: options.budget,
          speedPriority: options.speedPriority
        });
      } else {
        // محادثة عادية
        response = await this.router.chat(unifiedMessages, {
          providerPreference: options.provider,
          budget: options.budget,
          speedPriority: options.speedPriority
        });
      }

      // تحويل النتيجة للصيغة الحالية
      return this.convertFromUnifiedResponse(response);
      
    } catch (error) {
      console.error('Agent Loop Integration Error:', error);
      throw error;
    }
  }

  /**
   * تحويل الرسائل الحالية للصيغة الموحدة
   */
  private convertToUnifiedMessages(messages: any[]): UnifiedMessage[] {
    return messages.map(msg => ({
      role: this.mapRole(msg.role),
      content: msg.content,
      metadata: {
        agentType: msg.agentType,
        timestamp: msg.timestamp,
        ...(msg.metadata || {})
      }
    }));
  }

  /**
   * تحويل الأدوات الحالية للصيغة الموحدة
   */
  private convertToUnifiedTools(tools: any[]): UnifiedTool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || {},
      execute: tool.execute || (() => Promise.resolve({}))
    }));
  }

  /**
   * تحويل النتيجة الموحدة للصيغة الحالية
   */
  private convertFromUnifiedResponse(response: any): any {
    return {
      content: response.content,
      tool_calls: response.toolCalls,
      metadata: {
        provider: response.metadata.provider,
        model: response.metadata.model,
        cost: response.metadata.cost,
        tokens: response.metadata.tokens,
        duration: response.metadata.duration,
        ...response.metadata
      }
    };
  }

  /**
   * تحويل الأدوار بين الصيغ المختلفة
   */
  private mapRole(role: string): 'system' | 'user' | 'assistant' {
    const roleMap: Record<string, 'system' | 'user' | 'assistant'> = {
      'system': 'system',
      'user': 'user', 
      'assistant': 'assistant',
      'ai': 'assistant',
      'human': 'user'
    };
    
    return roleMap[role] || 'user';
  }

  /**
   * الحصول على إحصائيات النظام للتوضيح
   */
  getIntegrationStats(): any {
    return this.router.getRouterStats();
  }

  /**
   * تنفيذ Agent Loop مع التتبع التفصيلي
   */
  async executeWithTracking(
    messages: any[],
    tools: any[] = [],
    options: any = {}
  ): Promise<AgentLoopResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.executeAgentLoop(messages, tools, options);
      const duration = Date.now() - startTime;

      return {
        success: true,
        result,
        duration,
        provider: result.metadata?.provider,
        cost: result.metadata?.cost,
        tokens: result.metadata?.tokens
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * تنفيذ متعدد للـ Agent Loop مع إدارة الحالة
   */
  async executeMultiStep(
    steps: AgentLoopStep[],
    options: any = {}
  ): Promise<MultiStepResult> {
    const results: any[] = [];
    const conversationHistory: any[] = [];
    let totalCost = 0;
    let totalDuration = 0;

    for (const step of steps) {
      const messages = [...conversationHistory, ...step.messages];
      
      try {
        const result = await this.executeWithTracking(
          messages,
          step.tools || [],
          { ...options, ...step.options }
        );

        results.push({
          stepId: step.id,
          stepName: step.name,
          result: result.result,
          success: result.success,
          duration: result.duration,
          cost: result.cost
        });

        // تحديث سجل المحادثة
        if (result.success && result.result) {
          conversationHistory.push({
            role: 'user',
            content: step.messages[step.messages.length - 1].content
          });
          conversationHistory.push({
            role: 'assistant',
            content: result.result.content
          });
        }

        totalCost += result.cost || 0;
        totalDuration += result.duration || 0;

        // التوقف عند الفشل إذا لم يكن مسموحاً بالاستمرار
        if (!result.success && !step.continueOnError) {
          break;
        }

      } catch (error: any) {
        results.push({
          stepId: step.id,
          stepName: step.name,
          success: false,
          error: error.message
        });

        if (!step.continueOnError) {
          break;
        }
      }
    }

    return {
      steps: results,
      conversationHistory,
      totalCost,
      totalDuration,
      successRate: results.filter(r => r.success).length / results.length
    };
  }
}

/**
 * واجهات TypeScript
 */
export interface AgentLoopResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  provider?: string;
  cost?: number;
  tokens?: any;
}

export interface AgentLoopStep {
  id: string;
  name: string;
  messages: any[];
  tools?: any[];
  options?: any;
  continueOnError?: boolean;
}

export interface MultiStepResult {
  steps: any[];
  conversationHistory: any[];
  totalCost: number;
  totalDuration: number;
  successRate: number;
}
