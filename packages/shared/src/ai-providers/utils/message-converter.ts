// message-converter.ts
// ============================================
// 💬 Message Converter - محول الرسائل الذكي
// ============================================
// Advanced message format conversion with context preservation,
// intelligent optimization, and multi-modal support
// ============================================

// ============================================
// 📊 Core Types & Interfaces
// ============================================

/**
 * Unified Message Format - صيغة موحدة للرسائل
 */
export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentBlock[];
  name?: string; // For tool messages
  toolCallId?: string; // For tool results
  toolCalls?: ToolCall[]; // For assistant messages with tool calls
  metadata?: MessageMetadata;
}

/**
 * Content Block - كتلة محتوى (for multimodal)
 */
export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageBlock {
  type: 'image';
  source: {
    type: 'url' | 'base64';
    url?: string;
    media_type?: string;
    data?: string;
  };
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | any;
  is_error?: boolean;
}

/**
 * Tool Call - استدعاء أداة
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Message Metadata - بيانات وصفية
 */
export interface MessageMetadata {
  timestamp?: Date;
  tokens?: {
    input?: number;
    output?: number;
  };
  model?: string;
  cached?: boolean;
  index?: number;
  conversationId?: string;
  userId?: string;
  tags?: string[];
}

/**
 * Provider-specific formats
 */

// Claude format
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

// OpenAI format
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

// Gemini format
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }>;
}

// DeepSeek format (similar to OpenAI)
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Conversion Options - خيارات التحويل
 */
export interface ConversionOptions {
  preserveMetadata?: boolean;
  optimizeTokens?: boolean;
  mergeConsecutive?: boolean; // Merge consecutive messages from same role
  stripSystemMessage?: boolean;
  maxLength?: number;
  includeToolCalls?: boolean;
  imageFormat?: 'url' | 'base64' | 'remove';
  fallbackBehavior?: 'error' | 'skip' | 'convert';
}

/**
 * Conversion Result - نتيجة التحويل
 */
export interface ConversionResult<T> {
  success: boolean;
  messages: T[];
  systemMessage?: string;
  warnings: ConversionWarning[];
  metadata: {
    originalCount: number;
    convertedCount: number;
    tokensEstimate?: number;
    optimizationsApplied: string[];
  };
}

export interface ConversionWarning {
  type: 'info' | 'warning' | 'error';
  message: string;
  messageIndex?: number;
  field?: string;
}

// ============================================
// 💬 Message Converter Class
// ============================================

export class MessageConverter {
  private logger: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;
  private conversionCache: Map<string, any> = new Map();

  constructor(
    logger?: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void
  ) {
    this.logger =
      logger ||
      ((message: string, level: string) => {
        const emoji = { info: '💬', warn: '⚠️', error: '❌', debug: '🔍' }[level];
        console.log(`${emoji} [MessageConverter] ${message}`);
      });

    this.logger('Message Converter initialized', 'info');
  }

  // ============================================
  // 🔄 Main Conversion Methods
  // ============================================

