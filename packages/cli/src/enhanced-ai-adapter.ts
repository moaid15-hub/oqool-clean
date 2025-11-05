/**
 * Enhanced AI Adapter
 *
 * محول AI محسّن يدعم:
 * - Context-aware completions
 * - Streaming responses
 * - Smart provider selection
 * - System prompt building
 * - File change parsing
 */

import { UnifiedAIAdapter } from '@oqool/shared/ai-gateway';
import { ResponseTransformer } from '@oqool/shared/core';
import type { BuiltContext, ProjectInfo } from './smart-context-builder.js';

/**
 * Message interface
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * File change action
 */
export type FileChangeAction = 'create' | 'modify' | 'delete';

/**
 * File change
 */
export interface FileChange {
  path: string;
  action: FileChangeAction;
  content?: string;
  language?: string;
}

/**
 * Completion request
 */
export interface CompletionRequest {
  userMessage: string;
  context: BuiltContext;
  history: ChatMessage[];
  stream?: boolean;
}

/**
 * Enhanced AI Adapter Class
 */
export class EnhancedAIAdapter {
  private adapter: UnifiedAIAdapter;
  private defaultProvider: string;

  constructor(adapter: UnifiedAIAdapter, defaultProvider: string = 'auto') {
    this.adapter = adapter;
    this.defaultProvider = defaultProvider;
  }

  /**
   * Complete with context (main method)
   */
  async completeWithContext(request: CompletionRequest): Promise<AsyncGenerator<string>> {
    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(request.context);

    // Build user prompt
    const userPrompt = this.buildUserPrompt(request);

    // Select provider
    const provider = this.selectProvider(request);

    // Prepare messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.history,
      { role: 'user', content: userPrompt },
    ];

