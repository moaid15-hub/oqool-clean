// ========================================
// 'D*5/J1 'D1&J3J DF8'E AI Providers
// ========================================

// 'DH',G'*
export {
  IAIProvider,
  ProviderCapabilities,
  PricingInfo,
  ProviderStatus,
  CostEstimate
} from './interfaces/iai-provider.interface';

export {
  UnifiedMessage,
  UnifiedTool,
  UnifiedResponse,
  UnifiedToolCall
} from './interfaces/unified-types.interface';

export {
  ProviderConfig,
  ClaudeConfig,
  DeepSeekConfig,
  GeminiConfig
} from './interfaces/provider-config.interface';

// 'DE-HD'*
export { BaseAdapter } from './adapters/base-adapter';
export { ClaudeAdapter } from './adapters/claude-adapter';
export { DeepSeekAdapter } from './adapters/deepseek-adapter';
export { GeminiAdapter } from './adapters/gemini-adapter';

// 'D3,D H'DE5F9
export { ProviderRegistry } from './registry/provider-registry';
export { ProviderFactory, ProviderType, ProviderFactoryConfig } from './registry/provider-factory';

// Utils
export { ErrorHandler, ProviderError, ProviderErrorType } from './utils/error-handler';
export { MessageConverter } from './utils/message-converter';
export { ToolAdapter } from './utils/tool-adapter';

// Monitoring
export { ProviderMonitor, ProviderMetrics, HealthStatus, PerformanceReport } from './monitoring/provider-monitor';
export { CostTracker, CostEntry, CostFilters, Budget, CostAlert, CostAlertType } from './monitoring/cost-tracker';
export { MetricsCollector, Metric, MetricType, MetricFilters, AggregatedMetrics, MetricStats, MetricsReport } from './monitoring/metrics-collector';

// 'DEHH,G H'DE-// (Router)
export { IntelligentRouter, RouterOptions, TaskAnalysis, RouterStats } from './router/intelligent-router';
export { ProviderSelector } from './router/provider-selector';
export { FallbackManager } from './router/fallback-manager';
export { CostOptimizer, TaskRequirements, CostRecord, ProviderCostSummary } from './router/cost-optimizer';

// 'D*C'ED (Integration)
export { 
  AgentLoopIntegration, 
  AgentLoopResult, 
  AgentLoopStep, 
  MultiStepResult 
} from './integration/agent-loop-integration';

export { 
  ToolExecutionIntegration, 
  ToolExecutionResult, 
  ToolResult, 
  ToolExecutionRecord,
  AgentLoopResult as ToolAgentLoopResult,
  IterationResult,
  ToolUsageStats
} from './integration/tool-execution-integration';

export { 
  CLIIntegration, 
  InitializationResult, 
  ChatOptions, 
  ChatResult,
  SwitchResult,
  ProviderInfo,
  CostEstimate as CLICostEstimate
} from './integration/cli-integration';

// ========================================
// /'D) 'D*GJ&) 'D31J9)
// ========================================

/**
 * %F4'! 3,D E2H/JF 'A*1'6J E9 ,EJ9 'DE2H/JF 'DE*'-)
 * JB1# API Keys EF E*:J1'* 'D(J&) *DB'&J'K
 */
export function createDefaultProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  // *3,JD Claude %0' C'F API key EH,H/
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const claude = ProviderFactory.createFromEnv('claude');
      registry.registerProvider('claude', claude);
    } catch (error) {
      console.warn('Failed to register Claude provider:', error);
    }
  }

  // *3,JD DeepSeek %0' C'F API key EH,H/
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const deepseek = ProviderFactory.createFromEnv('deepseek');
      registry.registerProvider('deepseek', deepseek);
    } catch (error) {
      console.warn('Failed to register DeepSeek provider:', error);
    }
  }

  // *3,JD Gemini %0' C'F API key EH,H/
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = ProviderFactory.createFromEnv('gemini');
      registry.registerProvider('gemini', gemini);
    } catch (error) {
      console.warn('Failed to register Gemini provider:', error);
    }
  }

  return registry;
}

/**
 * %F4'! E2H/ H'-/ (319)
 */
export function createProvider(type: ProviderType, apiKey: string, config?: any): IAIProvider {
  return ProviderFactory.createProvider(type, { apiKey, ...config });
}

/**
 * %F4'! E2H/ EF E*:J1'* 'D(J&)
 */
export function createProviderFromEnv(type: ProviderType): IAIProvider {
  return ProviderFactory.createFromEnv(type);
}

// ========================================
// /'D) 'D*GJ&) 'DC'ED) (Complete System)
// ========================================

/**
 * %F4'! 'DF8'E 'DC'ED E9 ,EJ9 'DECF'*
 * J-*HJ 9DI: Router, Integration, CLI
 */
export function createCompleteAISystem(): {
  registry: ProviderRegistry;
  router: IntelligentRouter;
  agentIntegration: AgentLoopIntegration;
  toolIntegration: ToolExecutionIntegration;
  cliIntegration: CLIIntegration;
} {
  // %F4'! 'D3,D
  const registry = createDefaultProviderRegistry();
  
  // %F4'! 'DEHH,G 'D0CJ
  const router = new IntelligentRouter(registry);
  
  // %F4'! 'D*C'E*
  const agentIntegration = new AgentLoopIntegration(router);
  const toolIntegration = new ToolExecutionIntegration(router);
  const cliIntegration = new CLIIntegration(registry, router);

  return {
    registry,
    router,
    agentIntegration,
    toolIntegration,
    cliIntegration
  };
}

/**
 * F3() EF'G9) 3GD) 'D'3*5/'E - ,'-2 DD'3*5/'E 'DE('41
 */
export const aiSystem = createCompleteAISystem();

// ═══════════════════════════════════════════════════════
// 🆕 New Exports - التصديرات الجديدة
// ═══════════════════════════════════════════════════════

// Integration - التكامل مع النظام القديم
export { ExistingSystemIntegration } from './integration/existing-system-integration';

// Setup - التهيئة الآلية
export { SystemSetup } from './setup';

// Demos - الأمثلة التوضيحية
export { runCompleteDemo } from './demo/complete-demo';
export { runFinalTest } from './demo/final-test.demo';
