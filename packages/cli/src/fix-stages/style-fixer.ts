// fix-stages/style-fixer.ts
// ============================================
// ✅ المرحلة 3 (P3): تحسين أسلوب الكود
// إصلاح تلقائي
// ============================================

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { FixIssue } from '../auto-fix-system.js';

export class StyleFixer {
  private workingDir: string;
  private config = {
    indentSize: 2,
    useSemicolons: true,
    singleQuote: true,
    trailingComma: 'es5',
    maxLineLength: 100,
    arrowParens: 'always',
  };

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * تحليل الكود للبحث عن مشاكل الأسلوب
   */
  async analyze(code: string, file: string): Promise<FixIssue[]> {
    const issues: FixIssue[] = [];

    // 1. فحص التسمية
    issues.push(...this.checkNamingConventions(code));

    // 2. فحص البنية
    issues.push(...this.checkCodeStructure(code));

    // 3. فحص التنسيق
    issues.push(...this.checkFormatting(code));

    // 4. فحص أفضل الممارسات
    issues.push(...this.checkBestPractices(code));

    return issues;
  }

  /**
   * إصلاح مشاكل الأسلوب
   */
  async fix(code: string, issues: FixIssue[]): Promise<string> {
    let fixedCode = code;

    try {
      // Parse الكود
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
      });

      // تطبيق الإصلاحات على الـ AST
      this.applyStyleFixes(ast);

      // توليد الكود المُنسق
      const output = generate(ast, {
        retainLines: false,
        compact: false,
        concise: false,
        jsescOption: {
          minimal: true,
        },
      });

      fixedCode = output.code;

