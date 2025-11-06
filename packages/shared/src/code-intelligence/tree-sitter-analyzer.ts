/**
 * Tree-sitter Code Analyzer - Complete Implementation
 *
 * محلل كود احترافي باستخدام Tree-sitter
 * يوفر تحليل شامل للكود مع دعم عدة لغات برمجة
 */

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import Go from 'tree-sitter-go';
import Rust from 'tree-sitter-rust';

// ============================================
// Types
// ============================================

export interface FunctionNode {
  name: string;
  params: Parameter[];
  returnType?: string;
  body: string;
  startLine: number;
  endLine: number;
  complexity: number;
  documentation?: string;
  isAsync?: boolean;
  isExported?: boolean;
}

export interface ClassNode {
  name: string;
  extends?: string;
  implements?: string[];
  properties: Property[];
  methods: FunctionNode[];
  decorators?: string[];
  startLine: number;
  endLine: number;
}

export interface ImportNode {
  source: string;
  imports: string[];
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
}

export interface ExportNode {
  name: string;
  type: 'function' | 'class' | 'variable' | 'default';
  line: number;
}

export interface Variable {
  name: string;
  type?: string;
  value?: string;
  isConst: boolean;
  line: number;
}

export interface Parameter {
  name: string;
  type?: string;
  defaultValue?: string;
  optional: boolean;
}

export interface Property {
  name: string;
  type?: string;
  isPrivate: boolean;
  isStatic: boolean;
  value?: string;
}

export interface CodeSmell {
  type: 'long_function' | 'high_complexity' | 'duplicate_code' | 'too_many_params' | 'deep_nesting';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: { start: number; end: number };
  message: string;
  suggestion: string;
}

export interface CodeAnalysis {
  functions: FunctionNode[];
  classes: ClassNode[];
  imports: ImportNode[];
  exports: ExportNode[];
  variables: Variable[];
  complexity: number;
  dependencies: string[];
  codeSmells: CodeSmell[];
  suggestions: string[];
}

export interface Location {
  file: string;
  line: number;
  column: number;
}

export interface Reference {
  line: number;
  column: number;
  context: string;
}

export interface FoldingRange {
  start: number;
  end: number;
  kind: 'function' | 'class' | 'block' | 'comment';
}

// ============================================
// Tree-sitter Analyzer
// ============================================

export class TreeSitterAnalyzer {
  private parsers: Map<string, Parser>;

  constructor() {
    this.parsers = new Map();
    this.initializeParsers();
  }

  /**
   * تهيئة parsers لجميع اللغات المدعومة
   */
  private initializeParsers() {
    // TypeScript
    const tsParser = new Parser();
    tsParser.setLanguage(TypeScript.typescript);
    this.parsers.set('typescript', tsParser);
    this.parsers.set('ts', tsParser);
    this.parsers.set('tsx', tsParser);

    // JavaScript
    const jsParser = new Parser();
    jsParser.setLanguage(JavaScript);
    this.parsers.set('javascript', jsParser);
    this.parsers.set('js', jsParser);
    this.parsers.set('jsx', jsParser);

    // Python
    const pyParser = new Parser();
    pyParser.setLanguage(Python);
    this.parsers.set('python', pyParser);
    this.parsers.set('py', pyParser);

    // Go
    const goParser = new Parser();
    goParser.setLanguage(Go);
    this.parsers.set('go', goParser);

    // Rust
    const rustParser = new Parser();
    rustParser.setLanguage(Rust);
    this.parsers.set('rust', rustParser);
    this.parsers.set('rs', rustParser);
  }

  /**
   * تحليل شامل للكود
   */
  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const parser = this.parsers.get(language);
    if (!parser) {
      throw new Error(`Language ${language} not supported`);
    }

    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    const functions = this.extractFunctions(rootNode, code);
    const classes = this.extractClasses(rootNode, code);