  /**
   * Convert to Claude format
   * التحويل إلى صيغة Claude
   */
  toClaudeFormat(
    messages: UnifiedMessage[],
    options: ConversionOptions = {}
  ): ConversionResult<ClaudeMessage> {
    this.logger(`Converting ${messages.length} messages to Claude format`, 'debug');

    const warnings: ConversionWarning[] = [];
    const optimizations: string[] = [];
    const claudeMessages: ClaudeMessage[] = [];

    // Extract system message
    let systemMessage: string | undefined;
    const nonSystemMessages = messages.filter((msg, index) => {
      if (msg.role === 'system') {
        if (!options.stripSystemMessage) {
          systemMessage = systemMessage
            ? systemMessage + '\n\n' + this.extractTextContent(msg.content)
            : this.extractTextContent(msg.content);
        }
        return false;
      }
      return true;
    });

    // Process messages
    let processedMessages = [...nonSystemMessages];

    // Merge consecutive messages if requested
    if (options.mergeConsecutive) {
      processedMessages = this.mergeConsecutiveMessages(processedMessages);
      optimizations.push('merged_consecutive');
    }

    // Convert each message
    for (let i = 0; i < processedMessages.length; i++) {
      const msg = processedMessages[i];

      try {
        // Claude only supports 'user' and 'assistant' roles
        if (msg.role === 'tool') {
          // Convert tool message to user message with context
          const toolContent = this.convertToolMessageForClaude(msg);
          claudeMessages.push({
            role: 'user',
            content: toolContent,
          });

          warnings.push({
            type: 'info',
            message: 'Tool message converted to user message',
            messageIndex: i,
          });
        } else if (msg.role === 'user' || msg.role === 'assistant') {
          // Handle content
          let content: string | ContentBlock[];

          if (typeof msg.content === 'string') {
            content = msg.content;
          } else {
            // Process content blocks
            content = this.convertContentBlocks(msg.content, 'claude', options);
          }

          // Add tool calls if present
          if (msg.toolCalls && msg.toolCalls.length > 0 && options.includeToolCalls !== false) {
            const toolUseBlocks = this.convertToolCallsToBlocks(msg.toolCalls);

            if (typeof content === 'string') {
              content = [{ type: 'text', text: content }, ...toolUseBlocks];
            } else {
              content = [...content, ...toolUseBlocks];
            }
          }

          claudeMessages.push({
            role: msg.role,
            content,
          });
        }
      } catch (error: any) {
        warnings.push({
          type: 'error',
          message: `Failed to convert message: ${error.message}`,
          messageIndex: i,
        });

        if (options.fallbackBehavior === 'error') {
          throw error;
        } else if (options.fallbackBehavior === 'skip') {
          continue;
        }
      }
    }

    // Ensure alternating roles (Claude requirement)
    const fixedMessages = this.ensureAlternatingRoles(claudeMessages);
    if (fixedMessages.length !== claudeMessages.length) {
      optimizations.push('fixed_role_alternation');
      warnings.push({
        type: 'warning',
        message: 'Adjusted messages to ensure alternating user/assistant roles',
      });
    }

    // Optimize tokens if requested
    if (options.optimizeTokens) {
      const optimizedMessages = this.optimizeMessagesForTokens(fixedMessages, options);
      optimizations.push('optimized_tokens');
    }

    return {
      success: warnings.filter((w) => w.type === 'error').length === 0,
      messages: fixedMessages,
      systemMessage,
      warnings,
      metadata: {
        originalCount: messages.length,
        convertedCount: fixedMessages.length,
        tokensEstimate: this.estimateTokens(fixedMessages),
        optimizationsApplied: optimizations,
      },
    };
  }

  /**
   * Convert to OpenAI format
   * التحويل إلى صيغة OpenAI
   */
  toOpenAIFormat(
    messages: UnifiedMessage[],
    options: ConversionOptions = {}
  ): ConversionResult<OpenAIMessage> {
    this.logger(`Converting ${messages.length} messages to OpenAI format`, 'debug');

    const warnings: ConversionWarning[] = [];
    const optimizations: string[] = [];
    const openaiMessages: OpenAIMessage[] = [];

    let processedMessages = [...messages];

    // Merge consecutive if requested
    if (options.mergeConsecutive) {
      processedMessages = this.mergeConsecutiveMessages(processedMessages);
      optimizations.push('merged_consecutive');
    }

    // Convert each message
    for (let i = 0; i < processedMessages.length; i++) {
      const msg = processedMessages[i];

      try {
        const openaiMsg: OpenAIMessage = {
          role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'tool',
          content: this.extractTextContent(msg.content),
        };

        // Handle tool-specific fields
        if (msg.role === 'tool') {
          openaiMsg.tool_call_id = msg.toolCallId;
          openaiMsg.name = msg.name;
        }

        // Handle assistant tool calls
        if (msg.role === 'assistant' && msg.toolCalls && options.includeToolCalls !== false) {
          openaiMsg.tool_calls = msg.toolCalls;

          // OpenAI requires content to be null when tool_calls are present
          if (openaiMsg.tool_calls.length > 0 && !openaiMsg.content) {
            openaiMsg.content = null;
          }
        }

        openaiMessages.push(openaiMsg);
      } catch (error: any) {
        warnings.push({
          type: 'error',
          message: `Failed to convert message: ${error.message}`,
          messageIndex: i,
        });

        if (options.fallbackBehavior === 'error') {
          throw error;
        }
      }
    }

    return {
      success: warnings.filter((w) => w.type === 'error').length === 0,
      messages: openaiMessages,
      warnings,
      metadata: {
        originalCount: messages.length,
        convertedCount: openaiMessages.length,
        tokensEstimate: this.estimateTokens(openaiMessages),
        optimizationsApplied: optimizations,
      },
    };
  }

