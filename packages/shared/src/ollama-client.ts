/**
 * Ollama Local AI Client
 * عميل موحد للتعامل مع Ollama
 * توفير ضخم - بدون تكاليف API!
 */

import axios from 'axios';

export interface OllamaConfig {
  baseURL?: string;
  model?: string;
  timeout?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
}

export class OllamaClient {
  private baseURL: string;
  private model: string;
  private timeout: number;

  constructor(config: OllamaConfig = {}) {
    // Priority: config > env > oqool.net server > localhost
    this.baseURL =
      config.baseURL ||
      process.env.OLLAMA_URL ||
      process.env.OLLAMA_HOST ||
      'https://ollama.oqool.net'; // Default to Oqool server

    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.timeout = config.timeout || 60000; // Increased for network requests
  }

  /**
   * Chat with Ollama
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/chat`,
        {
          model: this.model,
          messages,
          stream: false,
        },
        { timeout: this.timeout }
      );

      return response.data.message.content;
    } catch (error) {
      console.error('[Ollama] Chat error:', error);
      throw new Error(`Ollama chat failed: ${error}`);
    }
  }

  /**
   * Generate text
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    return this.chat(messages);
  }

  /**
   * Stream chat (for real-time responses)
   */
  async *chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/chat`,
        {
          model: this.model,
          messages,
          stream: true,
        },
        {
          responseType: 'stream',
          timeout: this.timeout,
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
    } catch (error) {
      console.error('[Ollama] Stream error:', error);
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return response.data.models.map((m: any) => m.name);
    } catch (error) {
      console.error('[Ollama] List models error:', error);
      return [];
    }
  }

  /**
   * Pull a model
   */
  async pullModel(model: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/api/pull`, { name: model });
      console.log(`[Ollama] Model ${model} pulled successfully`);
    } catch (error) {
      console.error('[Ollama] Pull model error:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/api/tags`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Code generation helper
   */
  async generateCode(
    language: string,
    description: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are an expert ${language} developer. Generate clean, efficient, well-documented code.`;

    const prompt = context
      ? `Context:\n${context}\n\nTask: ${description}`
      : `Task: ${description}`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Code review helper
   */
  async reviewCode(code: string, language: string): Promise<string> {
    const systemPrompt = 'You are a senior code reviewer. Provide constructive feedback on code quality, bugs, and improvements.';

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
}

// Singleton instance
let ollamaInstance: OllamaClient | null = null;

export function getOllamaClient(config?: OllamaConfig): OllamaClient {
  if (!ollamaInstance) {
    ollamaInstance = new OllamaClient(config);
  }
  return ollamaInstance;
}

export default OllamaClient;
