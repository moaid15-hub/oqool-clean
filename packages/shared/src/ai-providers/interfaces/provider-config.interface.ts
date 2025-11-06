export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  customHeaders?: Record<string, string>;
}

export interface ClaudeConfig extends ProviderConfig {
  defaultModel?: 'claude-3-haiku-20240307' | 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229';
}

export interface DeepSeekConfig extends ProviderConfig {
  defaultModel?: 'deepseek-chat' | 'deepseek-coder';
}

export interface GeminiConfig extends ProviderConfig {
  defaultModel?: 'gemini-pro' | 'gemini-pro-vision';
}
