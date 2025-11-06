export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: {
    agentType?: string;
    tokens?: number;
    cost?: number;
    timestamp?: number;
    [key: string]: any;
  };
}

export interface UnifiedToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: any[];
  items?: UnifiedToolParameter;
  properties?: Record<string, UnifiedToolParameter>;
  default?: any;
}

export interface UnifiedTool {
  name: string;
  description: string;
  parameters: Record<string, UnifiedToolParameter>;
  required?: string[];
  execute: (args: Record<string, any>) => Promise<any>;
}

export interface UnifiedResponse {
  content: string;
  toolCalls?: UnifiedToolCall[];
  metadata: {
    provider: string;
    model: string;
    cost: number;
    tokens: number;
    duration: number;
    stopReason?: string;
  };
}

export interface UnifiedToolCall {
  id: string;
  name: string;
  arguments: any;
  confidence?: number;
}
