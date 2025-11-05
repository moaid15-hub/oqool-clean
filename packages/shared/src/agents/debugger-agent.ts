// debugger-agent.ts
// ============================================
// 🐛 Debugger Agent - المصلح
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';
import type { GeneratedCode, CodeFile } from '../core/god-mode.js';

export interface BugReport {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  file: string;
  line?: number;
  description: string;
  suggestion: string;
  fixed?: boolean;
}

export interface DebugResults {
  bugsFound: number;
  bugsFixed: number;
  bugs: BugReport[];
  fixedFiles: CodeFile[];
  summary: string;
}

export class DebuggerAgent {
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

  async analyzeAndFix(code: GeneratedCode, errorLogs?: string): Promise<DebugResults> {
    const bugs: BugReport[] = [];
    const fixedFiles: CodeFile[] = [];

    // 1. Static Analysis - تحليل ثابت
    for (const file of code.files) {
      const fileBugs = await this.analyzeFile(file);
      bugs.push(...fileBugs);
    }

    // 2. Runtime Error Analysis - تحليل أخطاء التشغيل
    if (errorLogs) {
      const runtimeBugs = await this.analyzeErrorLogs(errorLogs, code);
      bugs.push(...runtimeBugs);
    }

    // 3. Fix Critical and High Severity Bugs
    const criticalBugs = bugs.filter((b) => b.severity === 'critical' || b.severity === 'high');

    for (const bug of criticalBugs) {
      const fixed = await this.fixBug(bug, code);
      if (fixed) {
        bug.fixed = true;
        // Update fixed file in the list
        const fileIndex = fixedFiles.findIndex((f) => f.path === fixed.path);
        if (fileIndex >= 0) {
          fixedFiles[fileIndex] = fixed;
        } else {
          fixedFiles.push(fixed);
        }
      }
    }

    const bugsFixed = bugs.filter((b) => b.fixed).length;

    return {
      bugsFound: bugs.length,
      bugsFixed,
      bugs,
      fixedFiles,
      summary: this.generateSummary(bugs, bugsFixed),
    };
  }

  // ============================================
  // Analyze single file for bugs
  // ============================================
  private async analyzeFile(file: CodeFile): Promise<BugReport[]> {
    const prompt = `
Analyze this code for bugs, errors, and potential issues:

File: ${file.path}
Language: ${file.language}

Code:
${file.content}

Find:
1. ❌ Syntax errors
2. 🔴 Logic errors (wrong conditions, infinite loops)
3. ⚠️ Runtime errors (null refs, type mismatches)
4. 🐛 Edge cases not handled
5. 💥 Exception handling missing
6. 🔄 Race conditions
7. 🗑️ Memory leaks
8. 📦 Missing imports/dependencies

For each bug found, provide:
- Severity (critical/high/medium/low)
- Type (syntax/logic/runtime/etc)
- Line number if possible
- Description
- How to fix it

Output format (JSON):
\`\`\`json
{
  "bugs": [
    {
      "severity": "high",
      "type": "null-reference",
      "line": 42,
      "description": "Variable 'user' might be null",
      "suggestion": "Add null check before accessing properties"
    }
  ]
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseBugReport(response, file.path);
    } catch (error) {
      console.error(`Failed to analyze ${file.path}`);
      return [];
    }
  }

  // ============================================
  // Analyze error logs
  // ============================================
  private async analyzeErrorLogs(errorLogs: string, code: GeneratedCode): Promise<BugReport[]> {
    const prompt = `
Analyze these runtime error logs and find the bugs:

Error Logs:
${errorLogs}

Project Files:
${code.files.map((f) => `- ${f.path}`).join('\n')}

Identify:
1. What went wrong
2. Which file caused it
3. Root cause
4. How to fix

Output format (JSON):
\`\`\`json
{
  "bugs": [
    {
      "severity": "critical",
      "type": "runtime-error",
      "file": "src/api.ts",
      "line": 15,
      "description": "TypeError: Cannot read property 'id' of undefined",
      "suggestion": "Add validation before accessing user.id"
    }
  ]
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseBugReport(response);
    } catch (error) {
      console.error('Failed to analyze error logs');
      return [];
    }
  }

  // ============================================
  // Fix a specific bug
  // ============================================
  private async fixBug(bug: BugReport, code: GeneratedCode): Promise<CodeFile | null> {
    // Find the file
    const file = code.files.find((f) => f.path === bug.file);
    if (!file) return null;

    const prompt = `
Fix this bug in the code:

File: ${file.path}
Bug: ${bug.description}
Suggestion: ${bug.suggestion}
Severity: ${bug.severity}

Original Code:
${file.content}

Provide the COMPLETE fixed code with:
1. Bug fixed
2. Comments explaining the fix
3. Proper error handling
4. No other changes unless necessary

Output format:
\`\`\`${file.language}
// Fixed code here
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      const fixedContent = this.extractCode(response);

      if (fixedContent) {
        return {
          ...file,
          content: fixedContent,
        };
      }
    } catch (error) {
      console.error(`Failed to fix bug in ${bug.file}`);
    }

    return null;
  }

  // ============================================
  // Call Claude API via UnifiedAIAdapter
  // ============================================
  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'debugger',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }

  // ============================================
  // Parse bug report from response
  // ============================================
  private parseBugReport(response: string, defaultFile?: string): BugReport[] {
    try {
      // Extract JSON from markdown
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[1]);

      return (data.bugs || []).map((bug: any) => ({
        severity: bug.severity || 'medium',
        type: bug.type || 'unknown',
        file: bug.file || defaultFile || 'unknown',
        line: bug.line,
        description: bug.description || '',
        suggestion: bug.suggestion || '',
        fixed: false,
      }));
    } catch (error) {
      console.error('Failed to parse bug report');
      return [];
    }
  }

  // ============================================
  // Extract code from response
  // ============================================
  private extractCode(response: string): string | null {
    const match = response.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }

  // ============================================
  // Generate summary
  // ============================================
  private generateSummary(bugs: BugReport[], fixed: number): string {
    const bySeverity = {
      critical: bugs.filter((b) => b.severity === 'critical').length,
      high: bugs.filter((b) => b.severity === 'high').length,
      medium: bugs.filter((b) => b.severity === 'medium').length,
      low: bugs.filter((b) => b.severity === 'low').length,
    };

    return `
# 🐛 Debug Summary

## Bugs Found: ${bugs.length}
- 🔴 Critical: ${bySeverity.critical}
- 🟠 High: ${bySeverity.high}
- 🟡 Medium: ${bySeverity.medium}
- 🟢 Low: ${bySeverity.low}

## Bugs Fixed: ${fixed}
- Auto-fixed: ${fixed} (critical & high priority)
- Remaining: ${bugs.length - fixed}

## Top Issues:
${bugs
  .slice(0, 5)
  .map((b, i) => `${i + 1}. [${b.severity.toUpperCase()}] ${b.description}`)
  .join('\n')}

${fixed > 0 ? '\n✅ Critical bugs have been automatically fixed!' : ''}
${bugs.length - fixed > 0 ? '\n⚠️ Some bugs require manual review.' : ''}
    `.trim();
  }
}
