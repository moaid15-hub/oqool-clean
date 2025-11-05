// ai-code-completion.ts
// ============================================
// 🤖 AI Code Completion System
// نظام إكمال الكود الذكي
// ============================================

import { OqoolAPIClient } from './api-client.js';
import { createCodeAnalyzer, FunctionInfo, ClassInfo } from './code-analyzer.js';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================
// Types & Interfaces
// ============================================

export interface CodeCompletionOptions {
  language?: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'php';
  maxSuggestions?: number;
  useContext?: boolean;
  includeImports?: boolean;
  includeComments?: boolean;
  style?: 'minimal' | 'detailed' | 'verbose';
}

export interface CompletionSuggestion {
  code: string;
  description: string;
  confidence: number;
  type: 'function' | 'class' | 'variable' | 'import' | 'statement' | 'block';
  imports?: string[];
  explanation?: string;
}

export interface CompletionResult {
  success: boolean;
  suggestions: CompletionSuggestion[];
  context?: string;
  error?: string;
}

export interface InlineCompletionOptions {
  file: string;
  line: number;
  column: number;
  prefix?: string;
  suffix?: string;
}

export interface SmartSnippet {
  id: string;
  name: string;
  description: string;
  language: string;
  trigger: string;
  template: string;
  variables: string[];
  category: 'function' | 'class' | 'api' | 'database' | 'testing' | 'utility';
  usageCount: number;
  rating: number;
}

export interface CodePattern {
  pattern: string;
  description: string;
  examples: string[];
  bestPractices: string[];
  antiPatterns: string[];
}

// ============================================
// AI Code Completion System
// ============================================

export class AICodeCompletion {
  private projectRoot: string;
  private client: OqoolAPIClient;
  private analyzer = createCodeAnalyzer();
  private snippetsCache: Map<string, SmartSnippet[]> = new Map();
  private patternsCache: Map<string, CodePattern[]> = new Map();
  private completionHistory: Array<{
    prompt: string;
    suggestion: string;
    accepted: boolean;
    timestamp: number;
  }> = [];

  constructor(projectRoot: string, client: OqoolAPIClient) {
    this.projectRoot = projectRoot;
    this.client = client;
  }

  // ============================================
  // Smart Code Completion
  // ============================================

  /**
   * إكمال الكود الذكي بناءً على السياق
   */
  async completeCode(
    prompt: string,
    options: CodeCompletionOptions = {}
  ): Promise<CompletionResult> {
    try {
      const {
        language = 'typescript',
        maxSuggestions = 5,
        useContext = true,
        includeImports = true,
        includeComments = true,
        style = 'detailed',
      } = options;

      // جمع السياق من المشروع
      let context = '';
      if (useContext) {
        context = await this.gatherProjectContext(language);
      }

      // بناء الـ prompt للـ AI
      const aiPrompt = this.buildCompletionPrompt(
        prompt,
        context,
        language,
        includeImports,
        includeComments,
        style
      );

      // طلب الاقتراحات من AI
      const response = await this.client.sendChatMessage([{ role: 'user', content: aiPrompt }]);

      if (!response.success) {
        return {
          success: false,
          suggestions: [],
          error: response.error,
        };
      }

      // استخراج الاقتراحات
      const suggestions = this.parseSuggestions(response.message, maxSuggestions);

      // حفظ في التاريخ
      suggestions.forEach((s) => {
        this.completionHistory.push({
          prompt,
          suggestion: s.code,
          accepted: false,
          timestamp: Date.now(),
        });
      });

      return {
        success: true,
        suggestions,
        context,
      };
    } catch (error: any) {
      return {
        success: false,
        suggestions: [],
        error: error.message,
      };
    }
  }

