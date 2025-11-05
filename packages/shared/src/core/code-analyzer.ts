// code-analyzer.ts
// ============================================
// 🧠 محلل الكود الذكي باستخدام AST
// ============================================

import * as parser from '@babel/parser';
import _traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

// Fix for ES modules
const traverse = (_traverse as any).default || _traverse;
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface FunctionInfo {
  name: string;
  type: 'function' | 'arrow' | 'method';
  params: string[];
  async: boolean;
  lineStart: number;
  lineEnd: number;
  complexity?: number;
}

export interface VariableInfo {
  name: string;
  kind: 'const' | 'let' | 'var';
  lineNumber: number;
  scope: string;
}

export interface ImportInfo {
  source: string;
  imported: string[];
  type: 'default' | 'named' | 'namespace' | 'all';
  lineNumber: number;
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named';
  lineNumber: number;
}

export interface ClassInfo {
  name: string;
  methods: string[];
  properties: string[];
  extends?: string;
  lineStart: number;
  lineEnd: number;
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface CodeAnalysis {
  filePath: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';

  // العناصر المُكتشفة
  functions: FunctionInfo[];
  variables: VariableInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];

  // الإحصائيات
  stats: {
    totalLines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
    complexity: number;
  };

  // المشاكل المحتملة
  issues: CodeIssue[];

  // العلاقات
  dependencies: string[];
  unusedImports?: string[];
}

// ============================================
// 🔧 المُحلل الرئيسي
// ============================================

