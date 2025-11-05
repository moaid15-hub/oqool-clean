// langchain-agent.ts
// ============================================
// 🤖 Oqool AI Agent with LangChain
// ============================================
// AI workflows with memory, RAG, and code understanding

// @ts-nocheck - Langchain packages not fully installed
import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory, BufferWindowMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { CodeParser, ParsedFile } from '../parser/tree-sitter-parser.js';

// ============================================
// Types
// ============================================

export interface OqoolAIConfig {
  provider: 'openai' | 'ollama' | 'anthropic';
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  memorySize?: number; // Number of messages to remember
}

export interface ProjectAnalysisResult {
  summary: string;
  architecture: string[];
  technologies: string[];
  suggestions: string[];
  codeQuality: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  dependencies: {
    name: string;
    count: number;
    files: string[];
  }[];
}

export interface CodeGenerationRequest {
  description: string;
  language: string;
  context?: string;
  existingCode?: string;
  style?: 'functional' | 'oop' | 'mixed';
}

export interface CodeGenerationResult {
  code: string;
  explanation: string;
  tests?: string;
  documentation?: string;
}

export interface RefactoringRequest {
  code: string;
  language: string;
  goals: ('performance' | 'readability' | 'maintainability' | 'security')[];
  preserveTests?: boolean;
}

export interface RefactoringResult {
  refactoredCode: string;
  changes: {
    type: string;
    description: string;
    lineNumbers: { before: number; after: number };
  }[];
  explanation: string;
  improvements: string[];
}

// ============================================
// Main AI Agent Class
// ============================================

export class OqoolAIAgent {
  private config: OqoolAIConfig;
  private llm: ChatOpenAI;
  private memory: BufferWindowMemory;
  private conversationChain: ConversationChain | null = null;
  private codeParser?: CodeParser;

  constructor(config: OqoolAIConfig, codeParser?: CodeParser) {
    this.config = config;
    this.codeParser = codeParser;

    // Initialize LLM
    this.llm = new ChatOpenAI({
      modelName: config.model,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      openAIApiKey: config.apiKey,
      configuration: config.baseURL
        ? {
            baseURL: config.baseURL,
          }
        : undefined,
    });

    // Initialize memory with window
    this.memory = new BufferWindowMemory({
      k: config.memorySize || 10, // Remember last 10 messages
      returnMessages: true,
      memoryKey: 'chat_history',
    });
  }

  /**
   * Initialize conversation chain
   */
  async initialize(): Promise<void> {
    this.conversationChain = new ConversationChain({
      llm: this.llm,
      memory: this.memory,
    });
  }

  /**
   * Chat with the AI agent
   */
  async chat(message: string): Promise<string> {
    if (!this.conversationChain) {
      await this.initialize();
    }

    const response = await this.conversationChain!.call({
      input: message,
    });

    return response.response;
  }

  /**
   * Analyze entire project
   */
  async analyzeProject(
    projectPath: string,
    files: { path: string; content: string; language: string }[]
  ): Promise<ProjectAnalysisResult> {
    // Parse all files
    const parsedFiles: ParsedFile[] = [];
    if (this.codeParser) {
      for (const file of files) {
        try {
          const parsed = await this.codeParser.parseFile(file.content, file.language);
          parsedFiles.push(parsed);
        } catch (error) {
          console.error(`Error parsing ${file.path}:`, error);
        }
      }
    }

    // Build project context
    const projectContext = this.buildProjectContext(files, parsedFiles);

    // Create analysis prompt
    const prompt = `
Analyze this software project and provide comprehensive insights:

Project Path: ${projectPath}
Total Files: ${files.length}

${projectContext}

Provide analysis in the following format:

1. **Summary**: Brief overview of the project (2-3 sentences)

2. **Architecture**: List the architectural patterns and structure you observe

3. **Technologies**: List all technologies, frameworks, and tools used

4. **Code Quality** (score 0-100):
   - Score: [number]
   - Issues: [list of code quality issues]
   - Strengths: [list of positive aspects]

5. **Suggestions**: Actionable recommendations for improvement

6. **Dependencies**: Most important dependencies and their usage

Please be specific and actionable in your analysis.
`;

    const response = await this.llm.invoke(prompt);
    const analysisText = response.content.toString();

    // Parse the structured response
    return this.parseProjectAnalysis(analysisText, parsedFiles);
  }

