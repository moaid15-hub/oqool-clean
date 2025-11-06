// ═══════════════════════════════════════════════════════
// 🌐 AI Gateway - Unified AI Services Export
// ═══════════════════════════════════════════════════════

// Main Unified Adapter with all types
export {
  UnifiedAIAdapterWithTools,
  type AIProvider,
  type Message,
  type UnifiedToolDefinition,
  type ToolCall,
  type UnifiedRequest,
  type UnifiedResponse
} from './unified-ai-adapter.js';

// Alias for backward compatibility
export { UnifiedAIAdapterWithTools as UnifiedAIAdapter } from './unified-ai-adapter.js';

// Individual AI Services
export { default as EnhancedClaudeService } from './claude-service.js';
export { default as GeminiService } from './gemini-service.js';
export { default as OpenAIService } from './openai-service.js';
export { default as DeepSeekIntelligentService } from './deepseek-service.js';
export { default as OllamaService } from './ollama-service.js';