export class CodeAnalyzer {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * تحليل ملف JavaScript/TypeScript
   */
  async analyzeFile(filePath: string): Promise<CodeAnalysis> {
    const fullPath = path.join(this.workingDir, filePath);

    if (!(await fs.pathExists(fullPath))) {
      throw new Error(`الملف غير موجود: ${filePath}`);
    }

    const code = await fs.readFile(fullPath, 'utf-8');
    const language = this.detectLanguage(filePath);

    // Parse الكود
    let ast;
    try {
      ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'dynamicImport',
          'asyncGenerators',
          'objectRestSpread',
        ],
      });
    } catch (error: any) {
      throw new Error(`فشل تحليل الملف: ${error.message}`);
    }

    // جمع المعلومات
    const analysis: CodeAnalysis = {
      filePath,
      language,
      functions: [],
      variables: [],
      imports: [],
      exports: [],
      classes: [],
      stats: this.calculateStats(code),
      issues: [],
      dependencies: [],
    };

    // تحليل AST
    this.traverseAST(ast, code, analysis);

    // كشف المشاكل
    this.detectIssues(analysis, code);

    return analysis;
  }

  /**
   * تحديد لغة الملف
   */
  private detectLanguage(filePath: string): 'javascript' | 'typescript' | 'jsx' | 'tsx' {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.tsx') return 'tsx';
    if (ext === '.ts') return 'typescript';
    if (ext === '.jsx') return 'jsx';
    return 'javascript';
  }

  /**
   * حساب الإحصائيات
   */
  private calculateStats(code: string) {
    const lines = code.split('\n');
    let commentLines = 0;
    let blankLines = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        blankLines++;
      } else if (trimmed.startsWith('//')) {
        commentLines++;
      } else if (trimmed.startsWith('/*') || inBlockComment) {
        commentLines++;
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        } else if (trimmed.startsWith('/*')) {
          inBlockComment = true;
        }
      }
    }

    const totalLines = lines.length;
    const codeLines = totalLines - commentLines - blankLines;

    return {
      totalLines,
      codeLines,
      commentLines,
      blankLines,
      complexity: 0, // سيتم حسابه لاحقاً
    };
  }

  /**
   * المرور على AST وجمع المعلومات
   */
  private traverseAST(ast: any, code: string, analysis: CodeAnalysis) {
    let complexityScore = 0;

    traverse(ast, {
      // الدوال
      FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
        const node = path.node;
        analysis.functions.push({
          name: node.id?.name || 'anonymous',
          type: 'function',
          params: node.params.map((p: any) => this.getParamName(p)),
          async: node.async || false,
          lineStart: node.loc?.start.line || 0,
          lineEnd: node.loc?.end.line || 0,
        });
        complexityScore += this.calculateFunctionComplexity(path);
      },

      // Arrow Functions
      ArrowFunctionExpression: (path: NodePath<t.ArrowFunctionExpression>) => {
        const node = path.node;
        const parent: any = path.parent;

        let name = 'anonymous';
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          name = parent.id.name;
        }

        analysis.functions.push({
          name,
          type: 'arrow',
          params: node.params.map((p: any) => this.getParamName(p)),
          async: node.async || false,
          lineStart: node.loc?.start.line || 0,
          lineEnd: node.loc?.end.line || 0,
        });
      },

      // المتغيرات
      VariableDeclaration: (path: NodePath<t.VariableDeclaration>) => {
        const node = path.node;
        node.declarations.forEach((decl: any) => {
          if (t.isIdentifier(decl.id)) {
            analysis.variables.push({
              name: decl.id.name,
              kind: node.kind as 'const' | 'let' | 'var',
              lineNumber: node.loc?.start.line || 0,
              scope: path.scope.block.type,
            });
          }
        });
      },

      // Imports
      ImportDeclaration: (path: NodePath<t.ImportDeclaration>) => {
        const node = path.node;
        const imported: string[] = [];
        let type: 'default' | 'named' | 'namespace' | 'all' = 'named';

        node.specifiers.forEach(
          (spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
            if (t.isImportDefaultSpecifier(spec)) {
              imported.push(spec.local.name);
              type = 'default';
            } else if (t.isImportSpecifier(spec)) {
              imported.push(spec.local.name);
            } else if (t.isImportNamespaceSpecifier(spec)) {
              imported.push(spec.local.name);
              type = 'namespace';
            }
          }
        );

        const source = node.source.value;
        analysis.imports.push({
          source,
          imported,
          type,
          lineNumber: node.loc?.start.line || 0,
        });

        analysis.dependencies.push(source);
      },

      // Exports
      ExportNamedDeclaration: (path: NodePath<t.ExportNamedDeclaration>) => {
        const node = path.node;
        if (node.declaration && t.isVariableDeclaration(node.declaration)) {
          node.declaration.declarations.forEach((decl: any) => {
            if (t.isIdentifier(decl.id)) {
              analysis.exports.push({
                name: decl.id.name,
                type: 'named',
                lineNumber: node.loc?.start.line || 0,
              });
            }
          });
        }
      },

      ExportDefaultDeclaration: (path: NodePath<t.ExportDefaultDeclaration>) => {
        const node = path.node;
        let name = 'default';

        if (t.isIdentifier(node.declaration)) {
          name = node.declaration.name;
        } else if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
          name = node.declaration.id.name;
        }

        analysis.exports.push({
          name,
          type: 'default',
          lineNumber: node.loc?.start.line || 0,
        });
      },

      // Classes
      ClassDeclaration: (path: NodePath<t.ClassDeclaration>) => {
        const node = path.node;
        const methods: string[] = [];
        const properties: string[] = [];

        node.body.body.forEach((member: any) => {
          if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
            methods.push(member.key.name);
          } else if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
            properties.push(member.key.name);
          }
        });

        analysis.classes.push({
          name: node.id?.name || 'anonymous',
          methods,
          properties,
          extends:
            node.superClass && t.isIdentifier(node.superClass) ? node.superClass.name : undefined,
          lineStart: node.loc?.start.line || 0,
          lineEnd: node.loc?.end.line || 0,
        });
      },

      // حساب التعقيد
      IfStatement: () => complexityScore++,
      ConditionalExpression: () => complexityScore++,
      LogicalExpression: () => complexityScore++,
      SwitchCase: () => complexityScore++,
      WhileStatement: () => complexityScore++,
      ForStatement: () => complexityScore++,
      ForInStatement: () => complexityScore++,
      ForOfStatement: () => complexityScore++,
    });

    analysis.stats.complexity = complexityScore;
  }

  /**
   * استخراج اسم المعامل
   */
  private getParamName(param: any): string {
    if (t.isIdentifier(param)) {
      return param.name;
    } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
      return `...${param.argument.name}`;
    } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
      return `${param.left.name} = default`;
    }
    return 'unknown';
  }

  /**
   * حساب تعقيد الدالة
   */
  private calculateFunctionComplexity(path: any): number {
    let complexity = 1; // Base complexity

    path.traverse({
      IfStatement: () => complexity++,
      ConditionalExpression: () => complexity++,
      LogicalExpression: () => complexity++,
      SwitchCase: () => complexity++,
      WhileStatement: () => complexity++,
      ForStatement: () => complexity++,
    });

    return complexity;
  }

  /**
   * كشف المشاكل المحتملة
   */
  private detectIssues(analysis: CodeAnalysis, code: string) {
    // كشف var بدلاً من const/let
    analysis.variables.forEach((variable) => {
      if (variable.kind === 'var') {
        analysis.issues.push({
          type: 'warning',
          message: `استخدام var بدلاً من const/let`,
          line: variable.lineNumber,
          suggestion: `استبدل var ${variable.name} بـ const أو let`,
        });
      }
    });

    // كشف console.log
    const consoleLogMatches = code.match(/console\.log/g);
    if (consoleLogMatches && consoleLogMatches.length > 0) {
      analysis.issues.push({
        type: 'info',
        message: `تم العثور على ${consoleLogMatches.length} استدعاء لـ console.log`,
        suggestion: 'احذف console.log في production',
      });
    }

    // كشف التعقيد العالي
    analysis.functions.forEach((func) => {
      if (func.complexity && func.complexity > 10) {
        analysis.issues.push({
          type: 'warning',
          message: `الدالة ${func.name} معقدة جداً (${func.complexity})`,
          line: func.lineStart,
          suggestion: 'قسم الدالة إلى دوال أصغر',
        });
      }
    });

    // كشف الدوال الطويلة
    analysis.functions.forEach((func) => {
      const lines = func.lineEnd - func.lineStart;
      if (lines > 50) {
        analysis.issues.push({
          type: 'info',
          message: `الدالة ${func.name} طويلة جداً (${lines} سطر)`,
          line: func.lineStart,
          suggestion: 'قسم الدالة إلى دوال أصغر',
        });
      }
    });
  }

  /**
   * عرض نتائج التحليل
   */
  displayAnalysis(analysis: CodeAnalysis) {
    console.log(chalk.blue.bold(`\n🔍 تحليل الملف: ${analysis.filePath}`));
    console.log(chalk.gray('═'.repeat(70)));

    // اللغة
    console.log(chalk.cyan(`\n📝 اللغة: ${analysis.language.toUpperCase()}`));

    // الإحصائيات
    console.log(chalk.yellow('\n📊 الإحصائيات:'));
    console.log(chalk.white(`  • إجمالي الأسطر: ${chalk.cyan(analysis.stats.totalLines)}`));
    console.log(chalk.white(`  • أسطر الكود: ${chalk.cyan(analysis.stats.codeLines)}`));
    console.log(chalk.white(`  • أسطر التعليقات: ${chalk.cyan(analysis.stats.commentLines)}`));
    console.log(chalk.white(`  • أسطر فارغة: ${chalk.cyan(analysis.stats.blankLines)}`));
    console.log(chalk.white(`  • التعقيد الكلي: ${chalk.cyan(analysis.stats.complexity)}`));

    // الدوال
    if (analysis.functions.length > 0) {
      console.log(chalk.green(`\n⚡ الدوال (${analysis.functions.length}):`));
      analysis.functions.slice(0, 10).forEach((func) => {
        const asyncLabel = func.async ? chalk.yellow('[async]') : '';
        const params = func.params.join(', ');
        console.log(
          chalk.white(
            `  • ${chalk.cyan(func.name)}(${params}) ${asyncLabel} - السطر ${func.lineStart}`
          )
        );
      });
      if (analysis.functions.length > 10) {
        console.log(chalk.gray(`  ... و ${analysis.functions.length - 10} دالة أخرى`));
      }
    }

    // المتغيرات
    if (analysis.variables.length > 0) {
      const varCount = analysis.variables.filter((v) => v.kind === 'var').length;
      const letCount = analysis.variables.filter((v) => v.kind === 'let').length;
      const constCount = analysis.variables.filter((v) => v.kind === 'const').length;

      console.log(chalk.magenta(`\n📦 المتغيرات (${analysis.variables.length}):`));
      console.log(chalk.white(`  • const: ${chalk.cyan(constCount)}`));
      console.log(chalk.white(`  • let: ${chalk.cyan(letCount)}`));
      if (varCount > 0) {
        console.log(chalk.yellow(`  • var: ${chalk.cyan(varCount)} ⚠️`));
      }
    }

    // Imports
    if (analysis.imports.length > 0) {
      console.log(chalk.blue(`\n📥 Imports (${analysis.imports.length}):`));
      analysis.imports.slice(0, 5).forEach((imp) => {
        console.log(chalk.white(`  • ${chalk.cyan(imp.source)} - [${imp.imported.join(', ')}]`));
      });
      if (analysis.imports.length > 5) {
        console.log(chalk.gray(`  ... و ${analysis.imports.length - 5} import أخرى`));
      }
    }

    // Exports
    if (analysis.exports.length > 0) {
      console.log(chalk.green(`\n📤 Exports (${analysis.exports.length}):`));
      analysis.exports.forEach((exp) => {
        const typeLabel = exp.type === 'default' ? chalk.yellow('[default]') : '';
        console.log(chalk.white(`  • ${chalk.cyan(exp.name)} ${typeLabel}`));
      });
    }

    // Classes
    if (analysis.classes.length > 0) {
      console.log(chalk.magenta(`\n🏛️  Classes (${analysis.classes.length}):`));
      analysis.classes.forEach((cls) => {
        const extendsLabel = cls.extends ? chalk.gray(`extends ${cls.extends}`) : '';
        console.log(chalk.white(`  • ${chalk.cyan(cls.name)} ${extendsLabel}`));
        console.log(chalk.gray(`    - Methods: ${cls.methods.join(', ')}`));
      });
    }

    // المشاكل
    if (analysis.issues.length > 0) {
      console.log(chalk.red(`\n⚠️  المشاكل المحتملة (${analysis.issues.length}):`));
      analysis.issues.forEach((issue) => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        const color =
          issue.type === 'error' ? chalk.red : issue.type === 'warning' ? chalk.yellow : chalk.blue;
        const lineLabel = issue.line ? ` - السطر ${issue.line}` : '';
        console.log(color(`  ${icon} ${issue.message}${lineLabel}`));
        if (issue.suggestion) {
          console.log(chalk.gray(`     💡 ${issue.suggestion}`));
        }
      });
    }

    console.log(chalk.gray('\n═'.repeat(70)));
  }
}

// تصدير instance جاهز
export function createCodeAnalyzer(workingDir?: string): CodeAnalyzer {
  return new CodeAnalyzer(workingDir);
}
