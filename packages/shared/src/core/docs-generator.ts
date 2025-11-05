import * as fs from 'fs/promises';
import * as path from 'path';
import { OqoolAPIClient } from './api-client.js';
import { CodeAnalyzer, FunctionInfo, ClassInfo } from './code-analyzer.js';
import { FileManager } from './file-manager.js';

/**
 * أنواع التوثيق المدعومة
 */
export type DocFormat = 'jsdoc' | 'markdown' | 'html' | 'json';

/**
 * خيارات توليد التوثيق
 */
export interface DocsOptions {
  /** تنسيق التوثيق */
  format?: DocFormat;
  /** استخدام AI لتحسين التوثيق */
  useAI?: boolean;
  /** تضمين أمثلة الكود */
  includeExamples?: boolean;
  /** مستوى التفصيل (basic, detailed, comprehensive) */
  level?: 'basic' | 'detailed' | 'comprehensive';
  /** المجلد الناتج */
  outputDir?: string;
  /** اللغة (ar, en) */
  language?: 'ar' | 'en';
}

/**
 * معلومات توثيق دالة
 */
export interface FunctionDoc {
  name: string;
  description: string;
  params: ParamDoc[];
  returns: ReturnDoc;
  examples: string[];
  throws?: string[];
  complexity?: string;
  performance?: string;
}

/**
 * معلومات معامل
 */
export interface ParamDoc {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  defaultValue?: string;
}

/**
 * معلومات القيمة المرجعة
 */
export interface ReturnDoc {
  type: string;
  description: string;
}

/**
 * معلومات توثيق كلاس
 */
export interface ClassDoc {
  name: string;
  description: string;
  extends?: string;
  implements?: string[];
  properties: PropertyDoc[];
  methods: FunctionDoc[];
  examples: string[];
  usage?: string;
}

/**
 * معلومات خاصية
 */
export interface PropertyDoc {
  name: string;
  type: string;
  description: string;
  access: 'public' | 'private' | 'protected';
  readonly?: boolean;
}

/**
 * معلومات توثيق ملف
 */
export interface FileDoc {
  path: string;
  description: string;
  functions: FunctionDoc[];
  classes: ClassDoc[];
  exports: string[];
  imports: string[];
  overview?: string;
}

/**
 * نتيجة توليد التوثيق
 */
export interface DocsResult {
  success: boolean;
  files: FileDoc[];
  outputPath?: string;
  stats: {
    filesProcessed: number;
    functionsDocumented: number;
    classesDocumented: number;
    linesGenerated: number;
  };
  errors?: string[];
}

/**
 * مولد التوثيق التلقائي
 */
