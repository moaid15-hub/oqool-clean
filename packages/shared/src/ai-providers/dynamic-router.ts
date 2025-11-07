// dynamic-router.ts
// ============================================
// 🎯 الموجه الديناميكي - Dynamic Router
// الربط الديناميكي حسب الطلب
// ============================================

import { getConnectionManager } from './connection-manager.js';
import type { IAIProvider } from '../ai-providers/interfaces/iai-provider.interface.js';

/**
 * نوع المهمة
 */
export type TaskType = 'simple' | 'medium' | 'complex';

/**
 * مستوى الأولوية
 */
export type Priority = 'cost' | 'quality' | 'speed' | 'balanced';

/**
 * تحليل المهمة
 */
export interface TaskAnalysis {
  type: TaskType;
  complexity: number; // 1-10
  requiredAgents: string[];
  requiredTools: string[];
  estimatedCost: number;
  priority: Priority;
}

/**
 * قرار التوجيه
 */
export interface RoutingDecision {
  agents: string[];
  provider: string;
  tools: string[];
  reason: string;
  confidence: number;
}

/**
 * الموجه الديناميكي
 *
 * يحلل الطلب ويختار:
 * 1. الوكيل المناسب (أو فريق من الوكلاء)
 * 2. المزود الأمثل (حسب التكلفة/الجودة/السرعة)
 * 3. الأدوات اللازمة
 */
export class DynamicRouter {
  private static instance: DynamicRouter;
  private connectionManager = getConnectionManager();
  private ui = this.connectionManager.getUI();

  private constructor() {}

  static getInstance(): DynamicRouter {
    if (!DynamicRouter.instance) {
      DynamicRouter.instance = new DynamicRouter();
    }
    return DynamicRouter.instance;
  }

  /**
   * تحليل المهمة
   */
  async analyzeTask(
    request: string,
    options?: { priority?: Priority }
  ): Promise<TaskAnalysis> {
    this.ui.info('Analyzing task...', 'Router');

    const complexity = this.calculateComplexity(request);
    const type = this.determineTaskType(complexity);
    const requiredAgents = this.selectAgents(request, type);
    const requiredTools = this.selectTools(request);
    const priority = options?.priority || 'balanced';

    const analysis: TaskAnalysis = {
      type,
      complexity,
      requiredAgents,
      requiredTools,
      estimatedCost: this.estimateCost(type, requiredAgents.length),
      priority
    };

    this.ui.debug(`Task Analysis: ${JSON.stringify(analysis, null, 2)}`, 'Router');

    return analysis;
  }

  /**
   * توجيه المهمة (اختيار المسار الأمثل)
   */
  async route(analysis: TaskAnalysis): Promise<RoutingDecision> {
    this.ui.info('Routing task...', 'Router');

    let decision: RoutingDecision;

    switch (analysis.type) {
      case 'simple':
        decision = this.routeSimpleTask(analysis);
        break;
      case 'medium':
        decision = this.routeMediumTask(analysis);
        break;
      case 'complex':
        decision = this.routeComplexTask(analysis);
        break;
    }

    this.ui.success(
      `Routed to: ${decision.agents.join(', ')} + ${decision.provider}`,
      'Router'
    );

    return decision;
  }

  /**
   * توجيه مهمة بسيطة
   * → وكيل واحد + مزود رخيص
   */
  private routeSimpleTask(analysis: TaskAnalysis): RoutingDecision {
    const agent = analysis.requiredAgents[0] || 'general';
    const provider = this.selectProvider('cost', analysis);

    return {
      agents: [agent],
      provider,
      tools: analysis.requiredTools,
      reason: 'Simple task - single agent with cost-effective provider',
      confidence: 0.9
    };
  }

  /**
   * توجيه مهمة متوسطة
   * → عدة وكلاء + مزود متوازن
   */
  private routeMediumTask(analysis: TaskAnalysis): RoutingDecision {
    const agents = analysis.requiredAgents.slice(0, 3);
    const provider = this.selectProvider('balanced', analysis);

    return {
      agents,
      provider,
      tools: analysis.requiredTools,
      reason: 'Medium task - multiple agents with balanced provider',
      confidence: 0.8
    };
  }

  /**
   * توجيه مهمة معقدة
   * → فريق كامل + أفضل مزود
   */
  private routeComplexTask(analysis: TaskAnalysis): RoutingDecision {
    const agents = analysis.requiredAgents;
    const provider = this.selectProvider('quality', analysis);

    return {
      agents,
      provider,
      tools: analysis.requiredTools,
      reason: 'Complex task - full team with premium provider',
      confidence: 0.95
    };
  }

