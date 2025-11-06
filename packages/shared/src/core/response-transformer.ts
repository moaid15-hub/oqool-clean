/**
 * Response Transformer System
 *
 * نظام لتوحيد ردود مختلف الـ AI providers في صيغة موحدة
 * يسهل التعامل مع responses من:
 * - Google Gemini
 * - Anthropic Claude
 * - OpenAI GPT
 * - DeepSeek
 * - Ollama
 */

export type ResponseStatus = 'success' | 'error' | 'partial';

export interface StandardResponse<T = any> {
  status: ResponseStatus;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    provider?: string;
    model?: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      cost?: number;
    };
    latency?: number;
  };
}

export interface AIResponse {
  text: string;
  finishReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Response Transformer Class
 */
export class ResponseTransformer {
  /**
   * Transform response to standard format
   */
  static transformResponse<T = any>(
    data: T,
    status: ResponseStatus = 'success',
    metadata?: Partial<StandardResponse['metadata']>
  ): StandardResponse<T> {
    return {
      status,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }

  /**
   * Transform error to standard format
   */
  static transformError(
    error: Error | string,
    code: string = 'INTERNAL_ERROR',
    metadata?: Partial<StandardResponse['metadata']>
  ): StandardResponse {
    const message = typeof error === 'string' ? error : error.message;

    return {
      status: 'error',
      error: {
        message: this.sanitizeErrorMessage(message),
        code,
        details: typeof error === 'object' ? error : undefined,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }

  /**
   * Transform Gemini response to standard format
   */
  static transformGeminiResponse(response: any, startTime?: number): StandardResponse<AIResponse> {
    try {
      const candidate = response.candidates?.[0];
      if (!candidate) {
        return this.transformError('No response from Gemini', 'GEMINI_NO_RESPONSE', {
          provider: 'gemini',
        });
      }

      const text = candidate.content?.parts?.[0]?.text || '';
      const finishReason = candidate.finishReason;

      // Calculate usage
      const usage = response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount || 0,
            outputTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      const latency = startTime ? Date.now() - startTime : undefined;

      return this.transformResponse<AIResponse>(
        {
          text,
          finishReason,
          usage,
        },
        'success',
        {
          provider: 'gemini',
          model: response.modelVersion,
          usage,
          latency,
        }
      );
    } catch (error: any) {
      return this.transformError(error, 'GEMINI_TRANSFORM_ERROR', { provider: 'gemini' });
    }
  }

  /**
   * Transform Claude response to standard format
   */
  static transformClaudeResponse(response: any, startTime?: number): StandardResponse<AIResponse> {
    try {
      const text = response.content?.[0]?.text || '';
      const finishReason = response.stop_reason;

      // Calculate usage
      const usage = response.usage
        ? {
            inputTokens: response.usage.input_tokens || 0,
            outputTokens: response.usage.output_tokens || 0,
            totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
          }
        : undefined;

      const latency = startTime ? Date.now() - startTime : undefined;

      return this.transformResponse<AIResponse>(
        {
          text,
          finishReason,
          usage,
        },
        'success',
        {
          provider: 'claude',
          model: response.model,
          usage,
          latency,
        }
      );
    } catch (error: any) {
      return this.transformError(error, 'CLAUDE_TRANSFORM_ERROR', { provider: 'claude' });
    }
  }

  /**
   * Transform OpenAI response to standard format
   */
  static transformOpenAIResponse(response: any, startTime?: number): StandardResponse<AIResponse> {
    try {
      const choice = response.choices?.[0];
      if (!choice) {
        return this.transformError('No response from OpenAI', 'OPENAI_NO_RESPONSE', {
          provider: 'openai',
        });
      }

      const text = choice.message?.content || '';
      const finishReason = choice.finish_reason;

      // Calculate usage
      const usage = response.usage
        ? {
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : undefined;

      const latency = startTime ? Date.now() - startTime : undefined;

      return this.transformResponse<AIResponse>(
        {
          text,
          finishReason,
          usage,
        },
        'success',
        {
          provider: 'openai',
          model: response.model,
          usage,
          latency,
        }
      );
    } catch (error: any) {
      return this.transformError(error, 'OPENAI_TRANSFORM_ERROR', { provider: 'openai' });
    }
  }

  /**
   * Transform DeepSeek response to standard format
   */
  static transformDeepSeekResponse(
    response: any,
    startTime?: number
  ): StandardResponse<AIResponse> {
    try {
      // DeepSeek uses OpenAI-compatible format
      const choice = response.choices?.[0];
      if (!choice) {
        return this.transformError('No response from DeepSeek', 'DEEPSEEK_NO_RESPONSE', {
          provider: 'deepseek',
        });
      }

      const text = choice.message?.content || '';
      const finishReason = choice.finish_reason;

      const usage = response.usage
        ? {
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : undefined;

      const latency = startTime ? Date.now() - startTime : undefined;

      return this.transformResponse<AIResponse>(
        {
          text,
          finishReason,
          usage,
        },
        'success',
        {
          provider: 'deepseek',
          model: response.model,
          usage,
          latency,
        }
      );
    } catch (error: any) {
      return this.transformError(error, 'DEEPSEEK_TRANSFORM_ERROR', { provider: 'deepseek' });
    }
  }

  /**
   * Transform Ollama response to standard format
   */
  static transformOllamaResponse(response: any, startTime?: number): StandardResponse<AIResponse> {
    try {
      const text = response.response || response.message?.content || '';
      const finishReason = response.done ? 'stop' : 'length';

      // Ollama usage (if available)
      const usage = response.eval_count
        ? {
            inputTokens: response.prompt_eval_count || 0,
            outputTokens: response.eval_count || 0,
            totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
          }
        : undefined;

      const latency = startTime ? Date.now() - startTime : undefined;

      return this.transformResponse<AIResponse>(
        {
          text,
          finishReason,
          usage,
        },
        'success',
        {
          provider: 'ollama',
          model: response.model,
          usage,
          latency,
        }
      );
    } catch (error: any) {
      return this.transformError(error, 'OLLAMA_TRANSFORM_ERROR', { provider: 'ollama' });
    }
  }

  /**
   * Auto-detect provider and transform
   */
  static autoTransform(response: any, provider?: string, startTime?: number): StandardResponse {
    // If provider is specified, use it
    if (provider) {
      switch (provider.toLowerCase()) {
        case 'gemini':
          return this.transformGeminiResponse(response, startTime);
        case 'claude':
          return this.transformClaudeResponse(response, startTime);
        case 'openai':
          return this.transformOpenAIResponse(response, startTime);
        case 'deepseek':
          return this.transformDeepSeekResponse(response, startTime);
        case 'ollama':
          return this.transformOllamaResponse(response, startTime);
      }
    }

    // Try to auto-detect
    if (response.candidates) {
      return this.transformGeminiResponse(response, startTime);
    } else if (response.content && Array.isArray(response.content)) {
      return this.transformClaudeResponse(response, startTime);
    } else if (response.choices && response.choices[0]?.message) {
      return this.transformOpenAIResponse(response, startTime);
    } else if (response.response || response.message) {
      return this.transformOllamaResponse(response, startTime);
    }

    return this.transformError('Unknown provider format', 'UNKNOWN_PROVIDER');
  }

  /**
   * Sanitize error messages (prevent information leakage)
   */
  private static sanitizeErrorMessage(message: string): string {
    // Map specific errors to generic messages
    const errorMap: Record<string, string> = {
      'API key': 'Authentication failed',
      'quota': 'Service quota exceeded',
      'rate limit': 'Too many requests',
      unauthorized: 'Authentication required',
      forbidden: 'Access denied',
      'not found': 'Resource not found',
      timeout: 'Request timeout',
      'network error': 'Network error',
      'connection refused': 'Service unavailable',
    };

    const lowerMessage = message.toLowerCase();

    for (const [key, value] of Object.entries(errorMap)) {
      if (lowerMessage.includes(key)) {
        return value;
      }
    }

    // If no match, return generic message
    return 'An error occurred while processing your request';
  }

  /**
   * Extract text from standard response
   */
  static extractText(response: StandardResponse<AIResponse>): string {
    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data?.text || '';
  }

  /**
   * Check if response is successful
   */
  static isSuccess(response: StandardResponse): boolean {
    return response.status === 'success';
  }

  /**
   * Get usage information
   */
  static getUsage(response: StandardResponse): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null {
    const usage = response.metadata.usage;
    if (!usage) return null;

    // Ensure all required fields are present
    if (typeof usage.inputTokens === 'number' &&
        typeof usage.outputTokens === 'number' &&
        typeof usage.totalTokens === 'number') {
      return {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens
      };
    }

    return null;
  }

  /**
   * Calculate cost (rough estimate)
   */
  static estimateCost(
    response: StandardResponse,
    pricing?: { input: number; output: number }
  ): number | null {
    const usage = this.getUsage(response);
    if (!usage || !pricing) return null;

    const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }
}

/**
 * Batch response transformer
 */
export class BatchResponseTransformer {
  private responses: StandardResponse[] = [];

  add(response: StandardResponse): this {
    this.responses.push(response);
    return this;
  }

  getAll(): StandardResponse[] {
    return this.responses;
  }

  getSuccessful(): StandardResponse[] {
    return this.responses.filter((r) => r.status === 'success');
  }

  getFailed(): StandardResponse[] {
    return this.responses.filter((r) => r.status === 'error');
  }

  getTotalUsage(): { inputTokens: number; outputTokens: number; totalTokens: number } {
    return this.responses.reduce(
      (acc, response) => {
        const usage = ResponseTransformer.getUsage(response);
        if (usage) {
          acc.inputTokens += usage.inputTokens;
          acc.outputTokens += usage.outputTokens;
          acc.totalTokens += usage.totalTokens;
        }
        return acc;
      },
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    );
  }
}

/**
 * Response logger for debugging
 */
export class ResponseLogger {
  static log(response: StandardResponse, options?: { verbose?: boolean }): void {
    if (response.status === 'error') {
      console.error('❌ Error:', response.error?.message);
      if (options?.verbose && response.error?.details) {
        console.error('Details:', response.error.details);
      }
    } else {
      console.log('✅ Success');
      if (options?.verbose) {
        const usage = ResponseTransformer.getUsage(response);
        if (usage) {
          console.log(
            `📊 Usage: ${usage.inputTokens} in + ${usage.outputTokens} out = ${usage.totalTokens} total`
          );
        }
        if (response.metadata.latency) {
          console.log(`⏱️  Latency: ${response.metadata.latency}ms`);
        }
      }
    }
  }
}
