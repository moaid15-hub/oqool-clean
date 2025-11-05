// validation-pipeline.ts
// ============================================
// 🔍 Validation Pipeline - نظام التحقق المتكامل
// ============================================
// يجمع كل مراحل التحقق في نظام موحد:
// 1. Syntax Check (P1) - أخطاء الكتابة
// 2. Type Check (P2) - أخطاء الأنواع
// 3. Security Scan (P1) - ثغرات أمنية
// 4. Performance Analysis (P3) - مشاكل الأداء
// 5. Style Check (P3) - نظافة الكود
// ============================================

import * as ts from 'typescript';
// Optional imports - will be loaded dynamically if available
// import { parse } from '@typescript-eslint/parser';
// import * as ESLint from 'eslint';

// ============================================
// 📊 Types & Interfaces
// ============================================

export type ValidationStage = 'syntax' | 'types' | 'security' | 'performance' | 'style';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Priority = 'P1' | 'P2' | 'P3';
export type FixStrategy = 'auto' | 'suggest' | 'manual' | 'confirm';

export interface ValidationIssue {
  stage: ValidationStage;
  severity: Severity;
  type: string;
  message: string;
  line?: number;
  column?: number;
  file?: string;
  code?: string;
  cwe?: string; // Common Weakness Enumeration
  fix?: {
    strategy: FixStrategy;
    description: string;
    suggestedCode?: string;
  };
}

export interface StageResult {
  stage: ValidationStage;
  priority: Priority;
  passed: boolean;
  duration: number; // milliseconds
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: ValidationIssue[];
  autoFixApplied: boolean;
  fixedCode?: string;
}

export interface ValidationResult {
  success: boolean;
  totalIssues: number;
  criticalIssues: number;
  stages: StageResult[];
  finalCode: string;
  originalCode: string;
  summary: string;
  duration: number;
}

export interface StageConfig {
  enabled: boolean;
  priority: Priority;
  autoFix: boolean;
  stopOnError: boolean;
  confirm?: boolean; // يسأل المستخدم قبل التطبيق
}

export interface PipelineConfig {
  stages?: {
    [K in ValidationStage]?: StageConfig;
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
}

// ============================================
// 🔧 Default Configuration
// ============================================

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  stages: {
    syntax: {
      enabled: true,
      priority: 'P1',
      autoFix: true,
      stopOnError: true,
      confirm: false,
    },
    types: {
      enabled: true,
      priority: 'P2',
      autoFix: true,
      stopOnError: false,
      confirm: false,
    },
    security: {
      enabled: true,
      priority: 'P1',
      autoFix: false,
      stopOnError: true,
      confirm: true, // يسأل المستخدم للثغرات الأمنية
    },
    performance: {
      enabled: true,
      priority: 'P3',
      autoFix: false,
      stopOnError: false,
      confirm: false,
    },
    style: {
      enabled: true,
      priority: 'P3',
      autoFix: true,
      stopOnError: false,
      confirm: false,
    },
  },
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
  },
};

// ============================================
// 🎯 Validation Pipeline Class
// ============================================

export class ValidationPipeline {
  private config: Required<PipelineConfig>;
  private cache: Map<string, ValidationResult> = new Map();

  constructor(config: PipelineConfig = {}) {
    this.config = this.mergeConfig(config);
  }

  // ============================================
  // 🔄 Main Validation Method
  // ============================================
  async validate(
    code: string,
    filePath: string,
    options?: {
      skipCache?: boolean;
      onProgress?: (stage: ValidationStage, progress: number) => void;
      onConfirm?: (issue: ValidationIssue) => Promise<boolean>;
    }
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    // Check cache first
    if (!options?.skipCache && this.config.cache.enabled) {
      const cached = this.getFromCache(code);
      if (cached) return cached;
    }

    const stages: StageResult[] = [];
    let currentCode = code;
    let totalIssues = 0;
    let criticalIssues = 0;

    // Execute stages in priority order
    const orderedStages = this.getOrderedStages();

    for (const stageName of orderedStages) {
      const stageConfig = this.config.stages[stageName];
      if (!stageConfig || !stageConfig.enabled) continue;

      options?.onProgress?.(stageName, stages.length / orderedStages.length);

      const stageResult = await this.executeStage(
        stageName,
        currentCode,
        filePath,
        stageConfig,
        options?.onConfirm
      );

      stages.push(stageResult);
      totalIssues += stageResult.errors.length + stageResult.warnings.length;
      criticalIssues += stageResult.errors.filter((e) => e.severity === 'critical').length;

      // Apply auto-fixes
      if (stageResult.autoFixApplied && stageResult.fixedCode) {
        currentCode = stageResult.fixedCode;
      }

      // Stop on critical errors if configured
      if (stageConfig.stopOnError && !stageResult.passed) {
        break;
      }
    }

    const result: ValidationResult = {
      success: criticalIssues === 0,
      totalIssues,
      criticalIssues,
      stages,
      finalCode: currentCode,
      originalCode: code,
      summary: this.generateSummary(stages, totalIssues, criticalIssues),
      duration: Date.now() - startTime,
    };

    // Cache result
    if (this.config.cache.enabled) {
      this.setCache(code, result);
    }

    return result;
  }

