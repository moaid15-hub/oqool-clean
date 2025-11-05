// optimizer-agent.ts
// ============================================
// ⚡ Optimizer Agent - المحسّن
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';
import type { GeneratedCode, CodeFile } from '../core/god-mode.js';

export interface OptimizationSuggestion {
  type: 'performance' | 'memory' | 'bundle-size' | 'algorithm' | 'database' | 'network';
  priority: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  issue: string;
  impact: string;
  solution: string;
  estimatedGain: string;
  applied?: boolean;
}

export interface OptimizationResults {
  suggestionsCount: number;
  appliedCount: number;
  suggestions: OptimizationSuggestion[];
  optimizedFiles: CodeFile[];
  performanceGain: string;
  summary: string;
}

export class OptimizerAgent {
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

  async optimize(code: GeneratedCode): Promise<OptimizationResults> {
    const suggestions: OptimizationSuggestion[] = [];
    const optimizedFiles: CodeFile[] = [];

    // 1. Analyze each file for optimizations
    for (const file of code.files) {
      const fileSuggestions = await this.analyzeFile(file);
      suggestions.push(...fileSuggestions);
    }

    // 2. Project-level optimizations
    const projectSuggestions = await this.analyzeProject(code);
    suggestions.push(...projectSuggestions);

    // 3. Apply high-priority optimizations
    const highPriority = suggestions.filter(
      (s) => s.priority === 'critical' || s.priority === 'high'
    );

    for (const suggestion of highPriority) {
      const optimized = await this.applyOptimization(suggestion, code);
      if (optimized) {
        suggestion.applied = true;
        const fileIndex = optimizedFiles.findIndex((f) => f.path === optimized.path);
        if (fileIndex >= 0) {
          optimizedFiles[fileIndex] = optimized;
        } else {
          optimizedFiles.push(optimized);
        }
      }
    }

    const appliedCount = suggestions.filter((s) => s.applied).length;

    return {
      suggestionsCount: suggestions.length,
      appliedCount,
      suggestions,
      optimizedFiles,
      performanceGain: this.estimateGain(suggestions, appliedCount),
      summary: this.generateSummary(suggestions, appliedCount),
    };
  }