  /**
   * Convert to Gemini format
   * التحويل إلى صيغة Gemini
   */
  toGeminiFormat(
    messages: UnifiedMessage[],
    options: ConversionOptions = {}
  ): ConversionResult<GeminiMessage> {
    this.logger(`Converting ${messages.length} messages to Gemini format`, 'debug');

    const warnings: ConversionWarning[] = [];
    const optimizations: string[] = [];
    const geminiMessages: GeminiMessage[] = [];

    // Gemini doesn't have explicit system role - prepend to first user message
    let systemPrefix = '';
    const nonSystemMessages: UnifiedMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrefix += this.extractTextContent(msg.content) + '\n\n';
      } else {
        nonSystemMessages.push(msg);
      }
    }

    // Convert messages
    for (let i = 0; i < nonSystemMessages.length; i++) {
      const msg = nonSystemMessages[i];

      try {
        // Map roles: user->user, assistant->model, tool->user
        const role = msg.role === 'assistant' ? 'model' : 'user';

        let textContent = this.extractTextContent(msg.content);

        // Add system prefix to first user message
        if (i === 0 && msg.role === 'user' && systemPrefix) {
          textContent = systemPrefix + textContent;
        }

        // Handle tool messages
        if (msg.role === 'tool') {
          textContent = `[Tool Result: ${msg.name}]\n${textContent}`;
          warnings.push({
            type: 'info',
            message: 'Tool message converted to user message with context',
            messageIndex: i,
          });
        }

        const geminiMsg: GeminiMessage = {
          role,
          parts: [{ text: textContent }],
        };

        // Handle images if present
        if (Array.isArray(msg.content)) {
          const imageBlocks = msg.content.filter(
            (block): block is ImageBlock => block.type === 'image'
          );

          for (const imgBlock of imageBlocks) {
            if (imgBlock.source.type === 'base64' && options.imageFormat !== 'remove') {
              geminiMsg.parts.push({
                inline_data: {
                  mime_type: imgBlock.source.media_type || 'image/png',
                  data: imgBlock.source.data || '',
                },
              });
            } else if (imgBlock.source.type === 'url') {
              warnings.push({
                type: 'warning',
                message: 'Gemini may not support image URLs directly',
                messageIndex: i,
              });
            }
          }
        }

        geminiMessages.push(geminiMsg);
      } catch (error: any) {
        warnings.push({
          type: 'error',
          message: `Failed to convert message: ${error.message}`,
          messageIndex: i,
        });

        if (options.fallbackBehavior === 'error') {
          throw error;
        }
      }
    }

    return {
      success: warnings.filter((w) => w.type === 'error').length === 0,
      messages: geminiMessages,
      warnings,
      metadata: {
        originalCount: messages.length,
        convertedCount: geminiMessages.length,
        tokensEstimate: this.estimateTokens(geminiMessages),
        optimizationsApplied: optimizations,
      },
    };
  }

  /**
   * Convert to DeepSeek format
   * التحويل إلى صيغة DeepSeek
   */
  toDeepSeekFormat(
    messages: UnifiedMessage[],
    options: ConversionOptions = {}
  ): ConversionResult<DeepSeekMessage> {
    this.logger(`Converting ${messages.length} messages to DeepSeek format`, 'debug');

    const warnings: ConversionWarning[] = [];
    const deepseekMessages: DeepSeekMessage[] = [];

    // DeepSeek uses OpenAI-like format but simpler
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      try {
        if (msg.role === 'tool') {
          // Convert tool to user message
          deepseekMessages.push({
            role: 'user',
            content: `[Tool: ${msg.name}]\n${this.extractTextContent(msg.content)}`,
          });

          warnings.push({
            type: 'info',
            message: 'Tool message converted to user message',
            messageIndex: i,
          });
        } else {
          deepseekMessages.push({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: this.extractTextContent(msg.content),
          });
        }
      } catch (error: any) {
        warnings.push({
          type: 'error',
          message: `Failed to convert message: ${error.message}`,
          messageIndex: i,
        });
      }
    }

    return {
      success: warnings.filter((w) => w.type === 'error').length === 0,
      messages: deepseekMessages,
      warnings,
      metadata: {
        originalCount: messages.length,
        convertedCount: deepseekMessages.length,
        tokensEstimate: this.estimateTokens(deepseekMessages),
        optimizationsApplied: [],
      },
    };
  }

  /**
   * Convert to any provider format
   * التحويل إلى أي صيغة مزود
   */
  toProviderFormat(
    messages: UnifiedMessage[],
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek',
    options: ConversionOptions = {}
  ): ConversionResult<any> {
    switch (provider) {
      case 'claude':
        return this.toClaudeFormat(messages, options);
      case 'openai':
        return this.toOpenAIFormat(messages, options);
      case 'gemini':
        return this.toGeminiFormat(messages, options);
      case 'deepseek':
        return this.toDeepSeekFormat(messages, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // ============================================
  // 🔧 Helper Methods - Content Processing
  // ============================================

  /**
   * Extract text content from message
   * استخراج المحتوى النصي
   */
  private extractTextContent(content: string | ContentBlock[]): string {
    if (typeof content === 'string') {
      return content;
    }

    return content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  /**
   * Convert content blocks to provider format
   * تحويل كتل المحتوى
   */
  private convertContentBlocks(
    blocks: ContentBlock[],
    provider: 'claude' | 'openai' | 'gemini',
    options: ConversionOptions
  ): ContentBlock[] {
    const converted: ContentBlock[] = [];

    for (const block of blocks) {
      if (block.type === 'text') {
        converted.push(block);
      } else if (block.type === 'image') {
        if (options.imageFormat === 'remove') {
          continue;
        }

        if (provider === 'claude') {
          converted.push(block);
        } else if (provider === 'openai') {
          // OpenAI might handle images differently
          converted.push(block);
        }
      } else if (block.type === 'tool_use' || block.type === 'tool_result') {
        if (options.includeToolCalls !== false) {
          converted.push(block);
        }
      }
    }

    return converted;
  }

  /**
   * Convert tool message for Claude
   * تحويل رسالة الأداة لـ Claude
   */
  private convertToolMessageForClaude(msg: UnifiedMessage): ContentBlock[] {
    const content = this.extractTextContent(msg.content);

    const blocks: ContentBlock[] = [
      {
        type: 'text',
        text: `[Tool Result from ${msg.name || 'unknown'}]:\n${content}`,
      },
    ];

    return blocks;
  }

  /**
   * Convert tool calls to blocks
   * تحويل استدعاءات الأدوات إلى كتل
   */
  private convertToolCallsToBlocks(toolCalls: ToolCall[]): ToolUseBlock[] {
    return toolCalls.map((call) => ({
      type: 'tool_use' as const,
      id: call.id,
      name: call.function.name,
      input: JSON.parse(call.function.arguments),
    }));
  }

  // ============================================
  // 🔧 Optimization Methods
  // ============================================

  /**
   * Merge consecutive messages from same role
   * دمج الرسائل المتتالية من نفس الدور
   */
  private mergeConsecutiveMessages(messages: UnifiedMessage[]): UnifiedMessage[] {
    const merged: UnifiedMessage[] = [];

    for (const msg of messages) {
      const lastMsg = merged[merged.length - 1];

      if (lastMsg && lastMsg.role === msg.role && !msg.toolCalls && !lastMsg.toolCalls) {
        // Merge content
        const lastContent = this.extractTextContent(lastMsg.content);
        const currentContent = this.extractTextContent(msg.content);

        lastMsg.content = lastContent + '\n\n' + currentContent;
      } else {
        merged.push({ ...msg });
      }
    }

    return merged;
  }

  /**
   * Ensure alternating user/assistant roles (Claude requirement)
   * ضمان تناوب الأدوار
   */
  private ensureAlternatingRoles(messages: ClaudeMessage[]): ClaudeMessage[] {
    const fixed: ClaudeMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const lastMsg = fixed[fixed.length - 1];

      if (!lastMsg || lastMsg.role !== msg.role) {
        fixed.push(msg);
      } else {
        // Same role as previous - merge or insert placeholder
        if (msg.role === 'user') {
          // Merge consecutive user messages
          const lastContent = this.extractTextContent(lastMsg.content);
          const currentContent = this.extractTextContent(msg.content);
          lastMsg.content = lastContent + '\n\n' + currentContent;
        } else {
          // For assistant, might need to insert a user message
          fixed.push({
            role: 'user',
            content: '[Continue]',
          });
          fixed.push(msg);
        }
      }
    }

    // Ensure starts with user
    if (fixed.length > 0 && fixed[0].role !== 'user') {
      fixed.unshift({
        role: 'user',
        content: '[Conversation start]',
      });
    }

    return fixed;
  }

  /**
   * Optimize messages for token count
   * تحسين الرسائل لعدد الرموز
   */
  private optimizeMessagesForTokens<T>(messages: T[], options: ConversionOptions): T[] {
    if (!options.maxLength) {
      return messages;
    }

    // Simple truncation strategy
    let totalTokens = this.estimateTokens(messages);

    if (totalTokens <= options.maxLength) {
      return messages;
    }

    // Remove older messages until within limit
    let optimized = [...messages];

    while (totalTokens > options.maxLength && optimized.length > 1) {
      // Keep first (system) and last messages, remove from middle
      if (optimized.length > 2) {
        optimized.splice(1, 1);
      } else {
        break;
      }

      totalTokens = this.estimateTokens(optimized);
    }

    return optimized;
  }

  // ============================================
  // 📊 Utility Methods
  // ============================================

  /**
   * Estimate token count
   * تقدير عدد الرموز
   */
  private estimateTokens(messages: any[]): number {
    let total = 0;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        total += Math.ceil(msg.content.length / 4);
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            total += Math.ceil(block.text.length / 4);
          } else if (block.type === 'image') {
            total += 1000; // Rough estimate for images
          }
        }
      } else if (msg.parts) {
        // Gemini format
        for (const part of msg.parts) {
          if (part.text) {
            total += Math.ceil(part.text.length / 4);
          }
        }
      }

      // Add overhead for role and structure
      total += 10;
    }

    return total;
  }

  /**
   * Validate messages
   * التحقق من الرسائل
   */
  validateMessages(messages: UnifiedMessage[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!messages || messages.length === 0) {
      errors.push('Messages array is empty');
      return { valid: false, errors };
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (!msg.role) {
        errors.push(`Message at index ${i} is missing role`);
      }

      if (!msg.content && !msg.toolCalls) {
        errors.push(`Message at index ${i} is missing content`);
      }

      if (msg.role === 'tool' && !msg.toolCallId) {
        errors.push(`Tool message at index ${i} is missing toolCallId`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear cache
   * مسح الكاش
   */
  clearCache(): void {
    this.conversionCache.clear();
    this.logger('Conversion cache cleared', 'info');
  }

  /**
   * Get cache stats
   * إحصائيات الكاش
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.conversionCache.size,
      entries: Array.from(this.conversionCache.keys()),
    };
  }
}

// ============================================
// 📤 Exports
// ============================================

export default MessageConverter;