  /**
   * إكمال سطر الكود في الموقع الحالي
   */
  async inlineComplete(options: InlineCompletionOptions): Promise<CompletionResult> {
    try {
      const { file, line, column, prefix, suffix } = options;

      // قراءة محتوى الملف
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      const currentLine = lines[line - 1] || '';

      // تحديد السياق
      const beforeCursor = prefix || currentLine.substring(0, column);
      const afterCursor = suffix || currentLine.substring(column);

      // جمع الأسطر المحيطة للسياق
      const contextLines = this.getContextLines(lines, line, 10);

      // تحليل الملف
      const analysis = await this.analyzer.analyzeFile(file);

      // بناء prompt
      const prompt = `
أكمل الكود التالي:

السياق:
\`\`\`${this.detectLanguage(file)}
${contextLines}
\`\`\`

السطر الحالي:
قبل المؤشر: ${beforeCursor}
بعد المؤشر: ${afterCursor}

المعلومات الإضافية:
- الدوال الموجودة: ${analysis.functions.map((f) => f.name).join(', ')}
- الكلاسات الموجودة: ${analysis.classes.map((c) => c.name).join(', ')}

أكمل الكود بذكاء مع مراعاة:
1. السياق المحيط
2. الأنماط المستخدمة في الملف
3. Best practices
4. اقترح 3 احتمالات مختلفة
`;

      return this.completeCode(prompt, {
        language: this.detectLanguage(file) as any,
        maxSuggestions: 3,
        useContext: false,
      });
    } catch (error: any) {
      return {
        success: false,
        suggestions: [],
        error: error.message,
      };
    }
  }

  /**
   * إكمال دالة كاملة بناءً على التعليق أو الاسم
   */
  async completeFunctionFromComment(
    comment: string,
    functionName?: string,
    options: CodeCompletionOptions = {}
  ): Promise<CompletionResult> {
    const language = options.language || 'typescript';

    const prompt = `
أنشئ دالة ${language} كاملة بناءً على:

${functionName ? `اسم الدالة: ${functionName}` : ''}
الوصف: ${comment}

متطلبات:
1. كود نظيف وقابل للقراءة
2. التعامل مع الأخطاء
3. JSDoc/تعليقات توضيحية
4. Type safety (TypeScript)
5. Unit test examples

اقترح 3 تنفيذات مختلفة (مبسط، متوسط، متقدم)
`;

    return this.completeCode(prompt, {
      ...options,
      maxSuggestions: 3,
      includeComments: true,
    });
  }

  /**
   * إكمال كلاس كامل
   */
  async completeClass(
    className: string,
    description: string,
    options: CodeCompletionOptions = {}
  ): Promise<CompletionResult> {
    const language = options.language || 'typescript';

    const prompt = `
أنشئ كلاس ${language} كامل:

اسم الكلاس: ${className}
الوصف: ${description}

يجب أن يحتوي على:
1. Properties مع types واضحة
2. Constructor
3. Methods أساسية
4. Getters/Setters إذا لزم
5. JSDoc documentation
6. Error handling
7. مثال على الاستخدام

اقترح تنفيذ شامل ومحترف
`;

    return this.completeCode(prompt, {
      ...options,
      maxSuggestions: 1,
      style: 'verbose',
    });
  }

  /**
   * اقتراح تحسينات على كود موجود
   */
  async suggestImprovements(
    code: string,
    language: string = 'typescript'
  ): Promise<CompletionResult> {
    const prompt = `
حلل الكود التالي واقترح تحسينات:

\`\`\`${language}
${code}
\`\`\`

اقترح تحسينات في:
1. الأداء (Performance)
2. القراءة (Readability)
3. الأمان (Security)
4. Best Practices
5. Type Safety
6. Error Handling

أعط 5 اقتراحات مع شرح لكل واحد
`;

    return this.completeCode(prompt, {
      language: language as any,
      maxSuggestions: 5,
      style: 'verbose',
    });
  }

  // ============================================
  // Smart Snippets System
  // ============================================

