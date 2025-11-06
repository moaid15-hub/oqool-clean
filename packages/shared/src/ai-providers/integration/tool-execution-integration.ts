import { IntelligentRouter } from '../router/intelligent-router';
import { UnifiedMessage, UnifiedTool, UnifiedResponse } from '../interfaces/unified-types.interface';

/**
 * تكامل تنفيذ الأدوات مع النظام الموحد
 */
export class ToolExecutionIntegration {
  private router: IntelligentRouter;
  private toolRegistry: Map<string, UnifiedTool> = new Map();
  private executionHistory: ToolExecutionRecord[] = [];

  constructor(router: IntelligentRouter) {
    this.router = router;
  }

  /**
   * تسجيل أداة في النظام
   */
  registerTool(tool: UnifiedTool): void {
    this.toolRegistry.set(tool.name, tool);
    console.log(`✅ Tool registered: ${tool.name}`);
  }

  /**
   * تسجيل عدة أدوات
   */
  registerTools(tools: UnifiedTool[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  /**
   * الحصول على جميع الأدوات المسجلة
   */
  getRegisteredTools(): UnifiedTool[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * تنفيذ محادثة مع أدوات مسجلة
   */
  async executeWithTools(
    messages: UnifiedMessage[],
    toolNames?: string[],
    options: any = {}
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    // تحديد الأدوات المطلوبة
    let tools: UnifiedTool[];
    if (toolNames) {
      tools = toolNames
        .map(name => this.toolRegistry.get(name))
        .filter((tool): tool is UnifiedTool => tool !== undefined);
    } else {
      tools = this.getRegisteredTools();
    }

    if (tools.length === 0) {
      throw new Error('No tools available for execution');
    }

    try {
      // تنفيذ المحادثة مع الأدوات
      const response = await this.router.chatWithTools(messages, tools, options);

      // معالجة استدعاءات الأدوات إذا وجدت
      const toolResults = await this.processToolCalls(response);

      const duration = Date.now() - startTime;

      // تسجيل التنفيذ
      this.recordExecution({
        timestamp: new Date(),
        toolsUsed: toolResults.map(r => r.toolName),
        success: true,
        duration,
        provider: response.metadata.provider
      });

      return {
        response,
        toolResults,
        success: true,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.recordExecution({
        timestamp: new Date(),
        toolsUsed: [],
        success: false,
        duration,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * معالجة استدعاءات الأدوات من الاستجابة
   */
  private async processToolCalls(response: UnifiedResponse): Promise<ToolResult[]> {
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return [];
    }

    const results: ToolResult[] = [];

    for (const toolCall of response.toolCalls) {
      const tool = this.toolRegistry.get(toolCall.name);
      
      if (!tool) {
        results.push({
          toolName: toolCall.name,
          success: false,
          error: `Tool ${toolCall.name} not found in registry`
        });
        continue;
      }

      try {
        const startTime = Date.now();
        const result = await tool.execute(toolCall.arguments);
        const duration = Date.now() - startTime;

        results.push({
          toolName: toolCall.name,
          success: true,
          result,
          duration
        });

      } catch (error: any) {
        results.push({
          toolName: toolCall.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * تنفيذ Agent Loop مع أدوات (حلقة متعددة)
   */
  async executeAgentLoopWithTools(
    initialMessage: string,
    maxIterations: number = 10,
    options: any = {}
  ): Promise<AgentLoopResult> {
    const messages: UnifiedMessage[] = [
      {
        role: 'user',
        content: initialMessage
      }
    ];

    const iterations: IterationResult[] = [];
    let currentIteration = 0;

    while (currentIteration < maxIterations) {
      currentIteration++;

      const result = await this.executeWithTools(messages, undefined, options);

      if (!result.success || !result.response) {
        break;
      }

      iterations.push({
        iterationNumber: currentIteration,
        response: result.response.content,
        toolCalls: result.toolResults || [],
        duration: result.duration
      });

      // إضافة الاستجابة لسجل الرسائل
      messages.push({
        role: 'assistant',
        content: result.response.content
      });

      // إذا لم تكن هناك استدعاءات أدوات، انته
      if (!result.toolResults || result.toolResults.length === 0) {
        break;
      }

      // إضافة نتائج الأدوات كرسائل system
      for (const toolResult of result.toolResults) {
        if (toolResult.success) {
          messages.push({
            role: 'user',
            content: `Tool ${toolResult.toolName} result: ${JSON.stringify(toolResult.result)}`
          });
        }
      }
    }

    return {
      iterations,
      totalIterations: currentIteration,
      finalResponse: iterations[iterations.length - 1]?.response,
      conversationHistory: messages
    };
  }

  /**
   * تنفيذ أداة واحدة مباشرةً
   */
  async executeToolDirectly(
    toolName: string,
    parameters: any
  ): Promise<ToolResult> {
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      return {
        toolName,
        success: false,
        error: `Tool ${toolName} not found`
      };
    }

    try {
      const startTime = Date.now();
      const result = await tool.execute(parameters);
      const duration = Date.now() - startTime;

      return {
        toolName,
        success: true,
        result,
        duration
      };
    } catch (error: any) {
      return {
        toolName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تسجيل التنفيذ
   */
  private recordExecution(record: ToolExecutionRecord): void {
    this.executionHistory.push(record);

    // الاحتفاظ بآخر 100 سجل فقط
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }
  }

  /**
   * الحصول على إحصائيات استخدام الأدوات
   */
  getToolUsageStats(): ToolUsageStats {
    const toolUsage: Record<string, number> = {};
    let successCount = 0;
    let totalDuration = 0;

    for (const record of this.executionHistory) {
      if (record.success) successCount++;
      totalDuration += record.duration;

      for (const toolName of record.toolsUsed) {
        toolUsage[toolName] = (toolUsage[toolName] || 0) + 1;
      }
    }

    return {
      totalExecutions: this.executionHistory.length,
      successRate: this.executionHistory.length > 0 
        ? successCount / this.executionHistory.length 
        : 0,
      averageDuration: this.executionHistory.length > 0
        ? totalDuration / this.executionHistory.length
        : 0,
      toolUsage,
      registeredTools: this.toolRegistry.size
    };
  }

  /**
   * إلغاء تسجيل أداة
   */
  unregisterTool(toolName: string): boolean {
    return this.toolRegistry.delete(toolName);
  }

  /**
   * مسح جميع الأدوات
   */
  clearTools(): void {
    this.toolRegistry.clear();
  }

  /**
   * مسح سجل التنفيذ
   */
  clearHistory(): void {
    this.executionHistory = [];
  }
}

/**
 * واجهات TypeScript
 */
export interface ToolExecutionResult {
  response?: UnifiedResponse;
  toolResults?: ToolResult[];
  success: boolean;
  error?: string;
  duration: number;
}

export interface ToolResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: string;
  duration?: number;
}

export interface ToolExecutionRecord {
  timestamp: Date;
  toolsUsed: string[];
  success: boolean;
  duration: number;
  provider?: string;
  error?: string;
}

export interface AgentLoopResult {
  iterations: IterationResult[];
  totalIterations: number;
  finalResponse?: string;
  conversationHistory: UnifiedMessage[];
}

export interface IterationResult {
  iterationNumber: number;
  response: string;
  toolCalls: ToolResult[];
  duration: number;
}

export interface ToolUsageStats {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  toolUsage: Record<string, number>;
  registeredTools: number;
}