      // إصلاحات إضافية للنص
      fixedCode = this.applyTextFixes(fixedCode);
    } catch (error) {
      // إذا فشل الـ parsing، طبق إصلاحات نصية فقط
      fixedCode = this.applyTextFixes(code);
    }

    return fixedCode;
  }

  /**
   * فحص اصطلاحات التسمية
   */
  private checkNamingConventions(code: string): FixIssue[] {
    const issues: FixIssue[] = [];

    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const self = this;
      traverse(ast, {
        // فحص أسماء الدوال
        FunctionDeclaration(path: any) {
          const name = path.node.id?.name;
          if (name && !self.isCamelCase(name) && !self.isPascalCase(name)) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'NamingConvention',
              message: `اسم الدالة '${name}' لا يتبع camelCase`,
              line: path.node.loc?.start.line,
              fix: 'rename_to_camel_case',
              suggestion: `استخدم: ${self.toCamelCase(name)}`,
            });
          }
        },

        // فحص أسماء المتغيرات
        VariableDeclarator(path: any) {
          const name = path.node.id.name;

          // const يجب أن يكون UPPER_CASE إذا كان constant
          if (path.parent.kind === 'const' && self.isConstant(name)) {
            if (!self.isUpperCase(name)) {
              issues.push({
                stage: 'style',
                priority: 'P3',
                type: 'NamingConvention',
                message: `الثابت '${name}' يجب أن يكون UPPER_CASE`,
                line: path.node.loc?.start.line,
                fix: 'rename_to_upper_case',
                suggestion: `استخدم: ${self.toUpperCase(name)}`,
              });
            }
          } else if (!self.isCamelCase(name)) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'NamingConvention',
              message: `اسم المتغير '${name}' لا يتبع camelCase`,
              line: path.node.loc?.start.line,
              fix: 'rename_to_camel_case',
              suggestion: `استخدم: ${self.toCamelCase(name)}`,
            });
          }
        },

        // فحص أسماء الكلاسات
        ClassDeclaration(path: any) {
          const name = path.node.id?.name;
          if (name && !self.isPascalCase(name)) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'NamingConvention',
              message: `اسم الكلاس '${name}' لا يتبع PascalCase`,
              line: path.node.loc?.start.line,
              fix: 'rename_to_pascal_case',
              suggestion: `استخدم: ${self.toPascalCase(name)}`,
            });
          }
        },
      });
    } catch (error) {
      // تجاهل أخطاء الـ parsing
    }

    return issues;
  }

  /**
   * فحص بنية الكود
   */
  private checkCodeStructure(code: string): FixIssue[] {
    const issues: FixIssue[] = [];

    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      traverse(ast, {
        // فحص طول الدوال وعدد المعاملات
        FunctionDeclaration(path: any) {
          // فحص طول الدالة
          const lines = path.node.loc?.end.line - path.node.loc?.start.line;
          if (lines && lines > 50) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'FunctionTooLong',
              message: `الدالة طويلة جداً (${lines} سطر)`,
              line: path.node.loc?.start.line,
              suggestion: 'قسّم الدالة إلى دوال أصغر',
            });
          }

          // فحص عدد المعاملات
          const params = path.node.params.length;
          if (params > 5) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'TooManyParameters',
              message: `عدد المعاملات كثير (${params})`,
              line: path.node.loc?.start.line,
              suggestion: 'استخدم object parameter أو قلل المعاملات',
            });
          }
        },

        // فحص التداخل العميق
        BlockStatement(path: any) {
          let depth = 0;
          let current = path.parent;

          while (current) {
            if (current.type === 'BlockStatement') depth++;
            current = current.parent;
          }

          if (depth > 4) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'DeepNesting',
              message: `تداخل عميق (${depth} مستويات)`,
              line: path.node.loc?.start.line,
              suggestion: 'استخرج الكود إلى دوال منفصلة',
            });
          }
        },
      });
    } catch (error) {
      // تجاهل أخطاء الـ parsing
    }

    return issues;
  }

  /**
   * فحص التنسيق
   */
  private checkFormatting(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // أسطر طويلة جداً
      if (line.length > this.config.maxLineLength) {
        issues.push({
          stage: 'style',
          priority: 'P3',
          type: 'LineTooLong',
          message: `السطر طويل جداً (${line.length} حرف)`,
          line: index + 1,
          fix: 'break_line',
          suggestion: `الحد الأقصى: ${this.config.maxLineLength} حرف`,
        });
      }

      // مسافات زائدة
      if (/\s+$/.test(line)) {
        issues.push({
          stage: 'style',
          priority: 'P3',
          type: 'TrailingWhitespace',
          message: 'مسافات زائدة في نهاية السطر',
          line: index + 1,
          fix: 'remove_trailing_whitespace',
        });
      }

      // مسافات متعددة
      if (/\s{2,}/.test(line) && !line.trim().startsWith('*')) {
        issues.push({
          stage: 'style',
          priority: 'P3',
          type: 'MultipleSpaces',
          message: 'مسافات متعددة متتالية',
          line: index + 1,
          fix: 'normalize_spaces',
        });
      }

      // عدم استخدام const
      if (/^\s*var\s+/.test(line)) {
        issues.push({
          stage: 'style',
          priority: 'P3',
          type: 'UseConstLet',
          message: 'استخدم const أو let بدلاً من var',
          line: index + 1,
          fix: 'replace_var_with_const',
        });
      }
    });

    return issues;
  }

  /**
   * فحص أفضل الممارسات
   */
  private checkBestPractices(code: string): FixIssue[] {
    const issues: FixIssue[] = [];

    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      traverse(ast, {
        // استخدام == بدلاً من ===
        BinaryExpression(path: any) {
          if (path.node.operator === '==' || path.node.operator === '!=') {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'UseStrictEquality',
              message: `استخدم ${path.node.operator === '==' ? '===' : '!=='} للمقارنة الصارمة`,
              line: path.node.loc?.start.line,
              fix: 'use_strict_equality',
            });
          }
        },

        // console.log في الكود
        CallExpression(path: any) {
          const callee = path.node.callee;
          if (
            callee.type === 'MemberExpression' &&
            callee.object.name === 'console' &&
            callee.property.name === 'log'
          ) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'ConsoleLog',
              message: 'console.log موجود في الكود',
              line: path.node.loc?.start.line,
              suggestion: 'احذف console.log من production code',
            });
          }
        },

        // استخدام function بدلاً من arrow function
        FunctionExpression(path: any) {
          if (
            !path.parent.id && // ليست دالة مُسماة
            path.parent.type !== 'MethodDefinition' && // ليست method
            path.parent.type !== 'ObjectProperty' // ليست object method
          ) {
            issues.push({
              stage: 'style',
              priority: 'P3',
              type: 'UseArrowFunction',
              message: 'فكر في استخدام arrow function',
              line: path.node.loc?.start.line,
              fix: 'convert_to_arrow',
            });
          }
        },
      });
    } catch (error) {
      // تجاهل أخطاء الـ parsing
    }

    return issues;
  }

  /**
   * تطبيق إصلاحات الأسلوب على الـ AST
   */
  private applyStyleFixes(ast: any) {
    traverse(ast, {
      // تحويل var إلى const/let
      VariableDeclaration(path: any) {
        if (path.node.kind === 'var') {
          // تحقق إذا كانت القيمة تتغير
          const hasReassignment = false; // TODO: check bindings
          path.node.kind = hasReassignment ? 'let' : 'const';
        }
      },

      // تحويل == إلى ===
      BinaryExpression(path: any) {
        if (path.node.operator === '==') {
          path.node.operator = '===';
        } else if (path.node.operator === '!=') {
          path.node.operator = '!==';
        }
      },

      // إزالة console.log
      CallExpression(path: any) {
        const callee = path.node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'console' &&
          callee.property.name === 'log'
        ) {
          // علق على console.log بدلاً من حذفه
          path.addComment('leading', ' TODO: Remove console.log');
        }
      },
    });
  }

  /**
   * تطبيق إصلاحات نصية
   */
  private applyTextFixes(code: string): string {
    let fixed = code;

    // إزالة المسافات الزائدة في النهاية
    fixed = fixed.replace(/\s+$/gm, '');

    // تطبيع المسافات المتعددة
    fixed = fixed.replace(/  +/g, ' ');

    // إضافة سطر فارغ في النهاية
    if (!fixed.endsWith('\n')) {
      fixed += '\n';
    }

    // تنسيق الأقواس
    fixed = fixed
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
      .replace(/\{\s+/g, '{ ')
      .replace(/\s+\}/g, ' }');

    return fixed;
  }

  /**
   * فحص camelCase
   */
  private isCamelCase(name: string): boolean {
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * فحص PascalCase
   */
  private isPascalCase(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * فحص UPPER_CASE
   */
  private isUpperCase(name: string): boolean {
    return /^[A-Z][A-Z0-9_]*$/.test(name);
  }

  /**
   * فحص إذا كان ثابت
   */
  private isConstant(name: string): boolean {
    return name === name.toUpperCase();
  }

  /**
   * تحويل إلى camelCase
   */
  private toCamelCase(name: string): string {
    return name
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toLowerCase());
  }

  /**
   * تحويل إلى PascalCase
   */
  private toPascalCase(name: string): string {
    return name
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  /**
   * تحويل إلى UPPER_CASE
   */
  private toUpperCase(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '');
  }

  /**
   * تحديث إعدادات الأسلوب
   */
  updateConfig(config: Partial<typeof this.config>) {
    this.config = { ...this.config, ...config };
  }
}
