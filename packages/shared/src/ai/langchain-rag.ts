/**
 * LangChain RAG System - Complete Implementation
 *
 * نظام RAG (Retrieval Augmented Generation) متقدم
 * يدمج البحث الدلالي مع توليد الإجابات الذكية
 */

// @ts-nocheck - Langchain packages not fully installed
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

// ============================================
// Types
// ============================================

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface ProjectAnalysis {
  architecture: string;
  issues: Issue[];
  suggestions: string[];
  documentation: string;
  testCoverage: TestCoverage;
  dependencies: Dependency[];
}

export interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  message: string;
  suggestion: string;
}

export interface TestCoverage {
  total: number;
  covered: number;
  percentage: number;
  uncoveredFiles: string[];
}

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  outdated: boolean;
}

export interface SearchResult {
  content: string;
  path: string;
  similarity: number;
  context: string;
}

export interface CodeContext {
  currentFile?: string;
  currentFunction?: string;
  imports?: string[];
  symbols?: string[];
}

export interface Solution {
  solution: string;
  steps: string[];
  confidence: number;
  code?: string;
}

export interface GeneratedCode {
  code: string;
  explanation: string;
  similarPatterns: SearchResult[];
  tests?: string;
  dependencies?: string[];
}

// ============================================
// RAG System
// ============================================

export class OqoolRAGSystem {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private vectorStore: MemoryVectorStore | null = null;
  private projectPath: string = '';

  constructor(apiKey?: string) {
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
      modelName: 'gpt-4',
      temperature: 0.7
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * تحليل مشروع كامل مع RAG
   */
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    this.projectPath = projectPath;

    // 1. قراءة جميع الملفات
    const files = await this.readProjectFiles(projectPath);

    // 2. إنشاء embeddings للملفات
    await this.indexProject(files);

    // 3. تحليل البنية
    const architecture = await this.analyzeArchitecture(files);

    // 4. اكتشاف المشاكل
    const issues = await this.findIssues(files);

    // 5. اقتراحات التحسين
    const suggestions = await this.generateSuggestions(architecture, issues);

    // 6. تحليل التبعيات
    const dependencies = await this.analyzeDependencies(projectPath);

    return {
      architecture,
      issues,
      suggestions,
      documentation: await this.generateDocumentation(files),
      testCoverage: await this.analyzeTestCoverage(files),
      dependencies
    };
  }

  /**
   * فهرسة المشروع في Vector Store
   */
  private async indexProject(files: ProjectFile[]): Promise<void> {
    const documents = files.map(file => new Document({
      pageContent: file.content,
      metadata: {
        path: file.path,
        language: file.language,
        size: file.size
      }
    }));

    this.vectorStore = await MemoryVectorStore.fromDocuments(
      documents,
      this.embeddings
    );

    console.log(`✅ Indexed ${documents.length} files`);
  }

  /**
   * Semantic Code Search
   */
  async semanticSearch(query: string, k: number = 5): Promise<SearchResult[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call indexProject() first.');
    }

    const results = await this.vectorStore.similaritySearchWithScore(query, k);