  /**
   * حساب مستوى التعقيد (1-10)
   */
  private calculateComplexity(request: string): number {
    let complexity = 1;

    // طول الطلب
    if (request.length > 500) complexity += 2;
    else if (request.length > 200) complexity += 1;

    // كلمات مفتاحية تدل على تعقيد
    const complexKeywords = [
      'refactor',
      'architecture',
      'optimize',
      'security',
      'performance',
      'integration',
      'complex',
      'advanced',
      'system',
      'full'
    ];

    const foundKeywords = complexKeywords.filter(keyword =>
      request.toLowerCase().includes(keyword)
    );

    complexity += Math.min(foundKeywords.length, 5);

    // عدد المهام المطلوبة
    const taskCount = (request.match(/\d+\./g) || []).length;
    complexity += Math.min(taskCount, 3);

    return Math.min(complexity, 10);
  }

  /**
   * تحديد نوع المهمة
   */
  private determineTaskType(complexity: number): TaskType {
    if (complexity <= 3) return 'simple';
    if (complexity <= 7) return 'medium';
    return 'complex';
  }

  /**
   * اختيار الوكلاء المناسبين
   */
  private selectAgents(request: string, type: TaskType): string[] {
    const requestLower = request.toLowerCase();
    const agents: string[] = [];

    // تحليل الطلب لاختيار الوكلاء
    const agentKeywords = {
      architect: ['design', 'architecture', 'structure', 'plan'],
      backend: ['api', 'backend', 'server', 'database'],
      frontend: ['ui', 'frontend', 'react', 'vue', 'interface'],
      reviewer: ['review', 'check', 'validate', 'quality'],
      security: ['security', 'secure', 'vulnerability', 'auth'],
      tester: ['test', 'testing', 'unit test', 'e2e'],
      devops: ['deploy', 'ci/cd', 'docker', 'kubernetes'],
      optimizer: ['optimize', 'performance', 'speed']
    };

    for (const [agent, keywords] of Object.entries(agentKeywords)) {
      if (keywords.some(keyword => requestLower.includes(keyword))) {
        agents.push(agent);
      }
    }

    // إذا لم يتم العثور على وكلاء محددين
    if (agents.length === 0) {
      agents.push('general');
    }

    // تحديد عدد الوكلاء حسب نوع المهمة
    if (type === 'simple') return agents.slice(0, 1);
    if (type === 'medium') return agents.slice(0, 3);
    return agents; // complex - جميع الوكلاء
  }

  /**
   * اختيار الأدوات المطلوبة
   */
  private selectTools(request: string): string[] {
    const requestLower = request.toLowerCase();
    const tools: string[] = [];

    const toolKeywords = {
      read_file: ['read', 'show', 'display', 'view', 'file'],
      write_file: ['write', 'create', 'save', 'generate'],
      edit_file: ['edit', 'modify', 'update', 'change'],
      list_directory: ['list', 'directory', 'folder', 'files'],
      execute_command: ['run', 'execute', 'command', 'terminal'],
      search_in_files: ['search', 'find', 'grep', 'lookup']
    };

    for (const [tool, keywords] of Object.entries(toolKeywords)) {
      if (keywords.some(keyword => requestLower.includes(keyword))) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * اختيار المزود الأمثل
   */
  private selectProvider(
    priority: Priority,
    analysis: TaskAnalysis
  ): string {
    const availableProviders = this.connectionManager.getAvailableProviders();

    if (availableProviders.length === 0) {
      return 'default';
    }

    // اختيار حسب الأولوية
    switch (priority) {
      case 'cost':
        // أرخص مزود
        return this.findCheapestProvider(availableProviders);

      case 'quality':
        // أفضل مزود
        return this.findBestProvider(availableProviders);

      case 'speed':
        // أسرع مزود
        return this.findFastestProvider(availableProviders);

      case 'balanced':
      default:
        // متوازن
        return this.findBalancedProvider(availableProviders);
    }
  }

  private findCheapestProvider(providers: string[]): string {
    // ترتيب حسب التكلفة (من الأرخص)
    const costOrder = ['deepseek', 'gemini', 'openai', 'claude'];
    return providers.find(p => costOrder.includes(p)) || providers[0];
  }

  private findBestProvider(providers: string[]): string {
    // ترتيب حسب الجودة (الأفضل)
    const qualityOrder = ['claude', 'openai', 'gemini', 'deepseek'];
    return providers.find(p => qualityOrder.includes(p)) || providers[0];
  }

  private findFastestProvider(providers: string[]): string {
    // ترتيب حسب السرعة (الأسرع)
    const speedOrder = ['deepseek', 'openai', 'gemini', 'claude'];
    return providers.find(p => speedOrder.includes(p)) || providers[0];
  }

  private findBalancedProvider(providers: string[]): string {
    // متوازن (جودة/سعر/سرعة)
    const balancedOrder = ['openai', 'gemini', 'claude', 'deepseek'];
    return providers.find(p => balancedOrder.includes(p)) || providers[0];
  }

  /**
   * تقدير التكلفة
   */
  private estimateCost(type: TaskType, agentCount: number): number {
    const baseCost = {
      simple: 0.01,
      medium: 0.05,
      complex: 0.15
    };

    return baseCost[type] * agentCount;
  }
}

/**
 * الحصول على الموجه الديناميكي
 */
export function getDynamicRouter(): DynamicRouter {
  return DynamicRouter.getInstance();
}
