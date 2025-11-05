// tree-sitter-parser.ts
// ============================================
// 🌳 Tree-sitter Code Parser
// ============================================
// Advanced code parsing using Tree-sitter for accurate AST analysis

// @ts-nocheck - Tree-sitter types are complex, skip strict checking for now
import Parser from 'web-tree-sitter';

// ============================================
// Types
// ============================================

export interface ParsedFile {
  ast: Parser.Tree;
  language: string;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  variables: VariableInfo[];
}

export interface FunctionInfo {
  name: string;
  params: ParameterInfo[];
  returnType?: string;
  body: string;
  docComment?: string;
  location: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
  isAsync: boolean;
  isExported: boolean;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  isOptional: boolean;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  extends?: string;
  implements?: string[];
  isExported: boolean;
  location: {
    startLine: number;
    endLine: number;
  };
}

export interface PropertyInfo {
  name: string;
  type?: string;
  isStatic: boolean;
  isPrivate: boolean;
  defaultValue?: string;
}

export interface ImportInfo {
  source: string;
  imports: Array<{ name: string; alias?: string }>;
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type';
  isDefault: boolean;
}

export interface VariableInfo {
  name: string;
  type?: string;
  kind: 'const' | 'let' | 'var';
  value?: string;
  isExported: boolean;
}

export interface DependencyGraph {
  nodes: Array<{ id: string; type: string; name: string }>;
  edges: Array<{ from: string; to: string; type: string }>;
}

// ============================================
// Tree-sitter Parser
// ============================================

export class CodeParser {
  private parser: Parser | null = null;
  private initialized = false;
  private supportedLanguages = new Map<string, Parser.Language>();

  constructor() {}

  /**
   * Initialize the parser with language support
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await Parser.init();
      this.parser = new Parser();

      // Load TypeScript
      const TypeScript = await Parser.Language.load(
        '/node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm'
      );
      this.supportedLanguages.set('typescript', TypeScript);
      this.supportedLanguages.set('tsx', TypeScript);

      // Load JavaScript
      const JavaScript = await Parser.Language.load(
        '/node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm'
      );
      this.supportedLanguages.set('javascript', JavaScript);
      this.supportedLanguages.set('jsx', JavaScript);

      // Load Python
      const Python = await Parser.Language.load(
        '/node_modules/tree-sitter-python/tree-sitter-python.wasm'
      );
      this.supportedLanguages.set('python', Python);

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Tree-sitter:', error);
      throw error;
    }
  }

  /**
   * Parse a file and extract all information
   */
  async parseFile(code: string, language: string = 'typescript'): Promise<ParsedFile> {
    if (!this.initialized || !this.parser) {
      await this.initialize();
    }

    const lang = this.supportedLanguages.get(language);
    if (!lang) {
      throw new Error(`Unsupported language: ${language}`);
    }

    this.parser!.setLanguage(lang);
    const tree = this.parser!.parse(code);

    return {
      ast: tree,
      language,
      functions: this.extractFunctions(tree.rootNode, code),
      classes: this.extractClasses(tree.rootNode, code),
      imports: this.extractImports(tree.rootNode, code),
      exports: this.extractExports(tree.rootNode, code),
      variables: this.extractVariables(tree.rootNode, code),
    };
  }