    // Stream completion
    return this.streamCompletion({
      messages,
      provider,
    });
  }

  /**
   * Build system prompt from context
   */
  private buildSystemPrompt(context: BuiltContext): string {
    const { projectInfo } = context;

    const parts: string[] = [];

    // Role definition
    parts.push(`You are an expert ${projectInfo.type} developer specializing in ${projectInfo.languages.join(', ')}.`);

    // Project context
    parts.push('\n## Project Context:\n');
    parts.push(`- Project: ${projectInfo.name}`);
    parts.push(`- Type: ${projectInfo.type}`);
    parts.push(`- Languages: ${projectInfo.languages.join(', ')}`);

    if (projectInfo.frameworks.length > 0) {
      parts.push(`- Frameworks: ${projectInfo.frameworks.join(', ')}`);
    }

    if (projectInfo.dependencies.length > 0) {
      parts.push(`- Key Dependencies: ${projectInfo.dependencies.slice(0, 10).join(', ')}`);
    }

    // Current files
    if (context.files.fullFiles.length > 0 || context.files.signatures.length > 0) {
      parts.push('\n## Current Codebase:\n');

      // Full files
      for (const file of context.files.fullFiles) {
        parts.push(file);
      }

      // Signatures
      for (const sig of context.files.signatures) {
        parts.push(sig);
      }

      // Summaries
      for (const summary of context.files.summaries) {
        parts.push(summary);
      }
    }

    // Instructions
    parts.push('\n## Instructions:\n');
    parts.push('- Follow the existing code style and conventions');
    parts.push('- Use existing patterns found in the codebase');
    parts.push('- Add proper error handling');

    if (projectInfo.languages.includes('TypeScript')) {
      parts.push('- Include TypeScript types and interfaces');
      parts.push('- Use strict type checking');
    }

    parts.push('- Write secure, production-ready code');
    parts.push('- Add helpful comments for complex logic');
    parts.push('- Consider edge cases and error scenarios');

    // Response format
    parts.push('\n## Response Format:\n');
    parts.push('When creating or modifying files, use this format:\n');
    parts.push('```language filepath');
    parts.push('// File content here');
    parts.push('```');
    parts.push('\nFor multiple files, repeat the above format for each file.');
    parts.push('Explain your changes and reasoning before showing the code.');

    return parts.join('\n');
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(request: CompletionRequest): string {
    const parts: string[] = [];

    // User message
    parts.push(request.userMessage);

    // Additional context from entities
    // (This could be enhanced based on parsed intent)

    return parts.join('\n\n');
  }

  /**
   * Select appropriate provider
   */
  private selectProvider(request: CompletionRequest): string {
    // For now, use default provider
    // Could be enhanced to:
    // - Use cheaper providers for simple tasks
    // - Use smarter providers for complex tasks
    // - Load balance across providers
    return this.defaultProvider;
  }

  /**
   * Stream completion
   */
  private async *streamCompletion(config: {
    messages: ChatMessage[];
    provider: string;
  }): AsyncGenerator<string> {
    // Convert messages to adapter format
    const systemMessage = config.messages.find(m => m.role === 'system');
    const otherMessages = config.messages.filter(m => m.role !== 'system');

    try {
      // Use adapter's stream method
      const stream = await this.adapter.streamComplete({
        message: otherMessages[otherMessages.length - 1].content,
        context: systemMessage?.content || '',
        history: otherMessages.slice(0, -1).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      // Yield chunks
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error: any) {
      // Handle errors gracefully
      yield `\n\n⚠️ Error: ${error.message}\n`;
      throw error;
    }
  }

  /**
   * Parse file changes from AI response
   */
  parseFileChanges(response: string): FileChange[] {
    const changes: FileChange[] = [];

    // Parse code blocks with file paths
    // Format: ```language filepath
    const codeBlockRegex = /```(\w+)\s+([\w/.-]+)\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1];
      const filePath = match[2];
      const content = match[3].trim();

      // Determine action based on content or keywords
      let action: FileChangeAction = 'modify';

      // Check for creation keywords in surrounding text
      const beforeBlock = response.substring(Math.max(0, match.index - 200), match.index);
      if (
        beforeBlock.includes('create') ||
        beforeBlock.includes('new file') ||
        beforeBlock.includes('add file')
      ) {
        action = 'create';
      }

      // Check for deletion
      if (content === '' || beforeBlock.includes('delete') || beforeBlock.includes('remove')) {
        action = 'delete';
      }

      changes.push({
        path: filePath,
        action,
        content: action !== 'delete' ? content : undefined,
        language,
      });
    }

    // Also try alternative format: <file path="...">...</file>
    const xmlBlockRegex = /<file(?:\s+path=["']([^"']+)["'])?(?:\s+action=["'](\w+)["'])?\s*>([\s\S]*?)<\/file>/g;

    while ((match = xmlBlockRegex.exec(response)) !== null) {
      const filePath = match[1];
      const action = (match[2] as FileChangeAction) || 'modify';
      const content = match[3].trim();

      if (filePath) {
        changes.push({
          path: filePath,
          action,
          content: action !== 'delete' ? content : undefined,
          language: this.detectLanguage(filePath),
        });
      }
    }

    return changes;
  }

  /**
   * Detect language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      swift: 'swift',
      kt: 'kotlin',
    };
    return ext && map[ext] ? map[ext] : 'text';
  }

  /**
   * Create simple completion (without context)
   */
  async complete(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    if (stream) {
      return this.adapter.streamComplete({
        message: prompt,
        context: '',
        history: [],
      });
    } else {
      const response = await this.adapter.complete({
        message: prompt,
        context: '',
        history: [],
      });
      return response.text;
    }
  }

  /**
   * Get adapter info
   */
  getInfo(): {
    provider: string;
    model?: string;
  } {
    return {
      provider: this.defaultProvider,
    };
  }
}

/**
 * Create enhanced AI adapter
 */
export function createEnhancedAIAdapter(
  adapter: UnifiedAIAdapter,
  defaultProvider: string = 'auto'
): EnhancedAIAdapter {
  return new EnhancedAIAdapter(adapter, defaultProvider);
}