  // ============================================
  // 🎭 Execute Individual Stage
  // ============================================
  private async executeStage(
    stage: ValidationStage,
    code: string,
    filePath: string,
    config: StageConfig,
    onConfirm?: (issue: ValidationIssue) => Promise<boolean>
  ): Promise<StageResult> {
    const startTime = Date.now();

    try {
      let result: StageResult;

      switch (stage) {
        case 'syntax':
          result = await this.checkSyntax(code, filePath);
          break;
        case 'types':
          result = await this.checkTypes(code, filePath);
          break;
        case 'security':
          result = await this.checkSecurity(code, filePath);
          break;
        case 'performance':
          result = await this.checkPerformance(code, filePath);
          break;
        case 'style':
          result = await this.checkStyle(code, filePath);
          break;
        default:
          throw new Error(`Unknown stage: ${stage}`);
      }

      result.duration = Date.now() - startTime;
      result.priority = config.priority;

      // Apply auto-fix if enabled
      if (config.autoFix && result.errors.length > 0) {
        const fixResult = await this.applyAutoFix(stage, code, result.errors, onConfirm);

        if (fixResult.fixed) {
          result.autoFixApplied = true;
          result.fixedCode = fixResult.code;
          result.errors = fixResult.remainingErrors;
        }
      }

      return result;
    } catch (error) {
      return {
        stage,
        priority: config.priority,
        passed: false,
        duration: Date.now() - startTime,
        errors: [
          {
            stage,
            severity: 'high',
            type: 'stage_error',
            message: `Failed to execute ${stage} stage: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        warnings: [],
        suggestions: [],
        autoFixApplied: false,
      };
    }
  }

  // ============================================
  // 1️⃣ Syntax Check
  // ============================================
  private async checkSyntax(code: string, filePath: string): Promise<StageResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    try {
      // Try to parse with TypeScript
      const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

      // Check for parsing errors
      const diagnostics = (sourceFile as any).parseDiagnostics || [];

      for (const diagnostic of diagnostics) {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        const position = diagnostic.start
          ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start)
          : { line: 0, character: 0 };

        errors.push({
          stage: 'syntax',
          severity: 'critical',
          type: 'syntax_error',
          message,
          line: position.line + 1,
          column: position.character + 1,
          file: filePath,
          code: `TS${diagnostic.code}`,
          fix: {
            strategy: 'auto',
            description: 'TypeScript compiler can auto-fix this',
          },
        });
      }
    } catch (error) {
      errors.push({
        stage: 'syntax',
        severity: 'critical',
        type: 'parse_error',
        message: `Failed to parse code: ${error instanceof Error ? error.message : String(error)}`,
        file: filePath,
      });
    }

    return {
      stage: 'syntax',
      priority: 'P1',
      passed: errors.length === 0,
      duration: 0,
      errors,
      warnings,
      suggestions: [],
      autoFixApplied: false,
    };
  }

  // ============================================
  // 2️⃣ Type Check
  // ============================================
  private async checkTypes(code: string, filePath: string): Promise<StageResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Skip if not TypeScript
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      return {
        stage: 'types',
        priority: 'P2',
        passed: true,
        duration: 0,
        errors: [],
        warnings: [],
        suggestions: [],
        autoFixApplied: false,
      };
    }

    try {
      // Create in-memory compiler
      const compilerOptions: ts.CompilerOptions = {
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
      };

      const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

      const host: ts.CompilerHost = {
        getSourceFile: (fileName) => (fileName === filePath ? sourceFile : undefined),
        writeFile: () => {},
        getCurrentDirectory: () => '/',
        getDirectories: () => [],
        fileExists: (fileName) => fileName === filePath,
        readFile: (fileName) => (fileName === filePath ? code : undefined),
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      };

      const program = ts.createProgram([filePath], compilerOptions, host);
      const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);

      for (const diagnostic of diagnostics) {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        const position = diagnostic.start
          ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start)
          : { line: 0, character: 0 };

        const severity = diagnostic.category === ts.DiagnosticCategory.Error ? 'high' : 'medium';

        const issue: ValidationIssue = {
          stage: 'types',
          severity,
          type: 'type_error',
          message,
          line: position.line + 1,
          column: position.character + 1,
          file: filePath,
          code: `TS${diagnostic.code}`,
          fix: {
            strategy: 'auto',
            description: 'TypeScript can infer or add type annotations',
          },
        };

        if (severity === 'high') {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    } catch (error) {
      warnings.push({
        stage: 'types',
        severity: 'medium',
        type: 'type_check_error',
        message: `Type checking failed: ${error instanceof Error ? error.message : String(error)}`,
        file: filePath,
      });
    }

    return {
      stage: 'types',
      priority: 'P2',
      passed: errors.length === 0,
      duration: 0,
      errors,
      warnings,
      suggestions: [],
      autoFixApplied: false,
    };
  }

  // ============================================
  // 3️⃣ Security Check
  // ============================================
  private async checkSecurity(code: string, filePath: string): Promise<StageResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const suggestions: ValidationIssue[] = [];

    // Common security patterns
    const securityChecks = [
      {
        pattern: /eval\s*\(/g,
        severity: 'critical' as Severity,
        type: 'dangerous_function',
        message: 'Use of eval() is extremely dangerous',
        cwe: 'CWE-95',
        fix: 'Remove eval() and use safer alternatives',
      },
      {
        pattern: /innerHTML\s*=/g,
        severity: 'high' as Severity,
        type: 'xss_vulnerability',
        message: 'Direct innerHTML assignment can lead to XSS',
        cwe: 'CWE-79',
        fix: 'Use textContent or sanitize HTML',
      },
      {
        pattern: /process\.env\./g,
        severity: 'medium' as Severity,
        type: 'sensitive_data',
        message: 'Direct access to environment variables',
        cwe: 'CWE-200',
        fix: 'Use a configuration service',
      },
      {
        pattern: /exec\s*\(/g,
        severity: 'critical' as Severity,
        type: 'command_injection',
        message: 'exec() can lead to command injection',
        cwe: 'CWE-78',
        fix: 'Use safer alternatives or sanitize input',
      },
      {
        pattern: /SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*\+/gi,
        severity: 'critical' as Severity,
        type: 'sql_injection',
        message: 'Potential SQL injection vulnerability',
        cwe: 'CWE-89',
        fix: 'Use parameterized queries',
      },
      {
        pattern: /Math\.random\(\)/g,
        severity: 'low' as Severity,
        type: 'weak_random',
        message: 'Math.random() is not cryptographically secure',
        cwe: 'CWE-330',
        fix: 'Use crypto.randomBytes() for security-sensitive operations',
      },
    ];

    const lines = code.split('\n');

    for (const check of securityChecks) {
      let match;
      while ((match = check.pattern.exec(code)) !== null) {
        const position = this.getLineAndColumn(code, match.index);

        const issue: ValidationIssue = {
          stage: 'security',
          severity: check.severity,
          type: check.type,
          message: check.message,
          line: position.line,
          column: position.column,
          file: filePath,
          cwe: check.cwe,
          fix: {
            strategy: 'confirm',
            description: check.fix,
          },
        };

        if (check.severity === 'critical' || check.severity === 'high') {
          errors.push(issue);
        } else if (check.severity === 'medium') {
          warnings.push(issue);
        } else {
          suggestions.push(issue);
        }
      }
    }

    return {
      stage: 'security',
      priority: 'P1',
      passed: errors.length === 0,
      duration: 0,
      errors,
      warnings,
      suggestions,
      autoFixApplied: false,
    };
  }

  // ============================================
  // 4️⃣ Performance Check
  // ============================================
  private async checkPerformance(code: string, filePath: string): Promise<StageResult> {
    const warnings: ValidationIssue[] = [];
    const suggestions: ValidationIssue[] = [];

    const performanceChecks = [
      {
        pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/g,
        severity: 'medium' as Severity,
        message: 'Nested loops detected (O(n²) complexity)',
        fix: 'Consider using more efficient algorithms',
      },
      {
        pattern: /\.forEach\([^)]*\)\s*\{[^}]*\.forEach\(/g,
        severity: 'medium' as Severity,
        message: 'Nested forEach detected',
        fix: 'Consider flattening or using other methods',
      },
      {
        pattern: /new\s+Array\(\d{4,}\)/g,
        severity: 'low' as Severity,
        message: 'Large array allocation',
        fix: 'Consider lazy loading or chunking',
      },
      {
        pattern: /JSON\.parse\(.*JSON\.stringify\(/g,
        severity: 'low' as Severity,
        message: 'Deep cloning using JSON (inefficient)',
        fix: 'Use structuredClone() or a proper cloning library',
      },
    ];

    for (const check of performanceChecks) {
      let match;
      while ((match = check.pattern.exec(code)) !== null) {
        const position = this.getLineAndColumn(code, match.index);

        const issue: ValidationIssue = {
          stage: 'performance',
          severity: check.severity,
          type: 'performance_issue',
          message: check.message,
          line: position.line,
          column: position.column,
          file: filePath,
          fix: {
            strategy: 'suggest',
            description: check.fix,
          },
        };

        if (check.severity === 'medium') {
          warnings.push(issue);
        } else {
          suggestions.push(issue);
        }
      }
    }

    return {
      stage: 'performance',
      priority: 'P3',
      passed: true, // Performance issues don't fail validation
      duration: 0,
      errors: [],
      warnings,
      suggestions,
      autoFixApplied: false,
    };
  }

  // ============================================
  // 5️⃣ Style Check
  // ============================================
  private async checkStyle(code: string, filePath: string): Promise<StageResult> {
    const warnings: ValidationIssue[] = [];
    const suggestions: ValidationIssue[] = [];

    const styleChecks = [
      {
        pattern: /var\s+/g,
        severity: 'low' as Severity,
        message: 'Use const or let instead of var',
        fix: 'Replace var with const or let',
      },
      {
        pattern: /==(?!=)/g,
        severity: 'low' as Severity,
        message: 'Use === instead of ==',
        fix: 'Replace == with ===',
      },
      {
        pattern: /console\.log\(/g,
        severity: 'low' as Severity,
        message: 'console.log() found in code',
        fix: 'Remove console.log or use proper logging',
      },
      {
        pattern: /\t/g,
        severity: 'info' as Severity,
        message: 'Tabs found, consider using spaces',
        fix: 'Replace tabs with spaces',
      },
    ];

    for (const check of styleChecks) {
      let match;
      while ((match = check.pattern.exec(code)) !== null) {
        const position = this.getLineAndColumn(code, match.index);

        const issue: ValidationIssue = {
          stage: 'style',
          severity: check.severity,
          type: 'style_issue',
          message: check.message,
          line: position.line,
          column: position.column,
          file: filePath,
          fix: {
            strategy: 'auto',
            description: check.fix,
          },
        };

        if (check.severity === 'low') {
          warnings.push(issue);
        } else {
          suggestions.push(issue);
        }
      }
    }

    return {
      stage: 'style',
      priority: 'P3',
      passed: true, // Style issues don't fail validation
      duration: 0,
      errors: [],
      warnings,
      suggestions,
      autoFixApplied: false,
    };
  }

  // ============================================
  // 🔧 Auto-Fix Logic
  // ============================================
  private async applyAutoFix(
    stage: ValidationStage,
    code: string,
    errors: ValidationIssue[],
    onConfirm?: (issue: ValidationIssue) => Promise<boolean>
  ): Promise<{ fixed: boolean; code: string; remainingErrors: ValidationIssue[] }> {
    let fixedCode = code;
    const remainingErrors: ValidationIssue[] = [];

    for (const error of errors) {
      // Check if fix requires confirmation
      if (error.fix?.strategy === 'confirm' && onConfirm) {
        const confirmed = await onConfirm(error);
        if (!confirmed) {
          remainingErrors.push(error);
          continue;
        }
      }

      // Apply auto-fix based on stage
      if (error.fix?.strategy === 'auto') {
        try {
          fixedCode = this.applyFix(fixedCode, error);
        } catch (err) {
          remainingErrors.push(error);
        }
      } else {
        remainingErrors.push(error);
      }
    }

    return {
      fixed: fixedCode !== code,
      code: fixedCode,
      remainingErrors,
    };
  }

  // ============================================
  // 🔨 Apply Individual Fix
  // ============================================
  private applyFix(code: string, issue: ValidationIssue): string {
    // Simple fixes based on issue type
    switch (issue.type) {
      case 'style_issue':
        if (issue.message.includes('var')) {
          return code.replace(/\bvar\s+/g, 'const ');
        }
        if (issue.message.includes('==')) {
          return code.replace(/==(?!=)/g, '===');
        }
        if (issue.message.includes('console.log')) {
          return code.replace(/console\.log\([^)]*\);?\s*/g, '');
        }
        if (issue.message.includes('tabs')) {
          return code.replace(/\t/g, '  ');
        }
        break;
    }

    return code;
  }

  // ============================================
  // 📊 Helper Methods
  // ============================================

  private getOrderedStages(): ValidationStage[] {
    const stages = Object.entries(this.config.stages) as [ValidationStage, any][];

    // Sort by priority
    const priorityOrder: Record<Priority, number> = { P1: 1, P2: 2, P3: 3 };
    stages.sort(
      (a, b) => priorityOrder[a[1].priority as Priority] - priorityOrder[b[1].priority as Priority]
    );

    return stages.map(([name]) => name);
  }

  private getLineAndColumn(code: string, index: number): { line: number; column: number } {
    const lines = code.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  private generateSummary(
    stages: StageResult[],
    totalIssues: number,
    criticalIssues: number
  ): string {
    const passed = stages.filter((s) => s.passed).length;
    const failed = stages.length - passed;

    let summary = `Validation completed: ${passed}/${stages.length} stages passed\n`;
    summary += `Total issues: ${totalIssues} (${criticalIssues} critical)\n`;

    if (failed > 0) {
      summary += `⚠️ Failed stages: ${stages
        .filter((s) => !s.passed)
        .map((s) => s.stage)
        .join(', ')}`;
    }

    return summary;
  }

  private mergeConfig(config: PipelineConfig): Required<PipelineConfig> {
    return {
      stages: { ...DEFAULT_CONFIG.stages, ...config.stages },
      cache: { ...DEFAULT_CONFIG.cache, ...config.cache },
    };
  }

  // ============================================
  // 💾 Cache Methods
  // ============================================

  private getFromCache(code: string): ValidationResult | undefined {
    const key = this.generateCacheKey(code);
    const cached = this.cache.get(key);

    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    return undefined;
  }

  private setCache(code: string, result: ValidationResult): void {
    const key = this.generateCacheKey(code);
    this.cache.set(key, result);

    // Auto-cleanup old cache entries
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  private generateCacheKey(code: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private isCacheValid(result: ValidationResult): boolean {
    const age = Date.now() - result.duration;
    return age < (this.config.cache.ttl || 3600) * 1000;
  }

  // ============================================
  // 🧹 Public Utility Methods
  // ============================================

  clearCache(): void {
    this.cache.clear();
  }

  configureStage(stage: ValidationStage, config: Partial<StageConfig>): void {
    if (!this.config.stages) {
      this.config.stages = {};
    }
    const existingConfig = this.config.stages[stage] || {
      enabled: true,
      priority: 'P2' as Priority,
      autoFix: false,
      stopOnError: false,
    };
    this.config.stages[stage] = {
      ...existingConfig,
      ...config,
    } as StageConfig;
  }

  getConfig(): Required<PipelineConfig> {
    return { ...this.config };
  }
}

// ============================================
// 🎯 Singleton Instance
// ============================================

let globalPipeline: ValidationPipeline | null = null;

export function getValidationPipeline(config?: PipelineConfig): ValidationPipeline {
  if (!globalPipeline) {
    globalPipeline = new ValidationPipeline(config);
  }
  return globalPipeline;
}

export function createValidationPipeline(config?: PipelineConfig): ValidationPipeline {
  return new ValidationPipeline(config);
}