export class DocsGenerator {
  private apiClient?: OqoolAPIClient;
  private analyzer: CodeAnalyzer;
  private fileManager: FileManager;
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
    this.analyzer = new CodeAnalyzer(workingDir);
    this.fileManager = new FileManager(workingDir);
  }

  /**
   * توليد توثيق للملفات
   */
  async generateDocs(files: string[], options: DocsOptions = {}): Promise<DocsResult> {
    const {
      format = 'markdown',
      useAI = false,
      includeExamples = true,
      level = 'detailed',
      outputDir = path.join(this.workingDir, 'docs'),
      language = 'ar',
    } = options;

    const result: DocsResult = {
      success: true,
      files: [],
      stats: {
        filesProcessed: 0,
        functionsDocumented: 0,
        classesDocumented: 0,
        linesGenerated: 0,
      },
      errors: [],
    };

    try {
      // إنشاء مجلد الإخراج
      await fs.mkdir(outputDir, { recursive: true });

      // معالجة كل ملف
      for (const file of files) {
        try {
          const fileDoc = await this.generateFileDoc(file, {
            useAI,
            includeExamples,
            level,
            language,
          });
          result.files.push(fileDoc);
          result.stats.filesProcessed++;
          result.stats.functionsDocumented += fileDoc.functions.length;
          result.stats.classesDocumented += fileDoc.classes.length;
        } catch (error) {
          result.errors?.push(`Error in ${file}: ${error}`);
        }
      }

      // توليد الملفات
      if (format === 'markdown') {
        const outputPath = await this.generateMarkdownDocs(result.files, outputDir, language);
        result.outputPath = outputPath;
        result.stats.linesGenerated = await this.countLines(outputPath);
      } else if (format === 'html') {
        const outputPath = await this.generateHTMLDocs(result.files, outputDir, language);
        result.outputPath = outputPath;
        result.stats.linesGenerated = await this.countLines(outputPath);
      } else if (format === 'json') {
        const outputPath = await this.generateJSONDocs(result.files, outputDir);
        result.outputPath = outputPath;
      }

      result.success = (result.errors?.length || 0) === 0;
    } catch (error) {
      result.success = false;
      result.errors?.push(`Fatal error: ${error}`);
    }

    return result;
  }

  /**
   * توليد توثيق لملف واحد
   */
  private async generateFileDoc(
    filePath: string,
    options: Pick<DocsOptions, 'useAI' | 'includeExamples' | 'level' | 'language'>
  ): Promise<FileDoc> {
    const content = await fs.readFile(filePath, 'utf-8');
    const analysis = await this.analyzer.analyzeFile(filePath);

    const fileDoc: FileDoc = {
      path: filePath,
      description: await this.generateFileDescription(filePath, content, options),
      functions: [],
      classes: [],
      exports: this.extractExports(content),
      imports: this.extractImports(content),
      overview:
        options.level === 'comprehensive'
          ? await this.generateOverview(filePath, analysis, options)
          : undefined,
    };

    // توثيق الدوال
    for (const func of analysis.functions) {
      const funcDoc = await this.generateFunctionDoc(func, content, options);
      fileDoc.functions.push(funcDoc);
    }

    // توثيق الكلاسات
    for (const cls of analysis.classes) {
      const classDoc = await this.generateClassDoc(cls, content, options);
      fileDoc.classes.push(classDoc);
    }

    return fileDoc;
  }

  /**
   * توليد وصف الملف
   */
  private async generateFileDescription(
    filePath: string,
    content: string,
    options: Pick<DocsOptions, 'useAI' | 'language'>
  ): Promise<string> {
    // البحث عن تعليق موجود في أول الملف
    const existingComment = this.extractFileComment(content);
    if (existingComment) {
      return existingComment;
    }

    const fileName = path.basename(filePath);

    if (options.useAI && this.apiClient) {
      // استخدام AI لتوليد وصف ذكي
      const prompt =
        options.language === 'ar'
          ? `اكتب وصفاً مختصراً لملف ${fileName} بناءً على محتواه:\n${content.slice(0, 1000)}`
          : `Write a brief description for file ${fileName} based on its content:\n${content.slice(0, 1000)}`;

      try {
        // استخدام التحليل الثابت بدلاً من AI
        return this.generateStaticFileDescription(fileName, content, options.language || 'ar');
      } catch {
        return this.generateStaticFileDescription(fileName, content, options.language || 'ar');
      }
    }

    return this.generateStaticFileDescription(fileName, content, options.language || 'ar');
  }

  /**
   * توليد وصف ثابت للملف
   */
  private generateStaticFileDescription(
    fileName: string,
    content: string,
    language: 'ar' | 'en'
  ): string {
    const hasExports = content.includes('export');
    const hasClasses = content.includes('class ');
    const hasFunctions =
      content.includes('function ') || (content.includes('const ') && content.includes('=>'));

    if (language === 'ar') {
      if (hasClasses && hasFunctions) {
        return `ملف ${fileName} يحتوي على كلاسات ودوال لتنفيذ وظائف النظام`;
      } else if (hasClasses) {
        return `ملف ${fileName} يحتوي على تعريفات الكلاسات`;
      } else if (hasFunctions) {
        return `ملف ${fileName} يحتوي على دوال مساعدة`;
      }
      return `ملف ${fileName} - جزء من النظام`;
    } else {
      if (hasClasses && hasFunctions) {
        return `File ${fileName} contains classes and functions for system functionality`;
      } else if (hasClasses) {
        return `File ${fileName} contains class definitions`;
      } else if (hasFunctions) {
        return `File ${fileName} contains helper functions`;
      }
      return `File ${fileName} - part of the system`;
    }
  }

  /**
   * استخراج تعليق الملف الموجود
   */
  private extractFileComment(content: string): string | null {
    const match = content.match(/^\/\*\*\s*\n([\s\S]*?)\*\//);
    if (match) {
      return match[1]
        .split('\n')
        .map((line) => line.trim().replace(/^\*\s?/, ''))
        .filter((line) => line.length > 0)
        .join(' ');
    }
    return null;
  }

  /**
   * توليد نظرة عامة شاملة
   */
  private async generateOverview(
    filePath: string,
    analysis: any,
    options: Pick<DocsOptions, 'useAI' | 'language'>
  ): Promise<string> {
    const stats = `
${options.language === 'ar' ? 'الإحصائيات' : 'Statistics'}:
- ${options.language === 'ar' ? 'عدد الأسطر' : 'Lines'}: ${analysis.linesOfCode}
- ${options.language === 'ar' ? 'عدد الدوال' : 'Functions'}: ${analysis.functions.length}
- ${options.language === 'ar' ? 'عدد الكلاسات' : 'Classes'}: ${analysis.classes.length}
`;
    return stats;
  }

  /**
   * استخراج الـ exports
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex =
      /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  /**
   * استخراج الـ imports
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  /**
   * توليد توثيق دالة
   */
  private async generateFunctionDoc(
    func: FunctionInfo,
    content: string,
    options: Pick<DocsOptions, 'useAI' | 'includeExamples' | 'level' | 'language'>
  ): Promise<FunctionDoc> {
    const doc: FunctionDoc = {
      name: func.name,
      description: await this.generateFunctionDescription(func, content, options),
      params: this.generateParams(func, options),
      returns: this.generateReturns(func, options),
      examples: options.includeExamples ? this.generateExamples(func, options) : [],
    };

    if (options.level === 'comprehensive') {
      doc.complexity = this.estimateComplexity(func);
      doc.performance = this.estimatePerformance(func);
    }

    return doc;
  }

  /**
   * توليد وصف دالة
   */
  private async generateFunctionDescription(
    func: FunctionInfo,
    content: string,
    options: Pick<DocsOptions, 'useAI' | 'language'>
  ): Promise<string> {
    // البحث عن JSDoc موجود
    const existingDoc = this.extractJSDoc(func, content);
    if (existingDoc) {
      return existingDoc;
    }

    // توليد وصف بناءً على اسم الدالة
    if (options.language === 'ar') {
      return `دالة ${func.name} - ${this.inferPurpose(func.name, 'ar')}`;
    } else {
      return `Function ${func.name} - ${this.inferPurpose(func.name, 'en')}`;
    }
  }

  /**
   * استنتاج الغرض من اسم الدالة
   */
  private inferPurpose(name: string, language: 'ar' | 'en'): string {
    const lower = name.toLowerCase();

    if (language === 'ar') {
      if (lower.startsWith('get')) return 'جلب البيانات';
      if (lower.startsWith('set')) return 'تعيين القيمة';
      if (lower.startsWith('create')) return 'إنشاء كائن جديد';
      if (lower.startsWith('delete') || lower.startsWith('remove')) return 'حذف عنصر';
      if (lower.startsWith('update')) return 'تحديث البيانات';
      if (lower.startsWith('find')) return 'البحث عن عنصر';
      if (lower.startsWith('validate')) return 'التحقق من الصحة';
      if (lower.startsWith('calculate')) return 'حساب قيمة';
      if (lower.startsWith('format')) return 'تنسيق البيانات';
      if (lower.startsWith('parse')) return 'تحليل البيانات';
      return 'تنفيذ عملية';
    } else {
      if (lower.startsWith('get')) return 'retrieves data';
      if (lower.startsWith('set')) return 'sets a value';
      if (lower.startsWith('create')) return 'creates a new object';
      if (lower.startsWith('delete') || lower.startsWith('remove')) return 'deletes an item';
      if (lower.startsWith('update')) return 'updates data';
      if (lower.startsWith('find')) return 'finds an item';
      if (lower.startsWith('validate')) return 'validates input';
      if (lower.startsWith('calculate')) return 'calculates a value';
      if (lower.startsWith('format')) return 'formats data';
      if (lower.startsWith('parse')) return 'parses data';
      return 'performs an operation';
    }
  }

  /**
   * استخراج JSDoc موجود
   */
  private extractJSDoc(func: FunctionInfo, content: string): string | null {
    const funcIndex = content.indexOf(`function ${func.name}`);
    if (funcIndex === -1) return null;

    const before = content.substring(0, funcIndex);
    const match = before.match(/\/\*\*\s*\n([\s\S]*?)\*\/\s*$/);
    if (match) {
      return match[1]
        .split('\n')
        .map((line) => line.trim().replace(/^\*\s?/, ''))
        .filter((line) => !line.startsWith('@'))
        .filter((line) => line.length > 0)
        .join(' ');
    }
    return null;
  }

  /**
   * توليد معلومات المعاملات
   */
  private generateParams(func: FunctionInfo, options: Pick<DocsOptions, 'language'>): ParamDoc[] {
    return func.params.map((paramName) => ({
      name: paramName,
      type: 'any',
      description: options.language === 'ar' ? `معامل ${paramName}` : `Parameter ${paramName}`,
      optional: false,
    }));
  }

  /**
   * توليد معلومات القيمة المرجعة
   */
  private generateReturns(func: FunctionInfo, options: Pick<DocsOptions, 'language'>): ReturnDoc {
    const returnType = func.async ? 'Promise<any>' : 'any';
    return {
      type: returnType,
      description:
        options.language === 'ar'
          ? `يرجع قيمة من نوع ${returnType}`
          : `Returns a value of type ${returnType}`,
    };
  }

  /**
   * توليد أمثلة
   */
  private generateExamples(func: FunctionInfo, options: Pick<DocsOptions, 'language'>): string[] {
    const example =
      options.language === 'ar'
        ? `// مثال استخدام\nconst result = ${func.name}(${func.params.join(', ')});`
        : `// Usage example\nconst result = ${func.name}(${func.params.join(', ')});`;

    return [example];
  }

  /**
   * تقدير التعقيد
   */
  private estimateComplexity(func: FunctionInfo): string {
    const paramCount = func.params.length;
    if (paramCount === 0) return 'Low';
    if (paramCount <= 3) return 'Medium';
    return 'High';
  }

  /**
   * تقدير الأداء
   */
  private estimatePerformance(func: FunctionInfo): string {
    return func.async ? 'Asynchronous operation' : 'Synchronous operation';
  }

  /**
   * توليد توثيق كلاس
   */
  private async generateClassDoc(
    cls: ClassInfo,
    content: string,
    options: Pick<DocsOptions, 'useAI' | 'includeExamples' | 'level' | 'language'>
  ): Promise<ClassDoc> {
    const doc: ClassDoc = {
      name: cls.name,
      description: await this.generateClassDescription(cls, content, options),
      properties: this.generateProperties(cls, options),
      methods: [],
      examples: options.includeExamples ? this.generateClassExamples(cls, options) : [],
    };

    // توثيق الميثودز (as simple function docs)
    for (const methodName of cls.methods) {
      const methodDoc: FunctionDoc = {
        name: methodName,
        description: options.language === 'ar' ? `ميثود ${methodName}` : `Method ${methodName}`,
        params: [],
        returns: { type: 'any', description: 'Return value' },
        examples: [],
      };
      doc.methods.push(methodDoc);
    }

    if (options.level === 'comprehensive') {
      doc.usage = this.generateUsageExample(cls, options);
    }

    return doc;
  }

  /**
   * توليد وصف كلاس
   */
  private async generateClassDescription(
    cls: ClassInfo,
    content: string,
    options: Pick<DocsOptions, 'useAI' | 'language'>
  ): Promise<string> {
    if (options.language === 'ar') {
      return `كلاس ${cls.name} - ${this.inferClassPurpose(cls.name, 'ar')}`;
    } else {
      return `Class ${cls.name} - ${this.inferClassPurpose(cls.name, 'en')}`;
    }
  }

  /**
   * استنتاج غرض الكلاس
   */
  private inferClassPurpose(name: string, language: 'ar' | 'en'): string {
    const lower = name.toLowerCase();

    if (language === 'ar') {
      if (lower.endsWith('manager')) return 'مدير للعمليات';
      if (lower.endsWith('service')) return 'خدمة';
      if (lower.endsWith('controller')) return 'متحكم';
      if (lower.endsWith('client')) return 'عميل API';
      if (lower.endsWith('handler')) return 'معالج';
      if (lower.endsWith('analyzer')) return 'محلل';
      if (lower.endsWith('generator')) return 'مولد';
      return 'كائن للنظام';
    } else {
      if (lower.endsWith('manager')) return 'manages operations';
      if (lower.endsWith('service')) return 'provides services';
      if (lower.endsWith('controller')) return 'controls flow';
      if (lower.endsWith('client')) return 'API client';
      if (lower.endsWith('handler')) return 'handles events';
      if (lower.endsWith('analyzer')) return 'analyzes code';
      if (lower.endsWith('generator')) return 'generates content';
      return 'system object';
    }
  }

  /**
   * توليد معلومات الخصائص
   */
  private generateProperties(
    cls: ClassInfo,
    options: Pick<DocsOptions, 'language'>
  ): PropertyDoc[] {
    return cls.properties.map((propName) => ({
      name: propName,
      type: 'any',
      description: options.language === 'ar' ? `خاصية ${propName}` : `Property ${propName}`,
      access: 'public' as 'public' | 'private' | 'protected',
    }));
  }

  /**
   * توليد أمثلة للكلاس
   */
  private generateClassExamples(cls: ClassInfo, options: Pick<DocsOptions, 'language'>): string[] {
    const example =
      options.language === 'ar'
        ? `// إنشاء كائن من ${cls.name}\nconst instance = new ${cls.name}();\n// استخدام الكائن\nawait instance.someMethod();`
        : `// Create instance of ${cls.name}\nconst instance = new ${cls.name}();\n// Use the instance\nawait instance.someMethod();`;

    return [example];
  }

  /**
   * توليد مثال استخدام
   */
  private generateUsageExample(cls: ClassInfo, options: Pick<DocsOptions, 'language'>): string {
    const firstMethod = cls.methods[0];
    if (options.language === 'ar') {
      return `
const ${cls.name.toLowerCase()} = new ${cls.name}();
${firstMethod ? `const result = await ${cls.name.toLowerCase()}.${firstMethod}();` : ''}
`;
    } else {
      return `
const ${cls.name.toLowerCase()} = new ${cls.name}();
${firstMethod ? `const result = await ${cls.name.toLowerCase()}.${firstMethod}();` : ''}
`;
    }
  }

  /**
   * توليد توثيق Markdown
   */
  private async generateMarkdownDocs(
    files: FileDoc[],
    outputDir: string,
    language: 'ar' | 'en'
  ): Promise<string> {
    let markdown = language === 'ar' ? '# توثيق المشروع\n\n' : '# Project Documentation\n\n';

    markdown +=
      language === 'ar'
        ? `تم التوليد تلقائياً في: ${new Date().toLocaleString('ar')}\n\n`
        : `Generated automatically on: ${new Date().toLocaleString('en')}\n\n`;

    // جدول المحتويات
    markdown += language === 'ar' ? '## جدول المحتويات\n\n' : '## Table of Contents\n\n';
    for (const file of files) {
      const fileName = path.basename(file.path);
      markdown += `- [${fileName}](#${fileName.replace(/\./g, '')})\n`;
    }
    markdown += '\n';

    // توثيق كل ملف
    for (const file of files) {
      markdown += this.generateFileMarkdown(file, language);
    }

    const outputPath = path.join(outputDir, 'API.md');
    await fs.writeFile(outputPath, markdown, 'utf-8');
    return outputPath;
  }

  /**
   * توليد Markdown لملف واحد
   */
  private generateFileMarkdown(file: FileDoc, language: 'ar' | 'en'): string {
    const fileName = path.basename(file.path);
    let md = `## ${fileName}\n\n`;
    md += `${file.description}\n\n`;

    if (file.overview) {
      md += file.overview + '\n\n';
    }

    // الدوال
    if (file.functions.length > 0) {
      md += language === 'ar' ? '### الدوال\n\n' : '### Functions\n\n';
      for (const func of file.functions) {
        md += this.generateFunctionMarkdown(func, language);
      }
    }

    // الكلاسات
    if (file.classes.length > 0) {
      md += language === 'ar' ? '### الكلاسات\n\n' : '### Classes\n\n';
      for (const cls of file.classes) {
        md += this.generateClassMarkdown(cls, language);
      }
    }

    return md;
  }

  /**
   * توليد Markdown لدالة
   */
  private generateFunctionMarkdown(func: FunctionDoc, language: 'ar' | 'en'): string {
    let md = `#### ${func.name}\n\n`;
    md += `${func.description}\n\n`;

    // المعاملات
    if (func.params.length > 0) {
      md += language === 'ar' ? '**المعاملات:**\n\n' : '**Parameters:**\n\n';
      for (const param of func.params) {
        md += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
      }
      md += '\n';
    }

    // القيمة المرجعة
    md += language === 'ar' ? '**القيمة المرجعة:**\n\n' : '**Returns:**\n\n';
    md += `- ${func.returns.type}: ${func.returns.description}\n\n`;

    // الأمثلة
    if (func.examples.length > 0) {
      md += language === 'ar' ? '**مثال:**\n\n' : '**Example:**\n\n';
      for (const example of func.examples) {
        md += `\`\`\`typescript\n${example}\n\`\`\`\n\n`;
      }
    }

    return md;
  }

  /**
   * توليد Markdown لكلاس
   */
  private generateClassMarkdown(cls: ClassDoc, language: 'ar' | 'en'): string {
    let md = `#### ${cls.name}\n\n`;
    md += `${cls.description}\n\n`;

    // الخصائص
    if (cls.properties.length > 0) {
      md += language === 'ar' ? '**الخصائص:**\n\n' : '**Properties:**\n\n';
      for (const prop of cls.properties) {
        md += `- \`${prop.name}\` (${prop.type}): ${prop.description}\n`;
      }
      md += '\n';
    }

    // الميثودز
    if (cls.methods.length > 0) {
      md += language === 'ar' ? '**الميثودز:**\n\n' : '**Methods:**\n\n';
      for (const method of cls.methods) {
        md += `##### ${method.name}\n\n`;
        md += `${method.description}\n\n`;
      }
    }

    // الأمثلة
    if (cls.examples.length > 0) {
      md += language === 'ar' ? '**مثال:**\n\n' : '**Example:**\n\n';
      for (const example of cls.examples) {
        md += `\`\`\`typescript\n${example}\n\`\`\`\n\n`;
      }
    }

    return md;
  }

  /**
   * توليد توثيق HTML
   */
  private async generateHTMLDocs(
    files: FileDoc[],
    outputDir: string,
    language: 'ar' | 'en'
  ): Promise<string> {
    const title = language === 'ar' ? 'توثيق المشروع' : 'Project Documentation';

    let html = `<!DOCTYPE html>
<html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #007bff; margin-top: 30px; }
    h3 { color: #555; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .param { margin-left: 20px; }
    .example { background: #e7f3ff; padding: 10px; border-left: 4px solid #007bff; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${language === 'ar' ? 'تم التوليد في' : 'Generated on'}: ${new Date().toLocaleString(language)}</p>
`;

    for (const file of files) {
      html += this.generateFileHTML(file, language);
    }

    html += '</body></html>';

    const outputPath = path.join(outputDir, 'index.html');
    await fs.writeFile(outputPath, html, 'utf-8');
    return outputPath;
  }

  /**
   * توليد HTML لملف
   */
  private generateFileHTML(file: FileDoc, language: 'ar' | 'en'): string {
    let html = `<h2>${path.basename(file.path)}</h2>\n`;
    html += `<p>${file.description}</p>\n`;

    if (file.functions.length > 0) {
      html += `<h3>${language === 'ar' ? 'الدوال' : 'Functions'}</h3>\n`;
      for (const func of file.functions) {
        html += `<h4><code>${func.name}</code></h4>\n`;
        html += `<p>${func.description}</p>\n`;
      }
    }

    if (file.classes.length > 0) {
      html += `<h3>${language === 'ar' ? 'الكلاسات' : 'Classes'}</h3>\n`;
      for (const cls of file.classes) {
        html += `<h4><code>${cls.name}</code></h4>\n`;
        html += `<p>${cls.description}</p>\n`;
      }
    }

    return html;
  }

  /**
   * توليد توثيق JSON
   */
  private async generateJSONDocs(files: FileDoc[], outputDir: string): Promise<string> {
    const outputPath = path.join(outputDir, 'docs.json');
    await fs.writeFile(outputPath, JSON.stringify(files, null, 2), 'utf-8');
    return outputPath;
  }

  /**
   * حساب عدد الأسطر
   */
  private async countLines(filePath: string): Promise<number> {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').length;
  }

  /**
   * إضافة JSDoc للملفات
   */
  async addJSDocComments(
    files: string[],
    options: Pick<DocsOptions, 'useAI' | 'language'> = {}
  ): Promise<{ success: boolean; filesModified: number; errors?: string[] }> {
    const result = {
      success: true,
      filesModified: 0,
      errors: [] as string[],
    };

    for (const file of files) {
      try {
        let content = await fs.readFile(file, 'utf-8');
        const analysis = await this.analyzer.analyzeFile(file);

        // إضافة JSDoc للدوال
        for (const func of analysis.functions) {
          const jsdoc = this.generateJSDocComment(func, options);
          content = this.insertJSDoc(content, func.name, jsdoc);
        }

        // إضافة JSDoc للكلاسات
        for (const cls of analysis.classes) {
          const jsdoc = this.generateClassJSDoc(cls, options);
          content = this.insertJSDoc(content, cls.name, jsdoc, 'class');
        }

        await fs.writeFile(file, content, 'utf-8');
        result.filesModified++;
      } catch (error) {
        result.errors.push(`Error in ${file}: ${error}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * توليد تعليق JSDoc
   */
  private generateJSDocComment(func: FunctionInfo, options: Pick<DocsOptions, 'language'>): string {
    const lang = options.language || 'ar';
    let jsdoc = '/**\n';
    jsdoc += ` * ${this.inferPurpose(func.name, lang)}\n`;

    for (const paramName of func.params) {
      jsdoc += ` * @param {any} ${paramName} - ${lang === 'ar' ? 'معامل' : 'Parameter'} ${paramName}\n`;
    }

    if (func.async) {
      jsdoc += ` * @returns {Promise<any>} ${lang === 'ar' ? 'القيمة المرجعة' : 'Return value'}\n`;
    }

    jsdoc += ' */';
    return jsdoc;
  }

  /**
   * توليد JSDoc للكلاس
   */
  private generateClassJSDoc(cls: ClassInfo, options: Pick<DocsOptions, 'language'>): string {
    const lang = options.language || 'ar';
    let jsdoc = '/**\n';
    jsdoc += ` * ${this.inferClassPurpose(cls.name, lang)}\n`;
    jsdoc += ' */';
    return jsdoc;
  }

  /**
   * إدراج JSDoc في الكود
   */
  private insertJSDoc(
    content: string,
    name: string,
    jsdoc: string,
    type: 'function' | 'class' = 'function'
  ): string {
    const pattern =
      type === 'function'
        ? new RegExp(`(\\n|^)(export\\s+)?(async\\s+)?function\\s+${name}`, 'g')
        : new RegExp(`(\\n|^)(export\\s+)?class\\s+${name}`, 'g');

    // تحقق إذا كان JSDoc موجود بالفعل
    const beforePattern = new RegExp(
      `\\/\\*\\*[\\s\\S]*?\\*\\/\\s*\\n(export\\s+)?(async\\s+)?(function|class)\\s+${name}`
    );
    if (beforePattern.test(content)) {
      return content; // JSDoc موجود بالفعل
    }

    return content.replace(pattern, `$1${jsdoc}\n$2$3${type} ${name}`);
  }
}

/**
 * إنشاء مولد توثيق
 */
export function createDocsGenerator(workingDir: string): DocsGenerator {
  return new DocsGenerator(workingDir);
}