  // ============================================
  // Analyze single file
  // ============================================
  private async analyzeFile(file: CodeFile): Promise<OptimizationSuggestion[]> {
    const prompt = `
Analyze this code for performance optimizations:

File: ${file.path}
Language: ${file.language}

Code:
${file.content}

Find optimization opportunities:

1. ⚡ Performance Issues:
   - Unnecessary loops
   - N+1 queries
   - Heavy operations in render
   - Missing memoization
   - Inefficient algorithms (O(n²) → O(n log n))

2. 🧠 Memory Issues:
   - Memory leaks
   - Large objects in memory
   - Missing cleanup
   - Unnecessary copies

3. 📦 Bundle Size:
   - Unused imports
   - Heavy libraries
   - Dead code

4. 🔄 Algorithm Improvements:
   - Better data structures
   - Caching opportunities
   - Lazy loading

5. 🗄️ Database:
   - Missing indexes
   - Inefficient queries
   - Missing pagination

6. 🌐 Network:
   - Missing compression
   - Too many requests
   - Large payloads

Output format (JSON):
\`\`\`json
{
  "suggestions": [
    {
      "type": "performance",
      "priority": "high",
      "file": "${file.path}",
      "issue": "Unnecessary loop in render function",
      "impact": "Re-renders cause 500ms lag",
      "solution": "Move calculation outside render, use useMemo",
      "estimatedGain": "~80% faster rendering"
    }
  ]
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseSuggestions(response, file.path);
    } catch (error) {
      console.error(`Failed to analyze ${file.path}`);
      return [];
    }
  }

  // ============================================
  // Analyze project-level optimizations
  // ============================================
  private async analyzeProject(code: GeneratedCode): Promise<OptimizationSuggestion[]> {
    const prompt = `
Analyze this project for architecture-level optimizations:

Files:
${code.files.map((f) => `- ${f.path} (${f.language})`).join('\n')}

Project Structure:
${this.getProjectStructure(code)}

Find:
1. 📐 Architecture improvements
2. 🔄 Code duplication
3. 📦 Bundle optimization
4. ⚡ Loading strategy
5. 🗄️ State management
6. 🌐 API optimization
7. 🎯 Resource loading

Output format (JSON):
\`\`\`json
{
  "suggestions": [
    {
      "type": "bundle-size",
      "priority": "high",
      "file": "package.json",
      "issue": "Bundle size is 2MB",
      "impact": "Slow initial load",
      "solution": "Code splitting, lazy loading, tree shaking",
      "estimatedGain": "~60% smaller bundle"
    }
  ]
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseSuggestions(response);
    } catch (error) {
      console.error('Failed to analyze project');
      return [];
    }
  }

  // ============================================
  // Apply optimization
  // ============================================
  private async applyOptimization(
    suggestion: OptimizationSuggestion,
    code: GeneratedCode
  ): Promise<CodeFile | null> {
    const file = code.files.find((f) => f.path === suggestion.file);
    if (!file) return null;

    const prompt = `
Apply this optimization to the code:

File: ${file.path}
Issue: ${suggestion.issue}
Solution: ${suggestion.solution}
Expected Gain: ${suggestion.estimatedGain}

Original Code:
${file.content}

Provide optimized code with:
1. Optimization applied
2. Comments explaining what changed
3. Preserve all functionality
4. Follow best practices

Output format:
\`\`\`${file.language}
// Optimized code here
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      const optimizedContent = this.extractCode(response);

      if (optimizedContent) {
        return {
          ...file,
          content: optimizedContent,
        };
      }
    } catch (error) {
      console.error(`Failed to optimize ${suggestion.file}`);
    }

    return null;
  }

  // ============================================
  // Call Claude API
  // ============================================
  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'optimizer',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }

  // ============================================
  // Parse suggestions
  // ============================================
  private parseSuggestions(response: string, defaultFile?: string): OptimizationSuggestion[] {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[1]);

      return (data.suggestions || []).map((s: any) => ({
        type: s.type || 'performance',
        priority: s.priority || 'medium',
        file: s.file || defaultFile || 'unknown',
        issue: s.issue || '',
        impact: s.impact || '',
        solution: s.solution || '',
        estimatedGain: s.estimatedGain || 'Unknown',
        applied: false,
      }));
    } catch (error) {
      console.error('Failed to parse suggestions');
      return [];
    }
  }

  // ============================================
  // Extract code
  // ============================================
  private extractCode(response: string): string | null {
    const match = response.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }

  // ============================================
  // Get project structure
  // ============================================
  private getProjectStructure(code: GeneratedCode): string {
    const structure: Record<string, string[]> = {};

    for (const file of code.files) {
      const dir = file.path.split('/').slice(0, -1).join('/') || 'root';
      if (!structure[dir]) structure[dir] = [];
      structure[dir].push(file.path.split('/').pop() || '');
    }

    return Object.entries(structure)
      .map(([dir, files]) => `${dir}:\n  - ${files.join('\n  - ')}`)
      .join('\n\n');
  }

  // ============================================
  // Estimate performance gain
  // ============================================
  private estimateGain(suggestions: OptimizationSuggestion[], applied: number): string {
    if (applied === 0) return '0%';

    const critical = suggestions.filter((s) => s.applied && s.priority === 'critical').length;
    const high = suggestions.filter((s) => s.applied && s.priority === 'high').length;

    let gain = 0;
    gain += critical * 25; // 25% per critical
    gain += high * 15; // 15% per high

    return `~${Math.min(gain, 85)}% improvement`;
  }

  // ============================================
  // Generate summary
  // ============================================
  private generateSummary(suggestions: OptimizationSuggestion[], applied: number): string {
    const byType = {
      performance: suggestions.filter((s) => s.type === 'performance').length,
      memory: suggestions.filter((s) => s.type === 'memory').length,
      'bundle-size': suggestions.filter((s) => s.type === 'bundle-size').length,
      algorithm: suggestions.filter((s) => s.type === 'algorithm').length,
      database: suggestions.filter((s) => s.type === 'database').length,
      network: suggestions.filter((s) => s.type === 'network').length,
    };

    const byPriority = {
      critical: suggestions.filter((s) => s.priority === 'critical').length,
      high: suggestions.filter((s) => s.priority === 'high').length,
      medium: suggestions.filter((s) => s.priority === 'medium').length,
      low: suggestions.filter((s) => s.priority === 'low').length,
    };

    return `
# ⚡ Optimization Summary

## Suggestions: ${suggestions.length}

### By Type:
- ⚡ Performance: ${byType.performance}
- 🧠 Memory: ${byType.memory}
- 📦 Bundle Size: ${byType['bundle-size']}
- 🔄 Algorithm: ${byType.algorithm}
- 🗄️ Database: ${byType.database}
- 🌐 Network: ${byType.network}

### By Priority:
- 🔴 Critical: ${byPriority.critical}
- 🟠 High: ${byPriority.high}
- 🟡 Medium: ${byPriority.medium}
- 🟢 Low: ${byPriority.low}

## Applied: ${applied} optimizations

## Top Improvements:
${suggestions
  .slice(0, 5)
  .map(
    (s, i) =>
      `${i + 1}. [${s.priority.toUpperCase()}] ${s.issue}\n   💡 ${s.solution}\n   📈 ${s.estimatedGain}`
  )
  .join('\n\n')}

${applied > 0 ? '\n✅ High-priority optimizations have been applied!' : ''}
${suggestions.length - applied > 0 ? '\n💡 Additional optimizations available for review.' : ''}
    `.trim();
  }
}
