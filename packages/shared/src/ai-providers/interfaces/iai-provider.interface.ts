import { UnifiedMessage, UnifiedTool, UnifiedResponse } from './unified-types.interface';

export interface IAIProvider {
  // 'DH8'&A 'D#3'3J)
  chat(messages: UnifiedMessage[]): Promise<UnifiedResponse>;
  chatWithTools(messages: UnifiedMessage[], tools: UnifiedTool[]): Promise<UnifiedResponse>;
  streamChat(messages: UnifiedMessage[]): AsyncGenerator<string>;

  // 'DE9DHE'* H'D%-5'&J'*
  getCapabilities(): ProviderCapabilities;
  getPricing(): PricingInfo;
  getStatus(): ProviderStatus;

  // 'D*-BB H'D5-)
  validate(): Promise<boolean>;
  estimateCost(messages: UnifiedMessage[]): CostEstimate;
}

export interface ProviderCapabilities {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  availableModels: string[];
  maxTokens: number;
  maxToolsPerCall: number;
}

export interface PricingInfo {
  inputCostPerToken: number;
  outputCostPerToken: number;
  currency: string;
  modelPricing: Record<string, { input: number; output: number }>;
}

export interface ProviderStatus {
  available: boolean;
  latency: number;
  lastChecked: Date;
  rateLimitRemaining: number;
}

export interface CostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
  currency: string;
}
