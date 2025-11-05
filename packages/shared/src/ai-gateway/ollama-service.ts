/**
 * Ollama Service - Local/Remote AI Models via Ollama
 * خدمة Ollama - نماذج AI محلية/بعيدة عبر Ollama
 *
 * Features:
 * - Free and open source models
 * - Local or remote deployment
 * - Default: https://ollama.oqool.net
 * - Support for multiple models (llama3, deepseek-r1, qwen2.5-coder, etc.)
 */

import axios, { type AxiosInstance } from 'axios';
import type { Message } from './unified-ai-adapter.js';

export interface OllamaServiceConfig {
  baseURL?: string;
  model?: string;
  timeout?: number;
  apiKey?: string; // Optional for authenticated servers
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  modified_at: string;
  digest: string;
}

export interface OllamaResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length';
}

export class OllamaService {
  private client: AxiosInstance;
  private model: string;

  constructor(config: OllamaServiceConfig = {}) {
    const baseURL =
      config.baseURL ||
      process.env.OLLAMA_URL ||
      process.env.OLLAMA_HOST ||
      'https://ollama.oqool.net';

    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';

    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });

    console.log(`[Ollama Service] Initialized with ${baseURL}, model: ${this.model}`);
  }

  /**
   * Convert role to Ollama format
   */
  private convertRole(role: 'system' | 'user' | 'assistant'): 'system' | 'user' | 'assistant' {
    if (role === 'system') return 'system';
    if (role === 'user') return 'user';
    return 'assistant';
  }

  /**
   * Chat completion with Ollama
   */
  async chat(messages: Message[], options?: { model?: string; temperature?: number }): Promise<OllamaResponse> {
    try {
      const model = options?.model || this.model;

      // Convert messages to Ollama format
      const ollamaMessages = messages.map((msg) => ({
        role: this.convertRole(msg.role),
        content: msg.content,
      }));

      const response = await this.client.post('/api/chat', {
        model,
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
        },
      });

      return {
        content: response.data.message.content,
        model: response.data.model,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        },
        finishReason: response.data.done ? 'stop' : 'length',
      };
    } catch (error: any) {
      console.error('[Ollama Service] Chat error:', error.message);

      // Provide helpful error messages
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          'Cannot connect to Ollama server. Make sure Ollama is running or check OLLAMA_URL environment variable.'
        );
      }

      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }

  /**
   * Generate text (simplified interface)
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Message[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.chat(messages);
    return response.content;
  }

  /**
   * Stream chat (for real-time responses)
   */
  async *chatStream(messages: Message[], options?: { model?: string }): AsyncGenerator<string> {
    try {
      const model = options?.model || this.model;

      const ollamaMessages = messages.map((msg) => ({
        role: this.convertRole(msg.role),
        content: msg.content,
      }));

      const response = await this.client.post(
        '/api/chat',
        {
          model,
          messages: ollamaMessages,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      for await (const chunk of response.data) {
        const text = chunk.toString();
        const lines = text.split('\n').filter((line: string) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error: any) {
      console.error('[Ollama Service] Stream error:', error.message);
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models || [];
    } catch (error: any) {
      console.error('[Ollama Service] List models error:', error.message);
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      console.log(`[Ollama Service] Pulling model: ${modelName}...`);
      await this.client.post('/api/pull', { name: modelName });
      console.log(`[Ollama Service] Model ${modelName} pulled successfully`);
    } catch (error: any) {
      console.error('[Ollama Service] Pull model error:', error.message);
      throw error;
    }
  }

  /**
   * Check if Ollama server is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await this.client.get('/api/tags', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName?: string): Promise<any> {
    try {
      const model = modelName || this.model;
      const response = await this.client.post('/api/show', { name: model });
      return response.data;
    } catch (error: any) {
      console.error('[Ollama Service] Get model info error:', error.message);
      return null;
    }
  }

  /**
   * Code generation helper
   */
  async generateCode(language: string, description: string, context?: string): Promise<string> {
    const systemPrompt = `You are an expert ${language} developer. Generate clean, efficient, well-documented code.`;

    const prompt = context ? `Context:\n${context}\n\nTask: ${description}` : `Task: ${description}`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Code review helper
   */
  async reviewCode(code: string, language: string): Promise<string> {
    const systemPrompt =
      'You are a senior code reviewer. Provide constructive feedback on code quality, bugs, and improvements.';

    const prompt = `Review this ${language} code:\n\n${code}`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Explain code helper
   */
  async explainCode(code: string, language: string): Promise<string> {
    const systemPrompt = 'You are a patient programming teacher. Explain code clearly and simply.';

    const prompt = `Explain this ${language} code:\n\n${code}`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Debug helper
   */
  async debugCode(code: string, error: string, language: string): Promise<string> {
    const systemPrompt = 'You are an expert debugger. Analyze errors and suggest fixes.';

    const prompt = `Debug this ${language} code:\n\nCode:\n${code}\n\nError:\n${error}\n\nProvide the fix and explanation.`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Refactor helper
   */
  async refactorCode(code: string, language: string, goal: string): Promise<string> {
    const systemPrompt = 'You are an expert in clean code and design patterns.';

    const prompt = `Refactor this ${language} code to ${goal}:\n\n${code}`;

    return this.generate(prompt, systemPrompt);
  }
}

// Singleton instance
let ollamaServiceInstance: OllamaService | null = null;

export function getOllamaService(config?: OllamaServiceConfig): OllamaService {
  if (!ollamaServiceInstance) {
    ollamaServiceInstance = new OllamaService(config);
  }
  return ollamaServiceInstance;
}

export default OllamaService;
