// fix-stages/type-fixer.ts
// ============================================
// ✅ المرحلة 2 (P2): إصلاح أخطاء Types
// ============================================

import * as ts from 'typescript';
import { FixIssue } from '../auto-fix-system.js';
import { createClientFromConfig } from '../api-client.js';

export class TypeFixer {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * تحليل الكود للبحث عن أخطاء Types
   */
  async analyze(code: string, file: string): Promise<FixIssue[]> {
    const issues: FixIssue[] = [];

    // إنشاء ملف TypeScript مؤقت
    const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);

    // إنشاء برنامج TypeScript
    const compilerOptions: ts.CompilerOptions = {
      noEmit: true,
      strict: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      esModuleInterop: true,
      skipLibCheck: true,
    };

    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;

    host.getSourceFile = (fileName, languageVersion) => {
      if (fileName === 'temp.ts') {
        return sourceFile;
      }
      return originalGetSourceFile.call(host, fileName, languageVersion);
    };

    const program = ts.createProgram(['temp.ts'], compilerOptions, host);
    const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);

    // تحويل التشخيصات إلى issues
    for (const diagnostic of diagnostics) {
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

        issues.push({
          stage: 'types',
          priority: 'P2',
          type: this.getDiagnosticCategory(diagnostic.category),
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          line: line + 1,
          column: character + 1,
          fix: this.suggestFix(diagnostic),
        });
      }
    }

    // فحوصات إضافية
    issues.push(...this.detectCommonTypeIssues(code, sourceFile));

    return issues;
  }

  /**
   * إصلاح أخطاء Types
   */
  async fix(code: string, issues: FixIssue[]): Promise<string> {
    let fixedCode = code;

    // الإصلاحات البسيطة أولاً
    fixedCode = this.applySimpleTypeFixes(fixedCode, issues);

    // إذا بقيت أخطاء، استخدم AI
    const remainingIssues = await this.analyze(fixedCode, '');
    if (remainingIssues.length > 0) {
      fixedCode = await this.fixWithAI(fixedCode, remainingIssues);
    }

    return fixedCode;
  }

  /**
   * كشف مشاكل الأنواع الشائعة
   */
  private detectCommonTypeIssues(code: string, sourceFile: ts.SourceFile): FixIssue[] {
    const issues: FixIssue[] = [];

    const visit = (node: ts.Node) => {
      // 1. متغيرات بدون نوع
      if (ts.isVariableDeclaration(node) && !node.type && !node.initializer) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        issues.push({
          stage: 'types',
          priority: 'P2',
          type: 'MissingType',
          message: `المتغير '${node.name.getText()}' بدون نوع`,
          line,
          fix: 'add_type_annotation',
        });
      }

      // 2. دوال بدون نوع إرجاع
      if (
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        !node.type &&
        node.name
      ) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        issues.push({
          stage: 'types',
          priority: 'P2',
          type: 'MissingReturnType',
          message: `الدالة '${node.name.getText()}' بدون نوع إرجاع`,
          line,
          fix: 'add_return_type',
        });
      }

      // 3. استخدام any
      if (ts.isTypeReferenceNode(node) && node.typeName.getText() === 'any') {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        issues.push({
          stage: 'types',
          priority: 'P2',
          type: 'UnsafeAny',
          message: 'استخدام نوع any غير آمن',
          line,
          suggestion: 'استخدم نوع محدد أو unknown',
        });
      }

      // 4. معاملات بدون أنواع
      if (ts.isParameter(node) && !node.type) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        issues.push({
          stage: 'types',
          priority: 'P2',
          type: 'MissingParameterType',
          message: `المعامل '${node.name.getText()}' بدون نوع`,
          line,
          fix: 'add_parameter_type',
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return issues;
  }

  /**
   * تطبيق الإصلاحات البسيطة للأنواع
   */
  private applySimpleTypeFixes(code: string, issues: FixIssue[]): string {
    let fixedCode = code;
    const lines = fixedCode.split('\n');

    for (const issue of issues) {
      if (!issue.line || !issue.fix) continue;

      const lineIndex = issue.line - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) continue;

      switch (issue.fix) {
        case 'add_type_annotation':
          // إضافة : any كحل مؤقت (سيتم تحسينه بـ AI)
          lines[lineIndex] = lines[lineIndex]
            .replace(/let\s+(\w+)\s*;/, 'let $1: any;')
            .replace(/const\s+(\w+)\s*;/, 'const $1: any;');
          break;

        case 'add_return_type':
          // إضافة نوع إرجاع افتراضي
          lines[lineIndex] = lines[lineIndex].replace(
            /function\s+(\w+)\s*\([^)]*\)\s*{/,
            'function $1(): any {'
          );
          break;

        case 'add_parameter_type':
          // إضافة أنواع للمعاملات
          lines[lineIndex] = lines[lineIndex].replace(/\(([^:)]+)\)/g, (match, params) => {
            const typedParams = params
              .split(',')
              .map((p: string) => {
                const trimmed = p.trim();
                return trimmed.includes(':') ? trimmed : `${trimmed}: any`;
              })
              .join(', ');
            return `(${typedParams})`;
          });
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * إصلاح باستخدام AI
   */
  private async fixWithAI(code: string, issues: FixIssue[]): Promise<string> {
    const client = await createClientFromConfig();
    if (!client) {
      throw new Error('فشل الاتصال بـ AI');
    }

    const systemPrompt = `أنت خبير في TypeScript وإصلاح أخطاء الأنواع.

الكود الحالي به مشاكل الأنواع التالية:
${issues.map((i) => `- السطر ${i.line}: ${i.message}`).join('\n')}

الكود:
\`\`\`typescript
${code}
\`\`\`

المطلوب:
1. قم بإضافة أنواع دقيقة ومناسبة
2. تجنب استخدام any قدر الإمكان
3. استخدم Union Types عند الحاجة
4. أضف interfaces/types عند الضرورة
5. احتفظ بالمنطق الأصلي
6. أرجع الكود المصلح فقط

استخدم صيغة:
\`\`\`typescript
// الكود المصلح هنا
\`\`\``;

    const response = await client.sendChatMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'قم بإصلاح أخطاء الأنواع' },
    ]);

    if (!response.success) {
      throw new Error('فشل في الحصول على الإصلاح من AI');
    }

    // استخراج الكود المصلح
    const codeMatch = response.message.match(/```typescript\n([\s\S]*?)```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    return response.message.trim();
  }

  /**
   * الحصول على فئة التشخيص
   */
  private getDiagnosticCategory(category: ts.DiagnosticCategory): string {
    switch (category) {
      case ts.DiagnosticCategory.Error:
        return 'TypeError';
      case ts.DiagnosticCategory.Warning:
        return 'TypeWarning';
      default:
        return 'TypeInfo';
    }
  }

  /**
   * اقتراح إصلاح
   */
  private suggestFix(diagnostic: ts.Diagnostic): string | undefined {
    const code = diagnostic.code;

    // بعض الأكواد الشائعة
    const fixSuggestions: { [key: number]: string } = {
      2304: 'add_import', // Cannot find name
      2339: 'add_property', // Property does not exist
      2345: 'fix_type_mismatch', // Type mismatch
      2365: 'add_operator', // Operator not applicable
      2551: 'fix_spelling', // Property does not exist (typo)
      7006: 'add_parameter_type', // Parameter implicitly has 'any' type
      7031: 'add_return_type', // Binding element implicitly has 'any' type
    };

    return fixSuggestions[code];
  }

  /**
   * تحقق من صحة الأنواع بعد الإصلاح
   */
  async validate(code: string): Promise<{ valid: boolean; errors: string[] }> {
    const issues = await this.analyze(code, '');
    return {
      valid: issues.length === 0,
      errors: issues.map((i) => i.message),
    };
  }
}
