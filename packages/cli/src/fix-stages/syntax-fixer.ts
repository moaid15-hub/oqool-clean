// fix-stages/syntax-fixer.ts
// ============================================
// ✅ المرحلة 1 (P1): إصلاح أخطاء Syntax
// ============================================

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { FixIssue } from '../auto-fix-system.js';
import { createClientFromConfig } from '../api-client.js';

export class SyntaxFixer {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * تحليل الكود للبحث عن أخطاء Syntax
   */
  async analyze(code: string, file: string): Promise<FixIssue[]> {
    const issues: FixIssue[] = [];

    try {
      // محاولة parse الكود
      parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
      });

      // إذا نجح الـ parse، لا توجد أخطاء syntax
      return issues;
    } catch (error: any) {
      // إذا فشل، هناك خطأ syntax
      const line = error.loc?.line;
      const column = error.loc?.column;

      issues.push({
        stage: 'syntax',
        priority: 'P1',
        type: 'SyntaxError',
        message: this.cleanErrorMessage(error.message),
        line,
        column,
        fix: undefined, // سيتم الإصلاح بواسطة AI
      });
    }

    // فحوصات إضافية للأخطاء الشائعة
    issues.push(...this.detectCommonSyntaxIssues(code));

    return issues;
  }

  /**
   * إصلاح أخطاء Syntax
   */
  async fix(code: string, issues: FixIssue[]): Promise<string> {
    let fixedCode = code;

    // الإصلاحات البسيطة أولاً
    fixedCode = this.applySimpleFixes(fixedCode, issues);

    // إذا بقيت أخطاء، استخدم AI
    const remainingIssues = await this.analyze(fixedCode, '');
    if (remainingIssues.length > 0) {
      fixedCode = await this.fixWithAI(fixedCode, remainingIssues);
    }

    return fixedCode;
  }

  /**
   * كشف الأخطاء الشائعة
   */
  private detectCommonSyntaxIssues(code: string): FixIssue[] {
    const issues: FixIssue[] = [];

    // 1. فواصل منقوطة مفقودة (في سطور معينة)
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // تحقق من السطور التي يجب أن تنتهي بفاصلة منقوطة
      if (
        trimmed.length > 0 &&
        !trimmed.endsWith(';') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}') &&
        !trimmed.endsWith(',') &&
        !trimmed.endsWith('(') &&
        !trimmed.endsWith(')') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('import') &&
        !trimmed.startsWith('export') &&
        !trimmed.includes('=>')
      ) {
        // تحقق إضافي: هل السطر التالي يبدأ بعملية؟
        const nextLine = lines[index + 1]?.trim();
        if (nextLine && !nextLine.startsWith('.') && !nextLine.startsWith('[')) {
          issues.push({
            stage: 'syntax',
            priority: 'P1',
            type: 'MissingSemicolon',
            message: 'فاصلة منقوطة مفقودة',
            line: index + 1,
            fix: 'add_semicolon',
          });
        }
      }
    });

    // 2. أقواس غير متطابقة
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    const opening = Object.keys(brackets);
    const closing = Object.values(brackets);

    for (let i = 0; i < code.length; i++) {
      const char = code[i];

      if (opening.includes(char)) {
        stack.push(char);
      } else if (closing.includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last as keyof typeof brackets] !== char) {
          const line = code.substring(0, i).split('\n').length;
          issues.push({
            stage: 'syntax',
            priority: 'P1',
            type: 'UnmatchedBracket',
            message: `قوس غير متطابق: ${char}`,
            line,
            fix: 'match_bracket',
          });
        }
      }
    }

    // 3. علامات تنصيص غير مغلقة
    const quoteRegex = /(['"`])((?:\\\1|(?!\1).)*?)(?:\1|$)/g;
    let match;
    while ((match = quoteRegex.exec(code)) !== null) {
      if (!code[match.index + match[0].length - 1]) {
        const line = code.substring(0, match.index).split('\n').length;
        issues.push({
          stage: 'syntax',
          priority: 'P1',
          type: 'UnclosedString',
          message: 'نص غير مغلق',
          line,
          fix: 'close_string',
        });
      }
    }

    return issues;
  }

  /**
   * تطبيق الإصلاحات البسيطة
   */
  private applySimpleFixes(code: string, issues: FixIssue[]): string {
    let fixedCode = code;
    const lines = fixedCode.split('\n');

    // ترتيب المشاكل من الأسفل للأعلى لتجنب تغيير أرقام الأسطر
    const sortedIssues = [...issues].sort((a, b) => (b.line || 0) - (a.line || 0));

    for (const issue of sortedIssues) {
      if (!issue.line || !issue.fix) continue;

      const lineIndex = issue.line - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) continue;

      switch (issue.fix) {
        case 'add_semicolon':
          lines[lineIndex] = lines[lineIndex].trimEnd() + ';';
          break;

        case 'close_string':
          const line = lines[lineIndex];
          const lastQuote = line.match(/['"`]/g)?.pop();
          if (lastQuote) {
            lines[lineIndex] = line + lastQuote;
          }
          break;

        // الإصلاحات الأخرى تحتاج AI
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

    const systemPrompt = `أنت خبير في إصلاح أخطاء JavaScript/TypeScript Syntax.

الكود الحالي به الأخطاء التالية:
${issues.map((i) => `- السطر ${i.line}: ${i.message}`).join('\n')}

الكود:
\`\`\`
${code}
\`\`\`

المطلوب:
1. قم بإصلاح جميع أخطاء Syntax
2. احتفظ بالمنطق الأصلي للكود
3. أرجع الكود المصلح فقط بدون شرح
4. استخدم صيغة:
\`\`\`typescript
// الكود المصلح هنا
\`\`\``;

    const response = await client.sendChatMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'قم بإصلاح الكود' },
    ]);

    if (!response.success) {
      throw new Error('فشل في الحصول على الإصلاح من AI');
    }

    // استخراج الكود المصلح
    const codeMatch = response.message.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    // إذا لم يتم العثور على block، استخدم الرد كاملاً
    return response.message.trim();
  }

  /**
   * تنظيف رسالة الخطأ
   */
  private cleanErrorMessage(message: string): string {
    // إزالة التفاصيل التقنية الزائدة
    return message
      .replace(/\(\d+:\d+\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * تحقق من صحة الكود بعد الإصلاح
   */
  async validate(code: string): Promise<boolean> {
    try {
      parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
      });
      return true;
    } catch {
      return false;
    }
  }
}
