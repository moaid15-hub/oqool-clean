// unified-agent-executor.ts
// ============================================
// 🤖 النظام الموحد + Agent Loop الكامل
// ربط النظام الموحد المتقدم مع agent-client الموجود
// ============================================

import { getUnifiedExecutor, type ExecutionOptions, type ExecutionResult } from './unified-executor-pro.js';
import { createAgentClient, type AgentConfig } from '../core/agent-client.js';

/**
 * Unified Agent Executor
 * يجمع بين:
 * - النظام الموحد المتقدم (7 layers)
 * - Agent Loop الكامل (tools, planning, context)
 * - 23 Agents
 * - 112+ Tools
 */
export class UnifiedAgentExecutor {
  private unifiedExecutor = getUnifiedExecutor();
  private agentClient: any;
  private isAgentMode = false;

  constructor(config?: {
    enableAgentMode?: boolean;
    agentConfig?: AgentConfig;
  }) {
    this.isAgentMode = config?.enableAgentMode || false;

    if (this.isAgentMode && config?.agentConfig) {
      this.agentClient = createAgentClient(config.agentConfig);
    }
  }

  /**
   * تنفيذ ذكي:
   * - إذا كانت المهمة تحتاج tools → استخدم agent-client
   * - إذا كانت محادثة عادية → استخدم unified-executor
   */
  async execute(
    request: string,
    options: ExecutionOptions & { forceAgentMode?: boolean } = {}
  ): Promise<ExecutionResult> {
    // تحليل: هل المهمة تحتاج tools؟
    const needsTools = this.detectToolsNeeded(request) || options.forceAgentMode;

    if (needsTools && this.agentClient) {
      // استخدم Agent Loop الكامل
      return await this.executeWithAgent(request, options);
    } else {
      // استخدم النظام الموحد البسيط
      return await this.unifiedExecutor.execute(request, options);
    }
  }

  /**
   * تنفيذ مع Agent Loop كامل
   * يستخدم agent-client الموجود مع جميع الـ tools
   */
  private async executeWithAgent(
    request: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // agent-client.run() يستخدم tools تلقائياً!
      // لأنه يستدعي aiAdapter.executeWithTools مع TOOL_DEFINITIONS
      const response = await this.agentClient.run(request);

      const duration = Date.now() - startTime;

      return {
        success: true,
        response,
        analysis: {
          type: 'agent-mode',
          complexity: 8,
          estimatedCost: 0.05,
          requiredAgents: ['agent-loop'],
          requiredTools: ['read_file', 'write_file', 'execute_command', 'list_files', 'search_files', 'replace_in_file'],
          requiresPlanning: true
        } as any,
        routing: {
          provider: this.agentClient.currentProvider || 'auto',
          agents: ['agent-loop'],
          tools: ['all-tools-enabled']
        } as any,
        cost: 0.05,
        duration,
        provider: this.agentClient.currentProvider || 'auto',
        attempts: 1,
        fromCache: false,
        toolsUsed: ['agent-loop-with-tools']
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        response: undefined,
        error: error.message,
        analysis: {
          type: 'error',
          complexity: 0,
          estimatedCost: 0,
          requiredAgents: [],
          requiredTools: [],
          requiresPlanning: false
        } as any,
        routing: {
          provider: 'none',
          agents: [],
          tools: []
        } as any,
        cost: 0,
        duration,
        provider: 'none',
        attempts: 1,
        fromCache: false
      };
    }
  }

  /**
   * كشف هل المهمة تحتاج tools
   */
  private detectToolsNeeded(request: string): boolean {
    const toolKeywords = [
      'اقرأ',
      'اكتب',
      'عدل',
      'احذف',
      'نفذ',
      'شغل',
      'read',
      'write',
      'edit',
      'delete',
      'execute',
      'run',
      'ملف',
      'file',
      'command',
      'أمر',
      'bash',
      'npm',
      'git'
    ];

    return toolKeywords.some(keyword =>
      request.toLowerCase().includes(keyword)
    );
  }

  /**
   * الحصول على حالة النظام
   */
  getStatus(): any {
    return {
      unified: this.unifiedExecutor.getSystemStatus(),
      agentMode: this.isAgentMode,
      agentAvailable: !!this.agentClient
    };
  }
}

/**
 * إنشاء Unified Agent Executor
 */
export function createUnifiedAgentExecutor(config?: {
  enableAgentMode?: boolean;
  agentConfig?: AgentConfig;
}): UnifiedAgentExecutor {
  return new UnifiedAgentExecutor(config);
}

/**
 * Singleton instance
 */
let instance: UnifiedAgentExecutor | null = null;

export function getUnifiedAgentExecutor(config?: {
  enableAgentMode?: boolean;
  agentConfig?: AgentConfig;
}): UnifiedAgentExecutor {
  if (!instance) {
    instance = new UnifiedAgentExecutor(config);
  }
  return instance;
}