  /**
   * الحصول على snippets ذكية بناءً على السياق
   */
  async getSmartSnippets(
    context: string,
    language: string = 'typescript',
    category?: SmartSnippet['category']
  ): Promise<SmartSnippet[]> {
    const cacheKey = `${language}-${category || 'all'}`;

    // فحص الـ cache
    if (this.snippetsCache.has(cacheKey)) {
      return this.snippetsCache.get(cacheKey)!;
    }

    // توليد snippets جديدة
    const snippets = await this.generateSmartSnippets(language, category);

    // حفظ في cache
    this.snippetsCache.set(cacheKey, snippets);

    return snippets;
  }

  /**
   * البحث عن snippet
   */
  async searchSnippets(query: string, language: string = 'typescript'): Promise<SmartSnippet[]> {
    const allSnippets = await this.getSmartSnippets('', language);

    const results = allSnippets.filter(
      (s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()) ||
        s.trigger.toLowerCase().includes(query.toLowerCase())
    );

    return results.sort((a, b) => b.rating - a.rating);
  }

  /**
   * استخدام snippet
   */
  async useSnippet(snippetId: string, variables: Record<string, string> = {}): Promise<string> {
    const allSnippets = Array.from(this.snippetsCache.values()).flat();
    const snippet = allSnippets.find((s) => s.id === snippetId);

    if (!snippet) {
      throw new Error(`Snippet not found: ${snippetId}`);
    }

    // استبدال المتغيرات
    let code = snippet.template;
    for (const [key, value] of Object.entries(variables)) {
      code = code.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }

    // زيادة عداد الاستخدام
    snippet.usageCount++;

    return code;
  }

  // ============================================
  // Code Patterns Recognition
  // ============================================

  /**
   * التعرف على الأنماط في الكود
   */
  async recognizePatterns(code: string, language: string = 'typescript'): Promise<CodePattern[]> {
    const cacheKey = `patterns-${language}`;

    if (this.patternsCache.has(cacheKey)) {
      return this.patternsCache.get(cacheKey)!;
    }

    const prompt = `
حلل الكود التالي وحدد الأنماط المستخدمة:

\`\`\`${language}
${code}
\`\`\`

حدد:
1. Design Patterns (Singleton, Factory, Observer, etc.)
2. Architectural Patterns (MVC, MVVM, etc.)
3. Code Patterns (Error handling, etc.)
4. Anti-patterns (إن وجدت)

لكل pattern:
- الاسم
- الوصف
- أمثلة من الكود
- Best practices
- Anti-patterns للتجنب
`;

    const result = await this.completeCode(prompt, {
      language: language as any,
      maxSuggestions: 10,
      style: 'verbose',
    });

    const patterns = this.parsePatterns(result.suggestions);
    this.patternsCache.set(cacheKey, patterns);

    return patterns;
  }

  // ============================================
  // Context & Analysis Helpers
  // ============================================

  /**
   * جمع سياق المشروع
   */
  private async gatherProjectContext(language: string): Promise<string> {
    try {
      // قراءة package.json للمعلومات
      const packagePath = path.join(this.projectRoot, 'package.json');
      let packageInfo = '';

      try {
        const pkg = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
        packageInfo = `
المشروع: ${pkg.name || 'Unknown'}
الوصف: ${pkg.description || 'No description'}
المكتبات: ${Object.keys(pkg.dependencies || {}).join(', ')}
`;
      } catch {
        // لا يوجد package.json
      }

      // البحث عن ملفات بنفس اللغة
      const ext = this.getExtension(language);
      const files = await this.findFiles(ext, 5);

      // تحليل بعض الملفات للسياق
      const analyses = await Promise.all(
        files.slice(0, 3).map((f) => this.analyzer.analyzeFile(f))
      );

      const functionsContext = analyses.flatMap((a) => a.functions.map((f) => f.name)).join(', ');

      const classesContext = analyses.flatMap((a) => a.classes.map((c) => c.name)).join(', ');

      return `
${packageInfo}

الدوال الموجودة: ${functionsContext}
الكلاسات الموجودة: ${classesContext}
`;
    } catch (error) {
      return '';
    }
  }

