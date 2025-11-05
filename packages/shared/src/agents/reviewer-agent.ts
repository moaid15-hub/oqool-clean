// reviewer-agent.ts
// ============================================
// 🔍 Reviewer Agent - المراجع
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';
import type { GeneratedCode, ReviewResult, Improvement, CodeFile } from '../core/god-mode.js';

export interface FileIssue {
  file: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  line?: number;
}

export class ReviewerAgent {
  private aiAdapter: UnifiedAIAdapter;
  private provider: AIProvider;

  constructor(
    config: { deepseek?: string; claude?: string; openai?: string },
    provider: AIProvider = 'auto'
  ) {
    // 🔄 Smart default: use Claude if available, otherwise DeepSeek
    const hasValidClaude = config.claude?.startsWith('sk-ant-');

    this.aiAdapter = new UnifiedAIAdapter({
      deepseek: config.deepseek,
      claude: config.claude,
      openai: config.openai,
      defaultProvider: hasValidClaude ? 'claude' : 'deepseek', // fallback to DeepSeek
    });
    this.provider = provider;
  }

  // ============================================
  // Review code file by file
  // ============================================
  async review(code: GeneratedCode): Promise<ReviewResult> {
    let score = 100;
    const improvements: Improvement[] = [];

    // Analyze each file individually
    for (const file of code.files) {
      const issues = await this.analyzeFile(file);

      // Reduce score based on issues found
      score -= issues.length * 5;

      // Convert issues to improvements
      for (const issue of issues) {
        improvements.push({
          type: issue.type,
          description: `[${file.path}] ${issue.description}`,
          applied: false,
        });
      }
    }

    const feedback = this.generateFeedback(improvements, score);

    return {
      score: Math.max(0, score),
      improvements,
      feedback,
    };
  }

  // ============================================
  // Improve code based on review
  // ============================================
  async improve(code: GeneratedCode, review: ReviewResult): Promise<GeneratedCode> {
    if (review.score >= 90) {
      return code; // Already excellent
    }

    const improvedFiles: CodeFile[] = [];

    // Apply improvements to each file that needs them
    for (const file of code.files) {
      const fileImprovements = review.improvements.filter((imp) =>
        imp.description.includes(`[${file.path}]`)
      );

      if (fileImprovements.length > 0) {
        const improved = await this.improveFile(file, fileImprovements);
        if (improved) {
          improvedFiles.push(improved);

          // Mark as applied
          fileImprovements.forEach((imp) => (imp.applied = true));
        } else {
          improvedFiles.push(file); // Keep original if improvement failed
        }
      } else {
        improvedFiles.push(file); // No improvements needed
      }
    }

    const totalLines = improvedFiles.reduce((sum, f) => sum + f.lines, 0);

    return {
      files: improvedFiles,
      totalLines,
    };
  }

  // ============================================
  // Analyze single file for issues
  // ============================================
  private async analyzeFile(file: CodeFile): Promise<FileIssue[]> {
    // Skip config files
    if (file.path.match(/package\.json|\.env|README/)) {
      return [];
    }

    const prompt = `
Analyze this code file for issues:

File: ${file.path}
Language: ${file.language}

Code:
${file.content}

Find issues in these categories:
1. Code Quality (naming, structure, readability)
2. Security (vulnerabilities, unsafe patterns)
3. Performance (inefficient code, memory leaks)
4. Best Practices (violations, anti-patterns)
5. Error Handling (missing try-catch, edge cases)

For each issue, provide:
- Type (quality/security/performance/practices/errors)
- Severity (critical/high/medium/low)
- Description (what's wrong and how to fix)

Output format:
TYPE: type | SEVERITY: severity | DESCRIPTION: description
TYPE: type | SEVERITY: severity | DESCRIPTION: description
...
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseIssues(response, file.path);
    } catch (error) {
      console.error(`Failed to analyze ${file.path}`);
      return [];
    }
  }

  // ============================================
  // Improve single file
  // ============================================
  private async improveFile(file: CodeFile, improvements: Improvement[]): Promise<CodeFile | null> {
    const issuesList = improvements.map((imp) => `- ${imp.description}`).join('\n');

    const prompt = `
Improve this code file by fixing the following issues:

File: ${file.path}
Language: ${file.language}

Issues to fix:
${issuesList}

Original Code:
${file.content}

Output the improved code in this format:
\`\`\`filename:${file.path}
// improved code here
\`\`\`

Keep the same functionality but fix all mentioned issues.
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseImprovedFile(response, file);
    } catch (error) {
      console.error(`Failed to improve ${file.path}`);
      return null;
    }
  }

  // ============================================
  // Generate feedback summary
  // ============================================
  private generateFeedback(improvements: Improvement[], score: number): string {
    let feedback = `# Code Review Report\n\n`;
    feedback += `## Overall Score: ${score}/100\n\n`;

    if (score >= 90) {
      feedback += `### ✅ Excellent Code Quality\n\n`;
      feedback += `The code is of high quality with minimal issues.\n\n`;
    } else if (score >= 70) {
      feedback += `### ⚠️ Good Code with Some Issues\n\n`;
      feedback += `The code is generally good but has some areas for improvement.\n\n`;
    } else if (score >= 50) {
      feedback += `### ⚠️ Fair Code Quality\n\n`;
      feedback += `The code needs improvement in several areas.\n\n`;
    } else {
      feedback += `### ❌ Poor Code Quality\n\n`;
      feedback += `The code has significant issues that need to be addressed.\n\n`;
    }

    if (improvements.length > 0) {
      feedback += `## Issues Found (${improvements.length})\n\n`;

      // Group by type
      const byType = improvements.reduce(
        (acc, imp) => {
          if (!acc[imp.type]) acc[imp.type] = [];
          acc[imp.type].push(imp);
          return acc;
        },
        {} as Record<string, Improvement[]>
      );

      for (const [type, issues] of Object.entries(byType)) {
        feedback += `### ${type.toUpperCase()}\n\n`;
        issues.forEach((issue, i) => {
          feedback += `${i + 1}. ${issue.description}\n`;
        });
        feedback += '\n';
      }
    } else {
      feedback += `## No Issues Found\n\n`;
      feedback += `The code follows best practices and has no significant issues.\n\n`;
    }

    feedback += `---\n`;
    feedback += `Generated by Oqool ReviewerAgent\n`;

    return feedback;
  }

  // ============================================
  // Parse issues from response
  // ============================================
  private parseIssues(response: string, filePath: string): FileIssue[] {
    const issues: FileIssue[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(
        /TYPE:\s*(\w+)\s*\|\s*SEVERITY:\s*(\w+)\s*\|\s*DESCRIPTION:\s*(.+)/i
      );
      if (match) {
        const [, type, severity, description] = match;

        issues.push({
          file: filePath,
          type: type.toLowerCase(),
          severity: severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
          description: description.trim(),
        });
      }
    }

    return issues;
  }

  // ============================================
  // Parse improved file from response
  // ============================================
  private parseImprovedFile(response: string, originalFile: CodeFile): CodeFile | null {
    const match = response.match(/```(?:filename:)?([^\n]+)\n([\s\S]*?)```/);

    if (!match) {
      return null;
    }

    const content = match[2].trim();
    const lines = content.split('\n').length;

    return {
      path: originalFile.path,
      content,
      language: originalFile.language,
      lines,
    };
  }

  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'reviewer',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }
}