  /**
   * Generate code based on description
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const prompt = `
You are an expert ${request.language} programmer. Generate high-quality code based on the following:

**Description**: ${request.description}

**Language**: ${request.language}

**Style**: ${request.style || 'mixed'}

${request.context ? `**Context**:\n${request.context}` : ''}

${request.existingCode ? `**Existing Code to Extend**:\n\`\`\`${request.language}\n${request.existingCode}\n\`\`\`` : ''}

Please provide:

1. **Code**: Complete, production-ready code
2. **Explanation**: How the code works
3. **Tests**: Unit tests for the code
4. **Documentation**: JSDoc/docstring comments

Format your response as:

## Code
\`\`\`${request.language}
[your code here]
\`\`\`

## Explanation
[explanation here]

## Tests
\`\`\`${request.language}
[test code here]
\`\`\`

## Documentation
[documentation notes]
`;

    const response = await this.llm.invoke(prompt);
    const result = response.content.toString();

    return this.parseCodeGeneration(result, request.language);
  }

  /**
   * Refactor existing code
   */
  async refactorCode(request: RefactoringRequest): Promise<RefactoringResult> {
    const goalsText = request.goals.join(', ');

    const prompt = `
You are a code refactoring expert. Refactor the following code to improve: ${goalsText}

**Language**: ${request.language}

**Original Code**:
\`\`\`${request.language}
${request.code}
\`\`\`

**Refactoring Goals**:
${request.goals.map((g) => `- ${g}`).join('\n')}

${request.preserveTests ? '**Important**: Preserve existing test behavior' : ''}

Please provide:

1. **Refactored Code**: The improved version
2. **Changes**: List each change with description and line numbers
3. **Explanation**: Why these changes improve the code
4. **Improvements**: Measurable improvements (if applicable)

Format:

## Refactored Code
\`\`\`${request.language}
[refactored code]
\`\`\`

## Changes
- [Change 1]: [description] (lines X-Y)
- [Change 2]: [description] (lines X-Y)

## Explanation
[detailed explanation]

## Improvements
- [Improvement 1]
- [Improvement 2]
`;

    const response = await this.llm.invoke(prompt);
    const result = response.content.toString();

    return this.parseRefactoringResult(result);
  }

  /**
   * Explain code functionality
   */
  async explainCode(
    code: string,
    language: string,
    level: 'beginner' | 'intermediate' | 'expert' = 'intermediate'
  ): Promise<string> {
    const prompt = `
Explain the following ${language} code at a ${level} level:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. **Overview**: What this code does
2. **Step-by-step**: How it works (line by line if complex)
3. **Key Concepts**: Important programming concepts used
4. **Use Cases**: When to use this pattern

Adjust the explanation complexity for a ${level} programmer.
`;

    const response = await this.llm.invoke(prompt);
    return response.content.toString();
  }

