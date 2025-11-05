/**
 * AI Gateway - Unified Multi-Provider System
 * نظام موحد لإدارة جميع مزودي الـ AI
 */

// Services
export { DeepSeekService } from './deepseek-service.js';
export { ClaudeService } from './claude-service.js';
export { OpenAIService } from './openai-service.js';
export { GeminiService } from './gemini-service.js';
export { OllamaService, getOllamaService } from './ollama-service.js';

// Main Adapter
export {
  UnifiedAIAdapter,
  type AIProvider,
  type AIRole,
  type Message,
  type AIResponse,
  type UnifiedAIAdapterConfig,
} from './unified-ai-adapter.js';

// Default export
export { UnifiedAIAdapter as default } from './unified-ai-adapter.js';

// Factory function for easier instantiation
export { UnifiedAIAdapter as createUnifiedAIAdapter } from './unified-ai-adapter.js';
