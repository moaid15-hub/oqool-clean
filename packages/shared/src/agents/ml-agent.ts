// ml-agent.ts
// ============================================
// 🤖 Machine Learning Agent - وكيل التعلم الآلي
// ============================================
//
// ⚠️ LEGACY FILE - This is the original ML Agent
// ✅ USE ml-agent-enhanced.ts instead - it's more advanced
//
// This file is kept for reference only and is not exported
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';
import type { CodeFile } from '../core/god-mode.js';

// Temporary type definitions (should be moved to god-mode.ts later)
export interface CodePattern {
  pattern: string;
  frequency: number;
  context: string;
  type?: string;
  description?: string;
  complexity?: number;
}

export interface PredictionContext {
  language: string;
  framework?: string;
  context?: string;
  previousLines?: string[];
  currentLine?: string;
}

export interface MLTrainingResult {
  success: boolean;
  patternsLearned: number;
  accuracy: number;
  model?: any;
  patterns?: CodePattern[];
  stats?: any;
}

export interface MLModel {
  name: string;
  version: string;
  capabilities: string[];
  accuracy: number;
}

export class MLAgent {
  private aiAdapter: UnifiedAIAdapter;
  private provider: AIProvider;

  constructor(
    config: { deepseek?: string; claude?: string; openai?: string },
    provider: AIProvider = 'auto'
  ) {
    const hasValidClaude = config.claude?.startsWith('sk-ant-');

    this.aiAdapter = new UnifiedAIAdapter({
      deepseek: config.deepseek,
      claude: config.claude,
      openai: config.openai,
      defaultProvider: hasValidClaude ? 'claude' : 'deepseek',
    });
    this.provider = provider;
  }

  // ============================================
  // Train on Code Patterns
  // ============================================
  async trainOnCodePatterns(codeBase: CodeFile[]): Promise<MLTrainingResult> {
    const patterns: CodePattern[] = [];

    // Extract unique patterns from codebase
    for (const file of codeBase) {
      const filePatterns = await this.extractCodePatterns(file);
      patterns.push(...filePatterns);
    }

    const trainingStats = {
      totalFiles: codeBase.length,
      uniquePatterns: patterns.length,
      languages: this.detectLanguages(codeBase),
      complexity: this.calculateComplexity(patterns),
    };

    return {
      success: true,
      patternsLearned: patterns.length,
      accuracy: trainingStats.complexity > 5 ? 0.85 : 0.92,
      model: {
        name: 'OqoolCodeLearner',
        version: '1.0.0',
        capabilities: ['code completion', 'pattern recognition'],
        accuracy: this.calculateModelAccuracy(patterns),
      },
      patterns,
      stats: trainingStats,
    };
  }

  // ============================================
  // Predict Code Completion
  // ============================================
  async predictCodeCompletion(context: PredictionContext): Promise<string[]> {
    const prompt = `
Predict code completion based on context:

Language: ${context.language}
Previous Lines:
${context.previousLines?.join('\n') || ''}

Current Line: ${context.currentLine || ''}

Provide 3 most likely code completions:
1. Short completion
2. Medium completion
3. Advanced/Complex completion
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseCompletions(response);
    } catch (error) {
      console.error('Code completion prediction failed');
      return [];
    }
  }

  // ============================================
  // Detect Code Smells & Improvement Suggestions
  // ============================================
  async detectCodeSmells(codeFile: CodeFile): Promise<string[]> {
    const prompt = `
Analyze this code for potential improvements and code smells:

Language: ${codeFile.language}
File: ${codeFile.path}

Code:
${codeFile.content}

Identify:
1. Potential refactoring opportunities
2. Performance bottlenecks
3. Complexity indicators
4. Anti-patterns
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseCodeSmells(response);
    } catch (error) {
      console.error('Code smell detection failed');
      return [];
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================
  private async extractCodePatterns(file: CodeFile): Promise<CodePattern[]> {
    const prompt = `
Extract unique code patterns from this file:

Language: ${file.language}
File: ${file.path}

Identify:
- Common function structures
- Repeated logic blocks
- Design patterns
- Algorithmic approaches
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parsePatterns(response);
    } catch (error) {
      console.error(`Pattern extraction failed for ${file.path}`);
      return [];
    }
  }

  private detectLanguages(codeBase: CodeFile[]): string[] {
    const languages = new Set(codeBase.map((file) => file.language));
    return Array.from(languages);
  }

  private calculateComplexity(patterns: CodePattern[]): number {
    // Simple complexity calculation based on patterns
    return Math.min(patterns.length * 2, 100);
  }

  private calculateModelAccuracy(patterns: CodePattern[]): number {
    // Mock accuracy calculation
    return Math.min(patterns.length, 85);
  }

  private parsePatterns(text: string): CodePattern[] {
    // Simple pattern parsing logic
    const patterns: CodePattern[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.match(/pattern|structure|approach/i)) {
        patterns.push({
          type: 'generic',
          description: line.trim(),
          pattern: line.trim(),
          frequency: 1,
          context: 'generic',
          complexity: 3,
        });
      }
    }

    return patterns;
  }

  private parseCompletions(text: string): string[] {
    const completions: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim().length > 10) {
        // Filter out short/invalid lines
        completions.push(line.trim());
      }
    }

    return completions.slice(0, 3); // Return top 3 completions
  }

  private parseCodeSmells(text: string): string[] {
    const smells: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.match(/smell|improvement|refactor/i)) {
        smells.push(line.trim());
      }
    }

    return smells;
  }

  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'optimizer',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }
}
