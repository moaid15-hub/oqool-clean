// packages/cli/src/smart-chat.ts
/**
 * Smart Chat System
 *
 * نظام محادثة ذكي مع AI يدعم:
 * - Context-aware conversations
 * - Streaming responses
 * - Action parsing and execution
 * - History management
 * - File operations
 * - Version control integration
 */

import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ContextManager, VersionGuardian } from '@oqool/shared/core';
import { UnifiedAIAdapter } from '@oqool/shared/ai-gateway';
import { FileManager } from './file-manager.js';
import { intentParser, type ParsedIntent } from './intent-parser.js';
import { SmartContextBuilder, type BuiltContext } from './smart-context-builder.js';

/**
 * Message interface
 */
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/**
 * Action to execute
 */
interface Action {
  type: 'create_file' | 'edit_file' | 'delete_file' | 'git_commit' | 'run_command';
  description: string;
  data: any;
}

/**
 * Smart Chat Configuration
 */
interface SmartChatConfig {
  model?: string;
  maxHistory?: number;
  autoApply?: boolean;
  verbose?: boolean;
}

/**
 * Smart Chat Class
 */
export class SmartChat {
  private context: ContextManager;
  private contextBuilder: SmartContextBuilder;
  private ai: UnifiedAIAdapter;
  private files: FileManager;
  private guardian: VersionGuardian;
  private history: Message[] = [];
  private config: Required<SmartChatConfig>;

  constructor(
    contextManager: ContextManager,
    aiAdapter: UnifiedAIAdapter,
    fileManager: FileManager,
    versionGuardian: VersionGuardian,
    smartContextBuilder: SmartContextBuilder,
    config?: SmartChatConfig
  ) {
    this.context = contextManager;
    this.contextBuilder = smartContextBuilder;
    this.ai = aiAdapter;
    this.files = fileManager;
    this.guardian = versionGuardian;

    // Default config
    this.config = {
      model: config?.model || 'claude-3-sonnet-20240229',
      maxHistory: config?.maxHistory || 20,
      autoApply: config?.autoApply || false,
      verbose: config?.verbose || false,
    };
  }

  /**
   * Main chat method
   */
  async chat(message: string): Promise<void> {
    try {
      // 1. Parse intent
      const intent = this.parseIntent(message);

      if (this.config.verbose) {
        console.log(chalk.gray(`\n🎯 Intent: ${intent.type} (${Math.round(intent.confidence * 100)}%)`));
      }

      // 2. Build context
      const spinner = ora('Building context...').start();
      const contextData = await this.buildContext(message, intent);
      spinner.succeed('Context ready');

      // 3. AI request with streaming
      console.log(chalk.cyan('\n💭 Claude:\n'));
      let response = '';

      try {
        const stream = await this.ai.streamComplete({
          message,
          context: contextData,
          history: this.history.slice(-this.config.maxHistory),
        });

        for await (const chunk of stream) {
          process.stdout.write(chunk);
          response += chunk;
        }
      } catch (error: any) {
        spinner.fail('AI request failed');
        console.error(chalk.red(`\n❌ Error: ${error.message}`));
        return;
      }

      console.log('\n');

      // 4. Parse response for actions
      const actions = this.parseActions(response);

      // 5. Review and apply
      if (actions.length > 0) {
        await this.reviewAndApply(actions);
      }

      // 6. Update history
      this.updateHistory(message, response);

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Chat error: ${error.message}`));
    }
  }

  /**
   * Parse user intent from message (using advanced parser)
   */
  private parseIntent(message: string): ParsedIntent {
    return intentParser.parse(message);
  }

  /**
   * Build context for AI (using Smart Context Builder)
   */
  private async buildContext(message: string, intent: ParsedIntent): Promise<string> {
    try {
      // Use Smart Context Builder for intelligent context
      const builtContext = await this.contextBuilder.buildContext(message);

      const contextParts: string[] = [];

      // Add project info
      const { projectInfo } = builtContext;
      contextParts.push(`# Project: ${projectInfo.name}`);
      contextParts.push(`Type: ${projectInfo.type}`);
      contextParts.push(`Languages: ${projectInfo.languages.join(', ')}`);

      if (projectInfo.frameworks.length > 0) {
        contextParts.push(`Frameworks: ${projectInfo.frameworks.join(', ')}`);
      }

      // Add relevant files
      contextParts.push('\n## Relevant Files:\n');

      // Full files
      for (const file of builtContext.files.fullFiles) {
        contextParts.push(file);
        contextParts.push('---\n');
      }

      // Signatures
      for (const sig of builtContext.files.signatures) {
        contextParts.push(sig);
        contextParts.push('---\n');
      }

      // Summaries
      for (const summary of builtContext.files.summaries) {
        contextParts.push(summary);
        contextParts.push('---\n');
      }

      // Add metadata in verbose mode
      if (this.config.verbose) {
        const { metadata } = builtContext;
        contextParts.push('\n## Context Metadata:');
        contextParts.push(`- Files analyzed: ${metadata.totalFilesAnalyzed}`);
        contextParts.push(`- Files included: ${metadata.filesIncluded}`);
        contextParts.push(`- Compression ratio: ${(metadata.compressionRatio * 100).toFixed(1)}%`);
        contextParts.push(`- Build time: ${metadata.buildTime}ms`);
      }

      return contextParts.join('\n');
    } catch (error) {
      // Fallback to simple context
      console.warn(chalk.yellow('⚠️  Smart context building failed, using fallback'));
      return this.buildSimpleContext(message, intent);
    }
  }