  /**
   * بناء prompt للإكمال
   */
  private buildCompletionPrompt(
    userPrompt: string,
    context: string,
    language: string,
    includeImports: boolean,
    includeComments: boolean,
    style: string
  ): string {
    let prompt = `أنت مساعد برمجة خبير. أكمل الكود التالي بطريقة احترافية.

اللغة: ${language}
الأسلوب: ${style}

`;

    if (context) {
      prompt += `السياق من المشروع:
${context}

`;
    }

    prompt += `المطلوب:
${userPrompt}

`;

    if (includeImports) {
      prompt += `- أضف الـ imports اللازمة\n`;
    }

    if (includeComments) {
      prompt += `- أضف تعليقات توضيحية\n`;
    }

    prompt += `
متطلبات:
1. كود نظيف ومقروء
2. Best practices
3. Type safety
4. Error handling

أعط عدة اقتراحات مع شرح لكل واحد.

التنسيق:
لكل اقتراح:
SUGGESTION [نوع الاقتراح: function/class/etc]
CONFIDENCE: [0-100]
CODE:
\`\`\`${language}
[الكود هنا]
\`\`\`
DESCRIPTION: [شرح مختصر]
EXPLANATION: [شرح تفصيلي]
---
`;

    return prompt;
  }

  /**
   * تحليل الاقتراحات من رد AI
   */
  private parseSuggestions(aiResponse: string, maxSuggestions: number): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];
    const blocks = aiResponse.split('---');

    for (const block of blocks.slice(0, maxSuggestions)) {
      const suggestionMatch = block.match(/SUGGESTION\s+\[([^\]]+)\]/i);
      const confidenceMatch = block.match(/CONFIDENCE:\s*(\d+)/i);
      const codeMatch = block.match(/CODE:\s*```[\w]*\n([\s\S]*?)```/i);
      const descMatch = block.match(/DESCRIPTION:\s*([^\n]+)/i);
      const explainMatch = block.match(/EXPLANATION:\s*([\s\S]*?)(?=\n\n|$)/i);

      if (codeMatch) {
        suggestions.push({
          type: (suggestionMatch?.[1]?.trim() as any) || 'statement',
          confidence: parseInt(confidenceMatch?.[1] || '70'),
          code: codeMatch[1].trim(),
          description: descMatch?.[1]?.trim() || 'Code suggestion',
          explanation: explainMatch?.[1]?.trim(),
        });
      }
    }

    return suggestions;
  }

  /**
   * تحليل الأنماط من الاقتراحات
   */
  private parsePatterns(suggestions: CompletionSuggestion[]): CodePattern[] {
    // تحليل بسيط - يمكن تحسينه
    return suggestions.map((s) => ({
      pattern: s.description,
      description: s.explanation || s.description,
      examples: [s.code],
      bestPractices: [],
      antiPatterns: [],
    }));
  }

  /**
   * توليد snippets ذكية
   */
  private async generateSmartSnippets(
    language: string,
    category?: SmartSnippet['category']
  ): Promise<SmartSnippet[]> {
    // Snippets محددة مسبقاً (يمكن توليدها من AI أيضاً)
    const baseSnippets: Omit<SmartSnippet, 'id'>[] = [
      {
        name: 'Async Function',
        description: 'دالة async مع error handling',
        language,
        trigger: 'afn',
        template: `async function \${functionName}(\${params}): Promise<\${returnType}> {
  try {
    \${body}
  } catch (error) {
    console.error('Error in \${functionName}:', error);
    throw error;
  }
}`,
        variables: ['functionName', 'params', 'returnType', 'body'],
        category: 'function',
        usageCount: 0,
        rating: 4.5,
      },
      {
        name: 'Class with Constructor',
        description: 'كلاس مع constructor وmethods أساسية',
        language,
        trigger: 'cls',
        template: `class \${className} {
  constructor(\${constructorParams}) {
    \${constructorBody}
  }

  \${methods}
}`,
        variables: ['className', 'constructorParams', 'constructorBody', 'methods'],
        category: 'class',
        usageCount: 0,
        rating: 4.7,
      },
      {
        name: 'API Endpoint Handler',
        description: 'معالج endpoint مع validation',
        language,
        trigger: 'api',
        template: `async function handle\${endpointName}(req: Request, res: Response) {
  try {
    // Validation
    if (!\${validation}) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Process
    const result = await \${processLogic};

    // Response
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}`,
        variables: ['endpointName', 'validation', 'processLogic'],
        category: 'api',
        usageCount: 0,
        rating: 4.8,
      },
    ];

    // تصفية حسب الفئة
    let snippets = baseSnippets;
    if (category) {
      snippets = snippets.filter((s) => s.category === category);
    }

    // إضافة IDs
    return snippets.map((s, i) => ({
      ...s,
      id: `${language}-${s.category}-${i}`,
    }));
  }

  /**
   * الحصول على السياق المحيط
   */
  private getContextLines(lines: string[], currentLine: number, contextSize: number = 10): string {
    const start = Math.max(0, currentLine - contextSize);
    const end = Math.min(lines.length, currentLine + contextSize);

    return lines
      .slice(start, end)
      .map((line, i) => {
        const lineNum = start + i + 1;
        const marker = lineNum === currentLine ? '→' : ' ';
        return `${marker} ${lineNum}: ${line}`;
      })
      .join('\n');
  }

  /**
   * اكتشاف اللغة من امتداد الملف
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.php': 'php',
    };
    return langMap[ext] || 'typescript';
  }

  /**
   * الحصول على الامتداد من اللغة
   */
  private getExtension(language: string): string {
    const extMap: Record<string, string> = {
      typescript: '.ts',
      javascript: '.js',
      python: '.py',
      go: '.go',
      rust: '.rs',
      java: '.java',
      php: '.php',
    };
    return extMap[language] || '.ts';
  }

  /**
   * البحث عن ملفات بامتداد معين
   */
  private async findFiles(extension: string, limit: number = 10): Promise<string[]> {
    const files: string[] = [];

    const scanDir = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > 3 || files.length >= limit) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (files.length >= limit) break;

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name.endsWith(extension)) {
            files.push(fullPath);
          }
        }
      } catch {
        // تجاهل الأخطاء
      }
    };

    await scanDir(this.projectRoot);
    return files;
  }

  // ============================================
  // Statistics & Learning
  // ============================================

  /**
   * الحصول على إحصائيات الاستخدام
   */
  getStatistics() {
    const totalCompletions = this.completionHistory.length;
    const acceptedCompletions = this.completionHistory.filter((h) => h.accepted).length;
    const acceptanceRate =
      totalCompletions > 0 ? (acceptedCompletions / totalCompletions) * 100 : 0;

    return {
      totalCompletions,
      acceptedCompletions,
      acceptanceRate: acceptanceRate.toFixed(1) + '%',
      totalSnippets: Array.from(this.snippetsCache.values()).flat().length,
      mostUsedSnippets: this.getMostUsedSnippets(5),
    };
  }

  /**
   * الحصول على أكثر snippets استخداماً
   */
  private getMostUsedSnippets(limit: number = 5): SmartSnippet[] {
    const allSnippets = Array.from(this.snippetsCache.values()).flat();
    return allSnippets.sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
  }

  /**
   * تعليم النظام من الاستخدام
   */
  async learnFromUsage(prompt: string, acceptedSuggestion: string, rating: number): Promise<void> {
    // تحديث التاريخ
    const entry = this.completionHistory.find(
      (h) => h.prompt === prompt && h.suggestion === acceptedSuggestion
    );

    if (entry) {
      entry.accepted = true;
    }

    // يمكن هنا إضافة منطق ML للتعلم من الاختيارات
    console.log(chalk.green(`✅ تم التعلم من الاختيار (تقييم: ${rating}/5)`));
  }
}

// ============================================
// Factory Function
// ============================================

export function createAICodeCompletion(
  projectRoot: string,
  client: OqoolAPIClient
): AICodeCompletion {
  return new AICodeCompletion(projectRoot, client);
}