    return {
      functions,
      classes,
      imports: this.extractImports(rootNode, code),
      exports: this.extractExports(rootNode, code),
      variables: this.extractVariables(rootNode, code),
      complexity: this.calculateComplexity(rootNode),
      dependencies: this.analyzeDependencies(rootNode, code),
      codeSmells: this.detectCodeSmells(functions, classes, rootNode, code),
      suggestions: this.generateSuggestions(functions, classes)
    };
  }

  /**
   * استخراج الدوال
   */
  private extractFunctions(node: any, code: string): FunctionNode[] {
    const functions: FunctionNode[] = [];

    const traverse = (n: any) => {
      if (
        n.type === 'function_declaration' ||
        n.type === 'method_definition' ||
        n.type === 'arrow_function' ||
        n.type === 'function_expression' ||
        n.type === 'function_item' // Rust
      ) {
        const func: FunctionNode = {
          name: this.getFunctionName(n, code),
          params: this.getParameters(n, code),
          returnType: this.getReturnType(n, code),
          body: this.getNodeText(n, code),
          startLine: n.startPosition.row + 1,
          endLine: n.endPosition.row + 1,
          complexity: this.calculateFunctionComplexity(n),
          documentation: this.extractDocumentation(n, code),
          isAsync: this.isAsync(n),
          isExported: this.isExported(n)
        };
        functions.push(func);
      }

      for (let i = 0; i < n.childCount; i++) {
        traverse(n.child(i));
      }
    };

    traverse(node);
    return functions;
  }

  /**
   * استخراج الـ Classes
   */
  private extractClasses(node: any, code: string): ClassNode[] {
    const classes: ClassNode[] = [];

    const traverse = (n: any) => {
      if (n.type === 'class_declaration' || n.type === 'class' || n.type === 'struct_item') {
        const classNode: ClassNode = {
          name: this.getClassName(n, code),
          extends: this.getExtends(n, code),
          implements: this.getImplements(n, code),
          properties: this.getProperties(n, code),
          methods: this.getMethods(n, code),
          decorators: this.getDecorators(n, code),
          startLine: n.startPosition.row + 1,
          endLine: n.endPosition.row + 1
        };
        classes.push(classNode);
      }

      for (let i = 0; i < n.childCount; i++) {
        traverse(n.child(i));
      }
    };

    traverse(node);
    return classes;
  }

  /**
   * استخراج الـ Imports
   */
  private extractImports(node: any, code: string): ImportNode[] {
    const imports: ImportNode[] = [];

    const traverse = (n: any) => {
      if (n.type === 'import_statement' || n.type === 'import_declaration' || n.type === 'use_declaration') {
        const importNode: ImportNode = {
          source: this.getImportSource(n, code),
          imports: this.getImportNames(n, code),
          isDefault: this.isDefaultImport(n),
          isNamespace: this.isNamespaceImport(n),
          line: n.startPosition.row + 1
        };
        imports.push(importNode);
      }

      for (let i = 0; i < n.childCount; i++) {
        traverse(n.child(i));
      }
    };

    traverse(node);
    return imports;
  }

  /**
   * استخراج الـ Exports
   */
  private extractExports(node: any, code: string): ExportNode[] {
    const exports: ExportNode[] = [];

    const traverse = (n: any) => {
      if (n.type === 'export_statement' || n.type.includes('export')) {
        const exportNode: ExportNode = {
          name: this.getExportName(n, code),
          type: this.getExportType(n),
          line: n.startPosition.row + 1
        };
        exports.push(exportNode);
      }

      for (let i = 0; i < n.childCount; i++) {
        traverse(n.child(i));
      }
    };

    traverse(node);
    return exports;
  }

  /**
   * استخراج المتغيرات
   */
  private extractVariables(node: any, code: string): Variable[] {
    const variables: Variable[] = [];

    const traverse = (n: any) => {
      if (n.type === 'variable_declaration' || n.type === 'lexical_declaration' || n.type === 'let_declaration') {
        for (let i = 0; i < n.childCount; i++) {
          const child = n.child(i);
          if (child.type === 'variable_declarator') {
            variables.push({
              name: this.getVariableName(child, code),
              type: this.getVariableType(child, code),
              value: this.getVariableValue(child, code),
              isConst: n.type.includes('const'),
              line: child.startPosition.row + 1
            });
          }
        }
      }

      for (let i = 0; i < n.childCount; i++) {
        traverse(n.child(i));
      }
    };

    traverse(node);
    return variables;
  }

  /**
   * حساب التعقيد Cyclomatic Complexity
   */
  private calculateFunctionComplexity(node: any): number {
    let complexity = 1; // base complexity

    const complexityNodes = [
      'if_statement',
      'while_statement',
      'for_statement',
      'for_in_statement',
      'for_of_statement',
      'case',
      'catch_clause',
      'ternary_expression',
      'binary_expression', // && و ||
      'conditional_expression'
    ];

    const traverse = (n: any) => {
      if (complexityNodes.includes(n.type)) {
        // && و || تزيد التعقيد
        if (n.type === 'binary_expression') {
          const operator = this.getOperator(n);
          if (operator === '&&' || operator === '||') {
            complexity++;
          }
        } else {
          complexity++;
        }
      }

      for (let i = 0; i < n.childCount; i++) {
        traverse(n.child(i));
      }
    };

    traverse(node);
    return complexity;
  }

  /**
   * حساب التعقيد الكلي
   */
  private calculateComplexity(node: any): number {
    const functions = this.extractFunctions(node, '');
    return functions.reduce((sum, f) => sum + f.complexity, 0);
  }

  /**
   * تحليل التبعيات
   */
  private analyzeDependencies(node: any, code: string): string[] {
    const imports = this.extractImports(node, code);
    return [...new Set(imports.map(imp => imp.source))];
  }

  /**
   * كشف Code Smells
   */
  private detectCodeSmells(
    functions: FunctionNode[],
    classes: ClassNode[],
    node: any,
    code: string
  ): CodeSmell[] {
    const smells: CodeSmell[] = [];

    // 1. Long functions
    for (const func of functions) {
      const lines = func.endLine - func.startLine + 1;
      if (lines > 50) {
        smells.push({
          type: 'long_function',
          severity: lines > 100 ? 'high' : 'medium',
          location: { start: func.startLine, end: func.endLine },
          message: `Function "${func.name}" is too long (${lines} lines)`,
          suggestion: `Consider breaking this function into smaller, more focused functions. Aim for functions under 50 lines.`
        });
      }

      // 2. High complexity
      if (func.complexity > 10) {
        smells.push({
          type: 'high_complexity',
          severity: func.complexity > 20 ? 'critical' : 'high',
          location: { start: func.startLine, end: func.endLine },
          message: `Function "${func.name}" has high complexity (${func.complexity})`,
          suggestion: `Refactor this function to reduce complexity. Consider extracting conditional logic into separate functions.`
        });
      }

      // 3. Too many parameters
      if (func.params.length > 5) {
        smells.push({
          type: 'too_many_params',
          severity: 'medium',
          location: { start: func.startLine, end: func.endLine },
          message: `Function "${func.name}" has too many parameters (${func.params.length})`,
          suggestion: `Consider using an options object or breaking this function into smaller pieces.`
        });
      }
    }

    // 4. Large classes
    for (const cls of classes) {
      if (cls.methods.length > 20) {
        smells.push({
          type: 'long_function',
          severity: 'medium',
          location: { start: cls.startLine, end: cls.endLine },
          message: `Class "${cls.name}" has too many methods (${cls.methods.length})`,
          suggestion: `Consider splitting this class into smaller, more focused classes following the Single Responsibility Principle.`
        });
      }
    }

    // 5. Deep nesting
    const maxDepth = this.getMaxNestingDepth(node);
    if (maxDepth > 4) {
      smells.push({
        type: 'deep_nesting',
        severity: 'medium',
        location: { start: 0, end: 0 },
        message: `Code has deep nesting (depth: ${maxDepth})`,
        suggestion: `Reduce nesting by using early returns or extracting nested logic into separate functions.`
      });
    }

    return smells;
  }

  /**
   * توليد اقتراحات التحسين
   */
  private generateSuggestions(functions: FunctionNode[], classes: ClassNode[]): string[] {
    const suggestions: string[] = [];

    // Documentation coverage
    const undocumentedFunctions = functions.filter(f => !f.documentation);
    if (undocumentedFunctions.length > functions.length * 0.5) {
      suggestions.push(`Add documentation to ${undocumentedFunctions.length} functions to improve code maintainability.`);
    }

    // Async patterns
    const asyncFunctions = functions.filter(f => f.isAsync);
    if (asyncFunctions.length > 0) {
      suggestions.push(`Consider using Promise.all() for parallel async operations in ${asyncFunctions.length} async functions.`);
    }

    // Export patterns
    const exportedFunctions = functions.filter(f => f.isExported);
    if (exportedFunctions.length < functions.length * 0.3) {
      suggestions.push(`Consider exporting more functions to improve code reusability.`);
    }

    return suggestions;
  }

  // ============================================
  // Code Navigation Methods
  // ============================================

  /**
   * اذهب إلى التعريف
   */
  async goToDefinition(
    code: string,
    language: string,
    position: { line: number; column: number }
  ): Promise<Location | null> {
    const parser = this.parsers.get(language);
    if (!parser) return null;

    const tree = parser.parse(code);
    const node = this.getNodeAtPosition(tree.rootNode, position);

    if (node && node.type === 'identifier') {
      const symbolName = this.getNodeText(node, code);
      const definition = this.findDefinition(tree.rootNode, symbolName, code);

      if (definition) {
        return {
          file: '', // يتم ملؤه من السياق
          line: definition.startPosition.row + 1,
          column: definition.startPosition.column + 1
        };
      }
    }

    return null;
  }

  /**
   * إيجاد جميع المراجع
   */
  async findReferences(
    code: string,
    language: string,
    symbol: string
  ): Promise<Reference[]> {
    const parser = this.parsers.get(language);
    if (!parser) return [];

    const tree = parser.parse(code);
    const references: Reference[] = [];

    const traverse = (node: any) => {
      if (node.type === 'identifier' && this.getNodeText(node, code) === symbol) {
        references.push({
          line: node.startPosition.row + 1,
          column: node.startPosition.column + 1,
          context: this.getLineText(code, node.startPosition.row)
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };

    traverse(tree.rootNode);
    return references;
  }

  /**
   * إعادة تسمية رمز
   */
  async renameSymbol(
    code: string,
    language: string,
    oldName: string,
    newName: string
  ): Promise<string> {
    const references = await this.findReferences(code, language, oldName);

    let newCode = code;
    // نبدأ من النهاية لتجنب تغيير المواقع
    for (const ref of references.reverse()) {
      const lines = newCode.split('\n');
      const line = lines[ref.line - 1];
      const before = line.substring(0, ref.column - 1);
      const after = line.substring(ref.column - 1 + oldName.length);
      lines[ref.line - 1] = before + newName + after;
      newCode = lines.join('\n');
    }

    return newCode;
  }

  /**
   * Code Folding Ranges
   */
  getFoldingRanges(code: string, language: string): FoldingRange[] {
    const parser = this.parsers.get(language);
    if (!parser) return [];

    const tree = parser.parse(code);
    const ranges: FoldingRange[] = [];

    const foldableTypes = [
      'function_declaration',
      'class_declaration',
      'if_statement',
      'for_statement',
      'while_statement',
      'object',
      'array',
      'block_comment'
    ];

    const traverse = (node: any) => {
      if (foldableTypes.includes(node.type)) {
        ranges.push({
          start: node.startPosition.row,
          end: node.endPosition.row,
          kind: this.getFoldingKind(node.type)
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };

    traverse(tree.rootNode);
    return ranges;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getNodeText(node: any, code: string): string {
    return code.substring(node.startIndex, node.endIndex);
  }

  private getFunctionName(node: any, code: string): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? this.getNodeText(nameNode, code) : 'anonymous';
  }

  private getClassName(node: any, code: string): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? this.getNodeText(nameNode, code) : 'Anonymous';
  }

  private getParameters(node: any, code: string): Parameter[] {
    const params: Parameter[] = [];
    const paramsNode = node.childForFieldName('parameters');

    if (paramsNode) {
      for (let i = 0; i < paramsNode.childCount; i++) {
        const param = paramsNode.child(i);
        if (param.type === 'required_parameter' || param.type === 'optional_parameter' || param.type === 'parameter') {
          const patternNode = param.childForFieldName('pattern');
          const typeNode = param.childForFieldName('type');

          params.push({
            name: patternNode ? this.getNodeText(patternNode, code) : this.getNodeText(param, code),
            type: typeNode ? this.getNodeText(typeNode, code) : undefined,
            optional: param.type === 'optional_parameter',
            defaultValue: this.getDefaultValue(param, code)
          });
        }
      }
    }

    return params;
  }

  private getReturnType(node: any, code: string): string | undefined {
    const returnTypeNode = node.childForFieldName('return_type');
    return returnTypeNode ? this.getNodeText(returnTypeNode, code) : undefined;
  }

  private getExtends(node: any, code: string): string | undefined {
    const extendsNode = node.childForFieldName('superclass');
    return extendsNode ? this.getNodeText(extendsNode, code) : undefined;
  }

  private getImplements(node: any, code: string): string[] {
    const implementsNode = node.childForFieldName('implements');
    if (!implementsNode) return [];

    const interfaces: string[] = [];
    for (let i = 0; i < implementsNode.childCount; i++) {
      const child = implementsNode.child(i);
      if (child.type === 'type_identifier') {
        interfaces.push(this.getNodeText(child, code));
      }
    }
    return interfaces;
  }

  private getProperties(node: any, code: string): Property[] {
    const properties: Property[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === 'field_definition' || child.type === 'public_field_definition') {
        properties.push({
          name: this.getPropertyName(child, code),
          type: this.getPropertyType(child, code),
          isPrivate: this.isPrivateProperty(child),
          isStatic: this.isStaticProperty(child),
          value: this.getPropertyValue(child, code)
        });
      }
    }

    return properties;
  }

  private getMethods(node: any, code: string): FunctionNode[] {
    const methods: FunctionNode[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === 'method_definition') {
        methods.push({
          name: this.getFunctionName(child, code),
          params: this.getParameters(child, code),
          returnType: this.getReturnType(child, code),
          body: this.getNodeText(child, code),
          startLine: child.startPosition.row + 1,
          endLine: child.endPosition.row + 1,
          complexity: this.calculateFunctionComplexity(child),
          documentation: this.extractDocumentation(child, code)
        });
      }
    }

    return methods;
  }

  private getDecorators(node: any, code: string): string[] {
    const decorators: string[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === 'decorator') {
        decorators.push(this.getNodeText(child, code));
      }
    }

    return decorators;
  }

  private getImportSource(node: any, code: string): string {
    const sourceNode = node.childForFieldName('source');
    if (sourceNode) {
      return this.getNodeText(sourceNode, code).replace(/['"]/g, '');
    }
    return '';
  }

  private getImportNames(node: any, code: string): string[] {
    const names: string[] = [];
    const clauseNode = node.childForFieldName('clause');

    if (clauseNode) {
      for (let i = 0; i < clauseNode.childCount; i++) {
        const child = clauseNode.child(i);
        if (child.type === 'import_specifier' || child.type === 'identifier') {
          names.push(this.getNodeText(child, code));
        }
      }
    }

    return names;
  }

  private isDefaultImport(node: any): boolean {
    return node.text?.includes('default') || false;
  }

  private isNamespaceImport(node: any): boolean {
    return node.text?.includes('* as') || false;
  }

  private getExportName(node: any, code: string): string {
    const nameNode = node.childForFieldName('name') || node.childForFieldName('declaration');
    return nameNode ? this.getNodeText(nameNode, code) : 'default';
  }

  private getExportType(node: any): 'function' | 'class' | 'variable' | 'default' {
    if (node.text?.includes('function')) return 'function';
    if (node.text?.includes('class')) return 'class';
    if (node.text?.includes('default')) return 'default';
    return 'variable';
  }

  private getVariableName(node: any, code: string): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? this.getNodeText(nameNode, code) : '';
  }

  private getVariableType(node: any, code: string): string | undefined {
    const typeNode = node.childForFieldName('type');
    return typeNode ? this.getNodeText(typeNode, code) : undefined;
  }

  private getVariableValue(node: any, code: string): string | undefined {
    const valueNode = node.childForFieldName('value');
    return valueNode ? this.getNodeText(valueNode, code) : undefined;
  }

  private getPropertyName(node: any, code: string): string {
    const nameNode = node.childForFieldName('property');
    return nameNode ? this.getNodeText(nameNode, code) : '';
  }

  private getPropertyType(node: any, code: string): string | undefined {
    const typeNode = node.childForFieldName('type');
    return typeNode ? this.getNodeText(typeNode, code) : undefined;
  }

  private getPropertyValue(node: any, code: string): string | undefined {
    const valueNode = node.childForFieldName('value');
    return valueNode ? this.getNodeText(valueNode, code) : undefined;
  }

  private isPrivateProperty(node: any): boolean {
    return node.text?.includes('private') || node.text?.startsWith('#') || false;
  }

  private isStaticProperty(node: any): boolean {
    return node.text?.includes('static') || false;
  }

  private isAsync(node: any): boolean {
    return node.text?.includes('async') || false;
  }

  private isExported(node: any): boolean {
    return node.parent?.type === 'export_statement' || false;
  }

  private getDefaultValue(node: any, code: string): string | undefined {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === 'assignment_pattern') {
        const valueNode = child.childForFieldName('right');
        return valueNode ? this.getNodeText(valueNode, code) : undefined;
      }
    }
    return undefined;
  }

  private getOperator(node: any): string {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === '&&' || child.type === '||') {
        return child.type;
      }
    }
    return '';
  }

  private extractDocumentation(node: any, code: string): string | undefined {
    const previousNode = node.previousSibling;
    if (previousNode && (previousNode.type === 'comment' || previousNode.type === 'block_comment')) {
      return this.getNodeText(previousNode, code);
    }
    return undefined;
  }

  private getNodeAtPosition(node: any, position: { line: number; column: number }): any {
    const row = position.line - 1;
    const col = position.column - 1;

    if (
      node.startPosition.row <= row &&
      node.endPosition.row >= row &&
      node.startPosition.column <= col &&
      node.endPosition.column >= col
    ) {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        const result = this.getNodeAtPosition(child, position);
        if (result) return result;
      }
      return node;
    }

    return null;
  }

  private findDefinition(node: any, symbolName: string, code: string): any {
    const traverse = (n: any): any => {
      if (
        (n.type === 'function_declaration' ||
          n.type === 'variable_declarator' ||
          n.type === 'class_declaration') &&
        this.getNodeText(n.childForFieldName('name') || n, code) === symbolName
      ) {
        return n;
      }

      for (let i = 0; i < n.childCount; i++) {
        const result = traverse(n.child(i));
        if (result) return result;
      }

      return null;
    };

    return traverse(node);
  }

  private getLineText(code: string, lineNumber: number): string {
    const lines = code.split('\n');
    return lines[lineNumber] || '';
  }

  private getMaxNestingDepth(node: any, currentDepth: number = 0): number {
    let maxDepth = currentDepth;

    const blockTypes = ['if_statement', 'for_statement', 'while_statement', 'function_declaration'];

    if (blockTypes.includes(node.type)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    for (let i = 0; i < node.childCount; i++) {
      const childDepth = this.getMaxNestingDepth(node.child(i), currentDepth);
      maxDepth = Math.max(maxDepth, childDepth);
    }

    return maxDepth;
  }

  private getFoldingKind(type: string): 'function' | 'class' | 'block' | 'comment' {
    if (type.includes('function')) return 'function';
    if (type.includes('class')) return 'class';
    if (type.includes('comment')) return 'comment';
    return 'block';
  }
}