  /**
   * Fallback: Simple context building
   */
  private async buildSimpleContext(message: string, intent: ParsedIntent): Promise<string> {
    const contextParts: string[] = [];

    // Add file context if files mentioned
    if (intent.entities.files) {
      for (const filePath of intent.entities.files) {
        try {
          const fileContent = await this.files.readFile(filePath);
          contextParts.push(`\nFile: ${filePath}\n\`\`\`\n${fileContent}\n\`\`\``);
        } catch (error) {
          // File doesn't exist
        }
      }
    }

    return contextParts.join('\n\n');
  }

  /**
   * Parse actions from AI response
   */
  private parseActions(response: string): Action[] {
    const actions: Action[] = [];

    // Parse code blocks with file paths
    const codeBlockRegex = /```(\w+)?\s*(?:file:)?\s*([\w/.-]+)?\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1];
      const filePath = match[2];
      const code = match[3];

      if (filePath && code) {
        actions.push({
          type: 'create_file',
          description: `Create/update file: ${filePath}`,
          data: {
            path: filePath,
            content: code,
            language,
          },
        });
      }
    }

    // Parse git commit suggestions
    if (response.toLowerCase().includes('git commit')) {
      const commitMatch = response.match(/git commit -m ["'](.+?)["']/);
      if (commitMatch) {
        actions.push({
          type: 'git_commit',
          description: `Git commit: ${commitMatch[1]}`,
          data: {
            message: commitMatch[1],
          },
        });
      }
    }

    // Parse command suggestions
    const commandRegex = /(?:run|execute):\s*`([^`]+)`/gi;
    while ((match = commandRegex.exec(response)) !== null) {
      actions.push({
        type: 'run_command',
        description: `Run command: ${match[1]}`,
        data: {
          command: match[1],
        },
      });
    }

    return actions;
  }

  /**
   * Review and apply actions
   */
  private async reviewAndApply(actions: Action[]): Promise<void> {
    console.log(chalk.yellow('\n📋 Suggested actions:\n'));

    // Show all actions
    actions.forEach((action, index) => {
      console.log(chalk.gray(`${index + 1}. ${action.description}`));
    });

    // Ask for confirmation unless auto-apply is enabled
    if (!this.config.autoApply) {
      const { shouldApply } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldApply',
          message: 'Apply these actions?',
          default: false,
        },
      ]);

      if (!shouldApply) {
        console.log(chalk.gray('Actions skipped.\n'));
        return;
      }
    }

    // Apply each action
    for (const action of actions) {
      const spinner = ora(action.description).start();

      try {
        await this.executeAction(action);
        spinner.succeed();
      } catch (error: any) {
        spinner.fail(`Failed: ${error.message}`);
      }
    }

    console.log(chalk.green('\n✅ Actions applied!\n'));
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action): Promise<void> {
    switch (action.type) {
      case 'create_file':
        await this.files.writeFile(action.data.path, action.data.content);
        break;

      case 'edit_file':
        await this.files.editFile(action.data.path, action.data.changes);
        break;

      case 'delete_file':
        await this.files.deleteFile(action.data.path);
        break;

      case 'git_commit':
        // Use createSnapshot instead of commit
        await this.guardian.createSnapshot(
          `commit-${Date.now()}`,
          action.data.message
        );
        break;

      case 'run_command':
        // This should be handled carefully with user confirmation
        console.log(chalk.yellow(`\nCommand: ${action.data.command}`));
        console.log(chalk.gray('(Skipped for safety - run manually if needed)'));
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Update conversation history
   */
  private updateHistory(userMessage: string, assistantResponse: string): void {
    this.history.push(
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      }
    );

    // Trim history if needed
    if (this.history.length > this.config.maxHistory * 2) {
      this.history = this.history.slice(-this.config.maxHistory * 2);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return [...this.history];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
    console.log(chalk.gray('History cleared.\n'));
  }

  /**
   * Export conversation history
   */
  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import conversation history
   */
  importHistory(historyJson: string): void {
    try {
      const history = JSON.parse(historyJson);
      if (Array.isArray(history)) {
        this.history = history;
        console.log(chalk.green(`✅ Imported ${history.length} messages\n`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Invalid history format\n'));
    }
  }
}

/**
 * Create a new SmartChat instance
 */
export function createSmartChat(
  contextManager: ContextManager,
  aiAdapter: UnifiedAIAdapter,
  fileManager: FileManager,
  versionGuardian: VersionGuardian,
  smartContextBuilder: SmartContextBuilder,
  config?: SmartChatConfig
): SmartChat {
  return new SmartChat(
    contextManager,
    aiAdapter,
    fileManager,
    versionGuardian,
    smartContextBuilder,
    config
  );
}
