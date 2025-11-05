// fix-stages/performance-optimizer.ts
// ============================================
// 💡 المرحلة 3 (P3): تحسين الأداء - اقتراحات فقط
// ============================================

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { FixIssue } from '../auto-fix-system.js';

export class PerformanceOptimizer {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * تحليل الكود للبحث عن فرص تحسين الأداء
   */
  async analyze(code: string, file: string): Promise<FixIssue[]> {
    const issues: FixIssue[] = [];

    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      // 1. كشف الحلقات المتداخلة
      issues.push(...this.detectNestedLoops(ast, code));

      // 2. كشف العمليات المكلفة في الحلقات
      issues.push(...this.detectExpensiveOperationsInLoops(ast, code));

      // 3. كشف استخدام غير فعال للذاكرة
      issues.push(...this.detectMemoryIssues(ast, code));

      // 4. كشف عمليات DOM المتكررة
      issues.push(...this.detectDOMOperations(code));

      // 5. كشف استخدام غير فعال للـ Arrays
      issues.push(...this.detectArrayIssues(ast, code));

      // 6. كشف Regular Expressions معقدة
      issues.push(...this.detectRegexIssues(code));
    } catch (error) {
      // تجاهل أخطاء الـ parsing
    }

    return issues;
  }

  /**
   * كشف الحلقات المتداخلة
   */
  private detectNestedLoops(ast: any, code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const loopDepth = new Map<any, number>();

    traverse(ast, {
      enter(path: any) {
        const node = path.node;

        if (
          path.isForStatement() ||
          path.isWhileStatement() ||
          path.isDoWhileStatement() ||
          path.isForOfStatement() ||
          path.isForInStatement()
        ) {
          let depth = 1;
          let parent = path.parent;

          // حساب عمق التداخل
          while (parent) {
            if (loopDepth.has(parent)) {
              depth += loopDepth.get(parent)!;
              break;
            }
            parent = parent.parent;
          }

          loopDepth.set(node, depth);

          if (depth >= 3) {
            const line = node.loc?.start.line;
            issues.push({
              stage: 'performance',
              priority: 'P3',
              type: 'NestedLoops',
              message: `حلقة متداخلة بعمق ${depth} - تعقيد O(n^${depth})`,
              line,
              suggestion: `فكر في خوارزمية أفضل أو استخدم Map/Set للبحث السريع`,
            });
          }
        }
      },
    });

    return issues;
  }

  /**
   * كشف العمليات المكلفة في الحلقات
   */
  private detectExpensiveOperationsInLoops(ast: any, code: string): FixIssue[] {
    const issues: FixIssue[] = [];

    traverse(ast, {
      ForStatement: (path: any) => this.checkExpensiveInLoop(path, issues),
      WhileStatement: (path: any) => this.checkExpensiveInLoop(path, issues),
      ForOfStatement: (path: any) => this.checkExpensiveInLoop(path, issues),
    });

    return issues;
  }

  /**
   * فحص العمليات المكلفة داخل حلقة
   */
  private checkExpensiveInLoop(path: any, issues: FixIssue[]) {
    path.traverse({
      CallExpression(callPath: any) {
        const callee = callPath.node.callee;
        const line = callPath.node.loc?.start.line;

        // DOM queries
        if (
          (callee.type === 'MemberExpression' && callee.property.name === 'querySelector') ||
          callee.property.name === 'querySelectorAll' ||
          callee.property.name === 'getElementById'
        ) {
          issues.push({
            stage: 'performance',
            priority: 'P3',
            type: 'ExpensiveInLoop',
            message: 'استعلام DOM داخل حلقة',
            line,
            suggestion: 'احفظ نتيجة الاستعلام في متغير خارج الحلقة',
          });
        }

        // Array methods that create new arrays
        if (
          callee.type === 'MemberExpression' &&
          (callee.property.name === 'map' ||
            callee.property.name === 'filter' ||
            callee.property.name === 'slice' ||
            callee.property.name === 'concat')
        ) {
          issues.push({
            stage: 'performance',
            priority: 'P3',
            type: 'ExpensiveInLoop',
            message: `استخدام .${callee.property.name}() داخل حلقة يُنشئ arrays جديدة`,
            line,
            suggestion: 'فكر في إعادة هيكلة الكود أو استخدام for loop بسيطة',
          });
        }

        // JSON operations
        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'JSON' &&
          (callee.property.name === 'parse' || callee.property.name === 'stringify')
        ) {
          issues.push({
            stage: 'performance',
            priority: 'P3',
            type: 'ExpensiveInLoop',
            message: `JSON.${callee.property.name}() داخل حلقة مكلف`,
            line,
            suggestion: 'احفظ النتيجة أو أعد التفكير في البنية',
          });
        }
      },
    });
  }

  /**
   * كشف مشاكل الذاكرة
   */
  private detectMemoryIssues(ast: any, code: string): FixIssue[] {
    const issues: FixIssue[] = [];

    traverse(ast, {
      // كشف إنشاء دوال داخل حلقات
      ForStatement: (path: any) => {
        path.traverse({
          FunctionExpression: (funcPath: any) => {
            issues.push({
              stage: 'performance',
              priority: 'P3',
              type: 'MemoryLeak',
              message: 'إنشاء دالة داخل حلقة يستهلك الذاكرة',
              line: funcPath.node.loc?.start.line,
              suggestion: 'أنشئ الدالة خارج الحلقة',
            });
          },
          ArrowFunctionExpression: (funcPath: any) => {
            issues.push({
              stage: 'performance',
              priority: 'P3',
              type: 'MemoryLeak',
              message: 'إنشاء arrow function داخل حلقة يستهلك الذاكرة',
              line: funcPath.node.loc?.start.line,
              suggestion: 'أنشئ الدالة خارج الحلقة',
            });
          },
        });
      },

      // كشف استخدام closures غير ضروري
      FunctionDeclaration: (path: any) => {
        let hasLargeClosure = false;
        let variableCount = 0;

        path.traverse({
          Identifier(idPath: any) {
            if (idPath.isReferencedIdentifier()) {
              variableCount++;
            }
          },
        });

        if (variableCount > 50) {
          issues.push({
            stage: 'performance',
            priority: 'P3',
            type: 'MemoryLeak',
            message: 'closure كبير قد يستهلك الذاكرة',
            line: path.node.loc?.start.line,
            suggestion: 'قلل من المتغيرات المُستخدمة أو أعد هيكلة الدالة',
          });
        }
      },
    });

    return issues;
  }

  /**
   * كشف عمليات DOM المتكررة
   */
  private detectDOMOperations(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // innerHTML في حلقة
      if (line.includes('innerHTML') && this.isInLoop(lines, index)) {
        issues.push({
          stage: 'performance',
          priority: 'P3',
          type: 'SlowDOM',
          message: 'استخدام innerHTML في حلقة بطيء جداً',
          line: index + 1,
          suggestion: 'استخدم DocumentFragment أو اجمع الـ HTML ثم اكتب مرة واحدة',
        });
      }

      // appendChild في حلقة
      if (line.includes('appendChild') && this.isInLoop(lines, index)) {
        issues.push({
          stage: 'performance',
          priority: 'P3',
          type: 'SlowDOM',
          message: 'استخدام appendChild في حلقة يُحدث reflow متكرر',
          line: index + 1,
          suggestion: 'استخدم DocumentFragment',
        });
      }

      // style.* في حلقة
      if (line.match(/\.style\.\w+\s*=/) && this.isInLoop(lines, index)) {
        issues.push({
          stage: 'performance',
          priority: 'P3',
          type: 'SlowDOM',
          message: 'تغيير الـ styles في حلقة يُحدث reflow متكرر',
          line: index + 1,
          suggestion: 'استخدم CSS classes أو cssText',
        });
      }
    });

    return issues;
  }

  /**
   * كشف مشاكل Arrays
   */
  private detectArrayIssues(ast: any, code: string): FixIssue[] {
    const issues: FixIssue[] = [];

    traverse(ast, {
      CallExpression(path: any) {
        const callee = path.node.callee;
        const line = path.node.loc?.start.line;

        // استخدام Array.push في حلقة
        if (callee.type === 'MemberExpression' && callee.property.name === 'push') {
          let parent = path.parent;
          let isInLoop = false;

          while (parent) {
            if (
              parent.type === 'ForStatement' ||
              parent.type === 'WhileStatement' ||
              parent.type === 'DoWhileStatement'
            ) {
              isInLoop = true;
              break;
            }
            parent = parent.parent;
          }

          if (isInLoop) {
            issues.push({
              stage: 'performance',
              priority: 'P3',
              type: 'SlowArray',
              message: 'استخدام Array.push في حلقة قد يكون بطيئاً',
              line,
              suggestion: 'فكر في تحديد حجم الـ array مسبقاً أو استخدام map/filter',
            });
          }
        }

        // استخدام Array.splice في حلقة
        if (callee.type === 'MemberExpression' && callee.property.name === 'splice') {
          issues.push({
            stage: 'performance',
            priority: 'P3',
            type: 'SlowArray',
            message: 'Array.splice مكلف - O(n)',
            line,
            suggestion: 'استخدم filter() لإنشاء array جديد أو أعد التفكير في البنية',
          });
        }

        // استخدام Array.indexOf للبحث المتكرر
        if (callee.type === 'MemberExpression' && callee.property.name === 'indexOf') {
          issues.push({
            stage: 'performance',
            priority: 'P3',
            type: 'SlowArray',
            message: 'Array.indexOf للبحث المتكرر بطيء - O(n)',
            line,
            suggestion: 'استخدم Set أو Map للبحث السريع - O(1)',
          });
        }
      },
    });

    return issues;
  }

  /**
   * كشف مشاكل Regular Expressions
   */
  private detectRegexIssues(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // كشف regex معقدة
      const regexMatch = line.match(/\/(.{30,})\//);
      if (regexMatch) {
        const pattern = regexMatch[1];

        // Catastrophic backtracking
        if (/(.*\+.*\+|.*\*.*\*)/.test(pattern)) {
          issues.push({
            stage: 'performance',
            priority: 'P3',
            type: 'SlowRegex',
            message: 'Regular expression قد تسبب catastrophic backtracking',
            line: index + 1,
            suggestion: 'بسّط الـ regex أو استخدم طرق String بديلة',
          });
        }
      }

      // كشف إنشاء regex في حلقة
      if (line.includes('new RegExp') && this.isInLoop(lines, index)) {
        issues.push({
          stage: 'performance',
          priority: 'P3',
          type: 'SlowRegex',
          message: 'إنشاء RegExp في حلقة مكلف',
          line: index + 1,
          suggestion: 'أنشئ الـ RegExp مرة واحدة خارج الحلقة',
        });
      }
    });

    return issues;
  }

  /**
   * تحقق إذا كان السطر داخل حلقة
   */
  private isInLoop(lines: string[], lineIndex: number): boolean {
    let depth = 0;

    for (let i = lineIndex; i >= 0; i--) {
      const line = lines[i].trim();

      if (line.includes('}')) depth--;
      if (line.includes('{')) depth++;

      if (
        depth > 0 &&
        (line.startsWith('for') ||
          line.startsWith('while') ||
          line.includes('.map(') ||
          line.includes('.forEach('))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * الإصلاح (للمرحلة 3، نعرض فقط اقتراحات)
   */
  async fix(code: string, issues: FixIssue[]): Promise<string> {
    // P3 = suggestions only, no automatic fixes
    return code;
  }

  /**
   * توليد تقرير الأداء
   */
  generatePerformanceReport(issues: FixIssue[]): string {
    const report = ['📊 تقرير تحسين الأداء', '═══════════════════════════════════', ''];

    const categories = new Map<string, FixIssue[]>();
    issues.forEach((issue) => {
      if (!categories.has(issue.type)) {
        categories.set(issue.type, []);
      }
      categories.get(issue.type)!.push(issue);
    });

    for (const [type, typeIssues] of categories) {
      report.push(`\n${this.getTypeEmoji(type)} ${this.getTypeName(type)} (${typeIssues.length})`);
      report.push('─'.repeat(40));

      typeIssues.slice(0, 5).forEach((issue) => {
        report.push(`  السطر ${issue.line}: ${issue.message}`);
        report.push(`  💡 ${issue.suggestion}`);
        report.push('');
      });

      if (typeIssues.length > 5) {
        report.push(`  ... و ${typeIssues.length - 5} اقتراحات أخرى`);
      }
    }

    return report.join('\n');
  }

  private getTypeEmoji(type: string): string {
    const emojis: { [key: string]: string } = {
      NestedLoops: '🔄',
      ExpensiveInLoop: '⚠️',
      MemoryLeak: '💾',
      SlowDOM: '🎨',
      SlowArray: '📊',
      SlowRegex: '🔍',
    };
    return emojis[type] || '💡';
  }

  private getTypeName(type: string): string {
    const names: { [key: string]: string } = {
      NestedLoops: 'حلقات متداخلة',
      ExpensiveInLoop: 'عمليات مكلفة في الحلقات',
      MemoryLeak: 'استهلاك ذاكرة',
      SlowDOM: 'عمليات DOM بطيئة',
      SlowArray: 'عمليات Array غير فعالة',
      SlowRegex: 'Regular Expressions بطيئة',
    };
    return names[type] || type;
  }
}