  /**
   * Find bugs in code
   */
  async findBugs(
    code: string,
    language: string
  ): Promise<{
    bugs: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      location: string;
      fix: string;
    }>;
    summary: string;
  }> {
    const prompt = `
Analyze this ${language} code for bugs, vulnerabilities, and potential issues:

\`\`\`${language}
${code}
\`\`\`

Find:
- Logic errors
- Security vulnerabilities
- Performance issues
- Memory leaks
- Race conditions
- Type errors
- Edge cases not handled

For each issue, provide:
1. **Severity**: critical/high/medium/low
2. **Description**: What the bug is
3. **Location**: Line numbers or function name
4. **Fix**: How to fix it

Format as:

## Bugs Found

### Bug 1
- **Severity**: [level]
- **Description**: [what's wrong]
- **Location**: [where]
- **Fix**: [how to fix]

## Summary
[Overall assessment]
`;

    const response = await this.llm.invoke(prompt);
    const result = response.content.toString();

    return this.parseBugAnalysis(result);
  }

  /**
   * Suggest improvements for code
   */
  async suggestImprovements(
    code: string,
    language: string
  ): Promise<Array<{
    category: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }>> {
    const prompt = `
Review this ${language} code and suggest improvements:

\`\`\`${language}
${code}
\`\`\`

Categories to consider:
- Performance optimization
- Code readability
- Maintainability
- Best practices
- Modern language features
- Error handling
- Testing
- Documentation

For each suggestion:
1. **Category**: Type of improvement
2. **Suggestion**: Specific recommendation
3. **Impact**: High/Medium/Low benefit
4. **Effort**: High/Medium/Low implementation effort

Format:

## Suggestion 1
- **Category**: [category]
- **Suggestion**: [detailed suggestion]
- **Impact**: [high/medium/low]
- **Effort**: [high/medium/low]
`;

    const response = await this.llm.invoke(prompt);
    const result = response.content.toString();

    return this.parseImprovementSuggestions(result);
  }

  /**
   * Generate tests for code
   */
  async generateTests(
    code: string,
    language: string,
    framework?: string
  ): Promise<{
    tests: string;
    coverage: string[];
    explanation: string;
  }> {
    const testFramework = framework || this.detectTestFramework(language);

    const prompt = `
Generate comprehensive unit tests for this ${language} code using ${testFramework}:

\`\`\`${language}
${code}
\`\`\`

Requirements:
- Test all public functions/methods
- Cover edge cases
- Test error handling
- Use descriptive test names
- Follow ${testFramework} best practices

Provide:
1. **Tests**: Complete test code
2. **Coverage**: What scenarios are tested
3. **Explanation**: Testing strategy

Format:

## Tests
\`\`\`${language}
[test code]
\`\`\`

## Coverage
- [Scenario 1]
- [Scenario 2]

## Explanation
[testing approach]
`;

    const response = await this.llm.invoke(prompt);
    const result = response.content.toString();

    return this.parseTestGeneration(result, language);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private buildProjectContext(
    files: { path: string; content: string; language: string }[],
    parsedFiles: ParsedFile[]
  ): string {
    const fileList = files.map((f) => `- ${f.path} (${f.language})`).join('\n');

    const totalFunctions = parsedFiles.reduce((acc, f) => acc + (f.functions?.length || 0), 0);
    const totalClasses = parsedFiles.reduce((acc, f) => acc + (f.classes?.length || 0), 0);

    return `
**Files**:
${fileList}

**Statistics**:
- Total Functions: ${totalFunctions}
- Total Classes: ${totalClasses}
- Languages: ${[...new Set(files.map((f) => f.language))].join(', ')}
`;
  }

  private parseProjectAnalysis(
    analysisText: string,
    parsedFiles: ParsedFile[]
  ): ProjectAnalysisResult {
    // Extract summary
    const summaryMatch = analysisText.match(/\*\*Summary\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : 'No summary available';

    // Extract architecture patterns
    const archMatch = analysisText.match(
      /\*\*Architecture\*\*:?\s*([\s\S]*?)(?=\*\*|$)/i
    );
    const architecture = archMatch
      ? archMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    // Extract technologies
    const techMatch = analysisText.match(/\*\*Technologies\*\*:?\s*([\s\S]*?)(?=\*\*|$)/i);
    const technologies = techMatch
      ? techMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    // Extract code quality score
    const scoreMatch = analysisText.match(/Score:?\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    // Extract issues and strengths
    const issuesMatch = analysisText.match(/Issues:?\s*([\s\S]*?)(?=Strengths|$)/i);
    const issues = issuesMatch
      ? issuesMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    const strengthsMatch = analysisText.match(/Strengths:?\s*([\s\S]*?)(?=\*\*|$)/i);
    const strengths = strengthsMatch
      ? strengthsMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    // Extract suggestions
    const suggestionsMatch = analysisText.match(/\*\*Suggestions\*\*:?\s*([\s\S]*?)(?=\*\*|$)/i);
    const suggestions = suggestionsMatch
      ? suggestionsMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    return {
      summary,
      architecture,
      technologies,
      suggestions,
      codeQuality: {
        score,
        issues,
        strengths,
      },
      dependencies: [], // TODO: Extract from package.json analysis
    };
  }

  private parseCodeGeneration(result: string, language: string): CodeGenerationResult {
    const codeMatch = result.match(/##\s*Code\s*```[\w]*\n([\s\S]*?)```/i);
    const code = codeMatch ? codeMatch[1].trim() : '';

    const explanationMatch = result.match(/##\s*Explanation\s*([\s\S]*?)(?=##|$)/i);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';

    const testsMatch = result.match(/##\s*Tests\s*```[\w]*\n([\s\S]*?)```/i);
    const tests = testsMatch ? testsMatch[1].trim() : undefined;

    const docsMatch = result.match(/##\s*Documentation\s*([\s\S]*?)(?=##|$)/i);
    const documentation = docsMatch ? docsMatch[1].trim() : undefined;

    return {
      code,
      explanation,
      tests,
      documentation,
    };
  }

  private parseRefactoringResult(result: string): RefactoringResult {
    const codeMatch = result.match(/##\s*Refactored Code\s*```[\w]*\n([\s\S]*?)```/i);
    const refactoredCode = codeMatch ? codeMatch[1].trim() : '';

    const changesMatch = result.match(/##\s*Changes\s*([\s\S]*?)(?=##|$)/i);
    const changesText = changesMatch ? changesMatch[1] : '';
    const changes = changesText
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => {
        const match = line.match(/^-\s*\[?([^\]]+)\]?:?\s*(.+?)(?:\s*\(lines?\s*(\d+)-(\d+)\))?$/i);
        return {
          type: match?.[1] || 'Unknown',
          description: match?.[2] || line.replace(/^-\s*/, ''),
          lineNumbers: {
            before: match?.[3] ? parseInt(match[3]) : 0,
            after: match?.[4] ? parseInt(match[4]) : 0,
          },
        };
      });

    const explanationMatch = result.match(/##\s*Explanation\s*([\s\S]*?)(?=##|$)/i);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';

    const improvementsMatch = result.match(/##\s*Improvements\s*([\s\S]*?)(?=##|$)/i);
    const improvements = improvementsMatch
      ? improvementsMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    return {
      refactoredCode,
      changes,
      explanation,
      improvements,
    };
  }

  private parseBugAnalysis(result: string): {
    bugs: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      location: string;
      fix: string;
    }>;
    summary: string;
  } {
    const bugs: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      location: string;
      fix: string;
    }> = [];

    const bugSections = result.matchAll(/###\s*Bug\s*\d+\s*([\s\S]*?)(?=###|##\s*Summary|$)/gi);

    for (const section of bugSections) {
      const content = section[1];

      const severityMatch = content.match(/\*\*Severity\*\*:?\s*(critical|high|medium|low)/i);
      const descMatch = content.match(/\*\*Description\*\*:?\s*([^\n*]+)/i);
      const locMatch = content.match(/\*\*Location\*\*:?\s*([^\n*]+)/i);
      const fixMatch = content.match(/\*\*Fix\*\*:?\s*([\s\S]*?)(?=\*\*|$)/i);

      bugs.push({
        severity: (severityMatch?.[1] as any) || 'medium',
        description: descMatch?.[1]?.trim() || 'Unknown issue',
        location: locMatch?.[1]?.trim() || 'Unknown location',
        fix: fixMatch?.[1]?.trim() || 'No fix provided',
      });
    }

    const summaryMatch = result.match(/##\s*Summary\s*([\s\S]*?)$/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : 'No summary available';

    return { bugs, summary };
  }

  private parseImprovementSuggestions(result: string): Array<{
    category: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }> {
    const suggestions: Array<{
      category: string;
      suggestion: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'high' | 'medium' | 'low';
    }> = [];

    const sections = result.matchAll(/##\s*Suggestion\s*\d+\s*([\s\S]*?)(?=##|$)/gi);

    for (const section of sections) {
      const content = section[1];

      const categoryMatch = content.match(/\*\*Category\*\*:?\s*([^\n*]+)/i);
      const suggestionMatch = content.match(/\*\*Suggestion\*\*:?\s*([^\n*]+)/i);
      const impactMatch = content.match(/\*\*Impact\*\*:?\s*(high|medium|low)/i);
      const effortMatch = content.match(/\*\*Effort\*\*:?\s*(high|medium|low)/i);

      suggestions.push({
        category: categoryMatch?.[1]?.trim() || 'General',
        suggestion: suggestionMatch?.[1]?.trim() || 'No suggestion',
        impact: (impactMatch?.[1] as any) || 'medium',
        effort: (effortMatch?.[1] as any) || 'medium',
      });
    }

    return suggestions;
  }

  private parseTestGeneration(result: string, language: string): {
    tests: string;
    coverage: string[];
    explanation: string;
  } {
    const testsMatch = result.match(/##\s*Tests\s*```[\w]*\n([\s\S]*?)```/i);
    const tests = testsMatch ? testsMatch[1].trim() : '';

    const coverageMatch = result.match(/##\s*Coverage\s*([\s\S]*?)(?=##|$)/i);
    const coverage = coverageMatch
      ? coverageMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    const explanationMatch = result.match(/##\s*Explanation\s*([\s\S]*?)(?=##|$)/i);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';

    return {
      tests,
      coverage,
      explanation,
    };
  }

  private detectTestFramework(language: string): string {
    const frameworks: Record<string, string> = {
      typescript: 'Jest',
      javascript: 'Jest',
      python: 'pytest',
      java: 'JUnit',
      go: 'testing package',
      rust: 'cargo test',
    };

    return frameworks[language.toLowerCase()] || 'appropriate testing framework';
  }

  /**
   * Clear conversation memory
   */
  clearMemory(): void {
    this.memory.clear();
  }

  /**
   * Get conversation history
   */
  async getHistory(): Promise<any[]> {
    const history = await this.memory.loadMemoryVariables({});
    return history.chat_history || [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OqoolAIConfig>): void {
    this.config = { ...this.config, ...config };

    // Recreate LLM with new config
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 2000,
      openAIApiKey: this.config.apiKey,
      configuration: this.config.baseURL
        ? {
            baseURL: this.config.baseURL,
          }
        : undefined,
    });
  }
}

// ============================================
// Factory
// ============================================

export function createOqoolAIAgent(
  config: OqoolAIConfig,
  codeParser?: CodeParser
): OqoolAIAgent {
  return new OqoolAIAgent(config, codeParser);
}

// ============================================
// Usage Examples
// ============================================

export const LANGCHAIN_AGENT_EXAMPLES = `
// 📝 استخدام Oqool AI Agent

import { createOqoolAIAgent } from '@oqool/shared';
import { CodeParser } from '@oqool/shared';

// 1. Initialize Agent
const agent = createOqoolAIAgent({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  memorySize: 10
});

await agent.initialize();

// 2. Chat with AI
const response = await agent.chat('How can I optimize this React component?');
console.log(response);

// 3. Analyze Project
const files = [
  { path: 'src/index.ts', content: '...', language: 'typescript' },
  { path: 'src/utils.ts', content: '...', language: 'typescript' }
];

const analysis = await agent.analyzeProject('/project', files);
console.log('Project Score:', analysis.codeQuality.score);
console.log('Suggestions:', analysis.suggestions);

// 4. Generate Code
const generated = await agent.generateCode({
  description: 'Create a debounce function with TypeScript',
  language: 'typescript',
  style: 'functional'
});

console.log('Code:', generated.code);
console.log('Tests:', generated.tests);

// 5. Refactor Code
const refactored = await agent.refactorCode({
  code: 'function old() { ... }',
  language: 'typescript',
  goals: ['performance', 'readability']
});

console.log('Improvements:', refactored.improvements);

// 6. Find Bugs
const bugs = await agent.findBugs(code, 'typescript');
console.log('Critical bugs:', bugs.bugs.filter(b => b.severity === 'critical'));

// 7. Generate Tests
const tests = await agent.generateTests(code, 'typescript', 'Jest');
console.log('Test Coverage:', tests.coverage);
`;

export default OqoolAIAgent;