  /**
   * Extract all functions from AST
   */
  private extractFunctions(node: Parser.SyntaxNode, code: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (
        n.type === 'function_declaration' ||
        n.type === 'method_definition' ||
        n.type === 'arrow_function'
      ) {
        const funcInfo = this.parseFunctionNode(n, code);
        if (funcInfo) {
          functions.push(funcInfo);
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return functions;
  }

  /**
   * Parse a function node
   */
  private parseFunctionNode(node: Parser.SyntaxNode, code: string): FunctionInfo | null {
    try {
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');
      const bodyNode = node.childForFieldName('body');

      const name = nameNode ? nameNode.text : '<anonymous>';
      const params = paramsNode ? this.parseParameters(paramsNode, code) : [];
      const body = bodyNode ? bodyNode.text : '';

      return {
        name,
        params,
        returnType: this.extractReturnType(node, code),
        body,
        docComment: this.extractDocComment(node, code),
        location: {
          startLine: node.startPosition.row,
          endLine: node.endPosition.row,
          startColumn: node.startPosition.column,
          endColumn: node.endPosition.column,
        },
        isAsync: node.text.includes('async'),
        isExported: this.isExported(node),
      };
    } catch (error) {
      console.error('Error parsing function node:', error);
      return null;
    }
  }

  /**
   * Extract parameters from function
   */
  private parseParameters(node: Parser.SyntaxNode, code: string): ParameterInfo[] {
    const params: ParameterInfo[] = [];

    for (const child of node.children) {
      if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
        const nameNode = child.childForFieldName('pattern');
        const typeNode = child.childForFieldName('type');
        const defaultNode = child.childForFieldName('value');

        params.push({
          name: nameNode ? nameNode.text : '',
          type: typeNode ? typeNode.text : undefined,
          defaultValue: defaultNode ? defaultNode.text : undefined,
          isOptional: child.type === 'optional_parameter',
        });
      }
    }

    return params;
  }

  /**
   * Extract all classes from AST
   */
  private extractClasses(node: Parser.SyntaxNode, code: string): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'class_declaration') {
        const classInfo = this.parseClassNode(n, code);
        if (classInfo) {
          classes.push(classInfo);
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return classes;
  }

  /**
   * Parse a class node
   */
  private parseClassNode(node: Parser.SyntaxNode, code: string): ClassInfo | null {
    try {
      const nameNode = node.childForFieldName('name');
      const bodyNode = node.childForFieldName('body');

      if (!nameNode) return null;

      const methods: FunctionInfo[] = [];
      const properties: PropertyInfo[] = [];

      if (bodyNode) {
        for (const child of bodyNode.children) {
          if (child.type === 'method_definition') {
            const method = this.parseFunctionNode(child, code);
            if (method) methods.push(method);
          } else if (child.type === 'field_definition') {
            const prop = this.parsePropertyNode(child, code);
            if (prop) properties.push(prop);
          }
        }
      }

      return {
        name: nameNode.text,
        methods,
        properties,
        extends: this.extractExtendsClause(node, code),
        implements: this.extractImplementsClause(node, code),
        isExported: this.isExported(node),
        location: {
          startLine: node.startPosition.row,
          endLine: node.endPosition.row,
        },
      };
    } catch (error) {
      console.error('Error parsing class node:', error);
      return null;
    }
  }

  /**
   * Parse a property node
   */
  private parsePropertyNode(node: Parser.SyntaxNode, code: string): PropertyInfo | null {
    try {
      const nameNode = node.childForFieldName('name');
      const typeNode = node.childForFieldName('type');
      const valueNode = node.childForFieldName('value');

      if (!nameNode) return null;

      return {
        name: nameNode.text,
        type: typeNode ? typeNode.text : undefined,
        isStatic: node.text.includes('static'),
        isPrivate: node.text.includes('private'),
        defaultValue: valueNode ? valueNode.text : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract imports
   */
  private extractImports(node: Parser.SyntaxNode, code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'import_statement') {
        const importInfo = this.parseImportNode(n, code);
        if (importInfo) imports.push(importInfo);
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return imports;
  }

  /**
   * Parse import node
   */
  private parseImportNode(node: Parser.SyntaxNode, code: string): ImportInfo | null {
    try {
      const sourceNode = node.childForFieldName('source');
      if (!sourceNode) return null;

      const source = sourceNode.text.replace(/['"]/g, '');
      const imports: Array<{ name: string; alias?: string }> = [];

      // Extract named imports
      for (const child of node.children) {
        if (child.type === 'import_clause') {
          for (const importChild of child.children) {
            if (importChild.type === 'identifier') {
              imports.push({ name: importChild.text });
            } else if (importChild.type === 'import_specifier') {
              const nameNode = importChild.childForFieldName('name');
              const aliasNode = importChild.childForFieldName('alias');

              if (nameNode) {
                imports.push({
                  name: nameNode.text,
                  alias: aliasNode ? aliasNode.text : undefined,
                });
              }
            }
          }
        }
      }

      return {
        source,
        imports,
        isDefault: node.text.includes('default'),
        isNamespace: node.text.includes('* as'),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract exports
   */
  private extractExports(node: Parser.SyntaxNode, code: string): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'export_statement') {
        const exportInfo = this.parseExportNode(n, code);
        if (exportInfo) exports.push(exportInfo);
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return exports;
  }

  /**
   * Parse export node
   */
  private parseExportNode(node: Parser.SyntaxNode, code: string): ExportInfo | null {
    try {
      for (const child of node.children) {
        if (child.type === 'function_declaration') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            return {
              name: nameNode.text,
              type: 'function',
              isDefault: node.text.includes('default'),
            };
          }
        } else if (child.type === 'class_declaration') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            return {
              name: nameNode.text,
              type: 'class',
              isDefault: node.text.includes('default'),
            };
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract variables
   */
  private extractVariables(node: Parser.SyntaxNode, code: string): VariableInfo[] {
    const variables: VariableInfo[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (
        n.type === 'variable_declaration' ||
        n.type === 'lexical_declaration'
      ) {
        const varInfo = this.parseVariableNode(n, code);
        if (varInfo) variables.push(...varInfo);
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return variables;
  }

  /**
   * Parse variable node
   */
  private parseVariableNode(node: Parser.SyntaxNode, code: string): VariableInfo[] {
    const variables: VariableInfo[] = [];

    try {
      const kind = node.text.startsWith('const')
        ? 'const'
        : node.text.startsWith('let')
        ? 'let'
        : 'var';

      for (const child of node.children) {
        if (child.type === 'variable_declarator') {
          const nameNode = child.childForFieldName('name');
          const typeNode = child.childForFieldName('type');
          const valueNode = child.childForFieldName('value');

          if (nameNode) {
            variables.push({
              name: nameNode.text,
              type: typeNode ? typeNode.text : undefined,
              kind,
              value: valueNode ? valueNode.text : undefined,
              isExported: this.isExported(node.parent!),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error parsing variable:', error);
    }

    return variables;
  }

  /**
   * Build dependency graph
   */
  analyzeDependencies(parsedFile: ParsedFile): DependencyGraph {
    const nodes: Array<{ id: string; type: string; name: string }> = [];
    const edges: Array<{ from: string; to: string; type: string }> = [];

    // Add function nodes
    parsedFile.functions.forEach((func) => {
      nodes.push({
        id: `func_${func.name}`,
        type: 'function',
        name: func.name,
      });
    });

    // Add class nodes
    parsedFile.classes.forEach((cls) => {
      nodes.push({
        id: `class_${cls.name}`,
        type: 'class',
        name: cls.name,
      });

      // Add edges for class methods
      cls.methods.forEach((method) => {
        edges.push({
          from: `class_${cls.name}`,
          to: `method_${method.name}`,
          type: 'contains',
        });
      });
    });

    // Add import edges
    parsedFile.imports.forEach((imp) => {
      imp.imports.forEach((imported) => {
        edges.push({
          from: 'current_file',
          to: imported.name,
          type: 'imports',
        });
      });
    });

    return { nodes, edges };
  }

  // Helper methods

  private extractReturnType(node: Parser.SyntaxNode, code: string): string | undefined {
    const typeNode = node.childForFieldName('return_type');
    return typeNode ? typeNode.text : undefined;
  }

  private extractDocComment(node: Parser.SyntaxNode, code: string): string | undefined {
    // Look for JSDoc comment before the node
    const prevSibling = node.previousSibling;
    if (prevSibling && prevSibling.type === 'comment') {
      return prevSibling.text;
    }
    return undefined;
  }

  private isExported(node: Parser.SyntaxNode): boolean {
    let current: Parser.SyntaxNode | null = node;
    while (current) {
      if (current.type === 'export_statement') {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private extractExtendsClause(node: Parser.SyntaxNode, code: string): string | undefined {
    const extendsNode = node.childForFieldName('extends');
    return extendsNode ? extendsNode.text : undefined;
  }

  private extractImplementsClause(node: Parser.SyntaxNode, code: string): string[] | undefined {
    const implementsNode = node.childForFieldName('implements');
    if (!implementsNode) return undefined;

    const types: string[] = [];
    for (const child of implementsNode.children) {
      if (child.type === 'type_identifier') {
        types.push(child.text);
      }
    }

    return types.length > 0 ? types : undefined;
  }
}

// ============================================
// Factory & Helper
// ============================================

let parserInstance: CodeParser | null = null;

export async function getCodeParser(): Promise<CodeParser> {
  if (!parserInstance) {
    parserInstance = new CodeParser();
    await parserInstance.initialize();
  }
  return parserInstance;
}

// ============================================
// Usage Example
// ============================================

export const TREE_SITTER_EXAMPLE = `
// 📝 استخدام Tree-sitter Parser

import { getCodeParser } from '@oqool/shared';

async function analyzeCode() {
  const parser = await getCodeParser();

  const code = \`
    export class Calculator {
      add(a: number, b: number): number {
        return a + b;
      }
    }
  \`;

  const parsed = await parser.parseFile(code, 'typescript');

  console.log('Functions:', parsed.functions);
  console.log('Classes:', parsed.classes);
  console.log('Imports:', parsed.imports);

  // Build dependency graph
  const graph = parser.analyzeDependencies(parsed);
  console.log('Dependency Graph:', graph);
}
`;

export default CodeParser;