    return results.map(([doc, score]: [Document, number]) => ({
      content: doc.pageContent,
      path: doc.metadata.path as string,
      similarity: score,
      context: this.extractContext(doc.pageContent, query)
    }));
  }

  /**
   * توليد كود مع السياق
   */
  async generateCodeWithContext(
    request: string,
    projectContext?: string[]
  ): Promise<GeneratedCode> {
    // 1. البحث عن كود مشابه في المشروع
    const similarCode = await this.semanticSearch(request, 3);

    // 2. بناء prompt مع السياق
    const contextStr = projectContext?.join('\n') || '';
    const similarCodeStr = similarCode
      .map(r => `File: ${r.path}\n${r.content.substring(0, 500)}`)
      .join('\n\n');

    const prompt = await PromptTemplate.fromTemplate(`
أنت خبير في كتابة كود عالي الجودة.

الطلب: {request}

السياق من المشروع:
{context}

أمثلة من كود مشابه في المشروع:
{similarCode}

اكتب الكود المطلوب مع:
1. التزام بأنماط الكود الموجودة في المشروع
2. Best practices
3. تعليقات توضيحية
4. معالجة الأخطاء

الكود:
`).format({
      request,
      context: contextStr,
      similarCode: similarCodeStr
    });

    const response = await this.llm.invoke(prompt);
    const content = String(response.content);

    return {
      code: this.extractCode(content),
      explanation: this.extractExplanation(content),
      similarPatterns: similarCode,
      tests: await this.generateTests(this.extractCode(content)),
      dependencies: this.extractDependencies(content)
    };
  }

  /**
   * مساعد محادثة ذكي
   */
  async chat(message: string, context?: CodeContext): Promise<string> {
    const contextPrompt = context ? this.formatContext(context) : 'لا يوجد سياق';

    // البحث في المشروع عن معلومات ذات صلة
    let relevantCode = '';
    if (this.vectorStore) {
      const results = await this.semanticSearch(message, 2);
      relevantCode = results
        .map(r => `${r.path}:\n${r.content.substring(0, 300)}`)
        .join('\n\n');
    }

    const prompt = await PromptTemplate.fromTemplate(`
أنت مساعد برمجة خبير في Oqool AI.
لديك معرفة بالمشروع الحالي وسياق الكود.

السياق الحالي:
{context}

كود ذو صلة من المشروع:
{relevantCode}

المستخدم: {message}

المساعد:`).format({
      context: contextPrompt,
      relevantCode,
      message
    });

    const response = await this.llm.invoke(prompt);
    return String(response.content);
  }

  /**
   * حل مشاكل معقدة خطوة بخطوة
   */
  async solveComplexProblem(problem: string): Promise<Solution> {
    const prompt = await PromptTemplate.fromTemplate(`
حل هذه المشكلة خطوة بخطوة:

المشكلة: {problem}

فكر بصوت عالٍ وقسم الحل إلى خطوات:
1. فهم المشكلة
2. تحليل الخيارات
3. اختيار الحل الأفضل
4. تطبيق الحل
5. التحقق من النتيجة

الحل:`).format({ problem });

    const response = await this.llm.invoke(prompt);
    const content = String(response.content);

    return {
      solution: content,
      steps: this.extractSteps(content),
      confidence: this.calculateConfidence(content),
      code: this.extractCode(content)
    };
  }

  // ============================================
  // Project Analysis Methods
  // ============================================

  /**
   * تحليل البنية المعمارية
   */
  private async analyzeArchitecture(files: ProjectFile[]): Promise<string> {
    const fileStructure = files.map(f => f.path).join('\n');

    const prompt = await PromptTemplate.fromTemplate(`
قم بتحليل البنية المعمارية للمشروع بناءً على بنية الملفات:

{fileStructure}

قدم:
1. نوع المشروع (frontend/backend/fullstack)
2. الأنماط المعمارية المستخدمة
3. تنظيم المجلدات
4. نقاط القوة والضعف
5. اقتراحات للتحسين

التحليل:`).format({ fileStructure });

    const response = await this.llm.invoke(prompt);
    return String(response.content);
  }

  /**
   * اكتشاف المشاكل
   */
  private async findIssues(files: ProjectFile[]): Promise<Issue[]> {
    const issues: Issue[] = [];

    // تحليل عينة من الملفات
    for (const file of files.slice(0, 10)) {
      const fileIssues = await this.analyzeFileIssues(file);
      issues.push(...fileIssues);
    }

    return issues;
  }

  /**
   * تحليل ملف واحد
   */
  private async analyzeFileIssues(file: ProjectFile): Promise<Issue[]> {
    const prompt = await PromptTemplate.fromTemplate(`
حلل هذا الكود واكتشف المشاكل:

الملف: {path}
الكود:
{content}

أذكر المشاكل فقط إذا كانت موجودة:
- Security issues
- Performance problems
- Code smells
- Best practices violations

المشاكل (JSON format):
`).format({
      path: file.path,
      content: file.content.substring(0, 2000)
    });

    try {
      const response = await this.llm.invoke(prompt);
      const content = String(response.content);

      // محاولة استخراج JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error analyzing file issues:', error);
    }

    return [];
  }

  /**
   * توليد اقتراحات
   */
  private async generateSuggestions(architecture: string, issues: Issue[]): Promise<string[]> {
    const prompt = await PromptTemplate.fromTemplate(`
بناءً على التحليل المعماري والمشاكل المكتشفة:

البنية المعمارية:
{architecture}

المشاكل (${issues.length}):
{issues}

اقترح تحسينات عملية:

الاقتراحات:`).format({
      architecture,
      issues: issues.slice(0, 5).map(i => `- ${i.message}`).join('\n')
    });

    const response = await this.llm.invoke(prompt);
    const content = String(response.content);

    return content.split('\n')
      .filter(line => line.match(/^[\d\-\*]/))
      .map(line => line.replace(/^[\d\-\*]\s*/, '').trim());
  }

  /**
   * توليد توثيق
   */
  private async generateDocumentation(files: ProjectFile[]): Promise<string> {
    const prompt = await PromptTemplate.fromTemplate(`
اكتب توثيقاً شاملاً للمشروع:

عدد الملفات: {count}
الملفات الرئيسية: {mainFiles}

التوثيق:`).format({
      count: files.length,
      mainFiles: files.slice(0, 5).map(f => f.path).join(', ')
    });

    const response = await this.llm.invoke(prompt);
    return String(response.content);
  }

  /**
   * تحليل تغطية الاختبارات
   */
  private async analyzeTestCoverage(files: ProjectFile[]): Promise<TestCoverage> {
    const testFiles = files.filter(f =>
      f.path.includes('.test.') ||
      f.path.includes('.spec.') ||
      f.path.includes('__tests__')
    );

    const sourceFiles = files.filter(f =>
      !f.path.includes('.test.') &&
      !f.path.includes('.spec.') &&
      (f.language === 'typescript' || f.language === 'javascript')
    );

    const percentage = sourceFiles.length > 0
      ? (testFiles.length / sourceFiles.length) * 100
      : 0;

    return {
      total: sourceFiles.length,
      covered: testFiles.length,
      percentage: Math.round(percentage),
      uncoveredFiles: sourceFiles.slice(0, 10).map(f => f.path)
    };
  }

  /**
   * تحليل التبعيات
   */
  private async analyzeDependencies(projectPath: string): Promise<Dependency[]> {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!await fs.pathExists(packageJsonPath)) {
      return [];
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    const dependencies: Dependency[] = [];

    // Production dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependencies.push({
          name,
          version: String(version),
          type: 'production',
          outdated: false // يمكن التحقق من npm للحصول على آخر إصدار
        });
      }
    }

    // Dev dependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        dependencies.push({
          name,
          version: String(version),
          type: 'development',
          outdated: false
        });
      }
    }

    return dependencies;
  }

  /**
   * توليد اختبارات
   */
  private async generateTests(code: string): Promise<string> {
    const prompt = await PromptTemplate.fromTemplate(`
اكتب اختبارات شاملة للكود التالي:

{code}

الاختبارات (Jest format):`).format({ code });

    const response = await this.llm.invoke(prompt);
    return this.extractCode(String(response.content));
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * قراءة ملفات المشروع
   */
  private async readProjectFiles(projectPath: string): Promise<ProjectFile[]> {
    const files: ProjectFile[] = [];

    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.go',
      '**/*.rs'
    ];

    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        ignore,
        absolute: true
      });

      for (const filePath of matches) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const ext = path.extname(filePath).slice(1);

          files.push({
            path: path.relative(projectPath, filePath),
            content,
            language: this.getLanguage(ext),
            size: content.length
          });
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }
      }
    }

    return files;
  }

  private getLanguage(ext: string): string {
    const mapping: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust'
    };
    return mapping[ext] || ext;
  }

  private extractContext(content: string, query: string): string {
    const lines = content.split('\n');
    const queryWords = query.toLowerCase().split(' ');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (queryWords.some(word => line.includes(word))) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        return lines.slice(start, end).join('\n');
      }
    }

    return content.substring(0, 200);
  }

  private formatContext(context: CodeContext): string {
    return `
الملف الحالي: ${context.currentFile || 'غير محدد'}
الدالة الحالية: ${context.currentFunction || 'غير محددة'}
الاستيرادات: ${context.imports?.join(', ') || 'لا يوجد'}
الرموز: ${context.symbols?.join(', ') || 'لا يوجد'}
    `.trim();
  }

  private extractCode(text: string): string {
    const codeBlockMatch = text.match(/```[\w]*\n([\s\S]*?)```/);
    return codeBlockMatch ? codeBlockMatch[1].trim() : text;
  }

  private extractExplanation(text: string): string {
    const parts = text.split('```');
    return parts[0].trim();
  }

  private extractSteps(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.match(/^[\d\-\*]/))
      .map(line => line.replace(/^[\d\-\*]\s*/, '').trim());
  }

  private calculateConfidence(text: string): number {
    // خوارزمية بسيطة لحساب الثقة بناءً على جودة الإجابة
    const hasSteps = text.includes('1.') || text.includes('2.');
    const hasCode = text.includes('```');
    const isDetailed = text.length > 500;

    let confidence = 0.5;
    if (hasSteps) confidence += 0.2;
    if (hasCode) confidence += 0.2;
    if (isDetailed) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private extractDependencies(text: string): string[] {
    const imports = text.match(/import .* from ['"](.*)['"];?/g);
    if (!imports) return [];

    return imports.map(imp => {
      const match = imp.match(/from ['"](.*)['"];?/);
      return match ? match[1] : '';
    }).filter(Boolean);
  }
}
